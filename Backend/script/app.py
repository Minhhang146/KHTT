from flask import Flask, request, jsonify
from flask_cors import CORS
from db_ops import add_user, get_all_users, update_user, delete_user
import sqlite3
from db_ops import add_user, get_all_users, update_user, delete_user, update_streak
from datetime import date, timedelta
from db_ops import add_user, get_all_users, update_user, delete_user, update_streak, update_user_score



app = Flask(__name__)
CORS(app)  # Cho phép Frontend kết nối tới Backend

DB_PATH = 'Backend/Database/edumate.db'

# 1. API Đăng ký tài khoản (Create)
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    
    username = data.get('username')
    email = data.get('email')
    mk = data.get('mk')
    bio = data.get('bio', '')

    if not username or not email or not mk:
        return jsonify({"success": False, "message": "Vui lòng nhập đầy đủ thông tin!"}), 400
    
    try:
        # add_user trả về True hoặc False, ta dựa vào đó để trả lời
        if add_user(username, email, mk, bio):
            return jsonify({"success": True, "message": "Đăng ký thành công!"}), 201
        return jsonify({"success": False, "message": "Email này đã được đăng ký!"}), 409
    except Exception as e:
        return jsonify({"success": False, "message": f"Lỗi: {str(e)}"}), 500

# 2. API Đăng nhập (Read)
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    mk = data.get('mk')

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # tìm user theo email và mật khẩu
    cursor.execute("SELECT id, username, email, bio FROM users WHERE email = ? AND mk = ?", (email, mk))
    user = cursor.fetchone()
    conn.close()

    # trường hợp 1: sai email hoặc mật khẩu -> báo lỗi rồi dừng luôn
    if not user:
        return jsonify({"success": False, "message": "Sai email hoặc mật khẩu!"}), 401

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT streak, last_active_date FROM users WHERE id = ?", (user['id'],)
    ).fetchone()
    conn.close()

    hom_nay = str(date.today())
    hom_qua = str(date.today() - timedelta(days=1))

    # chỉ giữ streak nếu lần làm bài gần nhất là hôm nay hoặc hôm qua
    # nếu bỏ lỡ từ 2 ngày trở lên thì hiện 0 (chuỗi đã đứt)
    streak_hien_thi = row['streak'] if row['last_active_date'] in (hom_nay, hom_qua) else 0

    info = dict(user)
    info['streak'] = streak_hien_thi

    # hàm nào cũng phải có return ở cuối, không thì sẽ bị lỗi như vừa rồi
    return jsonify({"success": True, "message": "Đăng nhập thành công!", "user": info}), 200

# 3. API Lấy danh sách tất cả user (Read)
@app.route('/api/users', methods=['GET'])
def list_users():
    users = get_all_users()
    return jsonify({"success": True, "data": users}), 200

# 4. API Cập nhật thông tin user (Update)
@app.route('/api/users/<int:user_id>', methods=['PUT'])
def update_profile(user_id):
    data = request.get_json()
    new_username = data.get('username')
    new_bio = data.get('bio', '')

    update_user(user_id, new_username, new_bio)
    return jsonify({"success": True, "message": "Cập nhật thành công!"}), 200

# 5. API Xóa user (Delete)
@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def remove_user(user_id):
    delete_user(user_id)
    return jsonify({"success": True, "message": "Đã xóa tài khoản!"}), 200

# 6. API cộng điểm sau khi nộp bài
@app.route('/api/score', methods=['POST'])
def add_score():
    data = request.get_json()
    user_id = data.get('user_id')
    points = data.get('points', 0)

    # thiếu thông tin hoặc điểm không hợp lệ thì báo lỗi
    if not user_id or points <= 0:
        return jsonify({"success": False, "message": "Dữ liệu không hợp lệ!"}), 400

    update_user_score(user_id, points)  # cộng điểm vào tài khoản
    update_streak(user_id)              # tính lại chuỗi ngày học

    # lấy streak mới để trả về cho trình duyệt hiện 🔥
    conn = sqlite3.connect(DB_PATH)
    row = conn.execute("SELECT streak FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return jsonify({"success": True, "streak": row[0]}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)