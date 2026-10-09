# Library Book Demand Analyzer and Future Demand Prediction System

A full-stack college project for analyzing library borrowing records, forecasting next-month demand with scikit-learn, monitoring stock, and preparing purchase-review recommendations. All generated demo records are synthetic.

## Features

- React + Vite responsive dashboard with Recharts visualizations and a light UI.
- FastAPI REST API with Swagger docs at `http://localhost:8000/docs`.
- SQLAlchemy relational models for books, students, departments, issue transactions, forecasts and model-training runs.
- Inventory CRUD; stock-aware issue/return workflow; overdue flags; CSV issue import/export.
- Pandas demand summaries by month, book, category and department.
- Random Forest regression with lagged demand features, saved model artifact, holdout MAE/RMSE, and an explicit insufficient-data state.
- Adjustable lead-time/safety-buffer stock-planning signals; recommendations are not automatic purchase orders.
- Synthetic seed data: 50 books, 100 demo students and more than a year of synthetic borrowing history.

## Requirements

- Python 3.10+ (Python 3.11/3.12 recommended)
- Node.js 20+
- MySQL 8+ for the primary database, or SQLite for a quick local demo

## 1. Database setup (MySQL)

Create a database and user in MySQL, then:

```sql
CREATE DATABASE library_demand CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'library_user'@'localhost' IDENTIFIED BY 'change_this_password';
GRANT ALL PRIVILEGES ON library_demand.* TO 'library_user'@'localhost';
FLUSH PRIVILEGES;
```

Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL`, for example:

```env
DATABASE_URL=mysql+pymysql://library_user:change_this_password@localhost:3306/library_demand
CORS_ORIGINS=http://localhost:5173
MODEL_PATH=./artifacts/demand_model.joblib
```

For a quick demo without installing MySQL, use `DATABASE_URL=sqlite:///./library_demand.db` instead. MySQL remains the intended primary SQL database.

## 2. Start the backend

From the project root:

```bash
cd backend
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
# Optional: copy .env.example to .env and edit it
python scripts/seed_demo.py
uvicorn app.main:app --reload --port 8000
```

If you use a virtual environment, activate it before running the seed script and API. The API creates the tables on startup. The seed script does not overwrite an inventory that already has books.

## 3. Start the frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. If the API runs on another URL, create `frontend/.env` with `VITE_API_URL=http://localhost:8000/api` and restart Vite.

## 4. Suggested demo flow

1. Open Overview and review real database-backed counts.
2. Open Book inventory to add or edit a title.
3. Issue a book to a synthetic student code, then record a return.
4. Open Data analysis to review borrowing patterns.
5. Go to Reports & data import to download the CSV template or import issue records.
6. Open Demand prediction and click **Train model & forecast**. With insufficient history, the API will explicitly say so instead of fabricating predictions.
7. Review Purchase planning and adjust the lead time and safety buffer.

## API highlights

- `GET /api/health`
- `GET /api/dashboard`
- `GET/POST /api/books`, `GET/PUT/DELETE /api/books/{book_id}`
- `GET /api/transactions`, `POST /api/transactions/issue`, `POST /api/transactions/{id}/return`
- `GET /api/analytics`
- `POST /api/ml/train`, `GET /api/ml/forecasts`, `GET /api/ml/training-runs`
- `GET /api/recommendations`
- `POST /api/import/issues`, `GET /api/import/template.csv`
- `GET /api/reports/issues.csv`, `GET /api/reports/recommendations.csv`

## Forecasting notes

Monthly issue-event counts are the demand target; returns are not counted as demand. The model uses previous 1–3 month issue counts, month-of-year and book ID. The training routine creates a chronological holdout based on time-sorted monthly records and reports MAE/RMSE where a holdout is available. A small demo dataset can still produce unstable estimates; use at least 12 months of representative history and review the metrics before using results for real purchase decisions. Forecasts for books with fewer than four monthly observations are labeled **Insufficient Data**.

The stock-planning target is a transparent heuristic based on forecasted issues, lead time and safety buffer. It is not a claim that each issue needs a separate copy. Librarians should factor in borrowing duration, concurrent demand, course schedules, stockouts and budget constraints.

## Tests

```bash
cd backend
pytest -q
```

## Notes / limitations

- Demo data is synthetic; do not use it as actual student or library data.
- The project is designed as an academic demonstrator, not a hardened public production deployment. Before production use, add authentication/role-based authorization, migrations (e.g. Alembic), audit logging, rate limits, backup policies, and database-specific concurrency testing.
- Issue import rejects invalid rows and returns a capped list of row errors. Review errors and correct the source file before retrying.
