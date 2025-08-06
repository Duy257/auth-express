import dotenv from "dotenv";

// Load environment variables FIRST before importing other modules
dotenv.config();

import bodyParser from "body-parser";
import express from "express";
import cors from "cors";
import { routes } from "./src/routes/routes";
import connectDB from "./src/config/database";
import passport from "passport";
import session from "express-session";

// Import passport configuration để đăng ký Google OAuth strategy
import "./src/plugin/passport";
const app = express();
connectDB();

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true, // Allow cookies to be sent
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(bodyParser.json({ limit: "10mb" })); // Limit request size
app.use(express.json({ limit: "10mb" }));

// Passport middleware
app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      "your-super-secret-session-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      httpOnly: true, // Prevent XSS attacks
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use("", routes);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const PORT = parseInt(process.env.PORT) || 4000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server đang chạy tại http://0.0.0.0:${PORT}`);
});
