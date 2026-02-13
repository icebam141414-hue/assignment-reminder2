const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

// ====== ใส่ค่าของคุณในไฟล์ .env ======
const CHANNEL_ACCESS_TOKEN = process.env.CHANNEL_ACCESS_TOKEN;
const CHANNEL_SECRET = process.env.CHANNEL_SECRET;

// หน้า test ว่า server ทำงานไหม
app.get("/", (req, res) => {
  res.send("LINE Reminder Bot is running");
});

// ====== Webhook จาก LINE ======
app.post("/webhook", async (req, res) => {
  const events = req.body.events;

  for (let event of events) {
    if (event.type === "message") {
      const userId = event.source.userId;

      await axios.post(
        "https://api.line.me/v2/bot/message/push",
        {
          to: userId,
          messages: [
            {
              type: "text",
              text: "ได้รับข้อความแล้ว 👍",
            },
          ],
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
          },
        }
      );
    }
  }

  res.sendStatus(200);
});

// ====== เปิด server ======
const PORT = 3000;
app.listen(PORT, () => {
  console.log("Server started on port " + PORT);
});