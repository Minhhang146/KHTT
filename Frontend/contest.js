document.addEventListener("DOMContentLoaded", async () => {
  const tbody = document.getElementById("contest-list");
  if (!tbody) return; // không phải trang cuộc thi thì thôi

  // Chữ hiện ra cho từng trạng thái (khớp với server trả về)
  const NHAN = {
    "sap-dien-ra": "Sắp diễn ra",
    "dang-dien-ra": "Đang diễn ra",
    "da-ket-thuc": "Đã kết thúc",
  };

  // Hiện 1 dòng thông báo chiếm hết 3 cột (dùng khi chưa có gì hoặc bị lỗi)
  function baoDong(chu) {
    tbody.innerHTML = `<tr><td colspan="3" class="contest-empty"></td></tr>`;
    tbody.querySelector("td").textContent = chu;
  }

  // Đổi "2026-11-01 19:00" thành "19:00 - 01/11/2026"
  function dinhDangGio(chuoi) {
    const [ngay, gio] = chuoi.split(" ");
    const [nam, thang, ngayThang] = ngay.split("-");
    return `${gio} - ${ngayThang}/${thang}/${nam}`;
  }

  // Tính số phút làm bài = giờ kết thúc trừ giờ bắt đầu
  function tinhSoPhut(batDau, ketThuc) {
    // đổi "2026-11-01 19:00" thành "2026-11-01T19:00" để JS hiểu
    const a = new Date(batDau.replace(" ", "T"));
    const b = new Date(ketThuc.replace(" ", "T"));
    return Math.round((b - a) / 60000);
  }

  try {
    // Gọi server lấy danh sách cuộc thi
    const res = await fetch("http://127.0.0.1:5000/api/contests");
    const kq = await res.json();

    // Chưa có cuộc thi nào thì báo cho người dùng biết
    if (!kq.data || kq.data.length === 0) {
      baoDong("Chưa có cuộc thi nào, bạn quay lại sau nhé!");
      return;
    }

    tbody.innerHTML = ""; // xóa dữ liệu cũ trước khi đổ mới

    kq.data.forEach((c) => {
      const tr = document.createElement("tr");

      // Cột 1: ID
      const tdId = document.createElement("td");
      tdId.textContent = c.id;

      // Cột 2: tên cuộc thi + nhãn trạng thái
      const tdTen = document.createElement("td");
      let ten;
      if (c.trang_thai === "dang-dien-ra") {
        // Đang diễn ra: tên là link bấm vào để thi
        ten = document.createElement("a");
        ten.href = `form.html?subject=contest&chapter=${c.id}&article=${c.id}`;
      } else {
        // Chưa tới giờ hoặc đã hết: chỉ là chữ thường
        ten = document.createElement("span");
      }
      ten.textContent = c.ten; // dùng textContent để tên không chạy được code lạ

      const nhan = document.createElement("span");
      nhan.className = `contest-badge ${c.trang_thai}`;
      nhan.textContent = NHAN[c.trang_thai] || "";

      tdTen.append(ten, nhan);

      // Cột 3: thời gian làm bài
      const tdGio = document.createElement("td");
      tdGio.className = "contest-time";
      tdGio.innerHTML = `
        <span></span>
        <small></small>`;
      tdGio.querySelector("span").textContent =
        `${dinhDangGio(c.bat_dau)} → ${dinhDangGio(c.ket_thuc)}`;
      tdGio.querySelector("small").textContent =
        `Thời lượng ${tinhSoPhut(c.bat_dau, c.ket_thuc)} phút`;

      tr.append(tdId, tdTen, tdGio);
      tbody.appendChild(tr);
    });
  } catch (err) {
    // Server chưa bật hoặc bị lỗi mạng
    baoDong("Không kết nối được server. Dm m bật app.py !!!");
  }
});