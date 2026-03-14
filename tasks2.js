document.addEventListener("DOMContentLoaded", () => {

  const taskList = document.getElementById("taskList");
  const notifiedTasks = new Set();


  // =============================
  // ดึงข้อมูลจาก Server
  // =============================
  async function getTasks() {
    try {
      const res = await fetch("/tasks");
      const data = await res.json();
      return data;
    } catch (err) {
      console.error("โหลดงานไม่สำเร็จ", err);
      return [];
    }
  }


  // =============================
  // เช็คสีสถานะเวลา
  // =============================
  function getTaskStatus(dueTime) {

    if (!dueTime) return "task-green";

    const now = new Date();
    const due = new Date(dueTime);

    const diff = due - now;
    const hours = diff / (1000 * 60 * 60);

    if (diff < 0) return "task-red";
    if (hours <= 24) return "task-yellow";

    return "task-green";
  }


  // =============================
  // แสดงรายการงาน
  // =============================
  async function renderTasks() {

    const tasks = await getTasks();

    taskList.innerHTML = "";

    if (!tasks || tasks.length === 0) {
      taskList.innerHTML = "<p>📭 ยังไม่มีงาน</p>";
      return;
    }

    tasks.forEach(task => {

      const subject = task.subject || "ไม่ระบุวิชา";
      const title = task.title || task.task || "ไม่มีรายละเอียด";
      const dueRaw = task.dueDate || task.time;

      const dueText = dueRaw
        ? new Date(dueRaw).toLocaleString("th-TH")
        : "ไม่มีวันที่";

      const statusClass = getTaskStatus(dueRaw);

      const div = document.createElement("div");
      div.className = `task-card ${statusClass}`;

      div.innerHTML = `
        <div class="task-info">
          <strong>${subject}</strong>
          <p>${title}</p>
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

          <button class="edit-btn" onclick="editTask('${task.id}')">
            แก้ไข
          </button>

          <button class="delete-btn" onclick="deleteTask('${task.id}')">
            ลบ
          </button>

        </div>
      `;

      taskList.appendChild(div);

    });

  }


  // =============================
  // ส่งงานแล้ว
  // =============================
  window.completeTask = async function(id) {

    await fetch(`/tasks/${id}/complete`, {
      method: "PUT"
    });

    renderTasks();
  }


  // =============================
  // ลบงาน
  // =============================
  window.deleteTask = async function(id) {

    if (!confirm("ต้องการลบงานนี้ใช่ไหม?")) return;

    await fetch(`/tasks/${id}`, {
      method: "DELETE"
    });

    renderTasks();
  }


  // =============================
  // แก้ไขงาน
  // =============================
  window.editTask = async function(id) {

    const tasks = await getTasks();
    const task = tasks.find(t => t.id === id);

    if (!task) return;

    const subject = task.subject || "";
    const title = task.title || task.task || "";

    const newSubject = prompt("แก้ไขชื่อวิชา", subject);
    if (newSubject === null) return;

    const newTitle = prompt("แก้ไขชื่องาน", title);
    if (newTitle === null) return;

    await fetch(`/tasks/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        subject: newSubject,
        title: newTitle
      })
    });

    renderTasks();
  }


  // =============================
  // แจ้งเตือนถึงเวลาส่ง
  // =============================
  async function checkDueTasks() {

    try {

      const tasks = await getTasks();
      const now = new Date();

      tasks.forEach(task => {

        if (task.completed) return;

        const due = task.dueDate || task.time;
        if (!due) return;

        const dueDate = new Date(due);

        if (dueDate <= now && !notifiedTasks.has(task.id)) {

          notifiedTasks.add(task.id);

          alert(
`🔔 ถึงเวลาส่งงาน!

วิชา: ${task.subject}
งาน: ${task.title || task.task}`
          );

        }

      });

    } catch (err) {

      console.error("เช็คเวลาไม่ได้", err);

    }

  }


  // =============================
  // เริ่มระบบ
  // =============================
  renderTasks();
  checkDueTasks();

  setInterval(checkDueTasks, 30000);

});
