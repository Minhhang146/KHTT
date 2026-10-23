document.addEventListener("DOMContentLoaded", async () => {
  const userId = localStorage.getItem("userId");

  // Chưa đăng nhập thì đưa sang trang đăng nhập
  if (!userId) {
    window.location.href = "login.html";
    return;
  }

  try {
    const res = await fetch(`http://127.0.0.1:5000/api/users/${userId}`);
    const kq = await res.json();
    if (!kq.success) throw new Error(kq.message);

    const u = kq.data;
    // dùng textContent để tên người dùng không chạy được code lạ
    document.getElementById("pf-username").textContent = u.username;
    document.getElementById("pf-bio").textContent = u.bio || "Chưa có giới thiệu";
    document.getElementById("pf-score").textContent = u.score;
    document.getElementById("pf-streak").textContent = u.streak;
    document.getElementById("pf-chuyen").textContent = u.mon_chuyen || "Không thi chuyên";
  } catch (err) {
    document.querySelector(".container").textContent = "Lỗi: " + err.message;
  }
});