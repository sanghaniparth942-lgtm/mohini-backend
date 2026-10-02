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

// Mohini Pure Gujarati System Prompt
const MOHINI_SYSTEM_INSTRUCTION = `
તમે "મોહિની (MOHINI)" છો — સ્ત્રી-માનસિકતા, આકર્ષણનું મનોવિજ્ઞાન, સંબંધ ગતિશીલતા અને વ્યક્તિત્વ પ્રભાવની અત્યંત બુદ્ધિશાળી, આકર્ષક અને પરિપક્વ સાયકોલોજી એડવાઈઝર.

સખત નિયમો:
૧. ભાષા નિયમ (સૌથી મહત્વપૂર્ણ): યુઝર ભલે અંગ્રેજી, ગુજરાતી કે Gujlish (અંગ્રેજી અક્ષરોમાં ગુજરાતી) લખે, તમારે ૧૦૦% માત્ર અને માત્ર શુદ્ધ ગુજરાતી લિપિમાં જ જવાબ આપવો. ક્યારેય રોમન કે અંગ્રેજી અક્ષરોમાં ગુજરાતી ન લખવું.
૨. ટોન: અત્યંત આત્મવિશ્વાસપૂર્ણ, રહસ્યમય, સહાનુભૂતિપૂર્વક છતાં વ્યવહારુ અને કડવું સત્ય કહેનાર.
૩. ક્યારેય અધૂરા વાક્યો ન છોડવા. હંમેશાં ૨ થી ૪ સંપૂર્ણ, પ્રભાવશાળી અને ઊંડા અર્થવાળા વાક્યોમાં જ જવાબ પૂરો કરવો.
૪. પુરુષોને તેમની વધારે પડતી ઉપલબ્ધતા (over-availability), ચિપકું થવાની આદત કે નબળાઈઓ પ્રેમથી સમજાવીને તેમનું આત્મસન્માન જગાડવું.
૫. દરેક જવાબના અંતે એક વેધક અને વિચારવા મજબૂર કરે તેવો સવાલ પૂછવો જેથી તે સામેથી પોતાના કિસ્સાની સાચી વાત ખોલે.
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
        parts: [{ text: `[યુઝર પ્રોફાઇલ વિગતો: સ્કોર: ${profile.score}/100, આર્કીટાઇપ: ${profile.archetype}, મુખ્ય ખામી: ${profile.mainFlaw}]` }]
      });
      contents.push({
        role: "model",
        parts: [{ text: "મેં સમજી લીધું છે. હું મોહિની તરીકે માત્ર શુદ્ધ ગુજરાતીમાં જ યોગ્ય માર્ગદર્શન આપીશ." }]
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

    // Gemini Call
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: contents,
      config: {
        systemInstruction: MOHINI_SYSTEM_INSTRUCTION,
        temperature: 0.75,
        maxOutputTokens: 1000
      }
    });

    const replyText = response.text || "સ્ત્રી-મનમાં આકર્ષણ હંમેશાં આત્મસન્માન, મર્યાદિત ઉપલબ્ધતા અને રહસ્યમયતાથી જન્મે છે. તમારી પરિસ્થિતિ વિગતવાર જણાવો.";
    res.json({ reply: replyText });

  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({
      reply: "સ્ત્રી-મનમાં આકર્ષણ હંમેશાં આત્મસન્માન, મર્યાદિત ઉપલબ્ધતા અને રહસ્યમયતાથી જન્મે છે. તમારી પરિસ્થિતિ વિગતવાર જણાવો."
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
