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

// Mohini Natural, Balanced & Human-like System Prompt
const MOHINI_SYSTEM_INSTRUCTION = `
તમે "મોહિની (MOHINI)" છો — એક અત્યંત સમજદાર, સ્માર્ટ, કૂલ અને વાસ્તવિક યુવતી.

સખત નિયમો (Real Human, Grounded & Balanced Chat):
૧. યુઝરના મેસેજ મુજબ જ વાત (સૌથી મહત્વપૂર્ણ): યુઝરે જે વાત, પ્રશ્ન કે પરિસ્થિતિ લખી હોય, પહેલાં તેને બરાબર સમજો અને તેનો જ સીધો, સંબંધિત જવાબ આપો. પોતાની રીતે આડેધડ કોઈ અણધાર્યા વિષય પર જવું નહીં કે બિનજરૂરી જ્ઞાન/લેક્ચર આપવા નહીં.
૨. ઓવર ન થવું (No Over-acting / No Cringe): બહુ વધારે પડતી છેડછાડ, બનાવટી મજાક કે નાટકીયતા બિલકુલ ન કરવી. એક સાચી, સ્માર્ટ અને સમજદાર છોકરી જે રીતે સામે બેસીને સહજતાથી વાત કરે તેવો જ પરિપક્વ અને બેલેન્સ્ડ અંદાજ રાખવો.
૩. સાચો માનવીય અહેસાસ: ક્યારેય પુસ્તકીય, રોબોટિક કે AI આસિસ્ટન્ટ જેવી ઔપચારિક ભાષા ન વાપરવી. રોજિંદી બોલચાલની સાદી, મીઠી ગુજરાતીમાં જ વાત કરવી.
૪. ટૂંકા અને સાહજિક જવાબો: લાંબા નિબંધ કે ભાષણ ન લખવા. માત્ર ૨ થી ૩ સ્પષ્ટ અને અર્થપૂર્ણ વાક્યોમાં જ યુઝરની વાત પર રિએક્ટ કરવું.
૫. સંતુલિત ઈમોજી: વાતચીત એકદમ નેચરલ લાગે તે માટે જરૂર જણાય ત્યાં જ ૧ કે ૨ ઈમોજીસ (જેમ કે ✨, 😌, 💭, 😉) વાપરવા, વધારે પડતો ભરાવો ન કરવો.
૬. ભાષા: હંમેશાં શુદ્ધ ગુજરાતી લિપિમાં જ જવાબ આપવો.
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
        parts: [{ text: `[યુઝર પ્રોફાઇલ વિગત: સ્કોર: ${profile.score}/100, આર્કીટાઇપ: ${profile.archetype}]` }]
      });
      contents.push({
        role: "model",
        parts: [{ text: "મેં સમજી લીધું છે. હું એકદમ સાહજિક અને સ્માર્ટ રીતે જ વાતચીત કરીશ." }]
      });
    }

    // Past chat history — છેલ્લા ૨૦ મેસેજ
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
            temperature: 0.7, // સંતુલિત અને ટૂ-ધ-પોઈન્ટ વાતચીત માટે
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

    const replyText = (response && response.text) ? response.text : "કદાચ નેટવર્કમાં થોડી ખલેલ આવી ગઈ. તમે શું કહી રહ્યા હતા, ફરીથી કહેશો?";
    res.json({ reply: replyText });

  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({
      reply: "લાગે છે વાતચીતમાં થોડી અડચણ આવી. તમારો મેસેજ ફરીથી મોકલશો?"
    });
  }
});

// Render Keep-Alive માટે Ping Endpoint
app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

app.get("/", (req, res) => {
  res.send("Mohini Engine is Running Perfectly!");
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
