import express from "express";
import User from "../models/user.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// GET /api/public/professors
router.get("/professors", protect, async (req, res) => {
  try {
    // optional: allow only students to see this
    if (req.user.userType !== "student") {
      return res.status(403).json({ message: "Students only." });
    }

    const professors = await User.find({ userType: "professor" })
      .select("fullName subject email")
      .sort({ fullName: 1 })
      .lean();

    res.json(professors);
  } catch (err) {
    console.error("Public professors error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
