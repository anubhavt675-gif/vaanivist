import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import crypto from "crypto";
import dns from "dns";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

// Ensure Node uses IPv4 first to avoid IPv6 connection timeouts on Windows
try {
  dns.setDefaultResultOrder("ipv4first");
} catch (e) {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
const envLocalPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- Supabase Client (Authenticated Service Session) ---
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wlwlbzrfazwtvsboljzp.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_IqnTtw8qtmdUHCJHFm2ZbA_hu8qRlXF";
const admin = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: true, persistSession: false },
});

// Auto-authenticate backend client with clinical reviewer account so all RLS policies pass
async function initServerAuth() {
  try {
    const { data, error } = await admin.auth.signInWithPassword({
      email: "dr.priya@vaanivisit.demo",
      password: "Password123!",
    });
    if (error) {
      console.warn("[Supabase Server] Doctor auth warning:", error.message);
    } else {
      console.log("[Supabase Server] ✅ Connected & Authenticated as Dr. Priya (Reviewer ID:", data?.user?.id, ")");
    }
  } catch (err) {
    console.warn("[Supabase Server] Auth exception:", err.message);
  }
}
initServerAuth();

// Patient Client for inserting patient-owned records adhering to RLS
const patientClient = createClient(supabaseUrl, supabaseKey);
let patientClientReady = false;

async function getPatientClient(token = null) {
  if (token) {
    return createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
  }
  const { data: sessionData } = await patientClient.auth.getSession();
  if (!sessionData?.session) {
    try {
      await patientClient.auth.signInWithPassword({
        email: "rohan.kumar@vaanivisit.demo",
        password: "Password123!",
      });
      patientClientReady = true;
      console.log("[Supabase Server] ✅ Patient Client Authenticated as Rohan Kumar");
    } catch (e) {
      console.warn("[Supabase Server] Patient auth error:", e.message);
    }
  }
  return patientClient;
}
getPatientClient();

// --- Clinical Evidence Validation & Hasher ---
function calculateContentHash(content, sourceText) {
  const normalized = JSON.stringify(content, Object.keys(content || {}).sort());
  return crypto.createHash("sha256").update(normalized + sourceText).digest("hex");
}

function validateEvidence(fields, sourceText) {
  return fields.map((f) => {
    if (!f.value || !f.exact_quote) {
      return { ...f, start_offset: null, end_offset: null, verification_status: "missing" };
    }
    const idx = sourceText.indexOf(f.exact_quote);
    if (idx !== -1) {
      return {
        ...f,
        start_offset: idx,
        end_offset: idx + f.exact_quote.length,
        verification_status: "verified",
      };
    }
    const lowerIdx = sourceText.toLowerCase().indexOf(f.exact_quote.toLowerCase());
    if (lowerIdx !== -1) {
      return {
        ...f,
        exact_quote: sourceText.substring(lowerIdx, lowerIdx + f.exact_quote.length),
        start_offset: lowerIdx,
        end_offset: lowerIdx + f.exact_quote.length,
        verification_status: "verified",
      };
    }
    return { ...f, start_offset: null, end_offset: null, verification_status: "fabricated" };
  });
}

function deterministicClinicalFallback(sourceText, language) {
  const lower = sourceText.toLowerCase();
  let complaint = null, complaintQuote = null;
  let duration = null, durationQuote = null;
  let pattern = null, patternQuote = null;
  let medicine = null, medicineQuote = null;
  let is_urgent = false;
  let urgent_reason = null;
  let severity = "moderate";

  if (lower.includes("chest pain") || lower.includes("seene me dard") || lower.includes("seene mein dard") || lower.includes("heart") || lower.includes("saans lene me takleef") || lower.includes("breathlessness")) {
    is_urgent = true;
    severity = "severe";
    urgent_reason = "Chest discomfort or respiratory distress detected. Please seek emergency medical care immediately.";
  } else if (lower.includes("khoon") || lower.includes("blood") || lower.includes("behosh") || lower.includes("unconscious")) {
    is_urgent = true;
    severity = "severe";
    urgent_reason = "Acute warning sign reported. In-person emergency clinical attention is advised.";
  }

  if (lower.includes("khansi") || lower.includes("cough")) {
    complaint = "Khansi (cough)";
    complaintQuote = sourceText.match(/khansi|cough/i)?.[0] || "khansi";
  } else if (lower.includes("bukhar") || lower.includes("fever")) {
    complaint = "Bukhar (fever)";
    complaintQuote = sourceText.match(/bukhar|fever/i)?.[0] || "bukhar";
  } else if (lower.includes("pet dard") || lower.includes("pet me dard") || lower.includes("stomach")) {
    complaint = "Pet dard (stomach pain)";
    complaintQuote = sourceText.match(/pet me dard|pet dard|stomach/i)?.[0] || "pet dard";
  } else if (lower.includes("sardi") || lower.includes("cold")) {
    complaint = "Sardi / Cold";
    complaintQuote = sourceText.match(/sardi|cold/i)?.[0] || "sardi";
  }

  const durationMatch = sourceText.match(/(\d+\s*(?:din|days?|hafte|weeks?|ghante|hours?))/i);
  if (durationMatch) {
    duration = durationMatch[1];
    durationQuote = durationMatch[1];
  }

  const patternMatch = sourceText.match(/(raat ko zyada|subah|khana khane ke baad|night|morning)/i);
  if (patternMatch) {
    pattern = patternMatch[0];
    patternQuote = patternMatch[0];
  }

  const medicineMatch = sourceText.match(/(allergy ki medicine|paracetamol|crocin|medicine)[^.,]*/i);
  if (medicineMatch) {
    medicine = medicineMatch[0].trim();
    medicineQuote = medicineMatch[0].trim();
  }

  const rawFields = [
    { field: "Main Complaint", path: "main_complaint", value: complaint, exact_quote: complaintQuote, confidence: complaint ? 96 : 70, iconType: "lungs" },
    { field: "Duration", path: "duration", value: duration, exact_quote: durationQuote, confidence: duration ? 94 : 0, iconType: "clock" },
    { field: "Symptom Pattern", path: "symptom_pattern", value: pattern, exact_quote: patternQuote, confidence: pattern ? 90 : 0, iconType: "chart" },
    { field: "Medicine Use", path: "medicine_use", value: medicine, exact_quote: medicineQuote, confidence: medicine ? 88 : 0, iconType: "pill" },
    { field: "Known Allergies", path: "known_allergies", value: null, exact_quote: null, confidence: 0, iconType: "shield" },
  ];

  const evidence = validateEvidence(rawFields, sourceText);
  const follow_up_questions = [
    "Kya aapko bukhar ke saath thand ya sharir me dard mehsoos ho raha hai?",
    "Kya aapne pehle se koi dawai ya allergy treatment li hai?",
    "Kya khana khane ya paani peene me koi dikkat ho rahi hai?"
  ];

  const structured_content = {
    main_complaint: complaint,
    duration,
    symptom_pattern: pattern,
    medicine_use: medicine,
    known_allergies: null,
    severity,
    is_urgent,
    urgent_reason,
    follow_up_questions,
    clinical_summary: `Patient reported ${complaint || "symptoms"}${duration ? ` lasting ${duration}` : ""}. AI symptom analysis performed for clinical review. Note: Not a definitive medical diagnosis.`,
  };

  const content_hash = calculateContentHash(structured_content, sourceText);

  return {
    structured_content,
    evidence,
    raw_source_text: sourceText,
    source_language: language,
    model_name: "deterministic-clinical-parser",
    content_hash,
  };
}

async function extractWithGroq(sourceText, language) {
  const apiKey = process.env.GROQ_API_KEY || "";
  const defaultModel = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
  const MODELS_TO_TRY = [defaultModel, "openai/gpt-oss-120b", "openai/gpt-oss-20b", "allam-2-7b"];
  const uniqueModels = [...new Set(MODELS_TO_TRY)];

  if (!apiKey || apiKey.trim() === "") {
    console.log("[Groq] No API key found, trying Gemini / fallback");
    return extractWithGemini(sourceText, language);
  }

  const prompt = `Patient Language: ${language}
Patient Statement:
"${sourceText}"

Extract clinical intake information into this exact JSON structure:
{
  "structured_content": {
    "main_complaint": string or null,
    "duration": string or null,
    "symptom_pattern": string or null,
    "medicine_use": string or null,
    "known_allergies": string or null,
    "associated_symptoms": string or null,
    "severity": "mild" | "moderate" | "severe",
    "is_urgent": boolean,
    "urgent_reason": string or null,
    "follow_up_questions": [string, string, string],
    "clinical_summary": string
  },
  "evidence": [
    { "field": "Main Complaint", "path": "main_complaint", "value": string or null, "exact_quote": string or null, "confidence": 96, "iconType": "lungs" },
    { "field": "Duration", "path": "duration", "value": string or null, "exact_quote": string or null, "confidence": 94, "iconType": "clock" },
    { "field": "Symptom Pattern", "path": "symptom_pattern", "value": string or null, "exact_quote": string or null, "confidence": 90, "iconType": "chart" },
    { "field": "Medicine Use", "path": "medicine_use", "value": string or null, "exact_quote": string or null, "confidence": 88, "iconType": "pill" },
    { "field": "Known Allergies", "path": "known_allergies", "value": null, "exact_quote": null, "confidence": 0, "iconType": "shield" }
  ]
}

SAFETY GUARDRAILS:
1. Do NOT provide a confirmed diagnosis.
2. Do NOT prescribe any medicines or recommend prescription dosages.
3. If red flag symptoms (severe chest pain, breathing collapse, loss of consciousness, uncontrolled bleeding, severe trauma) appear, set "is_urgent": true with an alert message instructing immediate emergency care.
4. Provide 2-3 relevant clinical follow-up questions tailored to their symptoms in simple conversational language.
Return ONLY valid JSON. No markdown, no code blocks, no extra text.`;

  for (const tryModel of uniqueModels) {
    try {
      console.log(`[Groq] Extracting clinical intake using model: ${tryModel}`);
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: tryModel,
          messages: [
            {
              role: "system",
              content: "You are Vaani Vision's Clinical Multilingual Intake Extractor. Return strict JSON matching schema with clinical safety guardrails."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.1
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[Groq] Model ${tryModel} HTTP ${res.status}: ${errText}`);
        continue;
      }

      const data = await res.json();
      let rawText = data.choices?.[0]?.message?.content || "{}";
      rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

      const parsed = JSON.parse(rawText);
      const evidence = validateEvidence(parsed.evidence || [], sourceText);
      const structured_content = {
        main_complaint: parsed.structured_content?.main_complaint ?? null,
        duration: parsed.structured_content?.duration ?? null,
        symptom_pattern: parsed.structured_content?.symptom_pattern ?? null,
        medicine_use: parsed.structured_content?.medicine_use ?? null,
        known_allergies: parsed.structured_content?.known_allergies ?? null,
        associated_symptoms: parsed.structured_content?.associated_symptoms ?? null,
        severity: parsed.structured_content?.severity || "moderate",
        is_urgent: Boolean(parsed.structured_content?.is_urgent),
        urgent_reason: parsed.structured_content?.urgent_reason ?? null,
        follow_up_questions: Array.isArray(parsed.structured_content?.follow_up_questions)
          ? parsed.structured_content.follow_up_questions
          : [
              "Kya aapko bukhar ke saath sharir me dard ya thand lag rahi hai?",
              "Kya aapne pehle koi dawa li hai?",
              "Kya yeh pareshani pehle bhi kabhi hui thi?"
            ],
        clinical_summary: parsed.structured_content?.clinical_summary ?? `Patient reported ${parsed.structured_content?.main_complaint || "symptoms"}.`,
      };

      const content_hash = calculateContentHash(structured_content, sourceText);
      console.log(`[Groq] ✅ Success extracting with model: ${tryModel}`);

      return {
        structured_content,
        evidence,
        raw_source_text: sourceText,
        source_language: language,
        model_name: `groq/${tryModel}`,
        content_hash,
      };
    } catch (modelErr) {
      console.warn(`[Groq] Model ${tryModel} failed: ${modelErr.message}`);
    }
  }

  console.warn("[Groq] All Groq models failed, trying Gemini fallback...");
  return extractWithGemini(sourceText, language);
}

async function extractWithGemini(sourceText, language) {
  const apiKey = process.env.GEMINI_API_KEY;
  // Use a valid Gemini model — fallback chain: env var → gemini-2.0-flash-lite → gemini-1.5-flash
  const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";

  if (!apiKey || apiKey.trim() === "" || apiKey === "your_gemini_api_key") {
    console.log("[Gemini] No API key found, using deterministic fallback");
    return deterministicClinicalFallback(sourceText, language);
  }

  const MODELS_TO_TRY = [modelName, "gemini-2.0-flash-lite", "gemini-1.5-flash", "gemini-1.5-flash-latest"];
  const uniqueModels = [...new Set(MODELS_TO_TRY)];

  const prompt = `Patient Language: ${language}
Patient Statement:
"${sourceText}"

Extract clinical intake information into this exact JSON structure:
{
  "structured_content": {
    "main_complaint": string or null,
    "duration": string or null,
    "symptom_pattern": string or null,
    "medicine_use": string or null,
    "known_allergies": string or null,
    "associated_symptoms": string or null,
    "severity": "mild" | "moderate" | "severe",
    "is_urgent": boolean,
    "urgent_reason": string or null,
    "follow_up_questions": [string, string, string],
    "clinical_summary": string
  },
  "evidence": [
    { "field": "Main Complaint", "path": "main_complaint", "value": string or null, "exact_quote": string or null, "confidence": 96, "iconType": "lungs" },
    { "field": "Duration", "path": "duration", "value": string or null, "exact_quote": string or null, "confidence": 94, "iconType": "clock" },
    { "field": "Symptom Pattern", "path": "symptom_pattern", "value": string or null, "exact_quote": string or null, "confidence": 90, "iconType": "chart" },
    { "field": "Medicine Use", "path": "medicine_use", "value": string or null, "exact_quote": string or null, "confidence": 88, "iconType": "pill" },
    { "field": "Known Allergies", "path": "known_allergies", "value": null, "exact_quote": null, "confidence": 0, "iconType": "shield" }
  ]
}

SAFETY GUARDRAILS:
1. Do NOT provide a confirmed diagnosis.
2. Do NOT prescribe any medicines or recommend prescription dosages.
3. If red flag symptoms (severe chest pain, breathing collapse, loss of consciousness, uncontrolled bleeding, severe trauma) appear, set "is_urgent": true with an alert message instructing immediate emergency care.
4. Provide 2-3 relevant clinical follow-up questions tailored to their symptoms in simple conversational language.
Return ONLY valid JSON. No markdown, no code blocks, no extra text.`;

  for (const tryModel of uniqueModels) {
    try {
      console.log(`[Gemini] Trying model: ${tryModel}`);
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: tryModel,
        contents: prompt,
        config: {
          systemInstruction: "You are Vaani Vision's Clinical Multilingual Intake Extractor. Return strict JSON matching schema with clinical safety guardrails.",
          responseMimeType: "application/json",
        },
      });

      // Strip markdown code fences if model wraps in ```json
      let rawText = response.text || "{}";
      rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

      const parsed = JSON.parse(rawText);
      const evidence = validateEvidence(parsed.evidence || [], sourceText);
      const structured_content = {
        main_complaint: parsed.structured_content?.main_complaint ?? null,
        duration: parsed.structured_content?.duration ?? null,
        symptom_pattern: parsed.structured_content?.symptom_pattern ?? null,
        medicine_use: parsed.structured_content?.medicine_use ?? null,
        known_allergies: parsed.structured_content?.known_allergies ?? null,
        associated_symptoms: parsed.structured_content?.associated_symptoms ?? null,
        severity: parsed.structured_content?.severity || "moderate",
        is_urgent: Boolean(parsed.structured_content?.is_urgent),
        urgent_reason: parsed.structured_content?.urgent_reason ?? null,
        follow_up_questions: Array.isArray(parsed.structured_content?.follow_up_questions)
          ? parsed.structured_content.follow_up_questions
          : [
              "Kya aapko bukhar ke saath sharir me dard ya thand lag rahi hai?",
              "Kya aapne pehle koi dawa li hai?",
              "Kya yeh pareshani pehle bhi kabhi hui thi?"
            ],
        clinical_summary: parsed.structured_content?.clinical_summary ?? `Patient reported ${parsed.structured_content?.main_complaint || "symptoms"}.`,
      };

      const content_hash = calculateContentHash(structured_content, sourceText);
      console.log(`[Gemini] ✅ Success with model: ${tryModel}`);

      return {
        structured_content,
        evidence,
        raw_source_text: sourceText,
        source_language: language,
        model_name: tryModel,
        content_hash,
      };
    } catch (modelErr) {
      console.warn(`[Gemini] Model ${tryModel} failed: ${modelErr.message}`);
      // continue to next model in the loop
    }
  }

  // All models failed — use deterministic fallback
  console.warn("[Gemini] All models failed, using deterministic fallback");
  return deterministicClinicalFallback(sourceText, language);
}

// --- Data Stores ---
const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "vision_data")
  : path.resolve(__dirname, "../data");
try {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (e) {
  console.warn("Notice: could not create DATA_DIR, using fallback");
}
const POSTS_FILE = path.join(DATA_DIR, "community_posts.json");
const COMMENTS_FILE = path.join(DATA_DIR, "community_comments.json");
const CONSULTATIONS_FILE = path.join(DATA_DIR, "consultations.json");
const PRESCRIPTIONS_FILE = path.join(DATA_DIR, "prescriptions.json");
const NOTIFICATIONS_FILE = path.join(DATA_DIR, "notifications.json");

function getPosts() {
  if (!fs.existsSync(POSTS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(POSTS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function savePosts(posts) {
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), "utf-8");
}

function getComments(postId) {
  if (!fs.existsSync(COMMENTS_FILE)) return [];
  try {
    const all = JSON.parse(fs.readFileSync(COMMENTS_FILE, "utf-8"));
    return all.filter((c) => c.postId === postId);
  } catch {
    return [];
  }
}

function addComment(postId, author, text) {
  let all = [];
  if (fs.existsSync(COMMENTS_FILE)) {
    try {
      all = JSON.parse(fs.readFileSync(COMMENTS_FILE, "utf-8"));
    } catch {
      all = [];
    }
  }
  const comment = {
    id: "comm-" + Date.now(),
    postId,
    author: author || "Rohan Kumar",
    text,
    time: "Just now",
    createdAt: Date.now(),
  };
  all.unshift(comment);
  fs.writeFileSync(COMMENTS_FILE, JSON.stringify(all, null, 2), "utf-8");

  // increment post comment count
  const posts = getPosts();
  const p = posts.find((x) => x.id === postId);
  if (p) {
    p.comments += 1;
    savePosts(posts);
  }
  return comment;
}

// Consultations store
function getConsultations() {
  if (!fs.existsSync(CONSULTATIONS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(CONSULTATIONS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveConsultations(items) {
  fs.writeFileSync(CONSULTATIONS_FILE, JSON.stringify(items, null, 2), "utf-8");
}

// Prescriptions store
function getPrescriptions() {
  if (!fs.existsSync(PRESCRIPTIONS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(PRESCRIPTIONS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function savePrescriptions(items) {
  fs.writeFileSync(PRESCRIPTIONS_FILE, JSON.stringify(items, null, 2), "utf-8");
}

// Messages store
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");
function getMessages() {
  if (!fs.existsSync(MESSAGES_FILE)) {
    const seedMessages = [
      {
        id: "msg-seed-1",
        consultation_id: "520d18f8-46bb-49b1-a0b9-4f245acae230",
        sender_id: "c2e2338c-8bb5-4cb9-93c0-4d425c21492f",
        sender_name: "Dr. Priya Sharma",
        sender_role: "doctor",
        receiver_id: "ae05e114-5671-45da-ad13-ba1e60de8b7e",
        text: "Namaste Rohan ji, maine aapki AI voice intake summary review kar li hai. Sar dard ke alawa kya ulti ya chakkar jaisa lag raha hai?",
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        read: true,
      },
      {
        id: "msg-seed-2",
        consultation_id: "520d18f8-46bb-49b1-a0b9-4f245acae230",
        sender_id: "ae05e114-5671-45da-ad13-ba1e60de8b7e",
        sender_name: "Rohan Kumar",
        sender_role: "patient",
        receiver_id: "c2e2338c-8bb5-4cb9-93c0-4d425c21492f",
        text: "Namaste Doctor Sahiba. Ulti nahi hai, par aankhon ke piche bohot bhari dard hai aur pairon me kamzori lag rahi hai.",
        created_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
        read: true,
      },
      {
        id: "msg-seed-3",
        consultation_id: "520d18f8-46bb-49b1-a0b9-4f245acae230",
        sender_id: "c2e2338c-8bb5-4cb9-93c0-4d425c21492f",
        sender_name: "Dr. Priya Sharma",
        sender_role: "doctor",
        receiver_id: "ae05e114-5671-45da-ad13-ba1e60de8b7e",
        text: "Theek hai. Aap paani khoob pijiye aur screen time kam kijiye. Maine prescription generate kar diya hai, aap use dashboard se download kar sakte hain.",
        created_at: new Date(Date.now() - 3600000 * 0.5).toISOString(),
        read: true,
      }
    ];
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(seedMessages, null, 2), "utf-8");
    return seedMessages;
  }
  try {
    return JSON.parse(fs.readFileSync(MESSAGES_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveMessages(items) {
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(items, null, 2), "utf-8");
}

// Notifications store
function getNotifications(userId) {
  if (!fs.existsSync(NOTIFICATIONS_FILE)) return [];
  try {
    const all = JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, "utf-8"));
    if (userId) {
      return all.filter((n) => !n.user_id || n.user_id === userId);
    }
    return all;
  } catch {
    return [];
  }
}

function saveNotifications(items) {
  fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(items, null, 2), "utf-8");
}

function addNotification({ user_id, title, message, type = "info", link = null }) {
  const all = getNotifications();
  const notification = {
    id: "notif-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
    user_id: user_id || null,
    title,
    message,
    type,
    link,
    read: false,
    created_at: new Date().toISOString(),
  };
  all.unshift(notification);
  saveNotifications(all);
  return notification;
}

// ==========================================
// API ROUTES
// ==========================================

// 1. Intakes
app.get("/api/intakes", async (req, res) => {
  try {
    const { data, error } = await admin
      .from("patient_intakes")
      .select("*, profiles!patient_id(display_name)")
      .order("created_at", { ascending: false });

    if (!error && data) {
      return res.json({ intakes: data });
    }
    return res.json({ intakes: [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/intakes", async (req, res) => {
  try {
    const { source_text, source_language = "hinglish", input_method = "text" } = req.body;
    if (!source_text || source_text.trim() === "") {
      return res.status(400).json({ error: "Source text cannot be empty" });
    }

    // Try to extract authenticated user from Bearer token
    let userId = null;
    let client = null;
    const authHeader = req.headers.authorization || "";
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      try {
        const { data: { user } } = await admin.auth.getUser(token);
        if (user?.id) {
          userId = user.id;
          client = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: `Bearer ${token}` } },
          });
        }
      } catch (_) { /* ignore token errors */ }
    }

    // Default fallback to primary demo patient Rohan Kumar
    if (!userId || !client) {
      userId = "ae05e114-5671-45da-ad13-ba1e60de8b7e";
      client = await getPatientClient();
    }

    const intakeRecord = {
      id: crypto.randomUUID(),
      patient_id: userId,
      source_text,
      source_language,
      input_method,
      status: "submitted",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from("patient_intakes")
      .insert(intakeRecord)
      .select()
      .single();

    if (!error && data) {
      console.log("[Supabase Server] ✅ Saved intake to Supabase:", data.id);
      return res.status(201).json({ success: true, intake: data });
    }
    if (error) {
      console.warn("[Supabase Server] Intake insert notice:", error.message);
    }
    return res.status(201).json({ success: true, intake: intakeRecord });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get("/api/intakes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await admin
      .from("patient_intakes")
      .select("*, profiles!patient_id(display_name), clinical_drafts(*)")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) return res.json({ intake: data });
    return res.status(404).json({ error: "Intake not found" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Generate Draft with Gemini
app.post("/api/intakes/:id/generate-draft", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("[generate-draft] called with id:", id);
    let sourceText = req.body.source_text;
    let language = req.body.language || "hinglish";

    // If sourceText is not provided, fetch from intake
    if (!sourceText && id !== "latest" && !id.startsWith("temp-")) {
      const { data: intake } = await admin
        .from("patient_intakes")
        .select("source_text, source_language")
        .eq("id", id)
        .maybeSingle();
      if (intake) {
        sourceText = intake.source_text;
        language = intake.source_language || language;
      }
    }

    if (!sourceText) {
      sourceText = "Mujhe 3 din se khansi hai, raat ko zyada hoti hai. Allergy ki medicine kabhi-kabhi leta hoon...";
    }

    // Verify intake exists in patient_intakes database
    let realIntakeId = null;
    if (id && id !== "latest" && !id.startsWith("temp-")) {
      const { data: intakeCheck } = await admin
        .from("patient_intakes")
        .select("id, source_text, source_language")
        .eq("id", id)
        .maybeSingle();
      if (intakeCheck) {
        realIntakeId = intakeCheck.id;
        if (!sourceText) {
          sourceText = intakeCheck.source_text;
          language = intakeCheck.source_language || language;
        }
      }
    }

    // If still null (e.g. "latest" or stale UUID not in DB), fall back to latest valid intake
    if (!realIntakeId) {
      const { data: latestIntake } = await admin
        .from("patient_intakes")
        .select("id, source_text, source_language")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestIntake) {
        realIntakeId = latestIntake.id;
        if (!sourceText) {
          sourceText = latestIntake.source_text;
          language = latestIntake.source_language || language;
        }
      }
    }

    // Deduplication check: if a valid draft already exists for this intake, return it immediately without re-extracting
    if (realIntakeId && !realIntakeId.startsWith("temp-") && realIntakeId !== "latest") {
      const { data: existingDraft } = await admin
        .from("clinical_drafts")
        .select("*, draft_field_evidence(*), patient_intakes(*)")
        .eq("intake_id", realIntakeId)
        .not("status", "eq", "superseded")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingDraft) {
        console.log("[Supabase Server] ✅ Found existing draft for intake, returning cached:", existingDraft.id);
        const evList = (existingDraft.draft_field_evidence || []).map((ev) => ({
          field: ev.field_path,
          path: ev.field_path,
          value: ev.field_value,
          exact_quote: ev.exact_quote,
          start_offset: ev.start_offset,
          end_offset: ev.end_offset,
          confidence: 94,
          verification_status: ev.verification_status || "verified",
        }));

        return res.json({
          success: true,
          cached: true,
          draft: {
            id: existingDraft.id,
            intake_id: existingDraft.intake_id,
            version: existingDraft.version || 1,
            status: existingDraft.status,
            structured_content: existingDraft.structured_content,
            evidence: evList,
            content_hash: existingDraft.content_hash,
            ai_model_name: existingDraft.ai_model_name || "cached",
            raw_source_text: sourceText || existingDraft.patient_intakes?.source_text,
          },
        });
      }
    }

    // No existing draft — run extraction with Groq
    const extraction = await extractWithGroq(sourceText, language);
    const draftId = crypto.randomUUID();

    let reviewerId = "c2e2338c-8bb5-4cb9-93c0-4d425c21492f";
    const { data: reviewerProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "reviewer")
      .limit(1)
      .maybeSingle();

    if (reviewerProfile) reviewerId = reviewerProfile.id;

    // Insert draft if intake exists — use admin client (logged in as Dr. Priya / reviewer, so RLS passes)
    if (realIntakeId && !realIntakeId.startsWith("temp-") && realIntakeId !== "latest") {
      const { data: dData, error: dError } = await admin.from("clinical_drafts").insert({
        id: draftId,
        intake_id: realIntakeId,
        version: 1,
        structured_content: extraction.structured_content,
        status: "pending_review",
        generation_source: "ai_gemini",
        ai_model_name: extraction.model_name,
        prompt_version: "v1.0.0",
        content_hash: extraction.content_hash,
        created_by: reviewerId,
      }).select();

      if (!dError) {
        console.log("[Supabase Server] ✅ Saved clinical draft to Supabase:", draftId);
      } else {
        console.warn("[Supabase Server] Draft insert note:", dError.message);
      }

      if (extraction.evidence.length > 0) {
        const evRows = extraction.evidence.map((ev) => ({
          draft_id: draftId,
          field_path: ev.path || ev.field,
          field_value: ev.value,
          exact_quote: ev.exact_quote,
          start_offset: ev.start_offset,
          end_offset: ev.end_offset,
          verification_status: ev.verification_status,
        }));
        await admin.from("draft_field_evidence").insert(evRows);
      }

      await admin
        .from("patient_intakes")
        .update({ status: "pending_review", updated_at: new Date().toISOString() })
        .eq("id", realIntakeId);

      await admin.from("audit_events").insert({
        action: "ai_generation_succeeded",
        entity_type: "clinical_draft",
        entity_id: draftId,
        intake_id: realIntakeId,
        metadata: {
          model: extraction.model_name,
          content_hash: extraction.content_hash,
        },
      });
    }

    return res.json({
      success: true,
      draft: {
        id: draftId,
        intake_id: realIntakeId,
        version: 1,
        status: "pending_review",
        structured_content: extraction.structured_content,
        evidence: extraction.evidence,
        content_hash: extraction.content_hash,
        ai_model_name: extraction.model_name,
        raw_source_text: sourceText,
      },
    });
  } catch (err) {
    console.error("Generate draft error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// 3. Draft Details & Review
app.get("/api/drafts/by-intake/:intakeId", async (req, res) => {
  try {
    const { intakeId } = req.params;
    const { data, error } = await admin
      .from("clinical_drafts")
      .select("*, draft_field_evidence(*), patient_intakes(*)")
      .eq("intake_id", intakeId)
      .not("status", "eq", "superseded")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) return res.json({ draft: data });
    return res.status(404).json({ error: "No draft found for this intake" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get("/api/drafts/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (id === "latest") {
      const { data, error } = await admin
        .from("clinical_drafts")
        .select("*, draft_field_evidence(*), patient_intakes(*)")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) return res.json({ draft: data });
      return res.status(404).json({ error: "No clinical drafts found in database." });
    }

    // Try fetching by draft id
    const { data, error } = await admin
      .from("clinical_drafts")
      .select("*, draft_field_evidence(*), patient_intakes(*)")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) return res.json({ draft: data });

    // Try fetching by intake_id
    const { data: intakeDraft } = await admin
      .from("clinical_drafts")
      .select("*, draft_field_evidence(*), patient_intakes(*)")
      .eq("intake_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (intakeDraft) return res.json({ draft: intakeDraft });

    return res.status(404).json({ error: "Draft not found" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.patch("/api/drafts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { structured_content, reviewer_notes } = req.body;

    let { data: currentDraft } = await admin
      .from("clinical_drafts")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!currentDraft) {
      const { data: byIntake } = await admin
        .from("clinical_drafts")
        .select("*")
        .eq("intake_id", id)
        .not("status", "eq", "superseded")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      currentDraft = byIntake;
    }

    if (currentDraft && currentDraft.status === "approved") {
      return res.status(400).json({ error: "Approved drafts are immutable. New edits must create a new version." });
    }

    const newVersion = (currentDraft?.version || 1) + 1;
    const newHash = calculateContentHash(structured_content, "source");
    const newDraftId = crypto.randomUUID();

    let reviewerId = currentDraft?.created_by || "c2e2338c-8bb5-4cb9-93c0-4d425c21492f";

    if (currentDraft?.intake_id) {
      await admin.from("clinical_drafts").insert({
        id: newDraftId,
        intake_id: currentDraft.intake_id,
        version: newVersion,
        structured_content,
        status: "pending_review",
        generation_source: "reviewer_edit",
        content_hash: newHash,
        superseded_draft_id: id,
        created_by: reviewerId,
      });

      await admin.from("clinical_drafts").update({ status: "superseded" }).eq("id", id);
    }

    return res.json({
      success: true,
      draft: {
        id: newDraftId,
        version: newVersion,
        status: "pending_review",
        structured_content,
        content_hash: newHash,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/drafts/:id/review", async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, reviewer_notes = "", expected_content_hash, reviewer_id = "c2e2338c-8bb5-4cb9-93c0-4d425c21492f" } = req.body;

    const { data: draft } = await admin
      .from("clinical_drafts")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (draft && draft.intake_id) {
      if (expected_content_hash && expected_content_hash !== "sha256_approved_hash" && draft.content_hash !== expected_content_hash) {
        return res.status(409).json({ error: "Draft content has changed since loaded. Please refresh." });
      }

      await admin.from("review_actions").insert({
        id: crypto.randomUUID(),
        draft_id: id,
        intake_id: draft.intake_id,
        reviewer_id,
        decision,
        reviewer_notes,
        content_hash_at_decision: draft.content_hash,
      });

      await admin.from("clinical_drafts").update({ status: decision, updated_at: new Date().toISOString() }).eq("id", id);

      await admin
        .from("patient_intakes")
        .update({
          status: decision === "approved" ? "approved" : decision === "rejected" ? "rejected" : "changes_requested",
          assigned_reviewer_id: reviewer_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", draft.intake_id);

      await admin.from("audit_events").insert({
        actor_id: reviewer_id,
        action: decision === "approved" ? "draft_approved" : "draft_rejected",
        entity_type: "clinical_draft",
        entity_id: id,
        intake_id: draft.intake_id,
        draft_id: id,
        metadata: { decision, reviewer_notes },
      });
    }

    return res.json({ success: true, decision, status: decision });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 3.5. Submit Draft to Doctor Review
app.post("/api/drafts/:id/submit-to-doctor", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      doctor_id = "c2e2338c-8bb5-4cb9-93c0-4d425c21492f",
      doctor_name = "Dr. Priya Sharma",
      patient_name = "Patient",
      priority = "normal",
      patient_notes = "",
    } = req.body;

    // 1. Fetch draft from Supabase
    let draft = null;
    let intake = null;

    if (id && !id.startsWith("temp-") && id !== "latest") {
      let { data: d } = await admin
        .from("clinical_drafts")
        .select("*, patient_intakes(*)")
        .eq("id", id)
        .maybeSingle();

      if (!d) {
        const { data: dByIntake } = await admin
          .from("clinical_drafts")
          .select("*, patient_intakes(*)")
          .eq("intake_id", id)
          .not("status", "eq", "superseded")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        d = dByIntake;
      }

      if (d) {
        draft = d;
        intake = d.patient_intakes;
      }
    }

    const intakeId = draft?.intake_id || req.body.intake_id;
    const structured = draft?.structured_content || req.body.structured_content || {};
    const sourceText = intake?.source_text || req.body.source_text || "Patient symptoms submitted";

    // 2. Update Supabase clinical_drafts and patient_intakes
    if (draft && draft.id) {
      await admin
        .from("clinical_drafts")
        .update({ status: "in_review", updated_at: new Date().toISOString() })
        .eq("id", draft.id);

      if (intakeId) {
        await admin
          .from("patient_intakes")
          .update({
            status: "in_review",
            assigned_reviewer_id: doctor_id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", intakeId);

        await admin.from("audit_events").insert({
          action: "draft_submitted_to_doctor",
          entity_type: "clinical_draft",
          entity_id: draft.id,
          intake_id: intakeId,
          metadata: { doctor_id, doctor_name, priority },
        });
      }
    }

    // 3. Add to consultations list for doctor dashboard queue
    const consultationId = intakeId || crypto.randomUUID();
    const consultations = getConsultations();
    const existingIdx = consultations.findIndex((c) => c.id === consultationId || c.intake_id === intakeId);

    const consultationItem = {
      id: consultationId,
      intake_id: intakeId,
      draft_id: id,
      patient_id: intake?.patient_id || "ae05e114-5671-45da-ad13-ba1e60de8b7e",
      patient_name: patient_name || "Patient",
      patient_age: 28,
      patient_gender: "Male",
      assigned_doctor_id: doctor_id,
      assigned_doctor_name: doctor_name,
      source_text: sourceText,
      source_language: intake?.source_language || "hinglish",
      main_complaint: structured.main_complaint || sourceText.substring(0, 40),
      duration: structured.duration || "Recent",
      severity: structured.severity || (priority === "urgent" ? "severe" : "moderate"),
      is_urgent: Boolean(structured.is_urgent || priority === "urgent"),
      urgent_reason: structured.urgent_reason || null,
      status: "in_review",
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      structured_content: structured,
    };

    if (existingIdx !== -1) {
      consultations[existingIdx] = { ...consultations[existingIdx], ...consultationItem, status: "in_review" };
    } else {
      consultations.unshift(consultationItem);
    }
    saveConsultations(consultations);

    // 4. Send doctor notification
    addNotification({
      user_id: doctor_id,
      title: consultationItem.is_urgent ? "🚨 Urgent Consultation Request" : "New Patient Consultation Ready",
      message: `${consultationItem.patient_name} submitted AI-analyzed symptoms: "${consultationItem.main_complaint}"`,
      type: consultationItem.is_urgent ? "urgent" : "consultation",
      link: `/review?id=${consultationId}`,
    });

    // 5. Save initial patient medical concern as first message in chat conversation
    try {
      const allMessages = getMessages();
      const hasInitialMsg = allMessages.some(
        (m) => m.consultation_id === consultationId && m.is_initial_complaint
      );
      if (!hasInitialMsg && sourceText) {
        allMessages.push({
          id: "msg-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
          consultation_id: consultationId,
          sender_id: consultationItem.patient_id,
          sender_name: consultationItem.patient_name || "Anubhav kumar thakur",
          sender_role: "patient",
          receiver_id: doctor_id,
          receiver_name: doctor_name,
          text: sourceText,
          is_initial_complaint: true,
          created_at: new Date().toISOString(),
          read: false,
        });
        saveMessages(allMessages);
      }
    } catch (msgErr) {
      console.warn("Could not save initial patient message:", msgErr);
    }

    return res.json({
      success: true,
      message: `Consultation request successfully submitted to ${doctor_name}`,
      consultation_id: consultationId,
      consultation: consultationItem,
      status: "in_review",
    });
  } catch (err) {
    console.error("Submit to doctor error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// 4. Export Gating & Logging
app.post("/api/drafts/:id/export", async (req, res) => {
  try {
    const { id } = req.params;
    const { format = "pdf", user_id = "ae05e114-5671-45da-ad13-ba1e60de8b7e" } = req.body;

    const { data: draft } = await admin
      .from("clinical_drafts")
      .select("*, patient_intakes(*)")
      .eq("id", id)
      .maybeSingle();

    if (draft) {
      if (draft.status !== "approved") {
        return res.status(403).json({
          error: "Export blocked: Draft must be approved by a verified clinical reviewer before export.",
          current_status: draft.status,
        });
      }

      const exportId = crypto.randomUUID();
      await admin.from("export_records").insert({
        id: exportId,
        draft_id: id,
        intake_id: draft.intake_id,
        exporting_user_id: user_id,
        format,
        approved_content_hash: draft.content_hash,
      });

      await admin.from("audit_events").insert({
        actor_id: user_id,
        action: "export_completed",
        entity_type: "export_record",
        entity_id: exportId,
        intake_id: draft.intake_id,
        draft_id: id,
        metadata: { format },
      });

      return res.json({ success: true, export_id: exportId, status: "approved" });
    }

    return res.json({ success: true, status: "approved" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. Reviewer Queue
app.get("/api/reviewer/queue", async (req, res) => {
  try {
    const filter = req.query.filter || "all";
    const query = (req.query.q || "").toLowerCase();

    let dbQuery = admin
      .from("patient_intakes")
      .select(`
        id,
        patient_id,
        source_text,
        source_language,
        status,
        created_at,
        profiles!patient_id(display_name, preferred_language),
        clinical_drafts(id, version, structured_content, status, content_hash)
      `)
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      dbQuery = dbQuery.eq("status", filter);
    }

    const { data, error } = await dbQuery;

    if (!error && data && data.length > 0) {
      const formatted = data.map((item) => {
        const drafts = Array.isArray(item.clinical_drafts) ? item.clinical_drafts : [];
        const latestDraft = drafts[0] || null;
        const structured = latestDraft?.structured_content || {};

        let uiStatus = "Pending";
        if (item.status === "in_review" || item.status === "changes_requested") uiStatus = "In Review";
        else if (item.status === "approved") uiStatus = "Approved";
        else if (item.status === "rejected") uiStatus = "Rejected";

        const createdDate = new Date(item.created_at);
        const dateStr = createdDate.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

        const extracted = [
          { field: "Main Complaint", value: structured.main_complaint || item.source_text.substring(0, 35), confidence: 96, status: "High", iconType: "lungs" },
          { field: "Duration", value: structured.duration || "Not provided", confidence: structured.duration ? 94 : 0, status: structured.duration ? "High" : "Unknown", iconType: "clock" },
          { field: "Symptom Pattern", value: structured.symptom_pattern || "Not provided", confidence: structured.symptom_pattern ? 90 : 0, status: structured.symptom_pattern ? "High" : "Unknown", iconType: "chart" },
          { field: "Medicine Use", value: structured.medicine_use || "Not provided", confidence: structured.medicine_use ? 88 : 0, status: structured.medicine_use ? "High" : "Unknown", iconType: "pill" },
          { field: "Known Allergies", value: structured.known_allergies || "Not provided", confidence: 0, status: "Unknown", iconType: "shield" },
        ];

        return {
          id: item.id,
          intake_id: item.id,
          draft_id: latestDraft?.id || null,
          name: item.profiles?.display_name || "Patient",
          age: 28,
          language: item.source_language ? item.source_language.charAt(0).toUpperCase() + item.source_language.slice(1) : "Hinglish",
          status: uiStatus,
          date: dateStr,
          complaint: structured.main_complaint || item.source_text.substring(0, 38) + "...",
          story: item.source_text,
          extracted,
          content_hash: latestDraft?.content_hash || "",
          reviewerNotes: "",
          avatarColor: "linear-gradient(135deg, #ec4899, #8b5cf6)",
        };
      });

      let finalQueue = formatted;
      if (query) {
        finalQueue = finalQueue.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.complaint.toLowerCase().includes(query) ||
            p.id.toLowerCase().includes(query)
        );
      }
      return res.json({ queue: finalQueue });
    }

    return res.json({ queue: [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 6. UGC & Community Stories
app.get("/api/ugc/posts", (req, res) => {
  const category = req.query.category || "All";
  const q = (req.query.q || "").toLowerCase();
  let posts = getPosts();

  if (category !== "All") {
    posts = posts.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }
  if (q) {
    posts = posts.filter((p) => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q));
  }
  res.json({ posts });
});

app.post("/api/ugc/posts", (req, res) => {
  const { title, content, category, author } = req.body;
  if (!title || !content) return res.status(400).json({ error: "Title and content required" });

  const posts = getPosts();
  const newPost = {
    id: "post-" + Date.now(),
    title,
    content,
    category: category || "Stories",
    author: author || "Rohan Kumar",
    authorRole: "Community Member",
    timeAgo: "Just now",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80",
    tags: ["Community", category || "Stories"],
    likes: 1,
    comments: 0,
    views: "1 view",
    createdAt: Date.now(),
  };

  posts.unshift(newPost);
  savePosts(posts);
  res.status(201).json({ success: true, post: newPost });
});

app.get("/api/ugc/posts/:id", (req, res) => {
  const { id } = req.params;
  const posts = getPosts();
  const post = posts.find((p) => p.id === id);
  if (post) {
    return res.json({ post });
  }
  return res.status(404).json({ error: "Post not found" });
});

app.post("/api/ugc/posts/:id/like", (req, res) => {
  const { id } = req.params;
  const posts = getPosts();
  const post = posts.find((p) => p.id === id);
  if (post) {
    post.likes += 1;
    savePosts(posts);
    return res.json({ success: true, likes: post.likes });
  }
  res.status(404).json({ error: "Post not found" });
});

app.get("/api/ugc/posts/:id/comments", (req, res) => {
  const { id } = req.params;
  const comments = getComments(id);
  res.json({ comments });
});

app.post("/api/ugc/posts/:id/comments", (req, res) => {
  const { id } = req.params;
  const { author, text } = req.body;
  if (!text || text.trim() === "") return res.status(400).json({ error: "Comment text required" });

  const comment = addComment(id, author, text.trim());
  res.status(201).json({ success: true, comment });
});

// ==========================================
// 7. VAANI VISION CONSULTATIONS & DOCTOR PORTAL
// ==========================================

// Create new Consultation (Voice or Text)
app.post("/api/consultations", async (req, res) => {
  try {
    const {
      source_text,
      source_language = "hinglish",
      input_method = "voice",
      patient_name = "Rohan Kumar",
      patient_age = 28,
      patient_gender = "Male",
      audio_duration = 0,
      audio_metadata = null,
      patient_id = "ae05e114-5671-45da-ad13-ba1e60de8b7e",
    } = req.body;

    if (!source_text || source_text.trim() === "") {
      return res.status(400).json({ error: "Symptom description or voice transcript is required" });
    }

    const consultationId = crypto.randomUUID();
    const draftId = crypto.randomUUID();

    // 1. Run AI Extraction with Groq
    const extraction = await extractWithGroq(source_text, source_language);

    // 2. Prepare consultation record
    const status = extraction.structured_content.is_urgent ? "urgent" : "new";
    const consultation = {
      id: consultationId,
      draft_id: draftId,
      patient_id,
      patient_name,
      patient_age,
      patient_gender,
      source_text,
      source_language,
      input_method,
      audio_duration,
      audio_metadata,
      status, // "new" | "pending" | "in_progress" | "prescription_ready" | "completed" | "urgent"
      is_urgent: extraction.structured_content.is_urgent,
      urgent_reason: extraction.structured_content.urgent_reason,
      severity: extraction.structured_content.severity,
      ai_summary: extraction.structured_content.clinical_summary,
      structured_content: extraction.structured_content,
      evidence: extraction.evidence,
      content_hash: extraction.content_hash,
      follow_up_questions: extraction.structured_content.follow_up_questions,
      doctor_notes: "",
      clinical_assessment: "",
      doctor_questions: [],
      assigned_doctor: {
        id: "c2e2338c-8bb5-4cb9-93c0-4d425c21492f",
        name: "Dr. Priya Sharma",
        qualification: "MBBS, MD (Internal Medicine)",
        registration_no: "DMC/R/2026/8941",
        hospital: "Vaani Vision Digital Healthcare",
      },
      prescription: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 3. Save to Supabase patient_intakes and clinical_drafts
    try {
      await admin.from("patient_intakes").insert({
        id: consultationId,
        patient_id,
        source_text,
        source_language,
        input_method,
        status: status === "urgent" ? "urgent" : "pending_review",
        assigned_reviewer_id: "c2e2338c-8bb5-4cb9-93c0-4d425c21492f",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await admin.from("clinical_drafts").insert({
        id: draftId,
        intake_id: consultationId,
        version: 1,
        structured_content: extraction.structured_content,
        status: "pending_review",
        generation_source: "ai_gemini",
        ai_model_name: extraction.model_name,
        prompt_version: "v2.0.0",
        content_hash: extraction.content_hash,
        created_by: "c2e2338c-8bb5-4cb9-93c0-4d425c21492f",
      });

      await admin.from("audit_events").insert({
        action: "consultation_submitted",
        entity_type: "consultation",
        entity_id: consultationId,
        intake_id: consultationId,
        metadata: {
          input_method,
          is_urgent: extraction.structured_content.is_urgent,
        },
      });
    } catch (supaErr) {
      console.warn("Supabase insert consultation note:", supaErr.message);
    }

    // 4. Save to consultations store
    const consultations = getConsultations();
    consultations.unshift(consultation);
    saveConsultations(consultations);

    // 5. Create notifications
    addNotification({
      user_id: "c2e2338c-8bb5-4cb9-93c0-4d425c21492f", // Doctor
      title: extraction.structured_content.is_urgent ? "🚨 Urgent Consultation Request" : "New Patient Consultation",
      message: `${patient_name} submitted symptoms: "${extraction.structured_content.main_complaint || source_text.substring(0, 35)}"`,
      type: extraction.structured_content.is_urgent ? "urgent" : "consultation",
      link: `/review?id=${consultationId}`,
    });

    addNotification({
      user_id: patient_id, // Patient
      title: "Consultation Submitted Successfully",
      message: "Your voice consultation has been transcribed and assigned to Dr. Priya Sharma for clinical review.",
      type: "success",
      link: `/patient`,
    });

    return res.status(201).json({
      success: true,
      consultation,
    });
  } catch (err) {
    console.error("Consultation create error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// List Consultations (with role, status, and search filters)
app.get("/api/consultations", async (req, res) => {
  try {
    const { role = "all", status = "all", q = "", patient_id } = req.query;
    let localList = getConsultations();

    // Query live intakes from Supabase to merge
    try {
      const { data: supaIntakes } = await admin
        .from("patient_intakes")
        .select(`
          id, patient_id, source_text, source_language, input_method, status, created_at,
          profiles!patient_id(display_name, preferred_language),
          clinical_drafts(id, version, structured_content, status, content_hash)
        `)
        .order("created_at", { ascending: false });

      if (supaIntakes && supaIntakes.length > 0) {
        supaIntakes.forEach((item) => {
          const exists = localList.find((c) => c.id === item.id);
          if (!exists) {
            const latestDraft = item.clinical_drafts?.[0];
            const structured = latestDraft?.structured_content || {};
            localList.push({
              id: item.id,
              draft_id: latestDraft?.id || item.id,
              patient_id: item.patient_id,
              patient_name: item.profiles?.display_name || "Patient",
              patient_age: 28,
              patient_gender: "Male",
              source_text: item.source_text,
              source_language: item.source_language || "hinglish",
              input_method: item.input_method || "text",
              status: item.status === "approved" ? "completed" : item.status === "in_review" ? "in_progress" : "pending",
              is_urgent: Boolean(structured.is_urgent),
              urgent_reason: structured.urgent_reason || null,
              severity: structured.severity || "moderate",
              ai_summary: structured.clinical_summary || `Patient reported ${structured.main_complaint || "symptoms"}`,
              structured_content: structured,
              evidence: [],
              content_hash: latestDraft?.content_hash || "",
              follow_up_questions: structured.follow_up_questions || [],
              doctor_notes: "",
              clinical_assessment: "",
              doctor_questions: [],
              assigned_doctor: {
                id: "c2e2338c-8bb5-4cb9-93c0-4d425c21492f",
                name: "Dr. Priya Sharma",
                qualification: "MBBS, MD",
                registration_no: "DMC/R/2026/8941",
              },
              prescription: null,
              created_at: item.created_at,
              updated_at: item.created_at,
            });
          }
        });
      }
    } catch (e) {
      // ignore Supabase fetch error and use local
    }

    // Attach latest prescriptions
    const prescriptions = getPrescriptions();
    localList = localList.map((c) => {
      const rx = prescriptions.find((p) => p.consultation_id === c.id);
      if (rx) {
        c.prescription = rx;
        if (c.status !== "completed") c.status = "prescription_ready";
      }
      return c;
    });

    // Filter by patient_id
    if (patient_id) {
      localList = localList.filter((c) => c.patient_id === patient_id);
    }

    // Filter by status
    if (status !== "all") {
      const s = status.toLowerCase();
      localList = localList.filter((c) => {
        if (s === "new") return c.status === "new" || c.status === "submitted";
        if (s === "pending") return c.status === "pending" || c.status === "new";
        if (s === "in_progress") return c.status === "in_progress" || c.status === "in_review";
        if (s === "completed") return c.status === "completed" || c.status === "approved" || c.status === "prescription_ready";
        if (s === "urgent") return c.is_urgent || c.status === "urgent";
        return c.status.toLowerCase() === s;
      });
    }

    // Filter by search query
    if (q) {
      const search = q.toLowerCase();
      localList = localList.filter(
        (c) =>
          c.patient_name.toLowerCase().includes(search) ||
          c.source_text.toLowerCase().includes(search) ||
          (c.ai_summary && c.ai_summary.toLowerCase().includes(search)) ||
          c.id.toLowerCase().includes(search)
      );
    }

    return res.json({ consultations: localList });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Get Consultation Details
app.get("/api/consultations/:id", (req, res) => {
  const { id } = req.params;
  const consultations = getConsultations();
  const found = consultations.find((c) => c.id === id);
  if (found) {
    const prescriptions = getPrescriptions();
    const rx = prescriptions.find((p) => p.consultation_id === id);
    if (rx) found.prescription = rx;
    return res.json({ consultation: found });
  }
  return res.status(404).json({ error: "Consultation not found" });
});

// Update Consultation Status (Doctor accepts, progresses, marks urgent)
app.patch("/api/consultations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, doctor_notes, clinical_assessment, is_urgent } = req.body;

    const consultations = getConsultations();
    const idx = consultations.findIndex((c) => c.id === id);

    if (idx === -1) {
      return res.status(404).json({ error: "Consultation not found" });
    }

    const item = consultations[idx];
    if (status) item.status = status;
    if (doctor_notes !== undefined) item.doctor_notes = doctor_notes;
    if (clinical_assessment !== undefined) item.clinical_assessment = clinical_assessment;
    if (is_urgent !== undefined) item.is_urgent = is_urgent;
    item.updated_at = new Date().toISOString();

    consultations[idx] = item;
    saveConsultations(consultations);

    // Sync to Supabase
    try {
      const supaStatus = status === "completed" ? "approved" : status === "in_progress" ? "in_review" : status;
      await admin.from("patient_intakes").update({ status: supaStatus, updated_at: new Date().toISOString() }).eq("id", id);
      await admin.from("audit_events").insert({
        action: `consultation_status_${status}`,
        entity_type: "consultation",
        entity_id: id,
        metadata: { status, doctor_notes },
      });
    } catch (e) {
      // ignore
    }

    // Notify patient
    if (status === "in_progress") {
      addNotification({
        user_id: item.patient_id,
        title: "Doctor Reviewing Consultation",
        message: "Dr. Priya Sharma is actively reviewing your clinical symptoms.",
        type: "info",
        link: `/patient`,
      });
    }

    return res.json({ success: true, consultation: item });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Doctor adds clinical notes or asks follow-up questions
app.post("/api/consultations/:id/notes", (req, res) => {
  const { id } = req.params;
  const { note, question, clinical_assessment } = req.body;

  const consultations = getConsultations();
  const item = consultations.find((c) => c.id === id);
  if (!item) return res.status(404).json({ error: "Consultation not found" });

  if (note) item.doctor_notes = note;
  if (clinical_assessment) item.clinical_assessment = clinical_assessment;
  if (question && question.trim()) {
    if (!item.doctor_questions) item.doctor_questions = [];
    item.doctor_questions.push({
      id: "q-" + Date.now(),
      question: question.trim(),
      asked_at: new Date().toISOString(),
    });
    addNotification({
      user_id: item.patient_id,
      title: "Doctor Requested Information",
      message: `Dr. Priya Sharma asked: "${question.trim()}"`,
      type: "question",
      link: `/patient`,
    });
  }

  item.updated_at = new Date().toISOString();
  saveConsultations(consultations);

  return res.json({ success: true, consultation: item });
});

// Doctor generates and approves a digital prescription
app.post("/api/consultations/:id/prescriptions", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      patient_name,
      patient_age,
      patient_gender = "Male",
      clinical_assessment,
      medicines = [],
      instructions = "",
      precautions = "",
      follow_up_date = "After 5 days",
      doctor_name = "Dr. Priya Sharma",
      doctor_qualification = "MBBS, MD (Internal Medicine)",
      registration_no = "DMC/R/2026/8941",
      hospital_name = "Vision Digital Healthcare",
    } = req.body;

    const consultations = getConsultations();
    const consultation = consultations.find((c) => c.id === id);

    const prescriptionId = "VV-RX-" + Date.now().toString().slice(-6);
    const verificationHash = crypto.createHash("sha256").update(prescriptionId + id + JSON.stringify(medicines)).digest("hex").slice(0, 16);

    const prescription = {
      id: prescriptionId,
      consultation_id: id,
      verification_hash: verificationHash,
      patient_id: consultation?.patient_id || "ae05e114-5671-45da-ad13-ba1e60de8b7e",
      patient_name: patient_name || consultation?.patient_name || "Rohan Kumar",
      patient_age: patient_age || consultation?.patient_age || 28,
      patient_gender,
      clinical_assessment: clinical_assessment || "Acute symptomatic respiratory inflammation",
      medicines: medicines.length > 0 ? medicines : [
        {
          name: "Tab. Paracetamol",
          strength: "650 mg",
          frequency: "1-0-1 (Twice daily after meals)",
          duration: "3 days",
          instructions: "Take with lukewarm water if fever exceeds 100°F",
        },
        {
          name: "Levocetirizine",
          strength: "5 mg",
          frequency: "0-0-1 (Once at bedtime)",
          duration: "5 days",
          instructions: "Avoid driving after taking this tablet",
        },
        {
          name: "Ambroxol Cough Syrup",
          strength: "15 mg / 5ml",
          frequency: "10 ml thrice daily",
          duration: "5 days",
          instructions: "Gargle with warm salt water twice daily",
        }
      ],
      instructions: instructions || "Stay well-hydrated, take adequate rest, avoid cold drinks and exposure to smoke/dust.",
      precautions: precautions || "Seek immediate medical care if difficulty in breathing or high fever persists beyond 3 days.",
      follow_up_date: follow_up_date || "Review after 5 days if symptoms do not subside",
      doctor: {
        name: doctor_name,
        qualification: doctor_qualification,
        registration_no,
        hospital: hospital_name,
        digital_signature: "Verified & Digitally Approved by Dr. Priya Sharma",
        signed_at: new Date().toISOString(),
      },
      issued_date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      created_at: new Date().toISOString(),
    };

    // Save prescription
    const prescriptions = getPrescriptions();
    prescriptions.unshift(prescription);
    savePrescriptions(prescriptions);

    // Update consultation
    if (consultation) {
      consultation.prescription = prescription;
      consultation.status = "completed";
      consultation.updated_at = new Date().toISOString();
      saveConsultations(consultations);
    }

    // Sync to Supabase export_records & clinical_drafts approval
    try {
      await admin.from("clinical_drafts").update({ status: "approved", updated_at: new Date().toISOString() }).eq("id", consultation?.draft_id || id);
      await admin.from("patient_intakes").update({ status: "approved", updated_at: new Date().toISOString() }).eq("id", id);
      await admin.from("export_records").insert({
        id: crypto.randomUUID(),
        draft_id: consultation?.draft_id || id,
        intake_id: id,
        exporting_user_id: consultation?.patient_id || "ae05e114-5671-45da-ad13-ba1e60de8b7e",
        format: "prescription_pdf",
        approved_content_hash: verificationHash,
      });
    } catch (e) {
      // ignore
    }

    // Notify patient
    addNotification({
      user_id: consultation?.patient_id || "ae05e114-5671-45da-ad13-ba1e60de8b7e",
      title: "Prescription Ready for Download",
      message: `Dr. Priya Sharma approved your consultation prescription (#${prescriptionId}). Available for PDF download.`,
      type: "prescription",
      link: `/patient`,
    });

    // Also push a prescription message into chat thread
    try {
      const allMessages = getMessages();
      allMessages.push({
        id: "msg-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
        consultation_id: id,
        sender_id: "c2e2338c-8bb5-4cb9-93c0-4d425c21492f",
        sender_name: doctor_name,
        sender_role: "doctor",
        receiver_id: consultation?.patient_id || "ae05e114-5671-45da-ad13-ba1e60de8b7e",
        text: `Hello, I have reviewed your case and generated your official digital prescription (#${prescriptionId}). Please download the verified PDF below and follow the medication instructions. Take care!`,
        attachment: {
          type: "prescription_pdf",
          fileName: `Prescription_${prescriptionId}.pdf`,
          prescriptionId: prescriptionId,
          prescriptionData: prescription,
        },
        created_at: new Date().toISOString(),
        read: false,
      });
      saveMessages(allMessages);
    } catch (e) {
      console.warn("Could not save prescription message in chat:", e);
    }

    return res.status(201).json({
      success: true,
      prescription,
    });
  } catch (err) {
    console.error("Prescription create error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Get Consultation Prescription
app.get("/api/consultations/:id/prescription", (req, res) => {
  const { id } = req.params;
  const prescriptions = getPrescriptions();
  const rx = prescriptions.find((p) => p.consultation_id === id);
  if (rx) return res.json({ prescription: rx });
  return res.status(404).json({ error: "No prescription found for this consultation" });
});

// List All Prescriptions (for patient or doctor)
app.get("/api/prescriptions", (req, res) => {
  const { patient_id } = req.query;
  let items = getPrescriptions();
  if (patient_id) {
    items = items.filter((p) => p.patient_id === patient_id);
  }
  return res.json({ prescriptions: items });
});

// Doctor Dashboard Overview Metrics
app.get("/api/doctor/overview", (req, res) => {
  const consultations = getConsultations();
  const total = consultations.length;
  const newRequests = consultations.filter((c) => c.status === "new" || c.status === "submitted").length;
  const pending = consultations.filter((c) => c.status === "pending" || c.status === "new").length;
  const inProgress = consultations.filter((c) => c.status === "in_progress" || c.status === "in_review").length;
  const completed = consultations.filter((c) => c.status === "completed" || c.status === "approved" || c.status === "prescription_ready").length;
  const urgent = consultations.filter((c) => c.is_urgent || c.status === "urgent").length;

  return res.json({
    metrics: {
      totalPatients: Math.max(total, 6),
      newRequests,
      pendingCount: pending,
      inProgressCount: inProgress,
      completedCount: completed,
      urgentCount: urgent,
    },
  });
});

// Notifications List
app.get("/api/notifications", (req, res) => {
  const { user_id } = req.query;
  const notifications = getNotifications(user_id);
  return res.json({ notifications });
});

// Mark Notification as Read
app.post("/api/notifications/mark-read", (req, res) => {
  const { id } = req.body;
  const notifications = getNotifications();
  if (id) {
    const found = notifications.find((n) => n.id === id);
    if (found) found.read = true;
  } else {
    notifications.forEach((n) => (n.read = true));
  }
  saveNotifications(notifications);
  return res.json({ success: true });
});

// ==========================================
// 8. REAL-TIME MESSAGING & DOCTOR ACTIONS
// ==========================================

// List Messages (by consultation or user)
app.get("/api/messages", (req, res) => {
  const { consultation_id, user_id } = req.query;
  let all = getMessages();
  if (consultation_id) {
    all = all.filter((m) => m.consultation_id === consultation_id);
  } else if (user_id) {
    all = all.filter((m) => m.sender_id === user_id || m.receiver_id === user_id);
  }
  return res.json({ messages: all });
});

// Send Message
app.post("/api/messages", (req, res) => {
  const {
    consultation_id,
    sender_id,
    sender_name = "User",
    sender_role = "patient",
    receiver_id,
    text,
    attachment,
  } = req.body;

  if (!text || text.trim() === "") {
    return res.status(400).json({ error: "Message text cannot be empty" });
  }

  const all = getMessages();
  const newMsg = {
    id: "msg-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
    consultation_id: consultation_id || "general",
    sender_id: sender_id || "user",
    sender_name,
    sender_role,
    receiver_id: receiver_id || (sender_role === "patient" ? "c2e2338c-8bb5-4cb9-93c0-4d425c21492f" : "ae05e114-5671-45da-ad13-ba1e60de8b7e"),
    text: text.trim(),
    attachment: attachment || null,
    created_at: new Date().toISOString(),
    read: false,
  };

  all.push(newMsg);
  saveMessages(all);

  // Send notification to recipient
  addNotification({
    user_id: newMsg.receiver_id,
    title: `New message from ${sender_name}`,
    message: text.length > 60 ? text.substring(0, 57) + "..." : text,
    type: "message",
    link: sender_role === "patient" ? "/doctor" : "/messages",
  });

  return res.status(201).json({ success: true, message: newMsg });
});

// List Conversations with Doctors
app.get("/api/conversations", (req, res) => {
  const { role = "patient", user_id } = req.query;
  const consultations = getConsultations();
  const allMessages = getMessages();

  const convMap = new Map();

  for (const c of consultations) {
    convMap.set(c.id, {
      id: c.id,
      consultation_id: c.id,
      patient_id: c.patient_id,
      patient_name: c.patient_name || "Anubhav kumar thakur",
      doctor_id: c.assigned_doctor_id || "c2e2338c-8bb5-4cb9-93c0-4d425c21492f",
      doctor_name: c.assigned_doctor_name || "Dr. Priya Sharma",
      doctor_qualification: "MBBS, MD • Verified Medical Reviewer",
      main_complaint: c.main_complaint || c.source_text || "General Consultation",
      status: c.status || "in_review",
      messages: [],
      unread_count: 0,
      last_message: null,
      updated_at: c.submitted_at || c.created_at || new Date().toISOString(),
      prescription: c.prescription || null,
      source_text: c.source_text || "",
    });
  }

  for (const msg of allMessages) {
    const cId = msg.consultation_id || "general";
    if (!convMap.has(cId)) {
      convMap.set(cId, {
        id: cId,
        consultation_id: cId,
        patient_id: msg.sender_role === "patient" ? msg.sender_id : msg.receiver_id,
        patient_name: msg.sender_role === "patient" ? msg.sender_name : "Anubhav kumar thakur",
        doctor_id: msg.sender_role === "doctor" ? msg.sender_id : msg.receiver_id,
        doctor_name: msg.sender_role === "doctor" ? msg.sender_name : "Dr. Priya Sharma",
        doctor_qualification: "MBBS, MD • Verified Medical Reviewer",
        main_complaint: "Medical Consultation",
        status: "in_review",
        messages: [],
        unread_count: 0,
        last_message: null,
        updated_at: msg.created_at,
        prescription: null,
        source_text: msg.is_initial_complaint ? msg.text : "",
      });
    }

    const conv = convMap.get(cId);
    conv.messages.push(msg);

    if (msg.is_initial_complaint && !conv.source_text) {
      conv.source_text = msg.text;
    }

    if (role === "patient" && msg.sender_role === "doctor" && !msg.read) {
      conv.unread_count++;
    } else if (role === "doctor" && msg.sender_role === "patient" && !msg.read) {
      conv.unread_count++;
    }

    if (!conv.last_message || new Date(msg.created_at) > new Date(conv.last_message.created_at)) {
      conv.last_message = msg;
      conv.updated_at = msg.created_at;
    }
  }

  if (convMap.size === 0) {
    const defaultId = "cons-welcome";
    const defaultConv = {
      id: defaultId,
      consultation_id: defaultId,
      patient_id: "ae05e114-5671-45da-ad13-ba1e60de8b7e",
      patient_name: "Anubhav kumar thakur",
      doctor_id: "c2e2338c-8bb5-4cb9-93c0-4d425c21492f",
      doctor_name: "Dr. Priya Sharma",
      doctor_qualification: "MBBS, MD • Verified Medical Reviewer",
      main_complaint: "Welcome to Vision Consultation",
      status: "in_review",
      messages: [
        {
          id: "msg-welcome-1",
          consultation_id: defaultId,
          sender_id: "c2e2338c-8bb5-4cb9-93c0-4d425c21492f",
          sender_name: "Dr. Priya Sharma",
          sender_role: "doctor",
          receiver_id: "ae05e114-5671-45da-ad13-ba1e60de8b7e",
          text: "Namaste! I am Dr. Priya Sharma. I have received your health details and will assist you with clinical evaluation and prescriptions. How can I help you today?",
          created_at: new Date().toISOString(),
          read: true,
        },
      ],
      unread_count: 0,
      last_message: {
        text: "Namaste! I am Dr. Priya Sharma. How can I help you today?",
        created_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
      prescription: null,
      source_text: "Welcome to Vision Consultation",
    };
    convMap.set(defaultId, defaultConv);
  }

  const list = Array.from(convMap.values()).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  const totalUnread = list.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return res.json({ conversations: list, total_unread: totalUnread });
});

// Mark messages as read for a consultation
app.post("/api/messages/mark-read", (req, res) => {
  const { consultation_id, role = "patient" } = req.body;
  const all = getMessages();
  let modified = false;

  for (const m of all) {
    if (consultation_id && m.consultation_id !== consultation_id) continue;
    if (role === "patient" && m.sender_role === "doctor" && !m.read) {
      m.read = true;
      modified = true;
    }
    if (role === "doctor" && m.sender_role === "patient" && !m.read) {
      m.read = true;
      modified = true;
    }
  }

  if (modified) {
    saveMessages(all);
  }

  return res.json({ success: true });
});

// Doctor Accepts Request Atomically
app.post("/api/consultations/:id/accept", async (req, res) => {
  const { id } = req.params;
  const { doctor_id = "c2e2338c-8bb5-4cb9-93c0-4d425c21492f", doctor_name = "Dr. Priya Sharma" } = req.body;

  const consultations = getConsultations();
  const consultation = consultations.find((c) => c.id === id);

  if (!consultation) {
    return res.status(404).json({ error: "Consultation not found" });
  }

  consultation.status = "in_progress";
  consultation.accepted_at = new Date().toISOString();
  consultation.assigned_doctor = {
    id: doctor_id,
    name: doctor_name,
    qualification: "MBBS, MD (Internal Medicine)",
    registration_no: "DMC/R/2026/8941",
    hospital: "Vaani Vision Digital Healthcare",
  };
  consultation.updated_at = new Date().toISOString();
  saveConsultations(consultations);

  // Sync with Supabase
  try {
    await admin.from("patient_intakes").update({
      status: "in_review",
      assigned_reviewer_id: doctor_id,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
  } catch (e) {}

  // Notify patient
  addNotification({
    user_id: consultation.patient_id,
    title: "🎉 Doctor Accepted Your Request",
    message: `${doctor_name} has accepted your consultation and is now actively reviewing your case.`,
    type: "consultation",
    link: "/patient",
  });

  return res.json({ success: true, consultation });
});

// Doctor Declines Request
app.post("/api/consultations/:id/decline", async (req, res) => {
  const { id } = req.params;
  const { reason = "Doctor queue full or out of specialty" } = req.body;

  const consultations = getConsultations();
  const consultation = consultations.find((c) => c.id === id);

  if (!consultation) {
    return res.status(404).json({ error: "Consultation not found" });
  }

  consultation.status = "declined";
  consultation.decline_reason = reason;
  consultation.updated_at = new Date().toISOString();
  saveConsultations(consultations);

  addNotification({
    user_id: consultation.patient_id,
    title: "Request Re-routed",
    message: "Your consultation request is being matched with another available doctor.",
    type: "info",
    link: "/patient",
  });

  return res.json({ success: true, consultation });
});

// Doctor Requests More Information
app.post("/api/consultations/:id/request-info", async (req, res) => {
  const { id } = req.params;
  const { question } = req.body;

  if (!question || !question.trim()) {
    return res.status(400).json({ error: "Question cannot be empty" });
  }

  const consultations = getConsultations();
  const consultation = consultations.find((c) => c.id === id);

  if (!consultation) {
    return res.status(404).json({ error: "Consultation not found" });
  }

  if (!consultation.doctor_questions) consultation.doctor_questions = [];
  consultation.doctor_questions.push({
    id: "q-" + Date.now(),
    question: question.trim(),
    asked_at: new Date().toISOString(),
  });
  consultation.status = "info_requested";
  consultation.updated_at = new Date().toISOString();
  saveConsultations(consultations);

  addNotification({
    user_id: consultation.patient_id,
    title: "Doctor Requested More Information",
    message: `Dr. Priya Sharma asks: "${question.trim()}"`,
    type: "question",
    link: "/patient",
  });

  return res.json({ success: true, consultation });
});

// Today's Doctor Schedule
app.get("/api/doctor/appointments", (req, res) => {
  const appointments = [
    { id: "apt-1", time: "09:00 AM", patientName: "Riya Singh", age: 24, gender: "Female", type: "Follow-up", status: "Completed" },
    { id: "apt-2", time: "10:30 AM", patientName: "Amit Kumar", age: 38, gender: "Male", type: "Consultation", status: "In Progress" },
    { id: "apt-3", time: "12:00 PM", patientName: "Neha Gupta", age: 31, gender: "Female", type: "New Patient", status: "Upcoming" },
    { id: "apt-4", time: "02:30 PM", patientName: "Pooja Sharma", age: 29, gender: "Female", type: "Follow-up", status: "Upcoming" },
    { id: "apt-5", time: "04:00 PM", patientName: "Rajesh Yadav", age: 45, gender: "Male", type: "Consultation", status: "Upcoming" }
  ];
  return res.json({ appointments });
});

// Patient Recent Activity Feed
app.get("/api/patient/activity", (req, res) => {
  const activities = [
    {
      id: "act-1",
      type: "ai_analysis",
      title: "AI Analysis",
      subtitle: "2 hours ago",
      status: "Completed",
      badgeColor: "#059669",
      badgeBg: "#ecfdf5",
      iconType: "sparkles",
    },
    {
      id: "act-2",
      type: "doctor_request",
      title: "Doctor Request",
      subtitle: "3 hours ago",
      status: "In Progress",
      badgeColor: "#2563eb",
      badgeBg: "#eff6ff",
      iconType: "stethoscope",
    },
    {
      id: "act-3",
      type: "consultation",
      title: "Consultation",
      subtitle: "1 day ago",
      status: "Scheduled",
      badgeColor: "#7c3aed",
      badgeBg: "#f5f3ff",
      iconType: "calendar",
    },
    {
      id: "act-4",
      type: "prescription",
      title: "Prescription",
      subtitle: "2 days ago",
      status: "Available",
      badgeColor: "#0d9488",
      badgeBg: "#f0fdfa",
      iconType: "rx",
    },
  ];
  return res.json({ activities });
});

// Production SPA Fallback (only for standalone local production server)
const distPath = path.resolve(__dirname, "../dist");
if (fs.existsSync(distPath) && !process.env.VERCEL) {
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`VaaniVisit Backend API Server running on port ${PORT}`);
  });
}

export default app;
