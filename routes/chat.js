const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const User = require("../models/User"); // import your User model

// Middleware to check login
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect("/login");
}

// GET chat page (show messages + contacts)
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const username = req.session.user.username;
    const chatWith = req.query.with;
    req.session.lastChatUrl = req.originalUrl;

    // First: fetch ALL messages involving current user (for partners list only)
    const allUserMessages = await Message.find({
      $or: [{ sender: username }, { receiver: username }],
    }).sort({ createdAt: 1 });

    // Extract distinct partners
    const rawPartners = [
      ...new Set(
        allUserMessages.map((msg) =>
          msg.sender === username ? msg.receiver : msg.sender
        )
      ),
    ].filter((partner) => partner !== username);

    // Validate partners exist in User collection
    const validUsers = await User.find(
      { username: { $in: rawPartners } },
      "username"
    ).lean();
    const chatPartners = validUsers.map((u) => u.username);

    // Now: fetch only messages for this chat
    let messages = [];
    if (chatWith) {
      messages = await Message.find({
        $or: [
          { sender: username, receiver: chatWith },
          { sender: chatWith, receiver: username },
        ],
      }).sort({ createdAt: 1 });
    }

    res.render("index", {
      title: "Chatter App",
      user: req.session.user,
      messages,
      chatPartners,
      chatWith,
    });

    console.log(
      "username:",
      username,
      "chatWith:",
      chatWith,
      "partners:",
      chatPartners
    );
  } catch (err) {
    console.error("❌ Error fetching messages:", err);
    req.flash("error", "Something went wrong while loading chats.");
    res.redirect("/chat");
  }
});

// Search for a username and redirect to chat
router.get("/search", isAuthenticated, async (req, res) => {
  try {
    const { username } = req.query;

    // ✅ Prevent chatting with self
    if (username === req.session.user.username) {
      req.flash("error", "You can’t chat with yourself.");
      return res.redirect("/chat");
    }

    if (!username) {
      req.flash("error", "Please enter a username.");
      return res.redirect("/chat");
    }

    const user = await User.findOne({ username });
    if (!user) {
      req.flash("error", "❌ User not found");
      return res.redirect("/chat");
    }

    // ✅ Redirect to chat with searched user
    req.flash("success", `Chatting with ${username}`);
    res.redirect(`/chat?with=${username}`);
  } catch (err) {
    console.error("❌ Error searching user:", err);
    req.flash("error", "Server error while searching.");
    res.redirect("/chat");
  }
});

// POST send a new message
router.post("/send", isAuthenticated, async (req, res) => {
  try {
    const { text, receiver } = req.body;

    if (!text || !receiver) {
      req.flash("error", "Message and receiver are required.");
      return res.redirect("/chat");
    }

    const newMessage = new Message({
      sender: req.session.user.username,
      receiver,
      text,
    });

    await newMessage.save();

    // ✅ Redirect back to the chat with this user
    req.flash("success", "Message sent!");
    res.redirect(`/chat?with=${receiver}`);
  } catch (err) {
    console.error("❌ Error sending message:", err);
    req.flash("error", "Failed to send message.");
    res.redirect("/chat");
  }
});

// Start chat with searched user
router.post("/chat/start", isAuthenticated, async (req, res) => {
  try {
    const { username } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      req.flash("error", "❌ User not found");
      return res.redirect("/chat");
    }

    req.flash("success", `Chat started with ${username}`);
    res.redirect(`/chat?with=${username}`);
  } catch (err) {
    console.error("❌ Error starting chat:", err);
    req.flash("error", "Something went wrong.");
    res.redirect("/chat");
  }
});

module.exports = router;
