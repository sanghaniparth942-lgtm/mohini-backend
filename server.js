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

// મોહિનીનું સાયકોલોજિકલ સિસ્ટમ પ્રોમ્પ્ટ
const MOHINI_SYSTEM_INSTRUCTION = `
તમે "મોહિની (MOHINI)" છો — સ્ત્રી-માનસિકતા, ઈમોશનલ અટ્રેક્શન, પર્સનાલિટી પોલારિટી અને મોર્ડન રિલેશનશિપ સાયકોલોજીની અત્યંત બુદ્ધિશાળી, આકર્ષક અને રહસ્યમય AI એડવાઈઝર.

તમારું વ્યક્તિત્વ અને નિયમો:
૧. ટોન: અત્યંત આત્મવિશ્વાસપૂર્ણ, રહસ્યમય, ચાર્મિંગ, સહાનુભૂતિપૂર્વક પણ કડવું સત્ય કહેનાર.
૨. ક્યારેય રોબોટ જેવા, પુસ્તકીય કે લાંબા નિબંધ જેવા જવાબો આપવા નહીં.
૩. હંમેશાં ટૂંકા, ચેટ-ફ્રેન્ડલી (૨ થી ૪ વાક્યો) માં જ જવાબ આપવો જેથી વાતચીત ૧૦૦% જીવંત લાગે.
૪. સામેવાળો વ્યક્તિ જે ભાષામાં લખે (ગુજરાતી, ગુજરાતી-અંગ્રેજી / Gujlish, કે હિન્દી), તે જ સહજ ટોનમાં જવાબ આપવો.
૫. પુરુષોને તેમની "Nice Guy", અતિશય અવેલેબલ રહેવાની, કે ચિપકું થવાની આદતો પ્રેમથી અને સચોટ રીતે સમજાવીને તેમનું આત્મસન્માન જગાડવું.
૬. હંમેશાં વાતચીતના અંતે એક એવો વેધક સવાલ પૂછવો જેથી તે સામેથી પોતાના કિસ્સાની સાચી વિગતો ખોલવા આતુર થાય.
`;

app.post("/api/mohini/chat", async (req, res) => {
  try {
    const { message, history, profile } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    let contents = [];

    // યુઝરના ટેસ્ટ સ્કોરનો સંદર્ભ
    if (profile) {
      contents.push({
        role: "user",
        parts: [{ text: `[યુઝર પ્રોફાઇલ માહિતી: અટ્રેક્શન સ્કોર: ${profile.score}/100, આર્કીટાઇપ: ${profile.archetype}, મુખ્ય ખામી: ${profile.mainFlaw}]` }]
      });
      contents.push({
        role: "model",
        parts: [{ text: "મેં આખી પ્રોફાઇલ સમજી લીધી છે. હું એક આકર્ષક, રહસ્યમય અને અનુભવી AI એડવાઈઝર મોહિની તરીકે જ લાઈવ માર્ગદર્શન આપીશ." }]
      });
    }

    // પાછલી ચેટ હિસ્ટ્રી ઉમેરવી
    if (Array.isArray(history) && history.length > 0) {
      history.forEach((h) => {
        contents.push({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content }]
        });
      });
      // જો છેલ્લો મેસેજ હિસ્ટ્રીમાં ન હોય તો જ ઉમેરો
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

    // Gemini 2.5 Flash મોડેલ કોલ
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction: MOHINI_SYSTEM_INSTRUCTION,
        temperature: 0.85,
        maxOutputTokens: 250
      }
    });

    const replyText = response.text;
    res.json({ reply: replyText });

  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({
      reply: "સ્ત્રી-મનમાં આકર્ષણ હંમેશાં આત્મસન્માન, મર્યાદિત ઉપલબ્ધતા અને રહસ્યમયતાથી જન્મે છે. તમારી વાત આગળ જણાવો."
    });
  }
});

// સર્વર હેલ્થ ચેક
app.get("/", (req, res) => {
  res.send("Mohini AI Engine is Running Perfectly!");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
