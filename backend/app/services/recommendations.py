from sqlalchemy import select
from app.models.entities import Book, DemandForecast

def recommendations(db, lead_time_months=1, safety_buffer=0.25):
    books=db.execute(select(Book)).scalars().all(); result=[]
    for b in books:
        fc=db.execute(select(DemandForecast).where(DemandForecast.book_id==b.id).order_by(DemandForecast.created_at.desc())).scalars().first()
        predicted=fc.predicted_issues if fc else None
        # A conservative planning heuristic: forecast demand across lead time, then apply configurable buffer.
        # It does not assume each issue needs a new physical copy; librarian review remains required.
        target=round((predicted or 0)*max(1,lead_time_months)*max(0,1+safety_buffer)) if predicted is not None else None
        gap=max(0,target-b.available_copies) if target is not None else None
        if predicted is None: action="Import history / train model"; status="Insufficient data"
        elif b.available_copies < predicted*0.5: action="Review purchase urgently"; status="High stock pressure"
        elif gap and gap>0: action="Review stock adequacy"; status="Potential shortfall"
        else: action="Stock appears adequate"; status="Adequate"
        result.append({"book_id":b.id,"title":b.title,"available_copies":b.available_copies,"predicted_issues":predicted,"planning_target":target,"suggested_additional_copies":gap,"status":status,"recommended_action":action,"logic":"Planning target = predicted monthly issues × replenishment lead-time months × (1 + safety buffer). This is a review signal, not an automatic purchase order."})
    return result
