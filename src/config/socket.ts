import { Server } from "socket.io";
import http from "http";
import User from "../models/User/User";

let io: Server;

// Track connected users: Map<userId, Set<socketIds>>
const connectedUsers = new Map<string, Set<string>>();

// Track user's workspace memberships: Map<userId, Set<workspaceIds>>
const userWorkspaces = new Map<string, Set<string>>();

export const initSocket = (server: http.Server) => {
    io = new Server(server, {
        cors: {
            // origin: process.env.frontend_URL,
            origin: (origin, callback) => {
                callback(null, true)
            },
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    console.log("✅ Socket.IO initialized");

    io.on("connection", (socket) => {
        console.log("🔌 User connected:", socket.id);

        socket.on("joinUser", (userId: string) => {
            socket.join(`user:${userId}`);

            // Track user connection
            if (!connectedUsers.has(userId)) {
                connectedUsers.set(userId, new Set());
            }
            connectedUsers.get(userId)?.add(socket.id);
            // Mark user as active
            User.findByIdAndUpdate(userId, { isActive: true, last_active: new Date() }).catch((err) => {
                console.error("Failed to set user active:", err);
            });

            console.log(`User ${userId} joined room user:${userId}`);
        });

        socket.on("joinWorkspace", ({ workspaceId, userId }: { workspaceId: string; userId: string }) => {
            socket.join(`workspace:${workspaceId}`);

            // Track user's workspace membership
            if (!userWorkspaces.has(userId)) {
                userWorkspaces.set(userId, new Set());
            }
            userWorkspaces.get(userId)?.add(workspaceId);

            // Emit memberOnline event to workspace
            io.to(`workspace:${workspaceId}`).emit('memberOnline', { userId, workspaceId });

            console.log(`➡️ User ${userId} joined room workspace:${workspaceId}`);
        });

        socket.on("disconnect", () => {
            console.log("❌ User disconnected:", socket.id);

            // Find which user this socket belonged to
            for (const [userId, socketIds] of connectedUsers.entries()) {
                if (socketIds.has(socket.id)) {
                    socketIds.delete(socket.id);

                    // If this user has no more connected sockets, emit offline event
                    if (socketIds.size === 0) {
                        connectedUsers.delete(userId);
                        // Persist offline status
                        User.findByIdAndUpdate(userId, { isActive: false, last_active: new Date() }).catch((err) => {
                            console.error("Failed to set user inactive:", err);
                        });

                        // Emit memberOffline to all workspace rooms this user was in
                        const workspaces = userWorkspaces.get(userId);
                        if (workspaces) {
                            workspaces.forEach((workspaceId) => {
                                io.to(`workspace:${workspaceId}`).emit('memberOffline', { userId, workspaceId });
                                console.log(`User ${userId} went offline in workspace:${workspaceId}`);
                            });
                            userWorkspaces.delete(userId);
                        }
                    }
                    break;
                }
            }
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
