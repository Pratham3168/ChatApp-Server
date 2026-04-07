import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const socketAuthMiddleware = async (socket,next) => {
    try{
        const token = socket.handshake.headers.cookie 
            ?.split("; ")
            .find((row) => row.startsWith("jwt="))
            ?.split("=")[1];

        
        if(!token){
            console.log("Socket connection rejected : No token provided");
            return next(new Error("Unauthorized - No token provided"));
        }

        const decoded = await jwt.verify(token, process.env.JWT_SECRET);
        if(!decoded){
            console.log("Socket connection rejected: Invalid Token");
            return next(new Error("Unathorized - Invalid token"));
        }

        const user = await User.findById(decoded.userId).select("-password");
        if(!user){
            console.log("Socket connection rejected: User not found");
            return next(new Error("User not found"));
        }

        socket.user = user;
        socket.userId = user._id.toString();

        console.log(`Socket authenticated for user : ${user.fullName} (${user._id})`);
        next();
    }catch(err){
        console.log("Error in socket authentication : ",err.message);
        next(new Error("Unauthorized - Authentication failed"));
    }
};