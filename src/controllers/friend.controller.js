import FriendRequest from "../models/FriendRequest.js";
import User from "../models/User.js";
import { emitToUser } from "../lib/socket.js";
import mongoose from "mongoose";

const getFriendRequestPairKey = (userA, userB) => {
  const [firstId, secondId] = [userA, userB].map((id) => id.toString()).sort();

  return `${firstId}:${secondId}`;
};

export const searchUsers = async (req, res) => {
  const requesterId = req.user._id;
  const query = (req.query.q || "").trim();
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || "20", 10), 1), 50);

  try {
    if (query.length < 2) {
      return res.status(200).json([]);
    }

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedQuery, "i");

    const users = await User.find({
      _id: { $ne: requesterId },
      $or: [{ fullName: regex }, { email: regex }],
    })
      .select("fullName email profilePic")
      .limit(limit)
      .sort({ fullName: 1 });

    res.status(200).json(users);
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getIncomingRequests = async (req, res) => {
  try {
    const incomingRequests = await FriendRequest.find({
      receiverId: req.user._id,
      status: "pending",
    })
      .populate("senderId", "fullName email profilePic")
      .sort({ createdAt: -1 });

    res.status(200).json(incomingRequests);
  } catch (error) {
    console.error("Error fetching incoming friend requests:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getOutgoingRequests = async (req, res) => {
  try {
    const outgoingRequests = await FriendRequest.find({
      senderId: req.user._id,
      status: "pending",
    })
      .populate("receiverId", "fullName email profilePic")
      .sort({ createdAt: -1 });

    res.status(200).json(outgoingRequests);
  } catch (error) {
    console.error("Error fetching outgoing friend requests:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const sendFriendRequest = async (req, res) => {
//   res.status(200).json({ message: "Friend request route is ready" });

    const { id: receiverId } = req.params;
    const senderId = req.user._id;
  const pairKey = getFriendRequestPairKey(senderId, receiverId);

    try{
        const receiverExists = await User.exists({ _id: receiverId });
        if (!receiverExists) {
          return res.status(404).json({ message: "Receiver user not found" });
        }

        if(senderId.toString() === receiverId){
            return res.status(400).json({ message: "You cannot send a friend request to yourself" });
        }

        const senderUser = await User.findById(senderId).select("friends");
        if (senderUser?.friends?.some((id) => id.toString() === receiverId)) {
          return res.status(400).json({ message: "You are already friends" });
        }

        const activeRequest = await FriendRequest.findOne({
            pairKey,
            status: "pending",
        });

        if (activeRequest) {
            return res.status(400).json({ message: "Friend request already exists between these users" });
        }

        const request = await FriendRequest.create({
          senderId,
          receiverId,
          pairKey,
          status: "pending",
        });

        const sender = await User.findById(senderId).select("fullName email profilePic");

        emitToUser(receiverId, "friend:request:created", {
          requestId: request._id.toString(),
          sender,
          senderId: senderId.toString(),
          receiverId: receiverId.toString(),
        });

        res.status(201).json({ message: "Friend request sent successfully", request });

    }catch(err){

    if (err?.code === 11000) {
      return res.status(400).json({ message: "Friend request already exists between these users" });
    }

        console.error("Error sending friend request:", err);
        res.status(500).json({ message: "Internal server error" });

    }

};

export const acceptFriendRequest = async (req, res) => {
  const { id: requestId } = req.params;
  const userId = req.user._id;

  try {
    // Atomic transition from pending -> accepted prevents double-accept races.
    const request = await FriendRequest.findOneAndUpdate(
      {
        _id: requestId,
        receiverId: userId,
        status: "pending",
      },
      {
        $set: { status: "accepted" },
      },
      { new: true }
    );

    if (!request) {
      return res
        .status(400)
        .json({ message: "Request already handled or not found" });
    }

    await Promise.all([
      User.findByIdAndUpdate(request.senderId, {
        $addToSet: { friends: request.receiverId },
      }),
      User.findByIdAndUpdate(request.receiverId, {
        $addToSet: { friends: request.senderId },
      }),
    ]);

    const [sender, receiver] = await Promise.all([
      User.findById(request.senderId).select("fullName email profilePic"),
      User.findById(request.receiverId).select("fullName email profilePic"),
    ]);

    const payload = {
      requestId: request._id.toString(),
      sender,
      receiver,
      senderId: request.senderId.toString(),
      receiverId: request.receiverId.toString(),
    };

    emitToUser(request.senderId.toString(), "friend:request:accepted", payload);
    emitToUser(request.receiverId.toString(), "friend:request:accepted", payload);

    return res.status(200).json({ message: "Friend request accepted", request });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const rejectFriendRequest = async (req, res) => {
  const { id: requestId } = req.params;
  const userId = req.user._id;

  try {
    // 🔒 Atomic update
    const request = await FriendRequest.findOneAndUpdate(
      {
        _id: requestId,
        receiverId: userId,
        status: "pending",
      },
      {
        $set: { status: "rejected" },
      },
      { new: true }
    );

    // ❌ Already handled or invalid
    if (!request) {
      return res
        .status(400)
        .json({ message: "Request already handled or not found" });
    }

    const payload = {
      requestId: request._id.toString(),
      senderId: request.senderId.toString(),
      receiverId: request.receiverId.toString(),
      status: request.status,
    };

    // 🔔 Emit events
    emitToUser(request.senderId.toString(), "friend:request:rejected", payload);
    emitToUser(request.receiverId.toString(), "friend:request:rejected", payload);

    return res.status(200).json({
      message: "Friend request rejected",
      request,
    });
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const cancelFriendRequest = async (req, res) => {
  const { id: requestId } = req.params;
  const userId = req.user._id;

  try {
    // 🔒 Atomic delete
    const request = await FriendRequest.findOneAndDelete({
      _id: requestId,
      senderId: userId,
      status: "pending",
    });

    if (!request) {
      return res.status(400).json({
        message: "Request already handled or not found",
      });
    }

    const payload = {
      requestId: request._id.toString(),
      senderId: request.senderId.toString(),
      receiverId: request.receiverId.toString(),
      status: "cancelled",
    };

    emitToUser(request.senderId.toString(), "friend:request:cancelled", payload);
    emitToUser(request.receiverId.toString(), "friend:request:cancelled", payload);

    return res.status(200).json({
      message: "Friend request cancelled",
    });
  } catch (error) {
    console.error("Error cancelling friend request:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getMyFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("friends")
      .populate("friends", "fullName email profilePic");

    res.status(200).json(user?.friends || []);
  } catch (error) {
    console.error("Error fetching friends list:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const removeFriend = async (req, res) => {
  const { id: friendId } = req.params;
  const userId = req.user._id;

  try {
    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      return res.status(400).json({ message: "Invalid friend id" });
    }

    if (userId.toString() === friendId) {
      return res.status(400).json({ message: "You cannot remove yourself" });
    }

    const friendExists = await User.exists({ _id: userId, friends: friendId });
    if (!friendExists) {
      return res.status(404).json({ message: "Friend not found in your friends list" });
    }

    await Promise.all([
      User.findByIdAndUpdate(userId, { $pull: { friends: friendId } }),
      User.findByIdAndUpdate(friendId, { $pull: { friends: userId } }),
    ]);

    res.status(200).json({ message: "Friend removed successfully" });

  } catch (err) {
    console.error("Error removing friend:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};