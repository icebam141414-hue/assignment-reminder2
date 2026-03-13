process.env.TZ = "Asia/Bangkok";
const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const cron = require("node-cron");
const session = require("express-session");

const app = express();
app.set("trust proxy", 1);

app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || "mysecret",
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    secure: false,
    sameSite: "lax"
  }
}));

// ==========================
// Firebase
// ==========================

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ==========================
// ENV
// ==========================

const CHANNEL_ACCESS_TOKEN = process.env.CHANNEL_ACCESS_TOKEN;
const LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID;
const LINE_LOGIN_CHANNEL_SECRET = process.env.LINE_LOGIN_CHANNEL_SECRET;
const BASE_URL = process.env.BASE_URL;

// ==========================
// Home
// ==========================

app.get("/", (req, res) => {
  res.send("LINE Assignment Reminder Running");
});

// ==========================
// Register
// ==========================

app.post("/register", async (req, res) => {

  const { email, password } = req.body;

  if (!email || !password) {
    return res.send("กรอกข้อมูลไม่ครบ");
  }

  const userRef = await db.collection("users").add({
    email: email,
    password: password,
    createdAt: new Date()
  });

  res.send("สมัครสมาชิกสำเร็จ");

});

// ==========================
// Login
// ==========================

app.post("/login", async (req, res) => {

  const { email, password } = req.body;

  if (!email || !password) {
    return res.send("กรุณากรอกอีเมลและรหัสผ่าน");
  }

  const snapshot = await db
    .collection("users")
    .where("email", "==", email)
    .where("password", "==", password)
    .get();

  if (snapshot.empty) {
    return res.send("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  }

  const user = snapshot.docs[0].data();

  req.session.userId = snapshot.docs[0].id;

  res.redirect("/dashboard");

});

// ==========================
// Dashboard
// ==========================

app.get("/dashboard", (req, res) => {

  if (!req.session.userId) {
    return res.redirect("/login.html");
  }

  res.send(`
  <h1>Dashboard</h1>

  <form action="/create-task" method="POST">

  <input name="subject" placeholder="วิชา"><br><br>

  <input name="title" placeholder="ชื่องาน"><br><br>

  <input type="datetime-local" name="dueDate"><br><br>

  <button type="submit">เพิ่มงาน</button>

  </form>

  <br>

  <a href="/logout">
  <button>Logout</button>
  </a>

  `);

});

// ==========================
// Logout
// ==========================

app.get("/logout", (req, res) => {

  req.session.destroy(() => {
    res.redirect("/login.html");
  });

});

// ==========================
// Create Task
// ==========================

app.post("/create-task", async (req, res) => {

  if (!req.session.userId) {
    return res.send("กรุณา Login ก่อน");
  }

  const { title, subject, dueDate } = req.body;

  if (!title || !subject || !dueDate) {
    return res.send("ข้อมูลไม่ครบ");
  }

  await db.collection("tasks").add({

    title: title,
    subject: subject,
    dueDate: new Date(dueDate),

    userId: req.session.userId,
    notified: false,
    createdAt: new Date()

  });

  res.send("บันทึกงานเรียบร้อยแล้ว");

});

// ==========================
// Cron ตรวจงานทุก 1 นาที
// ==========================

cron.schedule("* * * * *", async () => {

  const now = new Date();
  const hours24 = 24 * 60 * 60 * 1000;

  const tasksSnapshot = await db.collection("tasks").get();

  for (const taskDoc of tasksSnapshot.docs) {

    const task = taskDoc.data();

    if (task.notified) continue;

    const due = new Date(task.dueDate);
    const diff = due.getTime() - now.getTime();

    if (diff > 0 && diff <= hours24) {

      const message = {
        type: "text",
        text: `⏰ เตือนงานใกล้ครบกำหนด

📚 วิชา: ${task.subject}
📝 งาน: ${task.title}

เหลือเวลาไม่ถึง 24 ชั่วโมง`
      };

      const usersSnapshot = await db.collection("users").get();

      for (const userDoc of usersSnapshot.docs) {

        const user = userDoc.data();

        if (!user.userId) continue;

        try {

          await axios.post(
            "https://api.line.me/v2/bot/message/push",
            {
              to: user.userId,
              messages: [message]
            },
            {
              headers: {
                Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
                "Content-Type": "application/json"
              }
            }
          );

        } catch (err) {

          console.log(err.message);

        }

      }

      await taskDoc.ref.update({
        notified: true
      });

    }

  }

});

// ==========================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
