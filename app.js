require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");
const http = require("http");
const socketio = require("socket.io");
const flash = require("connect-flash");
const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");
const Message = require("./models/Message");
const profileRoutes = require("./routes/profile");

const app = express();
const server = http.createServer(app); // 👈 wrap Express
const io = socketio(server); // 👈 attach Socket.IO

// MongoDB connection
const dbUrl = process.env.MONGO_URL1;
mongoose
  .connect(dbUrl)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// Middleware
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: "chatter_secret_key", // change to env variable in production
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // set true with HTTPS
  })
);

app.use(flash());

// make flash available to all views
app.use((req, res, next) => {
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  res.locals.warning = req.flash("warning");
  res.locals.info = req.flash("info");
  next();
});

// Routes

app.use("/profile", profileRoutes);

app.use("/", authRoutes);
app.use("/chat", chatRoutes);

// Auth check
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/login");
}

// Socket.IO logic
// Store online users: username -> socket.id
const onlineUsers = {};

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // When user registers themselves
  socket.on("registerUser", (data) => {
    if (data.username) {
      onlineUsers[data.username] = socket.id;
      console.log(`✅ Registered ${data.username} to socket ${socket.id}`);
    }
  });

  // When a message is sent
  socket.on("chatMessage", async (data) => {
    const newMsg = new Message({
      sender: data.sender,
      receiver: data.receiver,
      text: data.text,
      timestamp: new Date(),
    });
    await newMsg.save();

    // Send back to sender (so they see it immediately)
    socket.emit("chatMessage", newMsg);

    // Send to receiver if online
    const receiverSocketId = onlineUsers[data.receiver];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("chatMessage", newMsg);
    }
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);

    // Clean up user mapping
    for (let user in onlineUsers) {
      if (onlineUsers[user] === socket.id) {
        delete onlineUsers[user];
        console.log(`❌ Removed ${user} from online list`);
        break;
      }
    }
  });
});

// Start server
const PORT = 8080;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
