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

// not test now
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

    // Check if user already requested to join
    const isPending = team.pendingRequests.some((user) => user === username);
    if (isPending) {
      return res.status(400).json({ message: "Join request already sent!" });
    }

    // Add user to pendingRequests instead of directly joining
    await teamsCollection.updateOne(
      { slug },
      { $push: { pendingRequests: username } }
    );

    res.json({
      message: "Join request sent successfully!",
      teamName: team.teamName,
      slug,
    });
  } catch (error) {
    console.error("❌ Join Team Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// not test now
router.post("/approve-join", async (req, res) => {
  try {
    const db = getDB();
    const teamsCollection = db.collection("teams");

    const { slug, username, approve } = req.body;
    const leader = req.cookies.username; // Leader's username from cookies

    if (!slug || !username || approve === undefined) {
      return res.status(400).json({ message: "Missing required fields!" });
    }

    const team = await teamsCollection.findOne({ slug });
    if (!team) {
      return res.status(404).json({ message: "Team not found!" });
    }

    // Check if current user is the team leader
    if (team.leader !== leader) {
      return res
        .status(403)
        .json({ message: "Only the team leader can approve requests!" });
    }

    // Check if the user actually requested to join
    if (!team.pendingRequests.includes(username)) {
      return res
        .status(400)
        .json({ message: "No pending request found for this user!" });
    }

    if (approve) {
      // Approve request: Move user from `pendingRequests` to `members`
      await teamsCollection.updateOne(
        { slug },
        {
          $pull: { pendingRequests: username },
          $push: { members: { name: username, role: "member" } },
        }
      );
      res.json({ message: `User ${username} has been added to the team!` });
    } else {
      // Reject request: Remove user from `pendingRequests`
      await teamsCollection.updateOne(
        { slug },
        { $pull: { pendingRequests: username } }
      );
      res.json({ message: `User ${username}'s join request was rejected.` });
    }
  } catch (error) {
    console.error("❌ Approve Join Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// not test now
router.put("/update-profile", async (req, res) => {
  try {
    const db = getDB();
    const usersCollection = db.collection("users");

    // Extract user from token
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized! No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email;

    const { skills, role } = req.body;
    if (!skills || !Array.isArray(skills)) {
      return res.status(400).json({ message: "Skills must be a valid array!" });
    }

    if (!role || !["member", "admin", "leader"].includes(role)) {
      return res.status(400).json({ message: "Invalid role!" });
    }

    // Update user profile
    const result = await usersCollection.updateOne(
      { email },
      { $set: { skills, role } }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({ message: "No changes made!" });
    }

    res.json({ message: "Profile updated successfully!", skills, role });
  } catch (error) {
    console.error("❌ Update Profile Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});


// not test now
router.get("/members/:teamSlug", async (req, res) => {
  try {
    const db = getDB();
    const teamsCollection = db.collection("teams");

    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized! No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email;

    const { teamSlug } = req.params;
    if (!teamSlug) {
      return res.status(400).json({ message: "Team slug is required!" });
    }

    // Fetch team details
    const team = await teamsCollection.findOne({ slug: teamSlug });
    if (!team) {
      return res.status(404).json({ message: "Team not found!" });
    }

    // Check if user is a member of the team
    const isMember = team.members.some((member) => member.email === email);
    if (!isMember) {
      return res.status(403).json({ message: "Access denied! You are not a team member." });
    }

    res.json({ teamName: team.teamName, members: team.members });
  } catch (error) {
    console.error("❌ Get Team Members Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});


// not test now
router.get("/find-users", async (req, res) => {
  try {
    const db = getDB();
    const usersCollection = db.collection("users");

    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized! No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { skill } = req.query;
    if (!skill) {
      return res.status(400).json({ message: "Skill query parameter is required!" });
    }

    // Find users who have the specified skill
    const users = await usersCollection
      .find({ skills: { $in: [skill] } })
      .project({ name: 1, email: 1, skills: 1, role: 1 })
      .toArray();

    if (users.length === 0) {
      return res.status(404).json({ message: "No users found with this skill!" });
    }

    res.json({ users });
  } catch (error) {
    console.error("❌ Get Users by Skill Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});


// not test now
router.get("/find-teams", async (req, res) => {
  try {
    const db = getDB();
    const teamsCollection = db.collection("teams");

    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized! No token provided." });
    }

    jwt.verify(token, process.env.JWT_SECRET);

    const { skill } = req.query;
    if (!skill) {
      return res.status(400).json({ message: "Skill query parameter is required!" });
    }

    // Find teams where the skill is missing
    const teams = await teamsCollection
      .find({ "requiredSkills": { $in: [skill] } })
      .project({ teamName: 1, slug: 1, requiredSkills: 1, members: 1 })
      .toArray();

    if (teams.length === 0) {
      return res.status(404).json({ message: "No matching teams found!" });
    }

    res.json({ teams });
  } catch (error) {
    console.error("❌ Get Team Suggestions Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});


// not test now
router.get("/templates", async (req, res) => {
  try {
    const db = getDB();
    const templatesCollection = db.collection("projectTemplates");

    // Fetch all project templates from the database
    const templates = await templatesCollection.find().toArray();

    if (templates.length === 0) {
      return res.status(404).json({ message: "No project templates available!" });
    }

    res.json({ templates });
  } catch (error) {
    console.error("❌ Get Project Templates Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

module.exports = router;
