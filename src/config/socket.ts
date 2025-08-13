import { Server } from "socket.io";
import http from "http";

let io: Server;

export const initSocket = (server: http.Server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.frontend_URL,
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    console.log("✅ Socket.IO initialized");

    io.on("connection", (socket) => {
        console.log("🔌 User connected:", socket.id);
        socket.on("joinUser", (userId: string) => {
            socket.join(`user:${userId}`);
            console.log(`User ${userId} joined room user:${userId}`);
        });

        socket.on("joinAllBoards", ({ ownedBoards = [], memberBoards = [], userId }: {
            ownedBoards: string[];
            memberBoards: string[];
            userId: string;
        }) => {
            if (!userId) return;

            const allBoards = [...new Set([...ownedBoards, ...memberBoards])];

            allBoards.forEach((boardId) => {
                const generalRoom = `board:${boardId}`;
                socket.join(generalRoom);
                console.log(`➡️ User ${userId} joined room ${generalRoom}`);
            });

            ownedBoards.forEach((boardId) => {
                const ownerRoom = `board:${boardId}:owner`;
                socket.join(ownerRoom);
                console.log(`👑 Owner ${userId} joined room ${ownerRoom}`);
            });
        });

        socket.on("disconnect", () => {
            console.log("❌ User disconnected:", socket.id);
        });
    });
    console.log("✅ Socket.IO connection handler set up");


    io.on("error", (error) => {
        console.error("💥 Socket.IO error:", error);
    });
};

export const getIO = () => {
    if (!io) throw new Error("❗Socket.IO not initialized");
    return io;
};
