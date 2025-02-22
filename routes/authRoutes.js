const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { getDB } = require("../config/db");
const dotenv = require("dotenv");

dotenv.config();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

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
    const newUser = { name, email, password: hashedPassword, createdAt: new Date() };
    await usersCollection.insertOne(newUser);

    // Generate JWT Token
    const token = jwt.sign({ email, name }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      message: "Signup successful!",
      token, // Send JWT token
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

    const token = jwt.sign({ email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ message: "Login successful!", token, role: user.role });
  } catch (error) {
    console.error("❌ Login Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});


module.exports = router;
