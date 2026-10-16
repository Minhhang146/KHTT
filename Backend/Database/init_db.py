import sqlite3
import os

def init_db():
    # Đảm bảo thư mục Database tồn tại
    os.makedirs('Backend/Database', exist_ok=True)

    # Kết nối tới file database edumate.db
    conn = sqlite3.connect('Backend/Database/edumate.db')
    cursor = conn.cursor()
    # Tạo bảng users
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        mk TEXT NOT NULL,
        bio TEXT,
        score INTEGER DEFAULT 0,
        streak INTEGER DEFAULT 0,
        last_active_date TEXT
    )
    ''')

    conn.commit()
    conn.close()
    print("Tạo Database và bảng users thành công!")

if __name__ == '__main__':
    init_db()