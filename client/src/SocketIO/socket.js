import { io } from "socket.io-client";

// Adjust the URL if your backend is hosted remotely
export const socket = io("http://localhost:5000", {
  transports: ["websocket"],
  withCredentials: true,
});