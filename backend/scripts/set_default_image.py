import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "library_demand.db")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
cursor.execute("UPDATE books SET image_url = '/uploads/book_covers/default_cover.png' WHERE image_url IS NULL OR image_url = ''")
conn.commit()
conn.close()
print("Updated missing image URLs to default cover.")
