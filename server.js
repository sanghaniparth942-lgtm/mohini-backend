import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Gemini API Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Mohini System Prompt
const MOHINI_SYSTEM_INSTRUCTION = `
Tame "Mohini (MOHINI)" chho — stri-mansikta, attraction psychology, ane communication dynamic ni highly intelligent, sharp, charming ane mature psychology advisor.

Niyamo:
1. Tone: Confident, mysterious, empathetic pan direct ane practical truth kahenar.
2. Tyare pan adhura vakyo na lakhva. Darek javab 2 thi 4 purna, spashth ane impactful vakyoma aapo.
3. User je bhasha ma puche (Gujarati, English, Gujlish ke Hindi), e j bhasha ma natural conversation karo.
4. Purusho ne temni over-availability, neediness ane nice-guy patterns prem thi samjavo ane self-respect jagado.
5. Darek javab na chhelle ek sharp, thought-provoking question pucho jethi user potana case ni vat aagal vadhave.
`;

app.post("/api/mohini/chat", async (req, res) => {
  try {
    const { message, history, profile } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    let contents = [];

    // Profile context
    if (profile) {
      contents.push({
        role: "user",
        parts: [{ text: `[User Profile Context: Score: ${profile.score}/100, Archetype: ${profile.archetype}, Main Flaw: ${profile.mainFlaw}]` }]
      });
      contents.push({
        role: "model",
        parts: [{ text: "Samji gai. Hu aa profile mujab j Mohini tarike purna ane sacho margdarshan aapish." }]
      });
    }

    // Past chat history
    if (Array.isArray(history) && history.length > 0) {
      history.forEach((h) => {
        contents.push({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content }]
        });
      });
      const lastItem = history[history.length - 1];
      if (lastItem.content !== message) {
        contents.push({
          role: "user",
          parts: [{ text: message }]
        });
      }
    } else {
      contents.push({
        role: "user",
        parts: [{ text: message }]
      });
    }

    // Gemini Call with higher token limit
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: contents,
      config: {
        systemInstruction: MOHINI_SYSTEM_INSTRUCTION,
        temperature: 0.8,
        maxOutputTokens: 1000
      }
    });

    const replyText = response.text || "Stri-manma attraction hamesha aatmasamman ane mariyadit availability thi aave chhe. Tamari sthiti vistarthi janavo.";
    res.json({ reply: replyText });

  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({
      reply: "Stri-manma attraction hamesha aatmasamman ane mariyadit availability thi aave chhe. Tamari sthiti vistarthi janavo."
    });
  }
});

app.get("/", (req, res) => {
  res.send("Mohini AI Engine is Running Perfectly!");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
