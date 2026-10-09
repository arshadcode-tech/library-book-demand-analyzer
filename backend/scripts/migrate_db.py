import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "library_demand.db")

if os.path.exists(DB_PATH):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(books)")
        columns = [info[1] for info in cursor.fetchall()]
        if 'image_url' not in columns:
            cursor.execute("ALTER TABLE books ADD COLUMN image_url VARCHAR(255)")
            print("Successfully added image_url column to books table.")
        else:
            print("Column image_url already exists.")
        conn.commit()
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        conn.close()
else:
    print(f"Database not found at {DB_PATH}. It will be created with the new schema by FastAPI.")
