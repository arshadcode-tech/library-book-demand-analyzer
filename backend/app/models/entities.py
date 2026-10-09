from datetime import datetime, date
from sqlalchemy import String, Integer, Date, DateTime, ForeignKey, Boolean, Float, Text, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

class Department(Base):
    __tablename__ = "departments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    students: Mapped[list["Student"]] = relationship(back_populates="department")

class Book(Base):
    __tablename__ = "books"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    isbn: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    author: Mapped[str] = mapped_column(String(160), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    publisher: Mapped[str] = mapped_column(String(160), default="Unknown")
    publication_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    department: Mapped[str] = mapped_column(String(100), default="General", index=True)
    total_copies: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    available_copies: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    shelf_location: Mapped[str] = mapped_column(String(60), default="Unassigned")
    image_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    date_added: Mapped[date] = mapped_column(Date, default=date.today)
    transactions: Mapped[list["IssueTransaction"]] = relationship(back_populates="book")

class Student(Base):
    __tablename__ = "students"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_code: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    department: Mapped[Department | None] = relationship(back_populates="students")

class IssueTransaction(Base):
    __tablename__ = "issue_transactions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    transaction_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), nullable=False, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False, index=True)
    department: Mapped[str] = mapped_column(String(100), default="General", index=True)
    issue_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    return_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="issued", index=True)
    book: Mapped[Book] = relationship(back_populates="transactions")
    __table_args__ = (Index("ix_issue_book_date", "book_id", "issue_date"),)

class DemandForecast(Base):
    __tablename__ = "demand_forecasts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), nullable=False, index=True)
    forecast_month: Mapped[str] = mapped_column(String(7), nullable=False, index=True)
    predicted_issues: Mapped[float] = mapped_column(Float, nullable=False)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("book_id", "forecast_month", "model_name", name="uq_forecast_book_month_model"),)

class ModelTrainingRun(Base):
    __tablename__ = "model_training_runs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    mae: Mapped[float | None] = mapped_column(Float, nullable=True)
    rmse: Mapped[float | None] = mapped_column(Float, nullable=True)
    training_rows: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(30), default="completed")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
