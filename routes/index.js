const express = require("express");
const authRoutes = require("./authRoutes");
const teamRoutes = require("./teamRoutes");
const router = express.Router();



router.use("/auth", authRoutes);
router.use("/team", teamRoutes);

module.exports = router;
