const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const fileUpload = require('express-fileupload');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());
app.use(fileUpload());
app.use('/uploads', express.static('uploads'));
app.use(express.static(path.join(__dirname, '../client')));

mongoose.connect('mongodb://localhost:27017/youtube_clone');

const User = mongoose.model('User', new mongoose.Schema({ username: String }));
const Video = mongoose.model('Video', new mongoose.Schema({
  url: String, title: String, user: String, createdAt: { type: Date, default: Date.now }
}));
const Comment = mongoose.model('Comment', new mongoose.Schema({
  videoId: String, user: String, text: String, createdAt: { type: Date, default: Date.now }
}));

app.post('/upload', async (req, res) => {
  const file = req.files.video;
  const filename = `uploads/${Date.now()}_${file.name}`;
  await file.mv(filename);
  const video = await Video.create({ url: filename, title: req.body.title, user: req.body.user });
  io.emit('new_video', video);
  res.json(video);
});

app.get('/videos', async (req, res) => {
  const videos = await Video.find().sort({ createdAt: -1 });
  res.json(videos);
});

app.post('/comment', async (req, res) => {
  const comment = await Comment.create(req.body);
  io.emit('new_comment', comment);
  res.json(comment);
});

app.get('/comments/:videoId', async (req, res) => {
  const comments = await Comment.find({ videoId: req.params.videoId });
  res.json(comments);
});

io.on('connection', () => {
  console.log('New connection');
});

server.listen(3001, () => console.log('Server running on http://localhost:3001'));
