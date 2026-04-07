// middleware to verify if the sender and receiver are friends before allowing certain actions


import User from '../models/User.js';

export const verifyFriendShip = async (req, res, next) => {
    const senderId = req.user?._id;
    const receiverId = req.params.id || req.params.receiverId;

    if (!senderId) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    if (!receiverId) {
        return res.status(400).json({ message: "Receiver id is required" });
    }

    try{
        const sender = await User.findById(senderId).select('friends');
        if(!sender) return res.status(404).json({message:"Sender not found"});

        const isFriend = sender.friends?.some((friendId) => friendId.toString() === receiverId);

        if(!isFriend) return res.status(403).json({message:"Forbidden: You are not friends with this user"});
        next();
    }
    catch(error){
        console.error("Error in verifyFriendShip middleware:", error);
        return res.status(500).json({message:"Internal server error"});
    }
}