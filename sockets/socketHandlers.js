const { getDB } = require("../config/db"); // MongoDB connection
const users = new Map();
const workspaceStores = new Map();
const dirtyWorkspaces = new Set(); // Track modified workspaces

// Save workspaces to MongoDB every 30 seconds 
setInterval(async () => {
  if (dirtyWorkspaces.size === 0) return;

  try {
    const db = getDB();
    const workspacesCollection = db.collection("workspaces");

    for (const workspaceId of dirtyWorkspaces) {
      const workspaceData = workspaceStores.get(workspaceId)?.data;
      if (!workspaceData) continue;

      // Upsert (update or insert) workspace data
      await workspacesCollection.updateOne(
        { workspaceId },
        { $set: { data: workspaceData, updatedAt: new Date() } },
        { upsert: true }
      );
    }

    console.log(`✅ Saved ${dirtyWorkspaces.size} workspaces to MongoDB.`);
    dirtyWorkspaces.clear(); // Clear after saving
  } catch (error) {
    console.error("❌ Error saving workspaces:", error);
  }
}, 30000); // Save every 30 seconds

function setupSockets(io) {
  io.on("connection", (socket) => {
    const urlParams = new URLSearchParams(socket.handshake.url.split("?")[1]);
    const workspaceId = urlParams.get("workspaceId");
    const username = urlParams.get("username");

    if (!workspaceId || !username) {
      console.log("❌ Connection rejected: Missing username or workspaceId");
      return socket.disconnect();
    }

    if (!users.has(workspaceId)) users.set(workspaceId, new Map());
    const userMap = users.get(workspaceId);

    userMap.set(socket.id, username);
    socket.join(workspaceId);

    console.log(`👥 ${username} joined workspace: ${workspaceId}`);
    io.to(workspaceId).emit("updateUsers", Array.from(userMap.entries()));

    // Ensure workspace data exists, fetch from DB if not in memory
    if (!workspaceStores.has(workspaceId)) {
      workspaceStores.set(workspaceId, { data: {} });

      // Load from MongoDB
      const db = getDB();
      db.collection("workspaces")
        .findOne({ workspaceId })
        .then((workspace) => {
          if (workspace) {
            workspaceStores.set(workspaceId, { data: workspace.data });
            socket.emit("sharedStateUpdate", { type: "sync", payload: workspace.data });
          }
        })
        .catch((err) => console.error("❌ Error loading workspace:", err));
    } else {
      // Send cached data
      socket.emit("sharedStateUpdate", { type: "sync", payload: workspaceStores.get(workspaceId).data });
    }

    // Handle dynamic shared state updates
    socket.on("sharedStateUpdate", ({ type, key, payload }) => {
      let currentState = workspaceStores.get(workspaceId).data || {};

      switch (type) {
        case "merge":
          if (!Array.isArray(currentState[key])) currentState[key] = [];
          if (Array.isArray(payload)) {
            const existingIds = new Set(currentState[key].map((item) => item.id));
            const newItems = payload.filter((item) => !existingIds.has(item.id));
            currentState[key] = [...currentState[key], ...newItems];
          }
          break;
        case "update":
          currentState[key] = payload;
          break;
        case "delete":
          delete currentState[key];
          break;
        case "replace":
          currentState = { ...payload };
          break;
        case "reset":
          currentState = {};
          break;
      }

      workspaceStores.set(workspaceId, { data: currentState });
      dirtyWorkspaces.add(workspaceId); // Mark workspace as modified

      io.to(workspaceId).emit("sharedStateUpdate", { type, key, payload });
    });

    socket.on("disconnect", () => {
      if (users.has(workspaceId)) {
        const userMap = users.get(workspaceId);
        if (userMap.has(socket.id)) {
          console.log(`🔴 ${userMap.get(socket.id)} left workspace: ${workspaceId}`);
          userMap.delete(socket.id);
          io.to(workspaceId).emit("updateUsers", Array.from(userMap.entries()));

          if (userMap.size === 0) {
            users.delete(workspaceId);
            console.log(`🛑 No users left in workspace ${workspaceId}, saving to MongoDB.`);

            // Immediate save when last user leaves
            const db = getDB();
            db.collection("workspaces").updateOne(
              { workspaceId },
              { $set: { data: workspaceStores.get(workspaceId).data, updatedAt: new Date() } },
              { upsert: true }
            );
          }
        }
      }
    });
  });
}

module.exports = setupSockets;
