document.addEventListener("DOMContentLoaded", () => {
  const taskList = document.getElementById("taskList");

  // =============================
  // ดึงงานจาก SERVER
  // =============================
  async function getTasks() {
    try {
      const res = await fetch("http://localhost:3000/tasks");
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

    tasks.forEach((task, index) => {
      const div = document.createElement("div");

      const statusClass = getTaskStatus(task.dueDate);
      div.className = `task-card ${statusClass}`;

      div.innerHTML = `
        <div class="task-info">
          <strong>${task.subject}</strong>
          <p>${task.title}</p>
          <p>⏰ ${new Date(task.dueDate).toLocaleString()}</p>
        </div>

        <div class="task-actions">
          ${
            task.completed
              ? `<span class="done-label">ส่งแล้ว ✅</span>`
              : `<button class="done-btn" onclick="completeTask(${index})">
                   ส่งงานแล้ว
                 </button>`
          }
          <button class="edit-btn" onclick="editTask(${index})">แก้ไข</button>
          <button class="delete-btn" onclick="deleteTask(${index})">ลบ</button>
        </div>
      `;

      taskList.appendChild(div);
    });
  }

  // =============================
  // ส่งงานแล้ว
  // =============================
  window.completeTask = async function (index) {
    await fetch(`http://localhost:3000/tasks/${index}/complete`, {
      method: "PUT",
    });
    renderTasks();
  };

  // =============================
  // ลบ
  // =============================
  window.deleteTask = async function (index) {
    if (!confirm("ต้องการลบงานนี้ใช่ไหม?")) return;

    await fetch(`http://localhost:3000/tasks/${index}`, {
      method: "DELETE",
    });

    renderTasks();
  };

  // =============================
  // แก้ไข
  // =============================
  window.editTask = async function (index) {
    const tasks = await getTasks();
    const task = tasks[index];

    const newSubject = prompt("แก้ไขชื่อวิชา", task.subject);
    if (newSubject === null) return;

    const newTitle = prompt("แก้ไขชื่องาน", task.title);
    if (newTitle === null) return;

    await fetch(`http://localhost:3000/tasks/${index}`, {
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
    const res = await fetch("http://localhost:3000/tasks");
    const tasks = await res.json();

    const now = new Date();

    tasks.forEach((task, index) => {
      if (task.completed) return;

      const due = new Date(task.dueDate);

      // ถ้าเลยเวลาแล้ว และยังไม่เคยแจ้งเตือน
      if (due <= now && !notifiedTasks.has(index)) {
        notifiedTasks.add(index);

        alert(`🔔 ถึงเวลาส่งงาน!\nวิชา: ${task.subject}\nงาน: ${task.title}`);
      }
    });
  } catch (err) {
    console.error("❌ เช็คเวลาไม่ได้", err);
  }
}

// เช็คทุก 30 วิ
setInterval(checkDueTasks, 30000);

// เปิดหน้าเว็บ → เช็คทันที 1 รอบ
checkDueTasks();
