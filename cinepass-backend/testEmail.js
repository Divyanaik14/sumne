const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendTestEmail = async () => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: 'test_receiver@gmail.com', // Replace with a test email address
    subject: 'Test Email',
    text: 'This is a test email to check if nodemailer is configured correctly.'
  };

  try {
    let info = await transporter.sendMail(mailOptions);
    console.log('Test Email sent: ' + info.response);
  } catch (error) {
    console.error('Error sending test email: ', error);
  }
};

sendTestEmail();
