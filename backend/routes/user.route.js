import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import { followUnfollowUser, getSuggestedUsers, getUserProfile, updateUser } from "../controllers/user.controller.js";

const router = express.Router();

router.get("/profile/:username", protectRoute, getUserProfile);
router.get("/suggested", protectRoute, getSuggestedUsers);
router.post("/follow/:id", protectRoute, followUnfollowUser);
router.post("/update", protectRoute, updateUser);



// routes/user.js

import User from "../models/user.model.js";

router.get("/search", async (req, res) => {
	try {
		const query = req.query.q;
		const users = await User.find({
			username: { $regex: query, $options: "i" },
		})
			.limit(10)
			.select("_id username profilePic");

		res.json(users);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
});

export default router;
