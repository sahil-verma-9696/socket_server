const express = require("express");
const { getDB } = require("../config/db");
const { v4: uuidv4 } = require("uuid"); // For unique slug generation
const router = express.Router();

router.post("/create-team", async (req, res) => {
  try {
    const db = getDB();
    const teamsCollection = db.collection("teams");

    const { teamName } = req.body;
    // const createdBy = req.cookies.username; // Get username from cookies
    const createdBy = "sahil"; // Get username from cookies

    if (!teamName || !createdBy) {
      return res
        .status(400)
        .json({ message: "Team name and creator required!" });
    }

    // Generate a unique slug
    const slug =
      teamName.toLowerCase().replace(/\s+/g, "-") + "-" + uuidv4().slice(0, 6);

    // Save to database
    const newTeam = {
      teamName,
      slug,
      createdBy,
      members: [{ name: createdBy, role: "admin" }], // Creator is admin
    };

    await teamsCollection.insertOne(newTeam);

    res.json({
      message: "Team created successfully!",
      teamName,
      slug,
      shareLink: `http://localhost:3000/team/${slug}`,
    });
  } catch (error) {
    console.error("❌ Team Creation Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.post("/join-team", async (req, res) => {
  try {
    const db = getDB();
    const teamsCollection = db.collection("teams");

    const { slug } = req.body;
    const username = req.cookies.username; // Get username from cookies

    if (!slug || !username) {
      return res
        .status(400)
        .json({ message: "Team slug and username required!" });
    }

    const team = await teamsCollection.findOne({ slug });
    if (!team) {
      return res.status(404).json({ message: "Team not found!" });
    }

    // Check if user is already in the team
    const isMember = team.members.some((member) => member.name === username);
    if (isMember) {
      return res.status(400).json({ message: "You are already in this team!" });
    }

    // Add user as a member (default role: "member")
    await teamsCollection.updateOne(
      { slug },
      { $push: { members: { name: username, role: "member" } } }
    );

    res.json({
      message: "Joined team successfully!",
      teamName: team.teamName,
      slug,
    });
  } catch (error) {
    console.error("❌ Join Team Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

module.exports = router;
