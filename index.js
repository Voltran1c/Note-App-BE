require("dotenv").config();

// set up mongoose connection to MongoDB
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI);
mongoose.connection.on("connected", () => {
  console.log("Connected to MongoDB");
});

// use the mongoose models
const User = require("./models/user.model.js");
const Note = require("./models/note.model.js");

// set up express app and cors
const express = require("express");
const cors = require("cors");

const PORT = process.env.PORT || 8080;
const app = express(); // เรียกใช้ express

// use jwt and token to authenticate access to protected routes
const jwt = require("jsonwebtoken");

const { authenticateToken } = require("./utilities");

app.use(express.json());
app.use(
  cors({
    origin: "*",
  })
);

// start the Express server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// server connection test
app.get("/", (req, res) => {
  res.json({ data: "respond received from the server!" });
});

// API Endpoints

// Create account
app.post("/create-account", async (req, res) => {
  // when create acc เรียกใช้ async
  const { fullName, email, password } = req.body; // req obj มี body จึงสามารถ deconstruc ได้
  // Validate data
  if (!fullName) {
    // ถ้าไม่มี fullName
    return res
      .status(400)
      .json({ error: true, message: "Full Name is required" });
  }
  if (!email) {
    // ถ้าไม่มี email
    return res.status(400).json({ error: true, message: "Email is required" });
  }
  if (!password) {
    // ถ้าไม่มี password
    return res
      .status(400)
      .json({ error: true, message: "Password is required" });
  }
  // check email user โดยการ findOne ใน database & await to check
  const isUser = await User.findOne({ email: email });

  // when check already
  if (isUser) {
    return res.json({
      error: true,
      message: "User already exist",
    });
  }
  // กรณีที่ไม่มี use / moongose model named User
  const user = new User({
    fullName,
    email,
    password,
  });
  // save to database โดย await ด้วย
  await user.save();
  // create accessToken โดย assign jwt เป็น method ในการ sign token และใส่ Key ไปให้ด้วย
  const accessToken = jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "36000m", // มีอายุ Token ~ 25 days ถ้าหมดอายุจะ Generate ใหม่
  });

  return res.json({
    error: false, // ยืนยันกรณีทุกอย่างเรียบร้อย
    user,
    accessToken,
    message: "Registration Successful",
  });
});

//Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }
  if (!password) {
    return res.status(400).json({ message: "Password is required" });
  }
  const userInfo = await User.findOne({ email: email });
  if (!userInfo) {
    return res.status(400).json({ message: "User not found" });
  }
  if (userInfo.email == email && userInfo.password == password) {
    const user = { user: userInfo }; // เอาข้อมูล user ไปไว้ใน userInfo
    const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "36000m", // แนบ Access token ให้กับ user ไปด้วยโดยมีอายุไข
    });
    return res.json({
      error: false, // หากสำเร็จ error -> false
      message: "Login Successful",
      email,
      accessToken,
    });
  } else {
    return res.status(400).json({
      error: true, // หากไม่สำเร็จ error -> true
      message: "Invalid Credentials",
    });
  }
});

// Note
app.get("/get-user", authenticateToken, async (req, res) => {
  const { user } = req.user; // ใช้ auth ที่ user access เข้ามาเช็คกับ user_id ที่มี
  const isUser = await User.findOne({ _id: user._id });
  if (!isUser) {
    return res.sendStatus(401);
  }
  return res.json({
    user: isUser,
    message: " ",
  });
});

// Add Note || auth => ในที่นี้คือ Middleware
app.post("/add-note", authenticateToken, async (req, res) => {
  const { title, content, tags } = req.body;
  const { user } = req.user;
  if (!title) {
    return res.status(400).json({ error: true, message: "Title is required" });
  }
  if (!content) {
    return res
      .status(400)
      .json({ error: true, message: "Content is required" });
  }
  try {
    const note = new Note({
      title,
      content,
      tags: tags || [], // when no tags empty array
      userId: user._id,
    });
    await note.save();

    return res.json({
      error: false,
      note,
      message: "Note added successfully",
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Internal Server Error",
    });
  }
});

//Edit Node || ยืนยันตัวตนโดย auth
app.put("/edit-note/:noteId", authenticateToken, async (req, res) => {
  const noteId = req.params.noteId;
  const { title, content, tags, isPinned } = req.body;
  const { user } = req.user;
  if (!title && !content && !tags) {
    return res
      .status(400)
      .json({ error: true, message: "No Changes Provided" });
  }
  try {
    const note = await Note.findOne({ _id: noteId, userId: user._id });
    if (!note) {
      return res.status(404).json({ error: true, message: "Note not found" });
    }
    if (title) note.title = title; // การ map เข้าไปที่ database
    if (content) note.content = content;
    if (tags) note.tags = tags;
    if (isPinned) note.isPinned = isPinned;

    await note.save(); // save เป็น Method ของ Mongoose สำหรับบันทึกค่า

    return res.json({
      error: false,
      note,
      message: "Not update successfully",
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Intenal Server Error",
    });
  }
});

// Update isPinned
app.put("/update-note-pinned/:noteId", authenticateToken, async (req, res) => {
  const noteId = req.params.noteId;
  const { isPinned } = req.body;
  const { user } = req.user;
  try {
    const note = await Note.findOne({ _id: noteId, userId: user._id });
    if (!note) {
      return res.status(404).json({ error: true, message: "Note not found" });
    }
    note.isPinned = isPinned;
    await note.save();
    return res.json({
      error: false,
      note,
      message: "Note pinned status updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Internal Server Error",
    });
  }
});

// Get all Notes
app.get("/get-all-notes", authenticateToken, async (req, res) => {
  const { user } = req.user;
  try {
    const notes = await Note.find({ userId: user._id }).sort({ isPinned: -1 });
    return res.json({
      error: false,
      notes,
      message: "All notes retrieved successfully",
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Internal Server Error",
    });
  }
});

// Delete Note
app.delete("/delete-note/:noteId", authenticateToken, async (req, res) => {
  const noteId = req.params.noteId;
  const { user } = req.user;
  try {
    const note = await Note.findOne({ _id: noteId, userId: user._id });
    if (!note) {
      return res.status(404).json({ error: true, message: "Note not found" });
    }
    await Note.deleteOne({ _id: noteId, userId: user._id }); // method deleteOne
    return res.json({
      error: false,
      message: "Note deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Internal Server Error",
    });
  }
});

// Search Notes
app.get("/search-notes", authenticateToken, async (req, res) => {
  const { user } = req.user;
  const { query } = req.query;
  if (!query) {
    return res
      .status(400)
      .json({ error: true, message: "Search query is required" });
  }
  try {
    const matchingNotes = await Note.find({
      //method find
      userId: user._id,
      $or: [
        // เป็นการ search แบบกว้างๆ => $or
        { title: { $regex: new RegExp(query, "i") } }, // Case-insensitive title match
        { content: { $regex: new RegExp(query, "i") } }, // Case-insensitive content match
      ],
    });
    // ส่งข้อมุลไป Data เพื่อเช็คข้อมูลที่ Search
    return res.json({
      error: false,
      notes: matchingNotes,
      message: "Notes matching the search query retrieved successfully",
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Internal Server Error",
    });
  }
});

module.exports = app;
