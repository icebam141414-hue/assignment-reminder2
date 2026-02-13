const express = require("express");
const app = express();
const path = require("path");

// ให้เรียกตัวแจ้งเตือน
require("./reminder");

// ใช้ไฟล์ static จากโฟลเดอร์ปัจจุบัน
app.use(express.static(__dirname));

// หน้าแรก เปิดหน้า login
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "login2.html"));
});

// เปิด server
app.listen(3000, () => {
  console.log("🌐 Web running on port 3000");
});
