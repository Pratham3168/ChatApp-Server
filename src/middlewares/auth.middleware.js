import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import dotenv from 'dotenv';
dotenv.config();


export const protectRoute = async (req,res,next) =>{

    try{
        const token = req.cookies.jwt;

        if(!token){
            return res.status(401).json({message:"Unauthorized: No token provided"});
        }
        // Here you would typically verify the token and extract user information

        const decodedToken = jwt.verify(token,process.env.JWT_SECRET);
        if(!decodedToken) return res.status(401).json({message:"Unauthorized: Invalid provided"});


        const user = await User.findById(decodedToken.userId).select('-password');
        if(!user) return res.status(404).json({message:"Unauthorized: User not found"});
        
        req.user = user;
        next();
    }
    catch(error){
        console.error("Error in protectRoute middleware:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}