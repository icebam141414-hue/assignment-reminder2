document.addEventListener("DOMContentLoaded", () => {
  const taskList = document.getElementById("taskList");

  // =============================
  // ดึงงานจาก SERVER
  // =============================
  async function getTasks() {
    try {
      const res = await fetch("/tasks");
      return await res.json();
    } catch (err) {
      console.error("❌ ดึงงานไม่ได้", err);
      return [];
    }
  }

  // =============================
  // ดูสถานะเวลา (สี)
  // =============================
  function getTaskStatus(dueTime) {
    const now = new Date();
    const due = new Date(dueTime);
    const diffDays = (due - now) / (1000 * 60 * 60 * 24);

    if (diffDays <= 1) return "task-red";
    if (diffDays <= 7) return "task-yellow";
    return "task-green";
  }

  // =============================
  // แสดงผล
  // =============================
  async function renderTasks() {
    const tasks = await getTasks();
    taskList.innerHTML = "";

    if (!tasks || tasks.length === 0) {
      taskList.innerHTML = "<p>📭 ยังไม่มีงาน</p>";
      return;
    }

    tasks.forEach((task) => {
      const div = document.createElement("div");

      const statusClass = getTaskStatus(task.dueDate);
      div.className = `task-card ${statusClass}`;

      const dueText = task.dueDate
        ? new Date(task.dueDate).toLocaleString("th-TH")
        : "ไม่มีวันที่";

      div.innerHTML = `
        <div class="task-info">
          <strong>${task.subject}</strong>
          <p>${task.title}</p>
          <p>⏰ ${dueText}</p>
        </div>

        <div class="task-actions">
          ${
            task.completed
              ? `<span class="done-label">ส่งแล้ว ✅</span>`
              : `<button class="done-btn" onclick="completeTask('${task.id}')">
                   ส่งงานแล้ว
                 </button>`
          }
          <button class="edit-btn" onclick="editTask('${task.id}')">แก้ไข</button>
          <button class="delete-btn" onclick="deleteTask('${task.id}')">ลบ</button>
        </div>
      `;

      taskList.appendChild(div);
    });
  }

  // =============================
  // ส่งงานแล้ว
  // =============================
  window.completeTask = async function (id) {
    await fetch(`/tasks/${id}/complete`, {
      method: "PUT",
    });
    renderTasks();
  };

  // =============================
  // ลบ
  // =============================
  window.deleteTask = async function (id) {
    if (!confirm("ต้องการลบงานนี้ใช่ไหม?")) return;

    await fetch(`/tasks/${id}`, {
      method: "DELETE",
    });

    renderTasks();
  };

  // =============================
  // แก้ไข
  // =============================
  window.editTask = async function (id) {
    const tasks = await getTasks();
    const task = tasks.find((t) => t.id === id);

    const newSubject = prompt("แก้ไขชื่อวิชา", task.subject);
    if (newSubject === null) return;

    const newTitle = prompt("แก้ไขชื่องาน", task.title);
    if (newTitle === null) return;

    await fetch(`/tasks/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: newSubject,
        title: newTitle,
      }),
    });

    renderTasks();
  };

  renderTasks();
});


// =============================
// 🔔 ระบบแจ้งเตือนเมื่อถึงเวลา
// =============================
const notifiedTasks = new Set();

async function checkDueTasks() {
  try {
    const res = await fetch("/tasks");
    const tasks = await res.json();

    const now = new Date();

    tasks.forEach((task) => {
      if (task.completed) return;

      const due = new Date(task.dueDate);

      if (due <= now && !notifiedTasks.has(task.id)) {
        notifiedTasks.add(task.id);

        alert(`🔔 ถึงเวลาส่งงาน!\nวิชา: ${task.subject}\nงาน: ${task.title}`);
      }
    });
  } catch (err) {
    console.error("❌ เช็คเวลาไม่ได้", err);
  }
}

// เช็คทุก 30 วิ
setInterval(checkDueTasks, 30000);

// เปิดหน้าเว็บ → เช็คทันที
checkDueTasks();
