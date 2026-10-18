(function () {
  const $ = (id) => document.getElementById(id);
  let viTri = { lat: null, lng: null };
  let truong = [];
  let truongChuyenData = {};
  let monChuyenHienTai = ""; // "", "toan", "ly" hoặc "hoa"

  // value của <select> -> key trong JSON
  const KEY_MON = { toan: "Toan", ly: "Ly", hoa: "Hoa" };
  const TEN_MON = { toan: "Toán", ly: "Vật Lý", hoa: "Hóa Học" };

  // Ảnh: trường thường = <id>.webp, trường chuyên = chuyen_<id>.webp
  // Đường dẫn tính từ file HTML (HTML nằm trong Frontend/, ảnh ở Frontend/img/school/)
  const ANH = {
    thuong: { thuMuc: "img/school/", tienTo: "" },
    chuyen: { thuMuc: "img/school/", tienTo: "chuyen_" },
  };
  // Chỉ dùng .webp; không có file thì hiện "null"
  const DUOI_ANH = ["webp"];

  // ---------- Công thức tính khoảng cách (km, đường chim bay) ----------
  function tinhKhoangCach(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const rad = (d) => (d * Math.PI) / 180;
    const dlat = rad(lat2 - lat1);
    const dlon = rad(lon2 - lon1);
    const a =
      Math.sin(dlat / 2) ** 2 +
      Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dlon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s ?? "";
    return d.innerHTML;
  }

  const coToaDo = (t) => t.vi_do !== null && t.kinh_do !== null;

  // ---------- Logic chọn trường ----------
  // Ngưỡng chênh lệch giữa điểm học sinh và điểm chuẩn (chỉnh ở đây)
  const NGUONG_AN_TOAN = 1.5; // điểm HS >= chuẩn + 1.5  -> An toàn
  const NGUONG_THU_SUC = 1.5; // điểm HS >= chuẩn - 1.5  -> Thử sức (thấp hơn là loại)

  // Lấy điểm chuẩn tham khảo: lấy năm CAO hơn trong 2 năm (thận trọng)
  function diemChuan(t) {
    const v = [t.diem_2026, t.diem_2025].filter((x) => Number.isFinite(x));
    return v.length ? Math.max(...v) : null;
  }

  function phanLoai(diem, t) {
    const c = diemChuan(t);
    if (c === null) return "chuaco";
    const d = diem - c;
    if (d >= NGUONG_AN_TOAN) return "antoan";
    if (d >= 0) return "vuasuc";
    if (d >= -NGUONG_THU_SUC) return "thusuc";
    return "xa";
  }

  const NHAN = {
    vuasuc: "Vừa sức",
    antoan: "An toàn",
    thusuc: "Thử sức",
    chuaco: "Chưa có điểm chuẩn",
    xa: "Điểm chuẩn cao hơn nhiều so với điểm của bạn",
  };
  const THU_TU = { vuasuc: 0, antoan: 1, thusuc: 2, chuaco: 3, xa: 4 };

  function lyDoTruong(loai, diem, t) {
    const c = diemChuan(t);
    const km = t.km.toFixed(1);
    if (loai === "chuaco")
      return `Gần nhà bạn (${km} km) nhưng chưa có dữ liệu điểm chuẩn để so sánh.`;
    const so = `điểm ước tính của bạn ${diem}, điểm chuẩn tham khảo ${c}`;
    if (loai === "antoan") return `An toàn: ${so}. Cách nhà ${km} km.`;
    if (loai === "vuasuc") return `Vừa sức: ${so}. Cách nhà ${km} km.`;
    if (loai === "thusuc")
      return `Thử sức: ${so}, thấp hơn một chút nên cần cố gắng thêm. Cách nhà ${km} km.`;
    return `Cách nhà ${km} km nhưng ${so}, chênh lệch khá lớn.`;
  }

  // ungVien phải đã được sắp xếp theo km tăng dần
  function chonTruong(ungVien, diem, n) {
    const ds = ungVien.map((t) => ({ t, loai: phanLoai(diem, t) }));
    const chon = [];
    const them = (x) => {
      if (x && !chon.includes(x) && chon.length < n) chon.push(x);
    };
    const hopLe = ["vuasuc", "antoan", "thusuc"];

    // 1) mỗi nhóm lấy 1 trường gần nhất để có lựa chọn đa dạng
    hopLe.forEach((l) => them(ds.find((x) => x.loai === l)));
    // 2) chưa đủ thì bù bằng các trường hợp lệ gần nhất còn lại
    ds.filter((x) => hopLe.includes(x.loai)).forEach(them);
    // 3) vẫn thiếu thì bù trường chưa có điểm chuẩn
    ds.filter((x) => x.loai === "chuaco").forEach(them);
    // 4) không có trường nào phù hợp: hiện các trường gần nhất kèm cảnh báo
    if (chon.length === 0) ds.forEach(them);

    chon.sort((a, b) => THU_TU[a.loai] - THU_TU[b.loai] || a.t.km - b.t.km);
    return chon.map((x) => ({
      t: x.t,
      loai: x.loai,
      nhan: NHAN[x.loai],
      lyDo: lyDoTruong(x.loai, diem, x.t),
    }));
  }

  function danhGiaChuyen(t, diemChuyen) {
    if (diemChuyen === null) return "";
    const c = diemChuan(t);
    if (c === null)
      return ` Điểm xét chuyên ước tính của bạn: ${diemChuyen} (trường chưa có điểm chuẩn để so sánh).`;
    const d = diemChuyen - c;
    const so = `Điểm xét chuyên ước tính của bạn ${diemChuyen}, điểm chuẩn tham khảo ${c}.`;
    if (d >= NGUONG_AN_TOAN) return ` ${so} Khả năng đỗ tốt.`;
    if (d >= 0) return ` ${so} Sát điểm chuẩn, cạnh tranh cao.`;
    if (d >= -NGUONG_THU_SUC)
      return ` ${so} Thấp hơn một chút, cần cố gắng thêm.`;
    return ` ${so} Thấp hơn khá nhiều, rất khó.`;
  }

  // ---------- Lưu môn chuyên ----------
  // Luôn lưu trên trình duyệt; có đăng nhập thì lưu cả lên server
  async function luuMonChuyen(mon) {
    localStorage.setItem("monChuyen", mon);
    const userId = localStorage.getItem("userId");
    if (!userId) return "local";
    try {
      const res = await fetch(
        `http://127.0.0.1:5000/api/users/${userId}/mon-chuyen`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mon_chuyen: mon }),
        },
      );
      const kq = await res.json();
      return kq.success ? "server" : "loi";
    } catch (err) {
      return "loi";
    }
  }

  // Bấm vào 1 thẻ trường = chọn trường đó, lưu xong thì về trang chủ
  async function chonMotTruong(card, out) {
    // tránh bấm nhiều lần khi đang lưu / đang chuyển trang
    if (out.dataset.dangLuu === "1") return;
    out.dataset.dangLuu = "1";

    out
      .querySelectorAll(".truong-card")
      .forEach((c) => c.classList.toggle("da-chon", c === card));

    const tb = $("chon-thong-bao");
    const ten = card.querySelector("h3").textContent;
    const mon = monChuyenHienTai
      ? ` Môn chuyên: ${TEN_MON[monChuyenHienTai]}.`
      : "";

    tb.hidden = false;
    tb.textContent = "Đang lưu lựa chọn...";
    tb.scrollIntoView({ behavior: "smooth", block: "center" });

    const kq = await luuMonChuyen(monChuyenHienTai);
    if (kq === "server")
      tb.textContent = `Đã chọn ${ten}.${mon} Đã lưu vào tài khoản. Đang về trang chủ...`;
    else if (kq === "local")
      tb.textContent = `Đã chọn ${ten}.${mon} Hãy đăng nhập để lưu vào tài khoản. Đang về trang chủ...`;
    else
      tb.textContent = `Đã chọn ${ten}.${mon} Nhưng chưa lưu được lên server. Đang về trang chủ...`;

    // chờ 1,5 giây cho người dùng đọc thông báo rồi chuyển trang
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1500);
  }

  function ganChonTruong(out) {
    out.querySelectorAll(".truong-card").forEach((card) => {
      card.addEventListener("click", () => chonMotTruong(card, out));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          chonMotTruong(card, out);
        }
      });
    });
  }

  // ---------- Chuẩn bị giao diện bằng JS ----------
  function chuanBiGiaoDien() {
    const form = $("input-survey");

    document.querySelector('button[onclick="layViTri()"]')?.remove();
    $("btn-vitri")?.remove();

    form
      .querySelectorAll('input[type="checkbox"], select')
      .forEach((el) => (el.required = false));

    // cho phép nhập điểm lẻ (vd 8.5), nếu không trình duyệt chỉ nhận số nguyên
    ["survey-1-math", "survey-2-literature", "diem-chuyen"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.step = "any";
      el.min = "0";
      el.max = "10";
    });

    // nút quay lại + lưu ý nằm trên cùng trang
    if (!document.querySelector(".survey-dau")) {
      const dau = document.createElement("div");
      dau.className = "survey-dau";
      dau.innerHTML = `
        <a class="nut-quay-lai" href="index.html">
          <i class="fa-solid fa-arrow-left"></i><span>Quay lại</span>
        </a>
        <p class="luu-y" role="note">
          <i class="fa-solid fa-circle-info"></i>
          <span><b>Lưu ý:</b> Kết quả chỉ mang tính tham khảo. Khoảng cách tính theo đường chim bay,
          điểm ước tính từ điểm lớp 8 và điểm chuẩn lấy theo năm cao hơn trong hai năm gần nhất.</span>
        </p>`;
      form.parentElement.insertBefore(dau, form);
    }

    let kq = $("kq");
    if (!kq) {
      kq = document.createElement("p");
      kq.id = "kq";
      form.insertBefore(kq, form.querySelector('button[type="submit"]'));
    }

    let ketqua = $("ketqua");
    if (!ketqua) {
      ketqua = document.createElement("div");
      ketqua.id = "ketqua";
      ketqua.setAttribute("aria-live", "polite");
      form.insertAdjacentElement("afterend", ketqua);
    }
  }

  // ---------- Đọc dữ liệu ----------
  async function taiDuLieu() {
    const res = await fetch("diem_chuan_2026.json");
    const data = await res.json();
    truong = data["Dong Thap"].filter(coToaDo);
    truongChuyenData = data["Dong Thap Chuyen"] || {};
  }

  // ---------- Xin vị trí ----------
  function layViTri() {
    const kq = $("kq");
    if (!navigator.geolocation) {
      kq.textContent = "Trình duyệt không hỗ trợ định vị.";
      return;
    }
    kq.textContent = "Đang lấy vị trí...";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        viTri.lat = pos.coords.latitude;
        viTri.lng = pos.coords.longitude;
        kq.textContent = "Đã lấy được vị trí của bạn.";
      },
      (err) => {
        kq.textContent =
          "Chưa lấy được vị trí (" +
          err.message +
          "). Hãy cho phép định vị rồi tải lại trang.";
      },
    );
  }

  // ---------- Nộp form ----------
  function xuLyNop(e) {
    e.preventDefault();
    const out = $("ketqua");

    if (viTri.lat === null) {
      baoLoi(out, "Cần cho phép lấy vị trí trước khi nộp.");
      return;
    }
    if (truong.length === 0) {
      baoLoi(out, "Chưa tải được dữ liệu trường.");
      return;
    }

    const hs = {
      toan: Number($("survey-1-math").value),
      van: Number($("survey-2-literature").value),
      thiChuyen: $("survey-3-specialized_high_school").checked,
      tuDi: $("survey-4-live-independently")?.checked ?? false,
      monChuyen: $("mon-chuyen").value,
      diemChuyen: Number($("diem-chuyen").value),
    };

    // nhớ môn chuyên để lát bấm chọn trường thì lưu
    monChuyenHienTai = hs.thiChuyen ? hs.monChuyen : "";

    const hopLeDiem = (x) => Number.isFinite(x) && x >= 0 && x <= 10;
    if (!hopLeDiem(hs.toan) || !hopLeDiem(hs.van)) {
      baoLoi(out, "Điểm Toán và Văn phải nằm trong khoảng 0 đến 10.");
      return;
    }

    // điểm thường = toán + văn + (toán + văn)/2
    const diemUocTinh = +(hs.toan + hs.van + (hs.toan + hs.van) / 2).toFixed(1);

    // điểm chuyên = (toán-1) + (văn-1) + (toán+văn)/2 + chuyên*2 - 3
    const coDiemChuyen =
      hs.thiChuyen &&
      hs.monChuyen &&
      $("diem-chuyen").value !== "" &&
      hopLeDiem(hs.diemChuyen);
    const diemThiChuyen = coDiemChuyen
      ? +(
          hs.toan -
          1 +
          (hs.van - 1) +
          (hs.toan + hs.van) / 2 +
          hs.diemChuyen * 2 -
          3
        ).toFixed(1)
      : null;

    // ----- trường thường: tính km, sắp xếp từ gần đến xa -----
    const tatCa = truong
      .map((t) => ({
        ...t,
        km: tinhKhoangCach(viTri.lat, viTri.lng, t.vi_do, t.kinh_do),
      }))
      .sort((a, b) => a.km - b.km);

    // ----- trường chuyên gần nhất của môn đã chọn -----
    const dsChuyen = hs.thiChuyen
      ? truongChuyenData[KEY_MON[hs.monChuyen]] || []
      : [];
    const truongChuyen =
      dsChuyen
        .filter(coToaDo)
        .map((t) => ({
          ...t,
          km: tinhKhoangCach(viTri.lat, viTri.lng, t.vi_do, t.kinh_do),
        }))
        .sort((a, b) => a.km - b.km)[0] || null;

    const soTruong = truongChuyen ? 2 : 3;
    // tự đi được thì xét rộng hơn (30 trường gần nhất), không thì 12
    const ungVien = tatCa.slice(0, hs.tuDi ? 30 : 12);

    const goiY = chonTruong(ungVien, diemUocTinh, soTruong);

    hienKetQua(out, goiY, truongChuyen, hs.thiChuyen, diemThiChuyen);
  }

  // ---------- Hiển thị ----------
  function baoLoi(out, msg) {
    out.innerHTML = `<p class="thong-bao">${escapeHtml(msg)}</p>`;
  }

  // Ảnh: thử từng đuôi file, hết đuôi mà vẫn lỗi thì hiện chữ "null"
  function ganXuLyAnh(out) {
    out.querySelectorAll("img.truong-img").forEach((img) => {
      img.addEventListener("error", () => {
        const i = Number(img.dataset.i) + 1;
        if (i < DUOI_ANH.length) {
          img.dataset.i = i;
          img.src = `${img.dataset.base}.${DUOI_ANH[i]}`;
        } else {
          img.replaceWith(
            Object.assign(document.createElement("div"), {
              className: "truong-null",
              textContent: "null",
            }),
          );
        }
      });
    });
  }

  function hienKetQua(out, goiY, truongChuyen, thiChuyen, diemThiChuyen) {
    const theTruong = (t, nhan, lyDo, loai, cfg, i) => {
      const ten = escapeHtml(t.ten_truong);
      // vd: img/school/48  hoặc  img/school/chuyen_1
      const base = `${cfg.thuMuc}${cfg.tienTo}${t.id}`;
      return `
        <article class="truong-card truong-card--${loai}" style="--i:${i}" tabindex="0">
          <div class="truong-anh">
            <img class="truong-img" src="${base}.${DUOI_ANH[0]}"
                 data-base="${base}" data-i="0" alt="Ảnh ${ten}" loading="lazy">
            <span class="truong-nhan">${escapeHtml(nhan)}</span>
          </div>
          <div class="truong-noidung">
            <h3>${ten}</h3>
            <p class="truong-km"><i class="fa-solid fa-location-dot"></i>
              Cách nhà bạn khoảng <b>${t.km.toFixed(1)} km</b></p>
            <p class="truong-diem">
              <span>Điểm chuẩn 2026 <b>${t.diem_2026 ?? "chưa có"}</b></span>
              <span>2025 <b>${t.diem_2025 ?? "chưa có"}</b></span>
            </p>
            <p class="truong-lydo">${escapeHtml(lyDo)}</p>
          </div>
        </article>`;
    };

    const the = [];
    if (truongChuyen) {
      const lyDo =
        "Trường chuyên gần nhà bạn nhất." +
        danhGiaChuyen(truongChuyen, diemThiChuyen);
      the.push(
        theTruong(
          truongChuyen,
          "Trường chuyên",
          lyDo,
          "chuyen",
          ANH.chuyen,
          the.length,
        ),
      );
    }
    goiY.forEach((g) =>
      the.push(theTruong(g.t, g.nhan, g.lyDo, g.loai, ANH.thuong, the.length)),
    );

    let html = "";
    if (!truongChuyen && thiChuyen)
      html += `<p class="thong-bao">Chưa tìm được trường chuyên. Hãy chọn môn chuyên.</p>`;
    if (the.length) {
      html += `<h2 class="ketqua-tieu-de">Gợi ý trường dành cho bạn</h2>
               <p class="chon-goi-y">Bấm vào trường bạn muốn chọn.</p>
               <p id="chon-thong-bao" class="thong-bao" hidden></p>
               <div class="truong-grid">${the.join("")}</div>`;
    }
    out.dataset.dangLuu = "0";
    out.innerHTML =
      html || `<p class="thong-bao">Không tìm được trường phù hợp.</p>`;
    ganXuLyAnh(out);
    ganChonTruong(out);
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------- Khởi động ----------
  function khoiDong() {
    chuanBiGiaoDien();
    taiDuLieu().catch((e) => {
      $("kq").textContent = "Không đọc được diem_chuan_2026.json: " + e.message;
    });
    layViTri();
    $("input-survey").addEventListener("submit", xuLyNop);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", khoiDong);
  } else {
    khoiDong();
  }
})();

// ---------- Hiện/ẩn phần thi chuyên ----------
(function () {
  const chk = document.getElementById("survey-3-specialized_high_school");
  const section = document.getElementById("chuyen-section");
  const mon = document.getElementById("mon-chuyen");
  const wrap = document.getElementById("diem-chuyen-wrap");
  const label = document.getElementById("diem-chuyen-label");
  const diem = document.getElementById("diem-chuyen");
  const tenMon = { toan: "Toán", ly: "Vật Lý", hoa: "Hóa Học" };

  function resetChuyen() {
    mon.value = "";
    wrap.hidden = true;
    diem.value = "";
    diem.required = false;
  }

  chk.addEventListener("change", () => {
    section.hidden = !chk.checked;
    if (!chk.checked) resetChuyen();
  });

  mon.addEventListener("change", () => {
    if (mon.value) {
      label.textContent =
        "Nhập điểm môn " + tenMon[mon.value] + " lớp 8 của bạn:";
      wrap.hidden = false;
      diem.required = true;
    } else {
      resetChuyen();
    }
  });

  document.getElementById("input-survey").addEventListener("reset", () => {
    section.hidden = true;
    resetChuyen();
  });
})();
