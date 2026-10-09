"""Seed clearly synthetic books and 15 months of realistic demo issue history."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import random
from datetime import date, timedelta
from sqlalchemy import select
from app.db.session import Base, engine, SessionLocal
from app.models.entities import Book, Department, Student, IssueTransaction
Base.metadata.create_all(bind=engine)
random.seed(41)
CATEGORIES=["Programming","Data Science","Database","Networking","Mathematics","Business","Literature","Cybersecurity"]
DEPARTMENTS=["Computer Science","IT","Commerce","Mathematics","Electronics"]
TITLES=[("C Programming", "Dennis Ritchie", "Programming"),("Python for Data Analysis","Wes McKinney","Data Science"),("Database System Concepts","Silberschatz","Database"),("Computer Networks","Andrew Tanenbaum","Networking"),("Introduction to Algorithms","Cormen","Programming"),("Machine Learning Basics","Peter Flach","Data Science"),("Operating System Concepts","Abraham Silberschatz","Programming"),("Clean Code","Robert Martin","Programming"),("SQL Fundamentals","John Smith","Database"),("Applied Statistics","David Moore","Mathematics"),("Cybersecurity Essentials","Charles Brooks","Cybersecurity"),("Business Analytics","James Evans","Business"),("Discrete Mathematics","Kenneth Rosen","Mathematics"),("Web Development with React","Alex Banks","Programming"),("Digital Marketing","Dave Chaffey","Business"),("Literary Essays","Various Authors","Literature"),("Computer Organization","Carl Hamacher","Programming"),("Cloud Computing","Rajkumar Buyya","Networking"),("Data Mining","Pang-Ning Tan","Data Science"),("Information Systems","Kenneth Laudon","Business")]
def main():
 db=SessionLocal()
 try:
  if db.execute(select(Book.id)).first(): print("Inventory already contains data; seed skipped."); return
  depts={}
  for name in DEPARTMENTS:
   d=Department(name=name); db.add(d); db.flush(); depts[name]=d
  books=[]
  for i in range(50):
   title,author,cat=TITLES[i%len(TITLES)]; title=title if i<len(TITLES) else f"{title} - Volume {i//len(TITLES)+1}"
   total=random.randint(2,12); available=random.randint(0,total)
   b=Book(isbn=f"978000{i+1:06d}",title=title,author=author,category=cat,publisher="Synthetic Academic Press",publication_year=random.randint(2010,2025),department=DEPARTMENTS[i%len(DEPARTMENTS)],total_copies=total,available_copies=total,shelf_location=f"{chr(65+i%8)}-{i%20+1}")
   db.add(b); db.flush(); books.append(b)
  students=[]
  for i in range(100):
   s=Student(student_code=f"DEMO-STU-{i+1:03d}",department_id=depts[DEPARTMENTS[i%len(DEPARTMENTS)]].id); db.add(s); db.flush(); students.append(s)
  start=date.today().replace(day=1)-timedelta(days=450)
  txid=1
  for month_offset in range(15):
   month=(start.replace(day=1)+timedelta(days=month_offset*30)).replace(day=1)
   for b in books:
    baseline=7 if b.category in ["Programming","Data Science","Database"] else 2
    seasonal=1.7 if month.month in [8,9,1] else 1.0
    count=max(0,int(random.gammavariate(max(1,baseline*seasonal),1.0)))
    for _ in range(min(count,8)):
     day=min(28,random.randint(1,28)); issue=month.replace(day=day); returned=random.random()<0.82
     s=random.choice(students); dept=DEPARTMENTS[(s.id-1)%len(DEPARTMENTS)]
     db.add(IssueTransaction(transaction_code=f"DEMO-TX-{txid:06d}",book_id=b.id,student_id=s.id,department=dept,issue_date=issue,due_date=issue+timedelta(days=14),return_date=issue+timedelta(days=random.randint(2,21)) if returned else None,status="returned" if returned else "issued"))
     txid+=1
  db.commit()
  # Reconcile available inventory from currently active synthetic issues.
  for b in books:
   active=db.query(IssueTransaction).filter_by(book_id=b.id,status="issued").count()
   b.available_copies=max(0,b.total_copies-active)
  db.commit(); print(f"Seeded {len(books)} synthetic books, {len(students)} synthetic students, {txid-1} synthetic issue transactions.")
 finally: db.close()
if __name__=="__main__": main()
