const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "your_email@gmail.com", // Replace with your actual email
    pass: "your_app_password",    // Replace with your app password (not email password)
  },
});

const sendEmail = (to, subject, text) => {
  const mailOptions = {
    from: "your_email@gmail.com",
    to,
    subject,
    text,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
