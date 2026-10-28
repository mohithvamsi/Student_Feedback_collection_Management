require("dotenv").config();
const express = require("express");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const feedbackRoutes = require("./routes/feedback");

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be set to a random secret of at least 32 characters in backend/.env");
}
const app = express();
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: { directives: {
  defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"], imgSrc: ["'self'", "data:"],
  connectSrc: ["'self'"], objectSrc: ["'none'"], baseUri: ["'self'"], frameAncestors: ["'none'"]
} } }));
app.use(cors({ origin: false }));
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));

app.get("/api/health", (req, res) => res.json({ status: "ok", service: "CampusVoice API" }));
app.use("/api/auth", authRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use(express.static(path.join(__dirname, "..", "frontend")));
app.get("*path", (req, res, next) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "API endpoint not found." });
  return res.sendFile(path.join(__dirname, "..", "frontend", "index.html"), (error) => error && next(error));
});

app.use((req, res) => res.status(404).json({ error: "Resource not found." }));
app.use((error, req, res, next) => {
  // Do not send database errors, stack traces, or secrets to the browser.
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}: ${error.message || "Unexpected error"}`);
  if (res.headersSent) return next(error);
  res.status(500).json({ error: "The server could not complete the request. Check server logs and configuration." });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`CampusVoice is running at http://localhost:${port}`));
