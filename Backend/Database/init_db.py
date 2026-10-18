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
        last_active_date TEXT,
        mon_chuyen TEXT DEFAULT ''
    )
    ''')

    # DB cũ chưa có cột mon_chuyen thì thêm vào (không mất dữ liệu)
    cursor.execute("PRAGMA table_info(users)")
    cac_cot = [c[1] for c in cursor.fetchall()]
    if 'mon_chuyen' not in cac_cot:
        cursor.execute("ALTER TABLE users ADD COLUMN mon_chuyen TEXT DEFAULT ''")

    conn.commit()
    conn.close()
    print("Tạo Database và bảng users thành công!")

if __name__ == '__main__':
    init_db()