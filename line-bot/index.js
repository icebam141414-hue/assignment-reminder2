const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const cron = require("node-cron");
const session = require("express-session");
const path = require("path");

const app = express();
app.set("trust proxy", 1);

// =====================================
// 🔥 Static Files (แก้ให้ถูกต้อง)
// =====================================
app.use(express.static(__dirname));

// =====================================
// 🔥 Body Parser
// =====================================
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// =====================================
// 🔥 Session (สำคัญมากสำหรับ Render HTTPS)
// =====================================
app.use(session({
  secret: process.env.SESSION_SECRET || "mysecret",
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    secure: false,   // 👈 เปลี่ยนเป็น false ก่อน
    sameSite: "lax"  // 👈 เปลี่ยนเป็น lax
  }
}));

// =====================================
// 🔥 Firebase
// =====================================
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error("Missing FIREBASE_SERVICE_ACCOUNT");
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// =====================================
// 🔥 ENV CHECK
// =====================================
const CHANNEL_ACCESS_TOKEN = process.env.CHANNEL_ACCESS_TOKEN;
const LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID;
const LINE_LOGIN_CHANNEL_SECRET = process.env.LINE_LOGIN_CHANNEL_SECRET;
const BASE_URL = process.env.BASE_URL;

if (!CHANNEL_ACCESS_TOKEN || !LINE_LOGIN_CHANNEL_ID || !LINE_LOGIN_CHANNEL_SECRET || !BASE_URL) {
  console.error("Missing required ENV variables");
  process.exit(1);
}

const addFriendUrl = "https://line.me/R/ti/p/@898vvvdb";

// =====================================
// 🏠 Home
// =====================================
app.get("/", (req, res) => {
  res.send("LINE Assignment Reminder is running 🚀");
});

// =====================================
// 🔐 Login Page
// =====================================
app.get("/login", (req, res) => {

  const loginUrl =
    `https://access.line.me/oauth2/v2.1/authorize` +
    `?response_type=code` +
    `&client_id=${LINE_LOGIN_CHANNEL_ID}` +
    `&redirect_uri=${BASE_URL}/callback` +
    `&state=12345` +
    `&scope=profile%20openid`;

  res.send(`
    <h2>ระบบแจ้งเตือนงาน</h2>

    <a href="${loginUrl}">
      <button style="padding:10px 20px;">Login with LINE</button>
    </a>

    <br><br>

    <a href="${addFriendUrl}">
      <button style="padding:10px 20px;">➕ เพิ่มเพื่อน LINE Bot</button>
    </a>
  `);
});

// =====================================
// 🔐 Callback
// =====================================
app.get("/callback", async (req, res) => {
  try {

    const code = req.query.code;
    if (!code) return res.send("No code received");

    const tokenResponse = await axios.post(
      "https://api.line.me/oauth2/v2.1/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${BASE_URL}/callback`,
        client_id: LINE_LOGIN_CHANNEL_ID,
        client_secret: LINE_LOGIN_CHANNEL_SECRET
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenResponse.data.access_token;

    const profileResponse = await axios.get(
      "https://api.line.me/v2/profile",
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    const userId = profileResponse.data.userId;

    // 🔥 บันทึก session
    req.session.userId = userId;

    await db.collection("users").doc(userId).set({
      userId,
      createdAt: new Date()
    }, { merge: true });

    // 🔥 Redirect แบบปลอดภัย
    return res.redirect("/dashboard2.html");

  } catch (error) {
    console.error("Login error:", error.response?.data || error.message);
    return res.status(500).send("Login error");
  }
});

// =====================================
// ➕ สร้างงาน
// =====================================
app.post("/create-task", async (req, res) => {

  if (!req.session.userId) {
    return res.status(401).send("กรุณา Login ก่อน");
  }

  const { title, subject, dueDate } = req.body;

  if (!title || !subject || !dueDate) {
    return res.status(400).send("ข้อมูลไม่ครบ");
  }

  await db.collection("tasks").add({
    title,
    subject,
    dueDate,
    userId: req.session.userId,
    notified: false,
    createdAt: new Date()
  });

  res.send("บันทึกงานเรียบร้อยแล้ว");
});

// =====================================
// 🔔 Webhook
// =====================================
app.post("/webhook", async (req, res) => {

  const events = req.body.events || [];

  for (let event of events) {

    if (event.type === "follow") {
      const userId = event.source.userId;

      await db.collection("users").doc(userId).set({
        userId,
        createdAt: new Date()
      }, { merge: true });

      await axios.post(
        "https://api.line.me/v2/bot/message/push",
        {
          to: userId,
          messages: [{
            type: "text",
            text: "เชื่อมต่อระบบแจ้งเตือนงานเรียบร้อยแล้ว"
          }]
        },
        {
          headers: {
            Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
            "Content-Type": "application/json"
          }
        }
      );
    }
  }

  res.sendStatus(200);
});

// =====================================
// ⏰ Cron แจ้งเตือนทุก 1 นาที
// =====================================
cron.schedule("* * * * *", async () => {

  const now = new Date();
  const tasksSnapshot = await db.collection("tasks").get();

  for (const doc of tasksSnapshot.docs) {

    const data = doc.data();

    if (!data.dueDate || data.notified) continue;

    if (now >= new Date(data.dueDate)) {

      if (!data.userId) continue;

      await axios.post(
        "https://api.line.me/v2/bot/message/push",
        {
          to: data.userId,
          messages: [{
            type: "text",
            text: `🔔 งาน "${data.title}" วิชา ${data.subject} ถึงกำหนดส่งแล้ว!`
          }]
        },
        {
          headers: {
            Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
            "Content-Type": "application/json"
          }
        }
      );

      await doc.ref.update({ notified: true });
    }
  }
});

// =====================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));