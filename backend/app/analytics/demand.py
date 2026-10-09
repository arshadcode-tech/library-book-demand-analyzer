import pandas as pd
from sqlalchemy import select
from app.models.entities import IssueTransaction, Book

def transaction_frame(db):
    rows = db.execute(select(IssueTransaction, Book.title, Book.category).join(Book, Book.id == IssueTransaction.book_id)).all()
    data = [{"transaction_id": tx.id, "book_id": tx.book_id, "title": title, "category": category,
             "department": tx.department, "issue_date": tx.issue_date, "return_date": tx.return_date,
             "status": tx.status} for tx,title,category in rows]
    df = pd.DataFrame(data)
    if not df.empty: df["issue_date"] = pd.to_datetime(df["issue_date"])
    return df

def demand_by_month(db):
    df = transaction_frame(db)
    if df.empty: return []
    grouped = df.assign(month=df.issue_date.dt.to_period("M").astype(str)).groupby("month").size().reset_index(name="issues")
    return grouped.to_dict(orient="records")

def top_books(db, limit=10):
    df = transaction_frame(db)
    if df.empty: return []
    return df.groupby(["book_id","title"]).size().reset_index(name="issues").sort_values("issues",ascending=False).head(limit).to_dict(orient="records")

def category_demand(db):
    df = transaction_frame(db)
    if df.empty: return []
    return df.groupby("category").size().reset_index(name="issues").sort_values("issues",ascending=False).to_dict(orient="records")

def department_demand(db):
    df = transaction_frame(db)
    if df.empty: return []
    return df.groupby("department").size().reset_index(name="issues").sort_values("issues",ascending=False).to_dict(orient="records")
