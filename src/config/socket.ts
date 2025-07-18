import { Server } from "socket.io";
import http from "http";

let io: Server;

export const initSocket = (server: http.Server) => {
    io = new Server(server, {
        cors: {
            origin: "http://localhost:8080",
            methods: ["GET", "POST"],
            credentials: true,
        },
    });
    console.log("Socket.IO initialized");
    io.on("connection", (socket) => {
        console.log("User connected", socket.id);

        socket.on("joinBoardRoom", ({ boardId, userId, isOwner }) => {
            const generalRoom = `board:${boardId}`;
            socket.join(generalRoom);
            console.log(`User ${userId} joined room ${generalRoom}`);

            if (isOwner) {
                const ownerRoom = `board:${boardId}:owner`;
                socket.join(ownerRoom);
                console.log(`Owner ${userId} also joined room ${ownerRoom}`);
            }
        });

        socket.on("leaveBoardRoom", ({ boardId, userId, isOwner }) => {
            const generalRoom = `board:${boardId}`;
            socket.leave(generalRoom);
            console.log(`User ${userId} left room ${generalRoom}`);

            if (isOwner) {
                const ownerRoom = `board:${boardId}:owner`;
                socket.leave(ownerRoom);
                console.log(`Owner ${userId} also left room ${ownerRoom}`);
            }
        });

        socket.on("disconnect", () => {
            console.log("User disconnected", socket.id);
        });
    });

    io.on("error", (error) => {
        console.error("Socket.IO error:", error);
    })
};

export const getIO = () => {
    if (!io) throw new Error("Socket.io not initialized");
    return io;
};
