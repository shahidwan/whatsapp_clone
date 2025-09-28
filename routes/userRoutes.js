// const express = require("express");
// const router = express.Router();
// const User = require("../models/User");

// // test route
// router.get("/", (req, res) => {
//   res.send("User route working ✅");
// });

// // create user
// router.post("/signup", async (req, res) => {
//   try {
//     const { username, email, password } = req.body;
//     const newUser = new User({ username, email, password });
//     await newUser.save();
//     res
//       .status(201)
//       .json({ message: "User created successfully", user: newUser });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// module.exports = router;
