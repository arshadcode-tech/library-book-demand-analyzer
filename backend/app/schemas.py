from datetime import date
from pydantic import BaseModel, Field, ConfigDict, model_validator

class BookIn(BaseModel):
    isbn: str = Field(min_length=3, max_length=20)
    title: str = Field(min_length=1, max_length=255)
    author: str = Field(min_length=1, max_length=160)
    category: str = Field(min_length=1, max_length=100)
    publisher: str = "Unknown"
    publication_year: int | None = Field(default=None, ge=1000, le=2100)
    department: str = "General"
    total_copies: int = Field(ge=0, le=100000)
    available_copies: int = Field(ge=0, le=100000)
    shelf_location: str = "Unassigned"
    image_url: str | None = None
    @model_validator(mode="after")
    def valid_stock(self):
        if self.available_copies > self.total_copies: raise ValueError("Available copies cannot exceed total copies")
        return self

class BookOut(BookIn):
    id: int
    date_added: date
    model_config = ConfigDict(from_attributes=True)

class IssueIn(BaseModel):
    book_id: int
    student_code: str = Field(min_length=1, max_length=40)
    department: str = "General"
    issue_date: date = Field(default_factory=date.today)
    due_date: date
    transaction_code: str | None = None

class ReturnIn(BaseModel):
    return_date: date = Field(default_factory=date.today)

class TransactionOut(BaseModel):
    id: int
    transaction_code: str
    book_id: int
    student_id: int
    department: str
    issue_date: date
    due_date: date
    return_date: date | None
    status: str
    model_config = ConfigDict(from_attributes=True)
