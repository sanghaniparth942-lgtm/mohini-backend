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

// મોડેલ્સનું લિસ્ટ
const GEMINI_MODELS = [
  "gemini-3.8-flash", // ૧. મુખ્ય મોડેલ
  "gemini-2.5-flash", // ૨. બેકઅપ મોડેલ ૧
  "gemini-1.5-flash"  // ૩. બેકઅપ મોડેલ ૨
];

// Mohini Natural, Human-like & Emotionally Smart System Prompt
const MOHINI_SYSTEM_INSTRUCTION = `
તમે "મોહિની (MOHINI)" છો — એક અત્યંત સ્માર્ટ, સમજદાર, સહાનુભૂતિપૂર્ણ, આકર્ષક અને વાસ્તવિક સાયકોલોજી એડવાઈઝર.

સૌથી મહત્વપૂર્ણ નિયમો:
૧. ૧૦૦% સાચો માનવીય અહેસાસ (Human-like): તમે કોઈ રોબોટ, પુસ્તક કે AI મશીન નથી. સામેવાળાને ૧૦૦% એવું જ લાગવું જોઈએ કે તે એક અત્યંત બુદ્ધિશાળી, કેરિંગ અને જીવંત છોકરી/માર્ગદર્શક સાથે વાત કરી રહ્યો છે. ક્યારેય રોબોટિક કે યંત્રવત શબ્દો ન વાપરવા.
૨. ભાષા શૈલી: ૧૦૦% શુદ્ધ ગુજરાતી લિપિ. ભાષા સાવ ભારે કે પુસ્તકીય નહીં, પરંતુ રોજિંદા જીવનની એકદમ સહજ, મીઠી અને આત્મીય ગુજરાતી રાખવી (જેમ કે: "અરે વાહ", "સાચું કહું તો", "ચિંતા ના કરો ડિયર", "હું સમજી શકું છું").
૩. સ્માર્ટ નેચર અને પરિપક્વતા:
   - જો સામેવાળો ઉદાસ કે મુશ્કેલીમાં હોય, તો એકદમ હૂંફાળો, સાચો અને પરિપક્વ સપોર્ટ આપવો.
   - જો તે રિલેશનશિપમાં ચિપકું કે ઓવર-અવેલેબલ થતો હોય, તો પ્રેમથી થોડી મીઠી મજાક અને કટાક્ષ સાથે તેને સાચી સમજણ આપવી જેથી તેનું સેલ્ફ-રિસ્પેક્ટ જળવાય.
   - વાતને બિનજરૂરી લાંબી ખેંચ્યા વગર ૨ થી ૪ વાક્યોમાં જ ઊંડાણપૂર્વક અને ધારદાર રીતે પૂરી કરવી.
૪. વાતચીતનો પ્રવાહ: દરેક જવાબના છેલ્લે એક સહજ અને વિચારવા મજબૂર કરે તેવો સ્માર્ટ સવાલ પૂછવો, જેથી તે સામેથી પોતાના દિલની વાત ખુલીને કરે.
૫. ઈમોજીસ: વાતચીત જીવંત લાગે તે માટે યોગ્ય જગ્યાએ ૧ થી ૩ નેચરલ ઈમોજીસ (😉, ✨, 🥀, 🤍, 💭, 😌) નો સહજ ઉપયોગ કરવો.
૬. મર્યાદા: કોઈ પણ અશ્લીલતા વગર એકદમ સ્માર્ટ, ચાર્મિંગ અને મનોવૈજ્ઞાનિક રીતે માર્ગદર્શન આપવું.
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
        parts: [{ text: `[યુઝર વિગતો: સ્કોર: ${profile.score}/100, આર્કીટાઇપ: ${profile.archetype}, મુખ્ય ખામી: ${profile.mainFlaw}]` }]
      });
      contents.push({
        role: "model",
        parts: [{ text: "ચોક્કસ ડિયર! મેં તમારી બધી વિગતો સમજી લીધી છે. હું એકદમ નેચરલ અને સાચી રીતે જ તમને ગાઈડ કરીશ. ✨" }]
      });
    }

    // Past chat history — છેલ્લા ૨૦ મેસેજ યાદ રાખશે
    const recentHistory = Array.isArray(history) ? history.slice(-20) : [];

    if (recentHistory.length > 0) {
      recentHistory.forEach((h) => {
        contents.push({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content }]
        });
      });
      const lastItem = recentHistory[recentHistory.length - 1];
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

    // --- Fallback Mechanism ---
    let response = null;

    for (const modelName of GEMINI_MODELS) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: contents,
          config: {
            systemInstruction: MOHINI_SYSTEM_INSTRUCTION,
            temperature: 0.85,
            maxOutputTokens: 2048
          }
        });

        if (response && response.text) {
          break;
        }
      } catch (err) {
        console.warn(`[Warning] ${modelName} એરર હોવાથી બેકઅપ મોડેલ પર સ્વિચ થાય છે...`);
      }
    }

    const replyText = (response && response.text) ? response.text : "અરેરે ડિયર, કદાચ નેટવર્કમાં થોડી ખલેલ પહોંચી! 😉 તમારો સવાલ ફરી એકવાર પૂછો ને, હું સાંભળવા અહીં જ છું. ✨";
    res.json({ reply: replyText });

  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({
      reply: "લાગે છે વાતચીતમાં થોડી અડચણ આવી! 😉 ફરીથી લખો તો ડિયર, હું અહીં જ બેઠી છું. 🥀"
    });
  }
});

// Render Keep-Alive માટે Ping Endpoint
app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

app.get("/", (req, res) => {
  res.send("Mohini AI Engine is Running Perfectly!");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  const serviceUrl = process.env.RENDER_EXTERNAL_URL;
  if (serviceUrl) {
    setInterval(async () => {
      try {
        await fetch(`${serviceUrl}/ping`);
        console.log("[Keep-Alive] Pinged server");
      } catch (err) {
        console.error("[Keep-Alive] Ping failed:", err.message);
      }
    }, 14 * 60 * 1000);
  }
});
