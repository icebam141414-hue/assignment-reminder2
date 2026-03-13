process.env.TZ = "Asia/Bangkok";

const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const session = require("express-session");

const app = express();
app.set("trust proxy", 1);

app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: "mysecret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// =====================
// Firebase
// =====================

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// =====================
// Home
// =====================

app.get("/", (req, res) => {
  res.send("Server running");
});

// =====================
// Login (เข้าได้ทันที)
// =====================

app.post("/login", (req, res) => {

  req.session.userId = "testuser";

  res.redirect("/dashboard");

});

// =====================
// Dashboard
// =====================

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

  <a href="/logout">Logout</a>
  `);

});

// =====================
// Create Task
// =====================

app.post("/create-task", async (req, res) => {

  if (!req.session.userId) {
    return res.send("กรุณา login ก่อน");
  }

  const { subject, title, dueDate } = req.body;

  await db.collection("tasks").add({
    subject,
    title,
    dueDate: new Date(dueDate),
    userId: req.session.userId,
    createdAt: new Date()
  });

  res.send("บันทึกงานสำเร็จ");

});

// =====================
// Logout
// =====================

app.get("/logout", (req, res) => {

  req.session.destroy(() => {
    res.redirect("/login.html");
  });

});

// =====================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
