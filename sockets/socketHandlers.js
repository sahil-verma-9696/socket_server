const users = new Map();
const workspaceStores = new Map();

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

    // Prevent duplicate usernames
    for (const [existingSocketId, existingUsername] of userMap.entries()) {
      if (existingUsername === username) {
        console.log(
          `♻️ Replacing old connection for ${username} in workspace ${workspaceId}`
        );
        userMap.delete(existingSocketId);
      }
    }

    userMap.set(socket.id, username);
    socket.join(workspaceId);

    console.log(`👥 ${username} joined workspace: ${workspaceId}`);
    io.to(workspaceId).emit("updateUsers", Array.from(userMap.entries()));

    // Ensure workspace data exists
    if (!workspaceStores.has(workspaceId)) {
      workspaceStores.set(workspaceId, { data: {} });
    }

    // Send initial workspace data on connect
    socket.emit("sharedStateUpdate", {
      type: "sync",
      payload: workspaceStores.get(workspaceId).data,
    });

    // Handle dynamic shared state updates
    socket.on("sharedStateUpdate", ({ type, key, payload }) => {
      console.log(
        "workspaceStores",
        workspaceStores.get(workspaceId).data || {}
      );

      console.log(`🔄 Shared state update in workspace ${workspaceId}:`, {
        type,
        key,
        payload,
      });

      let currentState = workspaceStores.get(workspaceId).data || {};

      switch (type) {
        case "merge":
          if (!Array.isArray(currentState[key])) {
            currentState[key] = []; // ✅ Initialize as an array if undefined
          }

          if (Array.isArray(payload)) {
            // ✅ Prevent duplicate IDs in array
            const existingIds = new Set(
              currentState[key].map((item) => item.id)
            );
            const newItems = payload.filter(
              (item) => !existingIds.has(item.id)
            );

            currentState[key] = [...currentState[key], ...newItems];
          } else {
            console.warn(`⚠️ Merge failed: ${key} is not an array`);
          }
          break;

        case "update":
          currentState[key] = payload;
          break;

        case "delete":
          delete currentState[key];
          break;

        case "replace":
          currentState = { ...payload }; // ✅ Ensure complete replacement
          break;

        case "reset":
          currentState = {};
          break;
      }

      workspaceStores.set(workspaceId, { data: currentState });

      // Broadcast **only the updated key** (prevents full state resending)
      io.to(workspaceId).emit("sharedStateUpdate", { type, key, payload });
    });

    socket.on("disconnect", () => {
      if (users.has(workspaceId)) {
        const userMap = users.get(workspaceId);
        if (userMap.has(socket.id)) {
          console.log(
            `🔴 ${userMap.get(socket.id)} left workspace: ${workspaceId}`
          );
          userMap.delete(socket.id);
          io.to(workspaceId).emit("updateUsers", Array.from(userMap.entries()));

          // If no users left, clean up workspace
          if (userMap.size === 0) {
            users.delete(workspaceId);
            console.log(
              `🛑 No users left in workspace ${workspaceId}, but state is retained.`
            );
          }
        }
      }
    });
  });
}

module.exports = setupSockets;
