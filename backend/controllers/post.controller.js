import Notification from "../models/notification.model.js";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import { v2 as cloudinary } from "cloudinary";

export const createPost = async (req, res) => {
	try {
		const { text } = req.body;
		let { img } = req.body;
		const userId = req.user._id.toString();

		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ message: "User not found" });

		if (!text && !img) {
			return res.status(400).json({ error: "Post must have text or image" });
		}

		if (img) {
			const uploadedResponse = await cloudinary.uploader.upload(img);
			img = uploadedResponse.secure_url;
		}

		const newPost = new Post({
			user: userId,
			text,
			img,
		});

		await newPost.save();
		res.status(201).json(newPost);
	} catch (error) {
		res.status(500).json({ error: "Internal server error" });
		console.log("Error in createPost controller: ", error);
	}
};

export const deletePost = async (req, res) => {
	try {
		const post = await Post.findById(req.params.id);
		if (!post) {
			return res.status(404).json({ error: "Post not found" });
		}

		if (post.user.toString() !== req.user._id.toString()) {
			return res.status(401).json({ error: "You are not authorized to delete this post" });
		}

		if (post.img) {
			const imgId = post.img.split("/").pop().split(".")[0];
			await cloudinary.uploader.destroy(imgId);
		}

		await Post.findByIdAndDelete(req.params.id);

		res.status(200).json({ message: "Post deleted successfully" });
	} catch (error) {
		console.log("Error in deletePost controller: ", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const commentOnPost = async (req, res) => {
	try {
		const { text } = req.body;
		const postId = req.params.id;
		const userId = req.user._id;

		if (!text) {
			return res.status(400).json({ error: "Text field is required" });
		}
		const post = await Post.findById(postId);

		if (!post) {
			return res.status(404).json({ error: "Post not found" });
		}

		const comment = { user: userId, text };

		post.comments.push(comment);
		await post.save();

		res.status(200).json(post);
	} catch (error) {
		console.log("Error in commentOnPost controller: ", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const likeUnlikePost = async (req, res) => {
	try {
		const userId = req.user._id;
		const { id: postId } = req.params;

		const post = await Post.findById(postId);

		if (!post) {
			return res.status(404).json({ error: "Post not found" });
		}

		const userLikedPost = post.likes.includes(userId);

		if (userLikedPost) {
			// Unlike post
			await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
			await User.updateOne({ _id: userId }, { $pull: { likedPosts: postId } });

			const updatedLikes = post.likes.filter((id) => id.toString() !== userId.toString());
			res.status(200).json(updatedLikes);
		} else {
			// Like post
			post.likes.push(userId);
			await User.updateOne({ _id: userId }, { $push: { likedPosts: postId } });
			await post.save();

			const notification = new Notification({
				from: userId,
				to: post.user,
				type: "like",
			});
			await notification.save();

			const updatedLikes = post.likes;
			res.status(200).json(updatedLikes);
		}
	} catch (error) {
		console.log("Error in likeUnlikePost controller: ", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const getAllPosts = async (req, res) => {
	try {
		const posts = await Post.find()
			.sort({ createdAt: -1 })
			.populate({
				path: "user",
				select: "-password",
			})
			.populate({
				path: "comments.user",
				select: "-password",
			});

		if (posts.length === 0) {
			return res.status(200).json([]);
		}

		res.status(200).json(posts);
	} catch (error) {
		console.log("Error in getAllPosts controller: ", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const getLikedPosts = async (req, res) => {
	const userId = req.params.id;

	try {
		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ error: "User not found" });

		const likedPosts = await Post.find({ _id: { $in: user.likedPosts } })
			.populate({
				path: "user",
				select: "-password",
			})
			.populate({
				path: "comments.user",
				select: "-password",
			});

		res.status(200).json(likedPosts);
	} catch (error) {
		console.log("Error in getLikedPosts controller: ", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const getFollowingPosts = async (req, res) => {
	try {
		const userId = req.user._id;
		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ error: "User not found" });

		const following = user.following.map(f => f.toString());
		console.log("User ID:", userId);
		console.log("Following array:", following);

		// Find posts by following, reposted by following, reposted by user, or by the user
		const feedPosts = await Post.find({
			$or: [
				{ user: { $in: following } },
				{ reposts: { $in: following } },
				{ reposts: { $in: [userId] } },
				{ user: userId }, // include user's own posts
			],
		})
			.sort({ createdAt: -1 })
			.populate({
				path: "user",
				select: "-password",
			})
			.populate({
				path: "comments.user",
				select: "-password",
			})
			.populate({
				path: "reposts",
				select: "_id username fullName profileImg",
			});

		console.log("Number of posts found:", feedPosts.length);

		// Add reposter info to each post if it was reposted
		const postsWithReposter = feedPosts.map(post => {
			let reposter = null;
			if (post.reposts && post.reposts.length > 0) {
				// Find the first reposter who is the user or someone they follow
				const reposterUser = post.reposts.find(ruser => ruser._id.toString() === userId.toString() || following.includes(ruser._id.toString()));
				if (reposterUser) {
					reposter = {
						_id: reposterUser._id,
						username: reposterUser.username,
						fullName: reposterUser.fullName,
						profileImg: reposterUser.profileImg
					};
				}
			}
			return { ...post.toObject(), reposter };
		});

		res.status(200).json(postsWithReposter);
	} catch (error) {
		console.log("Error in getFollowingPosts controller: ", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const getUserPosts = async (req, res) => {
	try {
		const { username } = req.params;

		const user = await User.findOne({ username });
		if (!user) return res.status(404).json({ error: "User not found" });

		const posts = await Post.find({ user: user._id })
			.sort({ createdAt: -1 })
			.populate({
				path: "user",
				select: "-password",
			})
			.populate({
				path: "comments.user",
				select: "-password",
			});

		res.status(200).json(posts);
	} catch (error) {
		console.log("Error in getUserPosts controller: ", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const saveUnsavePost = async (req, res) => {
	try {
		const userId = req.user._id;
		const postId = req.params.id;
		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ error: "User not found" });

		const alreadySaved = user.savedPosts.includes(postId);
		let saved;
		if (alreadySaved) {
			user.savedPosts.pull(postId);
			saved = false;
		} else {
			user.savedPosts.push(postId);
			saved = true;
		}
		await user.save();
		return res.status(200).json({ saved });
	} catch (error) {
		console.log("Error in saveUnsavePost controller: ", error);
		return res.status(500).json({ error: "Internal server error" });
	}
};

export const getSavedPosts = async (req, res) => {
	try {
		const userId = req.user._id;
		const user = await User.findById(userId).populate({
			path: "savedPosts",
			populate: {
				path: "user comments.user",
				select: "-password",
			},
		});
		if (!user) return res.status(404).json({ error: "User not found" });
		return res.status(200).json(user.savedPosts.reverse());
	} catch (error) {
		console.log("Error in getSavedPosts controller: ", error);
		return res.status(500).json({ error: "Internal server error" });
	}
};

export const repostPost = async (req, res) => {
	try {
		const userId = req.user._id;
		const { id: postId } = req.params;

		const post = await Post.findById(postId);
		if (!post) {
			return res.status(404).json({ error: "Post not found" });
		}

		const hasReposted = post.reposts.includes(userId);
		console.log("Before repost:", post.reposts);
		if (hasReposted) {
			// Undo repost
			await Post.updateOne({ _id: postId }, { $pull: { reposts: userId } });
			const updatedReposts = post.reposts.filter((id) => id.toString() !== userId.toString());
			console.log("After undo repost:", updatedReposts);
			return res.status(200).json(updatedReposts);
		} else {
			post.reposts.push(userId);
			await post.save();
			console.log("After repost:", post.reposts);
            // Log the full post object for debugging
            console.log("Post after repost:", post);
			return res.status(200).json(post.reposts);
		}
	} catch (error) {
		console.log("Error in repostPost controller: ", error);
		res.status(500).json({ error: "Internal server error" });
	}
};
