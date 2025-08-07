const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const bodyParser = require("body-parser");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public")); // serve frontend files

// ===== In-memory data =====
let videos = []; // { id, title, url, uploader, category, timestamp, likes }
let comments = {}; // { videoId: [{ user, text, timestamp }] }
let users = {}; // { username: { username, bio, joinDate, avatar, uploads: [] } }

// ===== Homepage =====
app.get("/api/home", (req, res) => {
  res.json({
    trending: videos.slice(-5).reverse(), // newest 5 as trending
    recent: videos.slice(-12).reverse(), // newest 12 as recent
    categories: [...new Set(videos.map(v => v.category))]
  });
});

// ===== Search =====
app.get("/api/search", (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  const results = videos.filter(v =>
    v.title.toLowerCase().includes(q) ||
    v.uploader.toLowerCase().includes(q)
  );
  res.json(results);
});

// ===== Upload video =====
app.post("/api/upload", (req, res) => {
  const { title, url, uploader, category } = req.body;
  if (!title || !url || !uploader) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const id = uuidv4();
  const video = {
    id,
    title,
    url,
    uploader,
    category: category || "Uncategorized",
    timestamp: Date.now(),
    likes: 0
  };
  videos.push(video);

  // Add to user profile uploads
  if (!users[uploader]) {
    users[uploader] = {
      username: uploader,
      bio: "This user has not added a bio yet.",
      joinDate: new Date().toISOString(),
      avatar: "https://via.placeholder.com/100",
      uploads: []
    };
  }
  users[uploader].uploads.push(video);

  io.emit("newVideo", video); // realtime
  res.json({ success: true, video });
});

// ===== Get video comments =====
app.get("/api/comments/:videoId", (req, res) => {
  res.json(comments[req.params.videoId] || []);
});

// ===== Post a comment =====
app.post("/api/comments/:videoId", (req, res) => {
  const { user, text } = req.body;
  if (!user || !text) {
    return res.status(400).json({ error: "Missing user or text" });
  }
  if (!comments[req.params.videoId]) comments[req.params.videoId] = [];
  const comment = { user, text, timestamp: Date.now() };
  comments[req.params.videoId].push(comment);
  io.emit("newComment", { videoId: req.params.videoId, comment });
  res.json({ success: true, comment });
});

// ===== Profiles =====
app.get("/api/profile/:username", (req, res) => {
  const user = users[req.params.username];
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json(user);
});

// ===== Update profile =====
app.post("/api/profile/:username", (req, res) => {
  const { bio, avatar } = req.body;
  if (!users[req.params.username]) {
    return res.status(404).json({ error: "User not found" });
  }
  if (bio) users[req.params.username].bio = bio;
  if (avatar) users[req.params.username].avatar = avatar;
  res.json({ success: true, profile: users[req.params.username] });
});

// ===== Socket.IO realtime connection =====
io.on("connection", (socket) => {
  console.log("New client connected");
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
