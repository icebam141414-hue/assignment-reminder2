const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const CHANNEL_ACCESS_TOKEN = "w6bwmA9WjHhkTOEIm0z7GhzTKBLEGE68Ros58/BABx2wy9Fr2GloQjoK97+bhLGcqGchunW+qbglxz9AkF9jxZMdjSLD4FeEnLy8NO7mPiJTUoyhoBkK7n9upzvQS5HJvugcn8OIRe8/wrbjbiwsLAdB04t89/1O/w1cDnyilFU=";

app.post("/webhook", async (req, res) => {
  const events = req.body.events;

  for (let event of events) {
    if (event.type === "follow") {
      const userId = event.source.userId;

      console.log("User ID:", userId);

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

app.listen(3000, () => {
  console.log("Server running on port 3000");
});