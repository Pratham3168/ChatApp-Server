import express from "express";
import { protectRoute } from "../middlewares/auth.middleware.js";
import { arcjetProtection } from "../middlewares/arcjet.middleware.js";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  getMyFriends,
  getIncomingRequests,
  getOutgoingRequests,
  rejectFriendRequest,
  removeFriend,
  searchUsers,
  sendFriendRequest,
} from "../controllers/friend.controller.js";

const router = express.Router();

router.use(arcjetProtection, protectRoute);

router.get("/incoming", getIncomingRequests);
router.get("/outgoing", getOutgoingRequests);
router.get("/list", getMyFriends);
router.get("/search", searchUsers);
router.post("/send/:id", sendFriendRequest);
router.post("/:id/accept", acceptFriendRequest);
router.post("/:id/reject", rejectFriendRequest);
router.post("/:id/cancel", cancelFriendRequest);
router.delete("/:id/remove", removeFriend);

export default router;