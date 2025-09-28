const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Message = require("../models/Message");

// Middleware to check login
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/login");
}

// GET Profile page
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    res.render("profile", { title: "Your Profile", user });
  } catch (err) {
    console.error("❌ Error fetching profile:", err);
    res.status(500).send("Server error");
  }
});

// POST Update profile
// POST Update profile
router.post("/update", isAuthenticated, async (req, res) => {
  try {
    const { username, email } = req.body;
    const userId = req.session.user.id;

    const oldUser = await User.findById(userId);
    if (!oldUser) {
      req.flash("error", "❌ User not found.");
      return res.redirect("/profile");
    }

    const oldUsername = oldUser.username;

    // 🔎 Check if username is taken by another user
    const existingUserByName = await User.findOne({
      username,
      _id: { $ne: userId },
    });
    if (existingUserByName) {
      req.flash("error", "⚠️ Username already taken. Please choose another.");
      return res.redirect("/profile");
    }

    // 🔎 Check if email is taken by another user
    const existingUserByEmail = await User.findOne({
      email,
      _id: { $ne: userId },
    });
    if (existingUserByEmail) {
      req.flash("error", "⚠️ Email already registered with another account.");
      return res.redirect("/profile");
    }

    // ✅ Update user document
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { username, email },
      { new: true }
    );

    // ✅ Update session
    req.session.user.username = updatedUser.username;
    req.session.user.email = updatedUser.email;

    console.log("Old:", oldUsername, "New:", username);

    // ✅ Update all messages where this user was sender or receiver
    if (oldUsername !== username) {
      await Message.updateMany(
        { sender: oldUsername },
        { $set: { sender: username } }
      );
      await Message.updateMany(
        { receiver: oldUsername },
        { $set: { receiver: username } }
      );
    }

    req.flash("success", "✅ Profile updated successfully!");
    res.redirect("/chat");
  } catch (err) {
    console.error("❌ Error updating profile:", err);
    req.flash(
      "error",
      "⚠️ Server error while updating profile. Please try again."
    );
    res.redirect("/profile");
  }
});

module.exports = router;
