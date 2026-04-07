import User from "../models/User.js";
import { generateToken } from "../lib/utils.js";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "../emails/emailHandlers.js";
import cloudinary from "../lib/cloudinary.js";
import dotenv from 'dotenv';
dotenv.config();

const authCookieOptions = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  secure: process.env.NODE_ENV === "production",
};


export const signup = async (req, res) => {
  const { fullName, email, password } = req.body || {};

  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    // check if emailis valid: regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    //check if email already exists in database
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
    });

    if (newUser) {
      const savedUser = await newUser.save();
      generateToken(savedUser._id, res);


      res.status(201).json({
        _id: savedUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        profilePic: newUser.profilePic,
      });
      try {
        await sendWelcomeEmail(savedUser.email, savedUser.fullName, process.env.CLIENT_URL);
      } catch (error) {
        console.error("Failed to send welcome email:", error);
      }
    } else {
      res.status(400).json({ message: "Invalid User Data" });
    }
  } catch (err) {
    console.log("Error in signup controller:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req, res) => {
  
    const { email, password } = req.body || {};

    try {
      if (!email || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const user = await User.findOne({ email });

      if(!user){
        return res.status(400).json({ message: "Invalid Credentials" });
      }

      const isPasswordMatch = await bcrypt.compare(password, user.password);

        if (!isPasswordMatch) {
            return res.status(401).json({ message: "Invalid Credentials" });
        }

        generateToken(user._id, res);
        res.status(200).json({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            profilePic: user.profilePic,
        });



    } catch (err) {
        console.log("Error in login controller:", err);
        res.status(500).json({ message: "Internal server error" });
    }

};

export const logout = (_, res) => {
  res.cookie("jwt", "", { ...authCookieOptions, maxAge: 0 });
  res.status(200).json({ message: "Logged out successfully" });
};




export const updateProfile = async (req, res) => {
  try {
    const { profilePic, fullName } = req.body || {};
    const trimmedFullName = typeof fullName === "string" ? fullName.trim() : "";

    if (!profilePic && !trimmedFullName) {
      return res.status(400).json({ message: "Provide fullName or profilePic to update" });
    }

    if (fullName !== undefined && trimmedFullName.length < 2) {
      return res.status(400).json({ message: "Full name must be at least 2 characters" });
    }

    const userId = req.user._id;
    const updateFields = {};

    if (trimmedFullName) {
      updateFields.fullName = trimmedFullName;
    }

    if (profilePic) {
      const uploadResponse = await cloudinary.uploader.upload(profilePic);
      updateFields.profilePic = uploadResponse.secure_url;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateFields,
      { new: true }
    ).select("_id fullName email profilePic");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("Error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};