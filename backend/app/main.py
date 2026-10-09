import os, csv, io
from datetime import date, timedelta
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
import uuid
import shutil
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.db.session import Base, engine, get_db
from app.models.entities import Book, Student, Department, IssueTransaction, DemandForecast, ModelTrainingRun
from app.schemas import BookIn, BookOut, IssueIn, ReturnIn, TransactionOut
from app.analytics.demand import demand_by_month, top_books, category_demand, department_demand
from app.ml.forecast import train_and_forecast
from app.services.recommendations import recommendations
from pydantic import BaseModel

class LoginIn(BaseModel):
    username: str
    password: str

Base.metadata.create_all(bind=engine)
app=FastAPI(title="Library Book Demand Analyzer API",version="1.0.0",description="Library demand analytics, forecasting and inventory planning API")
origins=os.getenv("CORS_ORIGINS","http://localhost:5173").split(",")
app.add_middleware(CORSMiddleware,allow_origins=origins,allow_credentials=True,allow_methods=["*"],allow_headers=["*"])

@app.post("/api/login")
def login(payload: LoginIn):
    if payload.username == "admin" and payload.password == "library2026":
        return {"token": "fake-jwt-token-admin"}
    raise HTTPException(status_code=401, detail="Invalid credentials")

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(os.path.join(UPLOAD_DIR, "book_covers"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.post("/api/upload/image")
async def upload_image(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")
    ext = file.filename.split(".")[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "webp"]:
        raise HTTPException(400, "Unsupported image format")
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, "book_covers", filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"url": f"/uploads/book_covers/{filename}"}

@app.get("/api/health")
def health(): return {"status":"ok","service":"library-book-demand-analyzer"}

@app.get("/api/books",response_model=list[BookOut])
def list_books(search:str|None=None, category:str|None=None, department:str|None=None, skip:int=Query(0,ge=0), limit:int=Query(100,ge=1,le=500), db:Session=Depends(get_db)):
    stmt=select(Book)
    if search: stmt=stmt.where((Book.title.ilike(f"%{search}%"))|(Book.author.ilike(f"%{search}%"))|(Book.isbn.ilike(f"%{search}%"))|(Book.category.ilike(f"%{search}%")))
    if category: stmt=stmt.where(Book.category==category)
    if department: stmt=stmt.where(Book.department==department)
    return db.execute(stmt.order_by(Book.title).offset(skip).limit(limit)).scalars().all()

@app.post("/api/books",response_model=BookOut,status_code=201)
def create_book(payload:BookIn,db:Session=Depends(get_db)):
    if db.execute(select(Book).where(Book.isbn==payload.isbn)).scalar_one_or_none(): raise HTTPException(409,"ISBN already exists")
    book=Book(**payload.model_dump()); db.add(book); db.commit(); db.refresh(book); return book

@app.get("/api/books/{book_id}",response_model=BookOut)
def get_book(book_id:int,db:Session=Depends(get_db)):
    b=db.get(Book,book_id)
    if not b: raise HTTPException(404,"Book not found")
    return b

@app.put("/api/books/{book_id}",response_model=BookOut)
def update_book(book_id:int,payload:BookIn,db:Session=Depends(get_db)):
    b=db.get(Book,book_id)
    if not b: raise HTTPException(404,"Book not found")
    if payload.isbn!=b.isbn and db.execute(select(Book).where(Book.isbn==payload.isbn)).scalar_one_or_none(): raise HTTPException(409,"ISBN already exists")
    active=db.execute(select(func.count()).select_from(IssueTransaction).where(IssueTransaction.book_id==book_id,IssueTransaction.status=="issued")).scalar_one()
    if payload.available_copies < active: raise HTTPException(400,"Available copies cannot be less than currently issued copies")
    for k,v in payload.model_dump().items(): setattr(b,k,v)
    db.commit(); db.refresh(b); return b

@app.delete("/api/books/{book_id}",status_code=204)
def delete_book(book_id:int,db:Session=Depends(get_db)):
    b=db.get(Book,book_id)
    if not b: raise HTTPException(404,"Book not found")
    if db.execute(select(func.count()).select_from(IssueTransaction).where(IssueTransaction.book_id==book_id)).scalar_one(): raise HTTPException(409,"Cannot delete a book with transaction history")
    db.delete(b); db.commit(); return None

@app.get("/api/transactions",response_model=list[TransactionOut])
def transactions(department:str|None=None,book_id:int|None=None,status:str|None=None,skip:int=Query(0,ge=0),limit:int=Query(100,ge=1,le=500),db:Session=Depends(get_db)):
    stmt=select(IssueTransaction)
    if department: stmt=stmt.where(IssueTransaction.department==department)
    if book_id: stmt=stmt.where(IssueTransaction.book_id==book_id)
    if status: stmt=stmt.where(IssueTransaction.status==status)
    return db.execute(stmt.order_by(IssueTransaction.issue_date.desc()).offset(skip).limit(limit)).scalars().all()

@app.post("/api/transactions/issue",response_model=TransactionOut,status_code=201)
def issue_book(payload:IssueIn,db:Session=Depends(get_db)):
    if payload.due_date < payload.issue_date: raise HTTPException(422,"Due date cannot be before issue date")
    book=db.execute(select(Book).where(Book.id==payload.book_id).with_for_update()).scalar_one_or_none()
    if not book: raise HTTPException(404,"Book not found")
    if book.available_copies<1: raise HTTPException(409,"No available copies")
    code=payload.transaction_code or f"TX-{date.today():%Y%m%d}-{payload.book_id}-{payload.student_code}"
    if db.execute(select(IssueTransaction).where(IssueTransaction.transaction_code==code)).scalar_one_or_none(): raise HTTPException(409,"Duplicate transaction code")
    dept=db.execute(select(Department).where(Department.name==payload.department)).scalar_one_or_none()
    if not dept: dept=Department(name=payload.department); db.add(dept); db.flush()
    student=db.execute(select(Student).where(Student.student_code==payload.student_code)).scalar_one_or_none()
    if not student: student=Student(student_code=payload.student_code,department_id=dept.id); db.add(student); db.flush()
    tx=IssueTransaction(transaction_code=code,book_id=book.id,student_id=student.id,department=payload.department,issue_date=payload.issue_date,due_date=payload.due_date,status="issued")
    book.available_copies-=1; db.add(tx); db.commit(); db.refresh(tx); return tx

@app.post("/api/transactions/{transaction_id}/return",response_model=TransactionOut)
def return_book(transaction_id:int,payload:ReturnIn,db:Session=Depends(get_db)):
    tx=db.execute(select(IssueTransaction).where(IssueTransaction.id==transaction_id).with_for_update()).scalar_one_or_none()
    if not tx: raise HTTPException(404,"Transaction not found")
    if tx.status=="returned": raise HTTPException(409,"Book has already been returned")
    if payload.return_date < tx.issue_date: raise HTTPException(422,"Return date cannot be before issue date")
    book=db.execute(select(Book).where(Book.id==tx.book_id).with_for_update()).scalar_one()
    tx.return_date=payload.return_date; tx.status="returned"; book.available_copies=min(book.total_copies,book.available_copies+1)
    db.commit(); db.refresh(tx); return tx

@app.get("/api/dashboard")
def dashboard(db:Session=Depends(get_db)):
    total_books=db.execute(select(func.count()).select_from(Book)).scalar_one()
    total_copies=db.execute(select(func.coalesce(func.sum(Book.total_copies),0))).scalar_one()
    available=db.execute(select(func.coalesce(func.sum(Book.available_copies),0))).scalar_one()
    month_start=date.today().replace(day=1)
    month_issues=db.execute(select(func.count()).select_from(IssueTransaction).where(IssueTransaction.issue_date>=month_start)).scalar_one()
    low=db.execute(select(Book).where(Book.available_copies<=2).order_by(Book.available_copies)).scalars().all()
    high=top_books(db,10)
    forecasts=db.execute(select(DemandForecast).order_by(DemandForecast.created_at.desc())).scalars().all()
    latest={}
    for f in forecasts:
        if f.book_id not in latest: latest[f.book_id]=f.predicted_issues
    return {"total_books":total_books,"total_copies":total_copies,"available_copies":available,"issues_this_month":month_issues,"high_demand_books":sum(1 for b in high if b["issues"]>=5),"low_stock_books":len(low),"predicted_next_month_demand":round(sum(latest.values()),1),"monthly_demand":demand_by_month(db),"top_books":high,"category_demand":category_demand(db),"department_demand":department_demand(db),"low_stock":[{"id":b.id,"title":b.title,"available_copies":b.available_copies,"total_copies":b.total_copies} for b in low],"recent_transactions":[{"id":t.id,"transaction_code":t.transaction_code,"book_id":t.book_id,"department":t.department,"issue_date":str(t.issue_date),"status":t.status} for t in db.execute(select(IssueTransaction).order_by(IssueTransaction.issue_date.desc()).limit(8)).scalars().all()]}

@app.get("/api/analytics")
def analytics(start_date:date|None=None,end_date:date|None=None,department:str|None=None,category:str|None=None,book_id:int|None=None,db:Session=Depends(get_db)):
    stmt=select(IssueTransaction,Book).join(Book,Book.id==IssueTransaction.book_id)
    if start_date: stmt=stmt.where(IssueTransaction.issue_date>=start_date)
    if end_date: stmt=stmt.where(IssueTransaction.issue_date<=end_date)
    if department: stmt=stmt.where(IssueTransaction.department==department)
    if category: stmt=stmt.where(Book.category==category)
    if book_id: stmt=stmt.where(Book.id==book_id)
    rows=db.execute(stmt).all()
    durations=[(t.return_date-t.issue_date).days for t,b in rows if t.return_date]
    return {"total_issues":len(rows),"average_borrowing_days":round(sum(durations)/len(durations),1) if durations else None,"monthly_demand":demand_by_month(db),"top_books":top_books(db,10),"category_demand":category_demand(db),"department_demand":department_demand(db),"note":"Summary charts use all records; selected filters are applied to the total and borrowing-duration metrics."}

@app.post("/api/ml/train")
def train_model(db:Session=Depends(get_db)):
    model_path=os.getenv("MODEL_PATH","./artifacts/demand_model.joblib")
    return train_and_forecast(db,model_path)

@app.get("/api/ml/forecasts")
def forecasts(db:Session=Depends(get_db)):
    rows=db.execute(select(DemandForecast,Book.title).join(Book,Book.id==DemandForecast.book_id).order_by(DemandForecast.forecast_month.desc())).all()
    return [{"id":f.id,"book_id":f.book_id,"title":title,"forecast_month":f.forecast_month,"predicted_issues":f.predicted_issues,"model_name":f.model_name,"created_at":f.created_at.isoformat()} for f,title in rows]

@app.get("/api/ml/training-runs")
def training_runs(db:Session=Depends(get_db)):
    rows=db.execute(select(ModelTrainingRun).order_by(ModelTrainingRun.created_at.desc()).limit(20)).scalars().all()
    return [{"id":r.id,"model_name":r.model_name,"mae":r.mae,"rmse":r.rmse,"training_rows":r.training_rows,"status":r.status,"notes":r.notes,"created_at":r.created_at.isoformat()} for r in rows]

@app.get("/api/recommendations")
def stock_recommendations(lead_time_months:int=Query(1,ge=1,le=12),safety_buffer:float=Query(0.25,ge=0,le=2),db:Session=Depends(get_db)):
    return recommendations(db,lead_time_months,safety_buffer)

@app.get("/api/reports/issues.csv")
def export_issues(db:Session=Depends(get_db)):
    rows=db.execute(select(IssueTransaction)).scalars().all(); stream=io.StringIO(); writer=csv.writer(stream)
    writer.writerow(["transaction_code","book_id","student_id","department","issue_date","due_date","return_date","status"])
    for r in rows: writer.writerow([r.transaction_code,r.book_id,r.student_id,r.department,r.issue_date,r.due_date,r.return_date or "",r.status])
    stream.seek(0); return StreamingResponse(iter([stream.getvalue()]),media_type="text/csv",headers={"Content-Disposition":"attachment; filename=issue_report.csv"})

@app.get("/api/reports/recommendations.csv")
def export_recommendations(lead_time_months:int=1,safety_buffer:float=0.25,db:Session=Depends(get_db)):
    rows=recommendations(db,lead_time_months,safety_buffer); stream=io.StringIO(); writer=csv.DictWriter(stream,fieldnames=list(rows[0].keys()) if rows else ["book_id","title"]); writer.writeheader(); writer.writerows(rows); stream.seek(0)
    return StreamingResponse(iter([stream.getvalue()]),media_type="text/csv",headers={"Content-Disposition":"attachment; filename=purchase_recommendations.csv"})

@app.get("/api/import/template.csv")
def import_template():
    sample="transaction_code,isbn,student_code,department,issue_date,due_date,return_date,status\nDEMO-TX-001,978000000001,STU-001,Computer Science,2025-01-10,2025-01-24,2025-01-20,returned\n"
    return StreamingResponse(iter([sample]),media_type="text/csv",headers={"Content-Disposition":"attachment; filename=issue_import_template.csv"})

@app.post("/api/import/issues")
async def import_issues(file:UploadFile=File(...),db:Session=Depends(get_db)):
    if not file.filename.lower().endswith(".csv"): raise HTTPException(400,"Upload a CSV file")
    try: content=(await file.read()).decode("utf-8-sig"); reader=csv.DictReader(io.StringIO(content))
    except Exception: raise HTTPException(400,"Could not read CSV as UTF-8")
    required={"transaction_code","isbn","student_code","department","issue_date","due_date","status"}
    if not reader.fieldnames or not required.issubset(set(reader.fieldnames)): raise HTTPException(422,f"Required columns: {', '.join(sorted(required))}")
    imported=skipped=rejected=0; errors=[]
    for line,row in enumerate(reader,start=2):
        savepoint=db.begin_nested()
        try:
            code=row["transaction_code"].strip()
            if not code: raise ValueError("transaction_code is required")
            if db.execute(select(IssueTransaction).where(IssueTransaction.transaction_code==code)).scalar_one_or_none(): skipped+=1; continue
            book=db.execute(select(Book).where(Book.isbn==row["isbn"].strip())).scalar_one_or_none()
            if not book: raise ValueError("ISBN not found in inventory")
            issue=date.fromisoformat(row["issue_date"]); due=date.fromisoformat(row["due_date"])
            if due<issue: raise ValueError("due_date is before issue_date")
            status=row["status"].strip().lower()
            if status not in {"issued","returned"}: raise ValueError("status must be issued or returned")
            dept_name=row["department"].strip() or "General"; dept=db.execute(select(Department).where(Department.name==dept_name)).scalar_one_or_none()
            if not dept: dept=Department(name=dept_name); db.add(dept); db.flush()
            student_code=row["student_code"].strip(); student=db.execute(select(Student).where(Student.student_code==student_code)).scalar_one_or_none()
            if not student: student=Student(student_code=student_code,department_id=dept.id); db.add(student); db.flush()
            ret=date.fromisoformat(row["return_date"]) if row.get("return_date"," ").strip() else None
            if status=="returned" and not ret: raise ValueError("returned status requires return_date")
            if status=="issued" and book.available_copies<=0: raise ValueError("no available copies for active issue")
            tx=IssueTransaction(transaction_code=code,book_id=book.id,student_id=student.id,department=dept_name,issue_date=issue,due_date=due,return_date=ret,status=status)
            if status=="issued": book.available_copies-=1
            db.add(tx); db.flush(); imported+=1
            savepoint.commit()
        except Exception as e:
            savepoint.rollback(); rejected+=1; errors.append({"row":line,"error":str(e)})
    db.commit()
    return {"imported":imported,"skipped_duplicates":skipped,"rejected":rejected,"errors":errors[:100],"message":"Import finished; review rejected rows before retrying."}
