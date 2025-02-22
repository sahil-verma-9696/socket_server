const express = require("express");
const authRoutes = require("./authRoutes");
const teamRoutes = require("./teamRoutes");
const router = express.Router();

router.get("/", (req, res) => {
  res.send("FocusFlow Backend is Running...");
});

router.use("/auth", authRoutes);
router.use("/team", teamRoutes);

module.exports = router;
