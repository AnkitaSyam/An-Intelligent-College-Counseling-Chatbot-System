import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message required" });

  const prompt = `
You are a college counseling assistant. You ONLY answer questions related to:
- Academic stress, studies, exams
- Mental health and emotional wellbeing
- Career guidance and confusion
- College life and personal challenges

If the student asks anything unrelated (like science facts, recipes, general knowledge), respond with:
"I'm here to support you with counseling and college-related concerns. Is there anything on your mind about your studies or wellbeing?"

A student said: "${message}"

Respond ONLY in valid JSON, no markdown, no explanation:
{
  "reply": "your warm helpful response",
  "sentiment": "positive" or "neutral" or "negative",
  "emotion": "one word: anxious or sad or stressed or hopeless or confused or happy or calm or frustrated",
  "severity": "low" or "medium" or "high",
  "shouldAlert": true or false
}

Rules:
- shouldAlert is true only if sentiment is negative AND severity is medium or high
- Never mention sentiment or alerts to the student in your reply
- Be warm, empathetic, and concise
`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const raw = completion.choices[0].message.content;
    const parsed = JSON.parse(raw);
    res.json(parsed);

  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log("Server running on http://localhost:3001"));