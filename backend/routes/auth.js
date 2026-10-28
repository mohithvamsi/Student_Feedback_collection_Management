const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const supabase = require("../supabase");

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "Too many sign-in attempts. Please wait 15 minutes and try again." } });

function safeUser(row) {
  return { id: row.id, fullName: row.full_name, email: row.email, department: row.department, role: row.role };
}
function issueToken(row) {
  return jwt.sign({ sub: row.id, role: row.role, name: row.full_name, email: row.email }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: process.env.JWT_EXPIRES_IN || "8h", issuer: "campusvoice", audience: "campusvoice-users" });
}
router.post("/register", authLimiter, async (req, res, next) => {
  try {
    const { fullName, email, password, department = "" } = req.body || {};
    if (typeof fullName !== "string" || fullName.trim().length < 2 || fullName.trim().length > 100) return res.status(400).json({ error: "Full name must be between 2 and 100 characters." });
    if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json({ error: "Enter a valid email address." });
    if (typeof password !== "string" || password.length < 8 || password.length > 72) return res.status(400).json({ error: "Password must be between 8 and 72 characters." });
    if (typeof department !== "string" || department.length > 100) return res.status(400).json({ error: "Department must be 100 characters or fewer." });
    const normalizedEmail = email.trim().toLowerCase();
    const { data: existing, error: findError } = await supabase.from("app_users").select("id").eq("email", normalizedEmail).maybeSingle();
    if (findError) throw findError;
    if (existing) return res.status(409).json({ error: "An account with that email already exists." });
    const passwordHash = await bcrypt.hash(password, 12);
    const { data: row, error } = await supabase.from("app_users").insert({ full_name: fullName.trim(), email: normalizedEmail, password_hash: passwordHash, department: department.trim(), role: "student" }).select("id,full_name,email,department,role").single();
    if (error) {
      if (error.code === "23505") return res.status(409).json({ error: "An account with that email already exists." });
      throw error;
    }
    return res.status(201).json({ token: issueToken(row), user: safeUser(row) });
  } catch (error) { next(error); }
});
router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== "string" || typeof password !== "string" || email.length > 254 || password.length > 72) return res.status(400).json({ error: "Enter your email and password." });
    const { data: row, error } = await supabase.from("app_users").select("id,full_name,email,department,role,password_hash").eq("email", email.trim().toLowerCase()).maybeSingle();
    if (error) throw error;
    if (!row || !(await bcrypt.compare(password, row.password_hash))) return res.status(401).json({ error: "Email or password is incorrect." });
    return res.json({ token: issueToken(row), user: safeUser(row) });
  } catch (error) { next(error); }
});
module.exports = router;
