import "dotenv/config";
import app from './app';
import connectDB from './config/db';
import http from "http";
import { initSocket } from "./config/socket";

connectDB()

const PORT = process.env.PORT || 5002

// const server = createServer(app);
// export const io = new SocketIOServer(server, {
//     cors: {
//         origin: "http://localhost:8080", // <-- use your frontend URL, NOT '*'
//         methods: ["GET", "POST"],
//         credentials: true
//     }
// })
const server = http.createServer(app);
console.log("Initializing Socket.IO...");

initSocket(server);

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}/api-docs`);
});
