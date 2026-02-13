const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "yourgmail@gmail.com",
    pass: "app_password_here"
  }
});

const sendEmail = async (to, subject, text) => {
  await transporter.sendMail({
    from: "Assignment Reminder <yourgmail@gmail.com>",
    to: to,
    subject: subject,
    text: text
  });
};

module.exports = sendEmail;
