// server/index.js
require("dotenv").config();
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const tradeRoutes = require('./routes/tradeRoutes');
const ledgerRoutes = require('./routes/ledgerRoutes');
const userRoutes = require("./routes/userRoutes");
const { authMiddleware } = require("./middleware/authMiddleware");

// Load env vars
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: ['https://trade-web-zeta.vercel.app', 'http://localhost:3000', 'http://localhost:5173', 'https://fin-trade.netlify.app/login'], // Add all possible frontend origins, no trailing slashes
  methods: ['GET', 'POST', 'PUT', 'DELETE'],  // Allowed request types
  credentials: true                           // Important if you use cookies or sessions
}));

app.use(express.json()); // Allows us to accept JSON data in the body

// Request Logger Middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use('/api/trades', tradeRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use("/api/users", userRoutes);

// Basic Route for testing
app.get('/', (req, res) => {
  res.send('API is running...');
});

app.get("/api/protected", authMiddleware, (req, res) => {
  res.json({ msg: "Protected route working ✅", user: req.user });
})

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
