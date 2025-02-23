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

    // Handle workspace updates with a single event
    socket.on("sharedStateUpdate", ({ type, payload }) => {
      console.log(`🔄 Shared state update in workspace ${workspaceId}:`, { type, payload });
    
      let currentState = workspaceStores.get(workspaceId).data || { cards: [] };
    
      switch (type) {
        case "update":
          workspaceStores.set(workspaceId, { data: { ...currentState, cards: payload.cards } });
          break;
    
        case "replace":
          workspaceStores.set(workspaceId, { data: payload });
          break;
    
        case "delete":
          const updatedCards = currentState.cards.filter(card => card.id !== payload.cardId);
          workspaceStores.set(workspaceId, { data: { ...currentState, cards: updatedCards } });
    
          io.to(workspaceId).emit("sharedStateUpdate", { 
            type: "replace", 
            payload: { cards: updatedCards }  // ✅ Correct full state sent
          });
          break;
    
        case "reset":
          workspaceStores.set(workspaceId, { data: { cards: [] } });
          break;
      }
    
      if (type !== "delete") {
        io.to(workspaceId).emit("sharedStateUpdate", {
          type,
          payload: workspaceStores.get(workspaceId).data,
        });
      }
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

          if (userMap.size === 0) {
            users.delete(workspaceId);
          }
        }
      }
    });
  });
}

module.exports = setupSockets;
