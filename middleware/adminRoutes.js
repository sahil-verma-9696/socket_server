const express = require("express");
const { getDB } = require("../config/db");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// 🚀 Protected route for Admins only
router.get("/dashboard", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = getDB();
    const usersCollection = db.collection("users");

    const users = await usersCollection.find({}, { projection: { password: 0 } }).toArray();
    res.json({ message: "Admin Dashboard Access Granted", users });
  } catch (error) {
    console.error("❌ Admin Dashboard Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

module.exports = router;
