const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const cron = require("node-cron"); // ✅ เพิ่ม cron

// 🔥 ใช้ Environment Variable สำหรับ Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const app = express();
app.use(bodyParser.json());

// 🔥 ใช้ Environment Variable สำหรับ LINE
const CHANNEL_ACCESS_TOKEN = process.env.CHANNEL_ACCESS_TOKEN;

app.post("/webhook", async (req, res) => {
  const events = req.body.events || [];

  for (let event of events) {
    if (event.type === "follow") {
      const userId = event.source.userId;

      console.log("User ID:", userId);

      // ✅ บันทึก user ลง Firestore
      await db.collection("users").doc(userId).set({
        userId: userId,
        createdAt: new Date()
      });

      // ✅ ส่งข้อความกลับ
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
    }
  }

  res.sendStatus(200);
});



// =============================
// 🔔 CRON JOB (แก้ไขส่วนนี้)
// =============================

// ทดสอบรันทุก 1 นาที
cron.schedule("* * * * *", async () => {
  console.log("Cron is running every minute");

  try {
    const usersSnapshot = await db.collection("users").get();

    for (const doc of usersSnapshot.docs) {
      const userId = doc.id;
      console.log("Sending reminder to:", userId);

      await axios.post(
        "https://api.line.me/v2/bot/message/push",
        {
          to: userId,
          messages: [
            {
              type: "text",
              text: "🔔 แจ้งเตือนทดสอบจากระบบ Cron ทำงานแล้ว!"
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

      console.log("Sent reminder to:", userId);
    }

  } catch (error) {
    console.error("Cron error:", error.response?.data || error.message);
  }
});











// 🔥 สำคัญสำหรับ Render
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});