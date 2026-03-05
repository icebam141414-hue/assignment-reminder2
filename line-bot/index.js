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

const addFriendUrl = "https://line.me/R/ti/p/@898vvvdb";

// ==========================
// Home
// ==========================

app.get("/", (req, res) => {
  res.send("LINE Assignment Reminder Running");
});

// ==========================
// Login
// ==========================

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
      <button>Login with LINE</button>
    </a>

    <br><br>

    <a href="${addFriendUrl}">
      <button>เพิ่มเพื่อน LINE Bot</button>
    </a>
  `);
});

// ==========================
// Callback
// ==========================

app.get("/callback", async (req, res) => {

  try {

    const code = req.query.code;

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
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const userId = profileResponse.data.userId;

    req.session.userId = userId;

    await db.collection("users").doc(userId).set({
      userId: userId,
      createdAt: new Date()
    }, { merge: true });

    res.send("Login สำเร็จแล้ว");

  } catch (err) {

    console.log(err.response?.data || err.message);

    res.send("Login error");

  }

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

    // แก้ตรงนี้
    dueDate: new Date(dueDate),

    userId: req.session.userId,
    notified: false,
    createdAt: new Date()

  });

  res.send("บันทึกงานเรียบร้อยแล้ว");

});

// ==========================
// Webhook
// ==========================

app.post("/webhook", async (req, res) => {

  const events = req.body.events || [];

  for (const event of events) {

    if (event.type === "follow") {

      const userId = event.source.userId;

      await db.collection("users").doc(userId).set({

        userId: userId,
        createdAt: new Date()

      }, { merge: true });

      await axios.post(
        "https://api.line.me/v2/bot/message/push",
        {
          to: userId,
          messages: [
            {
              type: "text",
              text: "เชื่อมต่อระบบแจ้งเตือนงานเรียบร้อยแล้ว"
            }
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
            "Content-Type": "application/json"
          }
        }
      );

      console.log("User follow:", userId);

    }

  }

  res.sendStatus(200);

});

// ==========================
// Cron Check Every 1 Minute
// ==========================

cron.schedule("* * * * *", async () => {

  try {

    console.log("Checking tasks...");

    const now = new Date();

    const tasksSnapshot = await db.collection("tasks")
      .where("notified", "==", false)
      .get();

    if (tasksSnapshot.empty) return;

    const usersSnapshot = await db.collection("users").get();

    for (const taskDoc of tasksSnapshot.docs) {

      const task = taskDoc.data();
      const due = new Date(task.dueDate);

      const diff = due.getTime() - now.getTime();

      const hours24 = 24 * 60 * 60 * 1000;

      if (diff <= hours24 && diff > 0) {

        for (const userDoc of usersSnapshot.docs) {

          const user = userDoc.data();

          await axios.post(
            "https://api.line.me/v2/bot/message/push",
            {
              to: user.userId,
              messages: [
                {
                  type: "text",
                  text: `⏰ เตือนงานใกล้ครบกำหนด

วิชา: ${task.subject}
งาน: ${task.title}

เหลือเวลาไม่ถึง 24 ชั่วโมงแล้ว`
                }
              ]
            },
            {
              headers: {
                Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
                "Content-Type": "application/json"
              }
            }
          );

          console.log("sent to", user.userId);

        }

        await taskDoc.ref.update({
          notified: true
        });

      }

    }

  } catch (error) {

    console.log("Cron error:", error.message);

  }

});

// ==========================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log("Server running on port " + PORT);

});