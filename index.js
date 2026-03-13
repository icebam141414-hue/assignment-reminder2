process.env.TZ = "Asia/Bangkok";

const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const admin = require("firebase-admin");

const app = express();
app.set("trust proxy", 1);

app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: "assignment-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// ===== Firebase =====
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ===== หน้าแรก =====
app.get("/", (req, res) => {
  res.redirect("/login2.html");
});

// ===== LOGIN =====
app.post("/login", async (req, res) => {

  const { email, password } = req.body;

  try {

    const userSnapshot = await db.collection("users")
      .where("email", "==", email)
      .where("password", "==", password)
      .get();

    if (userSnapshot.empty) {
      return res.send("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }

    const user = userSnapshot.docs[0].data();

    req.session.userId = user.email;

    res.redirect("/dashboard2.html");

  } catch (error) {
    console.error(error);
    res.send("Login error");
  }

});

// ===== CREATE TASK =====
app.post("/create-task", async (req, res) => {

  if (!req.session.userId) {
    return res.redirect("/login2.html");
  }

  const { subject, title, dueDate } = req.body;

  try {

    await db.collection("tasks").add({
      subject: subject,
      title: title,
      dueDate: new Date(dueDate),
      userId: req.session.userId,
      createdAt: new Date()
    });

    res.send("เพิ่มงานสำเร็จ");

  } catch (error) {
    console.log(error);
    res.send("บันทึกงานไม่สำเร็จ");
  }

});

// ===== LOGOUT =====
app.get("/logout", (req, res) => {

  req.session.destroy(() => {
    res.redirect("/login2.html");
  });

});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
