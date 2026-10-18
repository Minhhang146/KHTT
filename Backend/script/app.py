from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
from datetime import date, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from db_ops import (
    DB_PATH,  # lấy đường dẫn từ db_ops để cả 2 file dùng chung 1 chỗ
    add_user, get_all_users, update_user, delete_user,
    update_streak, update_user_score, get_ranking, update_mon_chuyen
)

app = Flask(__name__)
CORS(app)  # Cho phép Frontend kết nối tới Backend

# 1. API Đăng ký tài khoản (Create)
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}         # không có dữ liệu thì thành {}, không bị sập
    username = (data.get('username') or '').strip()    # cắt dấu cách thừa hai đầu
    email = (data.get('email') or '').strip().lower()  # đổi hết về chữ thường
    mk = data.get('mk') or ''
    bio = data.get('bio', '')

    # kiểm tra từng thứ một, sai thì báo luôn
    if not username or not email or not mk:
        return jsonify({"success": False, "message": "Vui lòng nhập đầy đủ thông tin!"}), 400
    if len(mk) < 6:
        return jsonify({"success": False, "message": "Mật khẩu cần ít nhất 6 ký tự!"}), 400
    if len(username) > 30:
        return jsonify({"success": False, "message": "Username tối đa 30 ký tự!"}), 400

    try:
        # lưu mật khẩu đã xáo trộn, không lưu chữ thật
        new_id = add_user(username, email, generate_password_hash(mk), bio)
        if new_id:
            return jsonify({
                "success": True,
                "message": "Đăng ký thành công!",
                "user": {"id": new_id, "username": username, "streak": 0, "mon_chuyen": ""}
            }), 201
        return jsonify({"success": False, "message": "Email này đã được đăng ký!"}), 409
    except Exception as e:
        return jsonify({"success": False, "message": f"Lỗi: {str(e)}"}), 500

# 2. API Đăng nhập (Read)
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()  # đổi chữ thường giống lúc đăng ký
    mk = data.get('mk') or ''

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    # tìm theo email thôi, chưa so mật khẩu ở đây
    row = conn.execute(
        "SELECT id, username, email, bio, mon_chuyen, mk, streak, last_active_date "
        "FROM users WHERE email = ?", (email,)
    ).fetchone()
    conn.close()

    # không có email, hoặc mật khẩu không khớp -> báo sai (gộp chung để người lạ không đoán được email nào tồn tại)
    if not row or not check_password_hash(row['mk'], mk):
        return jsonify({"success": False, "message": "Sai email hoặc mật khẩu!"}), 401

    hom_nay = str(date.today())
    hom_qua = str(date.today() - timedelta(days=1))
    # bỏ lỡ từ 2 ngày trở lên thì chuỗi đứt, hiện 0
    streak_hien_thi = row['streak'] if row['last_active_date'] in (hom_nay, hom_qua) else 0

    # chỉ gửi thứ cần thiết, KHÔNG gửi mật khẩu về trình duyệt
    info = {
        "id": row['id'], "username": row['username'], "email": row['email'],
        "bio": row['bio'], "mon_chuyen": row['mon_chuyen'], "streak": streak_hien_thi
    }
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

# 7. API bảng xếp hạng
@app.route('/api/ranking', methods=['GET'])
def ranking():
    return jsonify({"success": True, "data": get_ranking()}), 200

# 8. API lưu môn chuyên
@app.route('/api/users/<int:user_id>/mon-chuyen', methods=['PUT'])
def save_mon_chuyen(user_id):
    data = request.get_json()
    mon = data.get('mon_chuyen', '')

    if mon not in ('', 'toan', 'ly', 'hoa'):
        return jsonify({"success": False, "message": "Môn chuyên không hợp lệ!"}), 400

    update_mon_chuyen(user_id, mon)
    return jsonify({"success": True, "message": "Đã lưu môn chuyên!"}), 200

if __name__ == '__main__':
    app.run(debug=True)