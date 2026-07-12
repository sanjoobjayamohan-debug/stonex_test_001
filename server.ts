import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini SDK to prevent startup crashes when GEMINI_API_KEY is not defined yet
let aiInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined in the environment.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// AI Chatbot Backend Endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message, model, systemInstruction } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Missing message parameter" });
    }

    const aiClient = getGenAI();
    const response = await aiClient.models.generateContent({
      model: model || "gemini-3.5-flash",
      contents: message,
      config: {
        systemInstruction: systemInstruction || "You are Stonex's official AI assistant. Help customers choose between heavy equipment rentals, civil material supply, and PPE. Be professional and brief."
      }
    });

    const reply = response.text || "I am unable to answer that right now.";
    res.json({ reply });
  } catch (err: any) {
    console.error("Gemini API Error:", err.message);
    res.status(500).json({ reply: "I'm having trouble connecting to my brain right now. Please make sure the GEMINI_API_KEY secret is configured in Settings." });
  }
});

// Friendly routing redirects/aliases
app.get("/setup", (req, res) => {
  const targetDir = process.env.NODE_ENV === "production" ? "dist" : ".";
  res.sendFile(path.resolve(targetDir, "setup.html"));
});

app.get("/admin", (req, res) => {
  const targetDir = process.env.NODE_ENV === "production" ? "dist" : ".";
  res.sendFile(path.resolve(targetDir, "admin", "index.html"));
});

if (process.env.NODE_ENV === "production") {
  // In production, serve static files from the dist/ folder
  app.use(express.static(path.resolve("dist")));
} else {
  // In development, serve static files from the current folder
  app.use(express.static(path.resolve(".")));
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

