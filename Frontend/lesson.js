document.addEventListener("DOMContentLoaded", async () => {
  // Lấy thông tin bài từ địa chỉ trang
  const params = new URLSearchParams(location.search);
  const subject = params.get("subject");
  const chapter = params.get("chapter");
  const article = params.get("article");

  // Tên thư mục dùng gạch dưới (ngu-van -> ngu_van), giống bai-tap.js
  const folder = (subject || "").replace("-", "_");

  // Các phần tử trên trang
  const nutMo = document.getElementById("btn-ly-thuyet");        // nút "Xem lý thuyết"
  const nen = document.getElementById("ly-thuyet-nen");          // lớp nền đen
  const nutDong = document.getElementById("btn-dong-ly-thuyet"); // nút ✕
  const noiDung = document.getElementById("ly-thuyet-noi-dung"); // chỗ đổ lý thuyết

  // ----- Mở / đóng ô lý thuyết -----
  function moLyThuyet() {
    nen.classList.remove("hidden");              // hiện nền đen + ô chữ nhật
    document.body.style.overflow = "hidden";     // khoá cuộn trang phía sau
  }

  function dongLyThuyet() {
    nen.classList.add("hidden");                 // ẩn đi
    document.body.style.overflow = "";           // cho cuộn trang lại
  }

  nutMo.addEventListener("click", moLyThuyet);
  nutDong.addEventListener("click", dongLyThuyet);

  // Bấm vào vùng đen bên ngoài ô thì đóng (bấm trong ô thì không đóng)
  nen.addEventListener("click", (e) => {
    if (e.target === nen) dongLyThuyet();
  });

  // Bấm phím Esc cũng đóng được
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") dongLyThuyet();
  });

  // ----- Đọc file JSON của bài -----
  try {
    const res = await fetch(`./file_de/${folder}/${chapter}/${article}.json`);
    if (!res.ok) throw new Error("Không tìm thấy bài này.");
    const data = await res.json();

    // Phần 1: đổ lý thuyết từ JSON vào ô (không có thì báo chưa có)
    noiDung.innerHTML = data.ly_thuyet || "<p>Bài này chưa có lý thuyết.</p>";
    nutMo.disabled = false; // tải xong rồi mới cho bấm nút

    // Phần 2: danh sách bài tập, xếp từ dễ đến khó
    // File mới có "bai_tap"; file cũ chỉ có "cau_hoi" (mỗi câu coi như 1 bài)
    const dsBai = Array.isArray(data.bai_tap)
      ? data.bai_tap
      : (data.cau_hoi || []).map((c) => ({ id: c.id, do_kho: c.do_kho, cau_hoi: [c] }));

    const ds = document.getElementById("ds-cau");
    const baiSapXep = [...dsBai].sort((a, b) => a.do_kho - b.do_kho);

    baiSapXep.forEach((bai) => {
      const a = document.createElement("a");
      a.className = "btn";
      // Hiện "Bài 1.1" kèm số câu bên trong, vd: "Bài 1.1 (12 câu)"
      const soCau = (bai.cau_hoi || []).length;
      a.textContent = `Bài ${bai.id} (${soCau} câu)`;
      // Bấm vào thì sang form.html, kèm số bài (q) để form biết hiện bài nào
      a.href = `form.html?subject=${subject}&chapter=${chapter}&article=${article}&q=${bai.id}`;
      ds.appendChild(a);
    });
  } catch (err) {
    // Lỗi thì vẫn cho bấm nút, trong ô sẽ hiện thông báo lỗi
    noiDung.textContent = "Lỗi: " + err.message;
    nutMo.disabled = false;
  }
});