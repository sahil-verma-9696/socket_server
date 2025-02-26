const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const { getDB } = require("../config/db");
const dotenv = require("dotenv");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { getPasswordResetEmail } = require("../utils/emailTemplates");

dotenv.config();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;


// forgot password
router.post("/forgot-password", async (req, res) => {
  try {
    const db = getDB();
    const usersCollection = db.collection("users");
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required!" });
    }

    const user = await usersCollection.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found!" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour expiry

    // Save token in DB
    await usersCollection.updateOne(
      { email },
      { $set: { resetToken, resetTokenExpires } }
    );

    // Send email
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}&email=${email}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "🔒 Reset Your Password - CollabHub",
  html: getPasswordResetEmail(resetLink), // ✅ Using the separate email template
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: "Password reset link sent!" });
  } catch (error) {
    console.error("❌ Forgot Password Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// reset password
router.post("/reset-password", async (req, res) => {
  try {
    const db = getDB();
    const usersCollection = db.collection("users");
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    const user = await usersCollection.findOne({ email });

    if (!user || user.resetToken !== token || new Date() > user.resetTokenExpires) {
      return res.status(400).json({ message: "Invalid or expired token!" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password in DB & remove token
    await usersCollection.updateOne(
      { email },
      { $set: { password: hashedPassword }, $unset: { resetToken: "", resetTokenExpires: "" } }
    );

    res.json({ message: "Password reset successful!" });
  } catch (error) {
    console.error("❌ Reset Password Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// 🛠 Signup Route
router.post("/signup", async (req, res) => {
  try {
    const db = getDB();
    const usersCollection = db.collection("users");

    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists!" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save user to DB
    const newUser = {
      name,
      email,
      password: hashedPassword,
      createdAt: new Date(),
    };
    await usersCollection.insertOne(newUser);

    // Generate JWT Token
    const token = jwt.sign({ email, name }, JWT_SECRET, { expiresIn: "7d" });

    // **Set Session**
    req.session.user = { email, name };

    res.json({
      message: "Signup successful!",
      token, // Optional JWT
      user: { name, email },
    });
  } catch (error) {
    console.error("❌ Signup Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// 🔑 Login Route
router.post("/login", async (req, res) => {
  try {
    const db = getDB();
    const usersCollection = db.collection("users");

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    const user = await usersCollection.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password!" });
    }

    const token = jwt.sign({ email, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    // **Set Session**
    req.session.user = { email, name: user.name };

    res.json({
      message: "Login successful!",
      token,
      user: { name: user.name, email },
    });
  } catch (error) {
    console.error("❌ Login Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// 🚪 Logout Route
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Logout failed" });
    }
    res.clearCookie("connect.sid"); // Default session cookie clear
    res.json({ message: "Logout successful!" });
  });
});

// 🛡 Check Auth Route
router.get("/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Not logged in" });
  }
  res.json({ user: req.session.user });
});

module.exports = router;
