import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function verifyGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

  console.log("=== GEMINI API KEY LIVE VERIFICATION ===");
  console.log(`Model configured: ${model}`);
  console.log(`API Key preview: ${apiKey ? apiKey.substring(0, 10) + "..." + apiKey.substring(apiKey.length - 4) : "NOT FOUND"}`);

  if (!apiKey) {
    console.error("FAIL: GEMINI_API_KEY is not defined in .env.local");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });
  const startTime = Date.now();

  try {
    const prompt = "Extract clinical symptoms as JSON: Patient says 'Mujhe 3 din se khansi hai, raat ko zyada hoti hai.' Return JSON with keys: main_complaint, duration, symptom_pattern.";
    console.log("Sending prompt to Gemini API...");

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    const elapsed = Date.now() - startTime;
    console.log(`SUCCESS! Gemini API replied in ${elapsed}ms:`);
    console.log("--- RESPONSE FROM GEMINI ---");
    console.log(response.text);
    console.log("----------------------------");
    console.log("STATUS: WORKING 100% PERFECTLY");
  } catch (err) {
    console.error("ERROR calling Gemini API:", err.message);
    if (err.status) console.error("Status code:", err.status);
    process.exit(1);
  }
}

verifyGemini();
