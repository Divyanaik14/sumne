const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

dotenv.config();

const app = express();
const port = process.env.PORT || 5500;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors({
  origin: 'http://127.0.0.1:5500', // adjust if your client is served from a different origin
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
}));

app.use(express.static('public'));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB', err));

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  verified: { type: Boolean, default: false },
});

const User = mongoose.model('User', userSchema);

const verificationCodeSchema = new mongoose.Schema({
  email: { type: String, required: true },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: '10m' },
});

const VerificationCode = mongoose.model('VerificationCode', verificationCodeSchema);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendVerificationEmail = async (email, code) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verification Code',
    text: `Your verification code is ${code}`
  };

  await transporter.sendMail(mailOptions);
};

app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    const verificationCode = crypto.randomBytes(3).toString('hex');
    const newCode = new VerificationCode({ email, code: verificationCode });
    await newCode.save();

    await sendVerificationEmail(email, verificationCode);

    res.status(201).json({ message: 'User created successfully, verification code sent to email' });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Error creating user', error });
  }
});

app.post('/verify', async (req, res) => {
  const { email, code } = req.body;
  try {
    const verificationEntry = await VerificationCode.findOne({ email, code });
    if (!verificationEntry) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    const user = await User.findOne({ email });
    user.verified = true;
    await user.save();

    await VerificationCode.deleteOne({ email, code });

    res.status(200).json({ message: 'Verification successful' });
  } catch (error) {
    console.error('Error verifying user:', error);
    res.status(500).json({ message: 'Error verifying user', error });
  }
});

app.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    if (!user.verified) {
      return res.status(400).json({ message: 'Email not verified' });
    }
    if (await bcrypt.compare(password, user.password)) {
      res.status(200).json({ message: 'Sign-in successful' });
    } else {
      res.status(400).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error signing in', error });
  }
});

app.get('/', (req, res) => {
  res.send('Welcome to the API');
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));  // Adjust path as necessary
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
