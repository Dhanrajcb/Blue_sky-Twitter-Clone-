import { generateTokenAndSetCookie } from "../lib/utils/generateToken.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";

// In-memory store for OTPs (for production, use a database or cache)
const otpStore = {};

export const signup = async (req, res) => {
	try {
		const { fullName, username, email, password } = req.body;

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return res.status(400).json({ error: "Invalid email format" });
		}

		const existingUser = await User.findOne({ username });
		if (existingUser) {
			return res.status(400).json({ error: "Username is already taken" });
		}

		const existingEmail = await User.findOne({ email });
		if (existingEmail) {
			return res.status(400).json({ error: "Email is already taken" });
		}

		if (password.length < 6) {
			return res.status(400).json({ error: "Password must be at least 6 characters long" });
		}

		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		const newUser = new User({
			fullName,
			username,
			email,
			password: hashedPassword,
		});

		if (newUser) {
			generateTokenAndSetCookie(newUser._id, res);
			await newUser.save();

			res.status(201).json({
				_id: newUser._id,
				fullName: newUser.fullName,
				username: newUser.username,
				email: newUser.email,
				followers: newUser.followers,
				following: newUser.following,
				profileImg: newUser.profileImg,
				coverImg: newUser.coverImg,
			});
		} else {
			res.status(400).json({ error: "Invalid user data" });
		}
	} catch (error) {
		console.log("Error in signup controller", error.message);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

export const login = async (req, res) => {
	try {
		const { username, password } = req.body;
		const user = await User.findOne({ username });
		const isPasswordCorrect = await bcrypt.compare(password, user?.password || "");

		if (!user || !isPasswordCorrect) {
			return res.status(400).json({ error: "Invalid username or password" });
		}

		generateTokenAndSetCookie(user._id, res);

		res.status(200).json({
			_id: user._id,
			fullName: user.fullName,
			username: user.username,
			email: user.email,
			followers: user.followers,
			following: user.following,
			profileImg: user.profileImg,
			coverImg: user.coverImg,
		});
	} catch (error) {
		console.log("Error in login controller", error.message);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

export const logout = async (req, res) => {
	try {
		res.cookie("jwt", "", { maxAge: 0 });
		res.status(200).json({ message: "Logged out successfully" });
	} catch (error) {
		console.log("Error in logout controller", error.message);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

export const getMe = async (req, res) => {
	try {
		const user = await User.findById(req.user._id).select("-password");
		res.status(200).json(user);
	} catch (error) {
		console.log("Error in getMe controller", error.message);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

export const forgotPassword = async (req, res) => {
	try {
		const { email } = req.body;
		const user = await User.findOne({ email });
		if (!user) return res.status(404).json({ error: "User not found" });

		const otp = Math.floor(100000 + Math.random() * 900000).toString();
		const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
		otpStore[email] = { otp, expires };

		// Send OTP via email using Gmail SMTP
		const transporter = nodemailer.createTransport({
			service: "gmail",
			auth: {
				user: process.env.ETHEREAL_USER, // your gmail address
				pass: process.env.ETHEREAL_PASS, // your gmail app password
			},
		});
		await transporter.sendMail({
			from: 'no-reply@bluesky.com',
			to: email,
			subject: 'Your OTP for Blue Sky Password Reset',
			text: `Your OTP is: ${otp}`,
		});

		return res.status(200).json({ message: "OTP sent to email" });
	} catch (error) {
		return res.status(500).json({ error: "Failed to send OTP" });
	}
};

export const verifyOtp = async (req, res) => {
	try {
		const { email, otp } = req.body;
		const record = otpStore[email];
		if (!record || record.otp !== otp || record.expires < Date.now()) {
			return res.status(400).json({ error: "Invalid or expired OTP" });
		}
		return res.status(200).json({ message: "OTP verified" });
	} catch (error) {
		return res.status(500).json({ error: "OTP verification failed" });
	}
};

export const resetPassword = async (req, res) => {
	try {
		const { email, otp, newPassword } = req.body;
		const record = otpStore[email];
		if (!record || record.otp !== otp || record.expires < Date.now()) {
			return res.status(400).json({ error: "Invalid or expired OTP" });
		}
		const user = await User.findOne({ email });
		if (!user) return res.status(404).json({ error: "User not found" });
		if (newPassword.length < 6) return res.status(400).json({ error: "Password too short" });
		const salt = await bcrypt.genSalt(10);
		user.password = await bcrypt.hash(newPassword, salt);
		await user.save();
		delete otpStore[email];
		return res.status(200).json({ message: "Password reset successful" });
	} catch (error) {
		return res.status(500).json({ error: "Password reset failed" });
	}
};
