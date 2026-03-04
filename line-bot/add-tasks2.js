console.log("✅ add-tasks2.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("addTaskForm");

  if (!form) {
    console.error("❌ ไม่พบฟอร์ม addTaskForm");
    return;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const subject = document.getElementById("subject").value.trim();
    const task = document.getElementById("task").value.trim();
    const time = document.getElementById("time").value;

    if (!subject || !task || !time) {
      alert("กรุณากรอกข้อมูลให้ครบ");
      return;
    }

    const newTask = {
      subject: subject,
      title: task,
      dueDate: time
    };

    // ✅ แก้ตรงนี้: ใช้ path เดียวกับ server และไม่ใช้ localhost
    fetch("/create-task", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include", // ✅ สำคัญมากสำหรับ session
      body: JSON.stringify(newTask)
    })
    .then(res => res.text())
    .then(data => {
      console.log("📥 server:", data);
      alert("บันทึกงานเรียบร้อย ✅");
      form.reset();
    })
    .catch(err => {
      console.error(err);
      alert("❌ เพิ่มงานไม่สำเร็จ");
    });
  });
});