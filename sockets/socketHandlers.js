const users = new Map(); 
const workspaceStores = new Map();

function setupSockets(io) {
  io.on("connection", (socket) => {
    const urlParams = new URLSearchParams(socket.handshake.url.split("?")[1]);
    const workspaceId = urlParams.get("workspaceId");
    const username = urlParams.get("username");

    // console.log(urlParams);

    if (!workspaceId || !username) {
      console.log("❌ Connection rejected: Missing username or workspaceId");
      return socket.disconnect();
    }

    if (!users.has(workspaceId)) users.set(workspaceId, new Map());
    const userMap = users.get(workspaceId);

    for (const [existingSocketId, existingUsername] of userMap.entries()) {
      if (existingUsername === username) {
        console.log(`♻️ Replacing old connection for ${username} in workspace ${workspaceId}`);
        userMap.delete(existingSocketId);
      }
    }

    userMap.set(socket.id, username);
    socket.join(workspaceId);

    console.log(`👥 ${username} joined workspace: ${workspaceId}`);
    io.to(workspaceId).emit("updateUsers", Array.from(userMap.entries()));

    // --- HANDLE LABEL UPDATES ---
    socket.on("updateLabels", (labels) => {
      console.log(`🔄 Labels updated in workspace ${workspaceId}:`, labels);
      
      if (!workspaceStores.has(workspaceId)) workspaceStores.set(workspaceId, {});
      workspaceStores.get(workspaceId).labels = labels;

      io.to(workspaceId).emit("syncLabels", labels);
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
          }
        }
      }
    });
  });
}

module.exports = setupSockets;
