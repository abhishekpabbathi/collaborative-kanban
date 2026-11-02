import { io } from "socket.io-client";

let socket;

export function connectSocket(token, tenantId) {
  if (socket) socket.disconnect();

  socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000
  });

  socket.on("connect", () => {
    if (tenantId) socket.emit("tenant:join", tenantId);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
