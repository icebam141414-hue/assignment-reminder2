const express = require("express");
const axios = require("axios");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
app.use(express.static(__dirname));

const CLIENT_ID = "2009128895";
const CLIENT_SECRET = "d2633988a71f0f32e4ba2394f4c177ae";
const CHANNEL_ACCESS_TOKEN = "w6bwmA9WjHhkTOEIm0z7GhzTKBLEGE68Ros58/BABx2wy9Fr2GloQjoK97+bhLGcqGchunW+qbglxz9AkF9jxZMdjSLD4FeEnLy8NO7mPiJTUoyhoBkK7n9upzvQS5HJvugcn8OIRe8/wrbjbiwsLAdB04t89/1O/w1cDnyilFU=";

const REDIRECT_URI = "http://localhost:3000/callback";


// ============================
// LOGIN
// ============================
app.get("/login", (req, res) => {
  const state = crypto.randomBytes(8).toString("hex");

  const url =
    "https://access.line.me/oauth2/v2.1/authorize" +
    `?response_type=code` +
    `&client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&state=${state}` +
    `&scope=profile%20openid` +
    `&prompt=consent`;   // ⭐ บังคับให้ขึ้นหน้าอนุญาต

  res.redirect(url);
});


// ============================
// CALLBACK
// ============================
app.get("/callback", async (req, res) => {
  console.log("🔥 CALLBACK มาแล้ว");

  const code = req.query.code;
  if (!code) return res.send("no code");

  try {
    const tokenResponse = await axios.post(
      "https://api.line.me/oauth2/v2.1/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenResponse.data.access_token;

    const profileResponse = await axios.get(
      "https://api.line.me/v2/profile",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const userId = profileResponse.data.userId;

    if (!fs.existsSync("users.json")) {
      fs.writeFileSync("users.json", "[]");
    }

    let users = JSON.parse(fs.readFileSync("users.json"));

    if (!users.includes(userId)) {
      users.push(userId);
      fs.writeFileSync("users.json", JSON.stringify(users));
    }

    console.log("✅ LOGIN SUCCESS:", userId);

    res.redirect("/dashboard2.html");

  } catch (error) {
    console.log("ERROR:", error.response?.data || error.message);
    res.send("login error");
  }
});


// ============================
app.listen(3000, () => {
  console.log("Server running http://localhost:3000");
});
