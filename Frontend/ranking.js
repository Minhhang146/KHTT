document.addEventListener("DOMContentLoaded", async () => {
  const tbody = document.getElementById("ranking-list");
  if (!tbody) return; // không phải trang xếp hạng thì thôi

  // Hàm tạo 1 dòng trong bảng
  function themDong(cells) {
    const tr = document.createElement("tr");
    cells.forEach((text) => {
      const td = document.createElement("td");
      td.textContent = text; // dùng textContent để tên người dùng không chạy được code lạ
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }

  try {
    // Gọi server lấy danh sách
    const res = await fetch("http://127.0.0.1:5000/api/ranking");
    const kq = await res.json();

    tbody.innerHTML = ""; // xóa dữ liệu cũ trước khi đổ mới

    // Chưa có ai thì báo cho người dùng biết
    if (!kq.data || kq.data.length === 0) {
      themDong(["", "Chưa có ai trên bảng xếp hạng", "", ""]);
      return;
    }

    // Điền 3 người đầu vào bục (người nào chưa có thì để trống)
    [1, 2, 3].forEach((hang) => {
      const u = kq.data[hang - 1]; // hạng 1 là phần tử số 0  cout << "hello world";
      const the = document.getElementById(`podium-${hang}`);
      if (!the) return;
      // textContent để tên người dùng không chạy được code lạ
      the.querySelector(".podium-name").textContent = u? `${u.username} - ${u.score}`: "";
    });

    //?? hello world 
    

    // Mỗi người dùng = 1 dòng: ID, Bio, Username, Điểm
    kq.data.forEach((u) => {
      themDong([u.id, u.bio || "", u.username, u.score]);
    });
  } catch (err) {
    // Server chưa bật hoặc bị lỗi mạng
    tbody.innerHTML = "";
    themDong(["", "Không kết nối được server. Bạn đã chạy app.py chưa?", "", ""]);
  }
});