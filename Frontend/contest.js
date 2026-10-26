document.addEventListener("DOMContentLoaded", async () => {
  const khung = document.getElementById("ds-contest");
  if (!khung) return;

  // Gọi server lấy danh sách cuộc thi
  const res = await fetch("http://127.0.0.1:5000/api/contests");
  const kq = await res.json();

  // Chữ hiện ra cho từng trạng thái
  const NHAN = {
    "sap-dien-ra": "Sắp diễn ra",
    "dang-dien-ra": "Đang diễn ra",
    "da-ket-thuc": "Đã kết thúc",
  };

  kq.data.forEach((c) => {
    const the = document.createElement("div");
    the.className = "feature-card"; // dùng lại kiểu thẻ có sẵn
    the.innerHTML = `
      <h2>${c.ten}</h2>
      <p>${c.bat_dau} → ${c.ket_thuc} · <b>${NHAN[c.trang_thai]}</b></p>`;

    // Chỉ cuộc thi đang diễn ra mới có nút "Vào thi"
    if (c.trang_thai === "dang-dien-ra") {
      the.innerHTML += `<a class="btn" href="form.html?subject=contest&chapter=${c.id}&article=${c.id}">Vào thi</a>`;
    }
    khung.appendChild(the);
  });
});