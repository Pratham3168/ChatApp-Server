import express from 'express';
import { login, logout, signup, updateProfile } from '../controllers/auth.controller.js';
import { protectRoute } from '../middlewares/auth.middleware.js';
import { arcjetProtection } from '../middlewares/arcjet.middleware.js';

const router = express.Router();


router.use(arcjetProtection);

router.post('/signup',signup);

router.post('/login',login);

router.post('/logout',logout);

router.put('/update-profile', protectRoute ,updateProfile);

router.get("/check", protectRoute, (req, res) =>
	res.status(200).json({
		_id: req.user._id,
		fullName: req.user.fullName,
		email: req.user.email,
		profilePic: req.user.profilePic,
	})
);


export default router;