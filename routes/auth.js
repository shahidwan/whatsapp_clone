const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");

// Redirect root → login
router.get("/", (req, res) => {
  res.redirect("/login");
});

// GET signup page
router.get("/signup", (req, res) => {
  res.render("signup", {
    title: "Signup - Chatter",
    user: req.session.user || null,
  });
});

// POST signup form
// POST signup form
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // check if username exists
    const existingUserByName = await User.findOne({ username });
    if (existingUserByName) {
      req.flash("error", "Username already taken!");
      return res.redirect("/signup");
    }

    // check if email exists
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      req.flash("error", "Email already registered!");
      return res.redirect("/signup");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    req.flash("success", "Signup successful! Please log in.");
    res.redirect("/login");
  } catch (err) {
    console.error("❌ Signup error:", err.message);
    req.flash("error", "Something went wrong. Please try again.");
    res.redirect("/signup");
  }
});

// GET login page
router.get("/login", (req, res) => {
  res.render("login", {
    title: "Login - Chatter",
    user: req.session.user || null,
  });
});

// POST login form
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      req.flash("error", "Invalid email or password.");
      return res.redirect("/login");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash("error", "Invalid email or password.");
      return res.redirect("/login");
    }

    console.log("✅ User logged in:", user.username);

    // Save user in session
    req.session.user = { id: user._id, username: user.username };

    req.flash("success", "Welcome back, " + user.username + "!");
    res.redirect("/chat");
  } catch (err) {
    console.error("❌ Login error:", err.message);
    req.flash("error", "Something went wrong. Please try again.");
    res.redirect("/login");
  }
});

// GET logout
// GET logout
router.get("/logout", (req, res) => {
  // Save the message first (while session exists)
  req.flash("success", "You have logged out.");

  // Then destroy the session
  req.session.destroy((err) => {
    if (err) {
      console.error("❌ Error destroying session:", err);
      return res.redirect("/chat"); // fallback if session destroy fails
    }

    // Redirect after session is cleared
    res.redirect("/login");
  });
});

module.exports = router;
