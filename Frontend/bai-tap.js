document.addEventListener("DOMContentLoaded", async () => {
  // Lấy các tham số từ địa chỉ trang
  const params = new URLSearchParams(window.location.search);
  const subject = (params.get("subject") || "toan").replace("-", "_");
  const chapter = params.get("chapter");
  const article = params.get("article");
  const q = params.get("q"); // bài muốn làm, ví dụ "1.1" (không có thì hiện cả bài học)

  const problemList = document.getElementById("problem-list");
  const chapterSidebar = document.querySelector(".chapter-sidebar");

  // =========================================================================
  // 1. TRANG PROBLEMS.HTML (DANH SÁCH CHƯƠNG VÀ BÀI TẬP) - giữ nguyên
  // =========================================================================
  if (problemList && chapterSidebar) {
    const jsonPath = `./file_de/${subject}/tong-hop.json`;

    try {
      const response = await fetch(jsonPath);
      if (!response.ok) {
        throw new Error(`Không tìm thấy file JSON (HTTP ${response.status})`);
      }
      const data = await response.json();

      chapterSidebar.innerHTML = `<h3>Chương bài học</h3>`;

      data.chuong_list.forEach((chuongItem, index) => {
        const p = document.createElement("p");
        p.textContent = chuongItem.ten_chuong;
        p.style.cursor = "pointer";

        p.addEventListener("click", () => {
          document.querySelectorAll(".chapter-sidebar p").forEach((el) => el.classList.remove("active"));
          p.classList.add("active");
          renderTableProblems(chuongItem, subject);
        });

        chapterSidebar.appendChild(p);

        // Mặc định chọn chương đầu tiên
        if (index === 0) {
          p.classList.add("active");
          renderTableProblems(chuongItem, subject);
        }
      });
    } catch (error) {
      console.error("Lỗi tải danh sách chương:", error);
      problemList.innerHTML = `<tr><td colspan="3">Lỗi: ${error.message}</td></tr>`;
    }
  }

  // Đổ bài tập vào bảng
  function renderTableProblems(chuongObj, subjectCode) {
    problemList.innerHTML = "";

    if (!chuongObj.danh_sach_bai || chuongObj.danh_sach_bai.length === 0) {
      problemList.innerHTML = `<tr><td colspan="3">Chương này chưa có bài tập nào.</td></tr>`;
      return;
    }

    chuongObj.danh_sach_bai.forEach((bai) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${bai.id}</td>
        <td>
          <a href="lesson.html?subject=${subjectCode}&chapter=${chuongObj.id_chuong}&article=bai-${bai.id}">
            ${bai.ten_bai}
          </a>
        </td>
        <td>${bai.diem}</td>
      `;
      problemList.appendChild(tr);
    });
  }

  // =========================================================================
  // 2. TRANG FORM.HTML (HIỆN BÀI TẬP + CÂU HỎI + NÚT NỘP BÀI)
  // =========================================================================
  const quizContainer = document.getElementById("quiz-container");

  // File cũ (vd: Toán) chỉ có "cau_hoi" -> coi mỗi câu là 1 bài có đúng 1 câu
  // File mới có "bai_tap" -> mỗi bài chứa nhiều câu hỏi nhỏ
  function layDanhSachBai(data) {
    if (Array.isArray(data.bai_tap)) return data.bai_tap;
    return (data.cau_hoi || []).map((c) => ({
      id: c.id,
      do_kho: c.do_kho,
      tac_pham: data.tac_pham,
      cau_hoi: [c],
    }));
  }

  if (quizContainer && subject && chapter && article) {
    try {
      const response = await fetch(`./file_de/${subject}/${chapter}/${article}.json`);
      if (!response.ok) throw new Error("Không thể tải file nội dung bài học.");

      const data = await response.json();
      const tatCaBai = layDanhSachBai(data);

      // Địa chỉ có &q=1.1 thì chỉ giữ đúng bài đó, không có thì giữ hết
      const dsBai = q ? tatCaBai.filter((b) => String(b.id) === q) : tatCaBai;

      if (dsBai.length === 0) {
        quizContainer.insertAdjacentHTML("afterbegin", `<p>Không tìm thấy bài này.</p>`);
        return;
      }

      // Điểm mỗi câu: lấy trong JSON, không có thì mặc định 10
      const diemCua = (cau) => cau.diem ?? 10;

      // Thư mục hình của 1 bài: img/<môn>/<chương>/<bài học>/<bài tập>/
      // vd: img/ngu_van/chuong-1/bai-01/1.1/
      const duongDanHinh = (bai, tenFile) =>
        `img/${subject}/${chapter}/${article}/${bai.id}/${tenFile}`;

      // Biến danh sách tên file thành các thẻ <img> (nhận cả 1 tên lẫn 1 mảng tên)
      const veHinh = (ds, bai, lop) => {
        const mang = !ds ? [] : Array.isArray(ds) ? ds : [ds];
        return mang
          .map((ten) => `<img class="${lop}" src="${duongDanHinh(bai, ten)}" alt="Hình minh hoạ" loading="lazy">`)
          .join("");
      };

      // Nơi nhớ từng câu cùng ô hiển thị của nó (để chấm điểm sau)
      const dsCau = [];

      // ----- Vẽ từng bài -----
      dsBai.forEach((bai, baiIdx) => {
        const khungBai = document.createElement("section");
        khungBai.className = "bai-tap-khung";

        // Tiêu đề bài, vd: "Bài 1.1: Đọc hiểu Lão Hạc"
        khungBai.insertAdjacentHTML(
          "beforeend",
          `<h2 class="bai-tap-tieu-de">Bài ${bai.id}${bai.ten ? ": " + bai.ten : ""}</h2>`
        );

        // Tác phẩm + hình của bài (nếu có)
        if (bai.tac_pham) {
          const tp = bai.tac_pham;
          khungBai.insertAdjacentHTML(
            "beforeend",
            `<div class="tac-pham-box">
               <h3>${tp.ten || ""}</h3>
               ${tp.tac_gia ? `<p class="tac-gia">Tác giả: ${tp.tac_gia}</p>` : ""}
               ${veHinh(tp.hinh, bai, "tac-pham-hinh")}
               <div class="tac-pham-noi-dung">${tp.noi_dung || ""}</div>
             </div>`
          );
        }

        // Các câu hỏi nhỏ trong bài
        (bai.cau_hoi || []).forEach((cau, i) => {
          const name = `q-${baiIdx}-${i}`; // tên nhóm ô chọn, mỗi câu một tên riêng

          const cauHtml = document.createElement("div");
          cauHtml.className = "question-card";
          cauHtml.style.marginBottom = "16px";

          // Dòng tiêu đề có hiện điểm của câu + hình riêng của câu (nếu có)
          const tieuDe = `<p><b>Câu ${cau.id ?? i + 1}</b>
            <span style="color:#2457d6; font-weight:600;">(${diemCua(cau)} điểm)</span>:
            ${cau.de_bai}</p>
            ${veHinh(cau.hinh, bai, "tac-pham-hinh")}`;

          if (cau.type === "trac-nghiem") {
            cauHtml.innerHTML = `
              ${tieuDe}
              ${cau.dap_an.map((item, k) => `
                <label style="display:block; margin-top:4px;">
                  <input type="radio" name="${name}" value="${k}"> ${item}
                </label>`).join("")}
            `;
          } else if (cau.type === "dung-sai") {
            cauHtml.innerHTML = `
              ${tieuDe}
              <label style="margin-right:15px;">
                <input type="radio" name="${name}" value="true"> Đúng
              </label>
              <label>
                <input type="radio" name="${name}" value="false"> Sai
              </label>
            `;
          } else if (cau.type === "tra-loi-ngan") {
            cauHtml.innerHTML = `
              ${tieuDe}
              <input type="text" name="${name}" placeholder="Nhập câu trả lời..."
                     style="padding:6px; width:100%; max-width:300px;">
            `;
          } else {
            return; // loại câu lạ thì bỏ qua
          }

          // Chỗ hiện kết quả sau khi nộp (đúng/sai + gợi ý + lời giải)
          cauHtml.insertAdjacentHTML("beforeend", `<div class="ket-qua-cau" style="margin-top:8px;"></div>`);
          khungBai.appendChild(cauHtml);
          dsCau.push({ cau, card: cauHtml, baiId: bai.id }); // nhớ câu này thuộc bài nào
        });

        quizContainer.appendChild(khungBai);
      });

      // ----- Tạo nút Nộp bài và khung hiện tổng điểm -----
      const btnNop = document.createElement("button");
      btnNop.type = "button";
      btnNop.id = "btn-nop-bai";
      btnNop.textContent = "Nộp bài";
      btnNop.className = "btn"; // dùng lại kiểu nút có sẵn trong style.css

      const tongKet = document.createElement("p");
      tongKet.id = "tong-ket";
      tongKet.style.cssText = "margin-top:12px; font-weight:600;";

      quizContainer.appendChild(btnNop);
      quizContainer.appendChild(tongKet);

      // ----- Bấm Nộp bài -----
      btnNop.addEventListener("click", async () => {
        let diemDat = 0;
        let diemToiDa = 0;

        dsCau.forEach(({ cau, card }) => {
          const o = card.querySelector(".ket-qua-cau");
          diemToiDa += diemCua(cau);

          // Lấy câu trả lời người dùng đã chọn / nhập
          let traLoi = null;
          if (cau.type === "tra-loi-ngan") {
            traLoi = card.querySelector("input[type=text]").value.trim();
          } else {
            const chon = card.querySelector("input[type=radio]:checked");
            traLoi = chon ? chon.value : null;
          }

          // Chưa trả lời thì báo luôn, không tính điểm
          if (traLoi === null || traLoi === "") {
            o.innerHTML = `<span style="color:#d97706;">Bạn chưa trả lời câu này.</span>`;
            return;
          }

          // So với đáp án đúng (cách đổi kiểu dữ liệu để so cho khớp)
          let dung = false;
          if (cau.type === "trac-nghiem") dung = Number(traLoi) === cau.dap_an_dung;
          if (cau.type === "dung-sai") dung = (traLoi === "true") === cau.dap_an_dung;
          if (cau.type === "tra-loi-ngan") {
            dung = traLoi.toLowerCase() === String(cau.dap_an_dung).toLowerCase();
          }

          if (dung) diemDat += diemCua(cau);

          // Hiện đúng/sai, sai thì hiện gợi ý, luôn hiện lời giải
          o.innerHTML = dung
            ? `<span style="color:#16a34a;">✔ Đúng! +${diemCua(cau)} điểm</span>`
            : `<span style="color:#dc2626;">✘ Chưa đúng. ${cau.goi_y ? "Gợi ý: " + cau.goi_y : ""}</span>`;
          if (cau.loi_giai) o.innerHTML += `<p style="color:#5b6b82;">Lời giải: ${cau.loi_giai}</p>`;
        });

        tongKet.textContent = `Điểm của bạn: ${diemDat} / ${diemToiDa}`;
        btnNop.disabled = true; // nộp rồi thì khoá nút, tránh bấm nhiều lần để cộng điểm

        // Gửi điểm lên server (chỉ khi đã đăng nhập và có điểm)
        const userId = localStorage.getItem("userId");
        if (userId && diemDat > 0) {
          try {
            const res = await fetch("http://127.0.0.1:5000/api/score", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ user_id: Number(userId), points: diemDat }),
            });
            const kq = await res.json();
            if (kq.success) {
              // Cập nhật streak (chuỗi ngày) trên thanh trên cùng
              localStorage.setItem("streak", kq.streak);
              const streakEl = document.querySelector(".streak-box span");
              if (streakEl) streakEl.textContent = kq.streak;
            }
          } catch (err) {
            console.error("Không gửi được điểm:", err);
          }
        } else if (!userId) {
          tongKet.textContent += " (Đăng nhập để điểm được lưu nhé!)";
        }
      });
    } catch (error) {
      console.error("Lỗi tải chi tiết bài tập:", error);
    }
  }
});