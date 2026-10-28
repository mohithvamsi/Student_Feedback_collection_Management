const express = require("express");
const supabase = require("../supabase");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();
const categories = ["teaching", "course-content", "resources", "assessment", "facilities", "other"];
const statuses = ["submitted", "reviewed", "resolved"];

function toClient(row) {
  return {
    id: row.id, courseName: row.course_name, courseCode: row.course_code || "",
    facultyName: row.faculty_name, rating: row.rating, category: row.category,
    comments: row.comments, status: row.status, createdAt: row.created_at,
    studentName: row.app_users?.full_name || "Student",
    studentEmail: row.app_users?.email || ""
  };
}
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    let query = supabase.from("feedback").select("id,student_id,course_name,course_code,faculty_name,rating,category,comments,status,created_at,app_users(full_name,email)").order("created_at", { ascending: false }).limit(250);
    if (req.user.role !== "admin") query = query.eq("student_id", req.user.id);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ feedback: (data || []).map(toClient) });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    if (req.user.role !== "student") return res.status(403).json({ error: "Only student accounts can submit feedback." });
    const body = req.body || {};
    const fields = [
      ["courseName", 2, 120], ["courseCode", 0, 30], ["facultyName", 2, 120], ["comments", 10, 2000]
    ];
    for (const [name, min, max] of fields) {
      if (typeof body[name] !== "string" || body[name].trim().length < min || body[name].trim().length > max) {
        return res.status(400).json({ error: `${name} must be ${min ? `between ${min} and ` : "at most "}${max} characters${min ? "" : ""}.` });
      }
    }
    if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) return res.status(400).json({ error: "Choose a rating from 1 to 5." });
    if (!categories.includes(body.category)) return res.status(400).json({ error: "Choose a valid feedback category." });
    const { data, error } = await supabase.from("feedback").insert({
      student_id: req.user.id, course_name: body.courseName.trim(), course_code: body.courseCode.trim(),
      faculty_name: body.facultyName.trim(), rating: body.rating, category: body.category,
      comments: body.comments.trim()
    }).select("id,student_id,course_name,course_code,faculty_name,rating,category,comments,status,created_at").single();
    if (error) throw error;
    res.status(201).json({ feedback: toClient(data) });
  } catch (error) { next(error); }
});

router.patch("/:id/status", requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!statuses.includes(status)) return res.status(400).json({ error: "Status must be submitted, reviewed, or resolved." });
    const { data, error } = await supabase.from("feedback").update({ status }).eq("id", req.params.id).select("id,status").maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Feedback record was not found." });
    res.json({ id: data.id, status: data.status });
  } catch (error) { next(error); }
});

module.exports = router;
