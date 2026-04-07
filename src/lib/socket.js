import {Server} from 'socket.io';
import http from 'http';
import express from 'express';
import { socketAuthMiddleware } from '../middlewares/socket.auth.middleware.js';
import Message from '../models/Message.js';

const CLIENT_ORIGINS = (process.env.CLIENT_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    cors:{
        origin(origin, callback) {
            if (!origin) return callback(null, true);
            if (CLIENT_ORIGINS.includes(origin)) return callback(null, true);
            return callback(new Error('Socket.IO CORS origin not allowed'));
        },
        credentials : true
    },
});

io.use(socketAuthMiddleware);



const userSocketsMap = {};

export function getReceiverSocketId(userId){
    return userSocketsMap[userId];
}

export function emitToUser(userId,eventName,payload){
    const socketId = getReceiverSocketId(userId);
    if(!socketId){
        return false;
    }
    io.to(socketId).emit(eventName,payload);
    return true;
}

io.on("connection", (socket) => {
    console.log("A user connected : ",socket.user.fullName);

    const userId = socket.userId;
    userSocketsMap[userId] = socket.id;


    io.emit("getOnlineUsers" , Object.keys(userSocketsMap));

    socket.on("typing:start", ({ toUserId } = {}) => {
        if (!toUserId) return;
        if (String(toUserId) === String(userId)) return;

        emitToUser(String(toUserId), "typing:started", {
            fromUserId: userId,
        });
    });

    socket.on("typing:stop", ({ toUserId } = {}) => {
        if (!toUserId) return;
        if (String(toUserId) === String(userId)) return;

        emitToUser(String(toUserId), "typing:stopped", {
            fromUserId: userId,
        });
    });

    socket.on("markMessagesAsRead", async ({ senderId, receiverId }) => {
        try {
            if (!senderId || !receiverId) return;

            await Message.updateMany(
                {
                    senderId,
                    receiverId,
                    status: { $ne: "read" },
                },
                { $set: { status: "read" } }
            );

            const senderSocketId = getReceiverSocketId(String(senderId));
            if (senderSocketId) {
                io.to(senderSocketId).emit("messagesRead", {
                    senderId,
                    receiverId,
                });
            }
        } catch (error) {
            console.error("Error marking messages as read:", error);
        }
    });

    socket.on("disconnect" , () => { 
        console.log("A user disconnected : ", socket.user.fullName);
        delete userSocketsMap[userId];
        io.emit("getOnlineUsers" , Object.keys(userSocketsMap));
    });

});

export {io, app, server}