import express from 'express';
import { protectRoute } from '../middlewares/auth.middleware.js';
import { getChatPartners,getMessagesByUserId, sendMessage } from '../controllers/message.controller.js';
import { arcjetProtection } from '../middlewares/arcjet.middleware.js';
import { verifyFriendShip } from '../middlewares/friend.middleware.js';

const router = express.Router();

router.use(arcjetProtection,protectRoute); // Apply Arcjet protection and authentication middleware to all routes in this router

// Privacy-first mode: disable open contacts endpoint (friend-based flow only)
// router.get('/contacts',getAllContacts);
router.get("/chats", getChatPartners);
router.get("/:id", verifyFriendShip, getMessagesByUserId);
router.post("/send/:id", verifyFriendShip, sendMessage);

router.get('/send',(req,res)=>{
    res.send('Send Message Endpoint');
});


export default router;