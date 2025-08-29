import express from "express";
import fetch from "node-fetch";

const router = express.Router();

// forward request to python FastAPI
router.post("/analyze", async (req, res) => {
  try {
    const pyRes = await fetch("http://localhost:8000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const json = await pyRes.json();
    res.json(json);
  } catch (err) {
    console.error("Python analyze failed:", err);
    res.status(500).json({ error: "Python backend not available" });
  }
});

export default router;
