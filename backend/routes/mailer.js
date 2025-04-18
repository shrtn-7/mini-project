const nodemailer = require("nodemailer");
require('dotenv').config();

// Use environment variables for credentials
const emailUser = process.env.EMAIL_USER;
// For Gmail, use an "App Password" generated in your Google Account settings, not your regular password
const emailPass = process.env.EMAIL_PASS; 

if (!emailUser || !emailPass) {
  console.warn("\n***\nWARNING: EMAIL_USER or EMAIL_PASS not found in .env file.\nEmail reminders WILL NOT be sent.\nPlease configure them for email functionality.\n***\n");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: emailUser, // Use environment variable for email
    pass: emailPass, // Use environment variable for app password
  },
  logger: false, // Enable logging for debugging purposes
  debug: false, // Enable debug output for SMTP connection
});

// Verify connection configuration (optional, but recommended for startup)
if (emailUser && emailPass) {
  transporter.verify(function(error, success) {
    if (error) {
      console.error("MAILER ERROR: Transporter verification failed:", error);
    } else {
      console.log("MAILER: Server is ready to take messages.");
    }
  });
}

const sendEmail = (to, subject, text) => {
  // Prevent sending if not configured
  if (!emailUser || !emailPass) {
     console.error(`EMAIL NOT SENT: Email service not configured. To: ${to}, Subject: ${subject}`);
     return Promise.reject(new Error("Email service not configured in .env file.")); 
  }

  const mailOptions = {
    from: `"MediSync Reminders" <${emailUser}>`, // Set a sender name
    to: to, // Recipient email address
    subject: subject, // Email subject
    text: text, // Plain text body
    // Optional: Add an HTML version for better formatting
    html: `<p>${text.replace(/\n/g, '<br>')}</p>` 
  };

  console.log(`Attempting to send email: To=${to}, Subject=${subject}`);
  return transporter.sendMail(mailOptions); // Returns a Promise
};

module.exports = sendEmail;
