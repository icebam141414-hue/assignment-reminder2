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

    // ✅ แก้ตรงนี้ให้ตรงกับ server
    fetch("/add-tasks2", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
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