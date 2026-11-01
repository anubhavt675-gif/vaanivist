// Shared helpers for all Vercel API serverless functions
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://wlwlbzrfazwtvsboljzp.supabase.co";

export const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_IqnTtw8qtmdUHCJHFm2ZbA_hu8qRlXF";

export const DEMO_DOCTOR_ID = "c2e2338c-8bb5-4cb9-93c0-4d425c21492f";
export const DEMO_PATIENT_ID = "ae05e114-5671-45da-ad13-ba1e60de8b7e";

// Create admin client (authenticated as reviewer/doctor)
let _adminClient = null;
export async function getAdminClient() {
  if (!_adminClient) {
    _adminClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    try {
      await _adminClient.auth.signInWithPassword({
        email: "dr.priya@vaanivisit.demo",
        password: "Password123!",
      });
    } catch (_) {}
  }
  return _adminClient;
}

// Create authed client for a specific user token
export function getTokenClient(token) {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

// Extract user from Authorization header
export async function getUserFromRequest(req) {
  const authHeader = req.headers["authorization"] || "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const admin = await getAdminClient();
      const { data: { user } } = await admin.auth.getUser(token);
      if (user?.id) return { user, token };
    } catch (_) {}
  }
  return { user: null, token: null };
}

// CORS headers for all responses
export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export function json(res, data, status = 200) {
  res.status(status).json(data);
}

// ── Groq / Gemini extraction ──────────────────────────────────────────────────

export function calculateContentHash(content, sourceText) {
  const normalized = JSON.stringify(content, Object.keys(content || {}).sort());
  return crypto.createHash("sha256").update(normalized + sourceText).digest("hex");
}

export function validateEvidence(fields, sourceText) {
  return fields.map((f) => {
    if (!f.value || !f.exact_quote) {
      return { ...f, start_offset: null, end_offset: null, verification_status: "missing" };
    }
    const idx = sourceText.indexOf(f.exact_quote);
    if (idx !== -1) return { ...f, start_offset: idx, end_offset: idx + f.exact_quote.length, verification_status: "verified" };
    const lowerIdx = sourceText.toLowerCase().indexOf(f.exact_quote.toLowerCase());
    if (lowerIdx !== -1) return {
      ...f,
      exact_quote: sourceText.substring(lowerIdx, lowerIdx + f.exact_quote.length),
      start_offset: lowerIdx,
      end_offset: lowerIdx + f.exact_quote.length,
      verification_status: "verified",
    };
    return { ...f, start_offset: null, end_offset: null, verification_status: "fabricated" };
  });
}

export function deterministicClinicalFallback(sourceText, language) {
  const lower = sourceText.toLowerCase();
  let complaint = null, complaintQuote = null;
  let duration = null, durationQuote = null;
  let pattern = null, patternQuote = null;
  let medicine = null, medicineQuote = null;
  let is_urgent = false, urgent_reason = null, severity = "moderate";

  if (lower.includes("chest pain") || lower.includes("seene me dard") || lower.includes("breathlessness")) {
    is_urgent = true; severity = "severe";
    urgent_reason = "Chest discomfort or respiratory distress detected. Please seek emergency medical care immediately.";
  } else if (lower.includes("khoon") || lower.includes("blood") || lower.includes("behosh") || lower.includes("unconscious")) {
    is_urgent = true; severity = "severe";
    urgent_reason = "Acute warning sign reported. In-person emergency clinical attention is advised.";
  }

  if (lower.includes("khansi") || lower.includes("cough")) { complaint = "Khansi (cough)"; complaintQuote = sourceText.match(/khansi|cough/i)?.[0] || "khansi"; }
  else if (lower.includes("bukhar") || lower.includes("fever")) { complaint = "Bukhar (fever)"; complaintQuote = sourceText.match(/bukhar|fever/i)?.[0] || "bukhar"; }
  else if (lower.includes("pet dard") || lower.includes("stomach")) { complaint = "Pet dard (stomach pain)"; complaintQuote = sourceText.match(/pet me dard|pet dard|stomach/i)?.[0] || "pet dard"; }
  else if (lower.includes("sardi") || lower.includes("cold")) { complaint = "Sardi / Cold"; complaintQuote = sourceText.match(/sardi|cold/i)?.[0] || "sardi"; }
  else { complaint = "Symptoms reported"; complaintQuote = sourceText.substring(0, 30); }

  const durMatch = sourceText.match(/(\d+\s*(?:din|days?|hafte|weeks?|ghante|hours?))/i);
  if (durMatch) { duration = durMatch[1]; durationQuote = durMatch[1]; }

  const patMatch = sourceText.match(/(raat ko zyada|subah|khana khane ke baad|night|morning)/i);
  if (patMatch) { pattern = patMatch[0]; patternQuote = patMatch[0]; }

  const medMatch = sourceText.match(/(allergy ki medicine|paracetamol|crocin|medicine)[^.,]*/i);
  if (medMatch) { medicine = medMatch[0].trim(); medicineQuote = medMatch[0].trim(); }

  const rawFields = [
    { field: "Main Complaint", path: "main_complaint", value: complaint, exact_quote: complaintQuote, confidence: complaint ? 96 : 70, iconType: "lungs" },
    { field: "Duration", path: "duration", value: duration, exact_quote: durationQuote, confidence: duration ? 94 : 0, iconType: "clock" },
    { field: "Symptom Pattern", path: "symptom_pattern", value: pattern, exact_quote: patternQuote, confidence: pattern ? 90 : 0, iconType: "chart" },
    { field: "Medicine Use", path: "medicine_use", value: medicine, exact_quote: medicineQuote, confidence: medicine ? 88 : 0, iconType: "pill" },
    { field: "Known Allergies", path: "known_allergies", value: null, exact_quote: null, confidence: 0, iconType: "shield" },
  ];
  const evidence = validateEvidence(rawFields, sourceText);

  const structured_content = {
    main_complaint: complaint, duration, symptom_pattern: pattern, medicine_use: medicine,
    known_allergies: null, severity, is_urgent, urgent_reason,
    follow_up_questions: [
      "Kya aapko bukhar ke saath thand ya sharir me dard mehsoos ho raha hai?",
      "Kya aapne pehle se koi dawai ya allergy treatment li hai?",
      "Kya khana khane ya paani peene me koi dikkat ho rahi hai?",
    ],
    clinical_summary: `Patient reported ${complaint || "symptoms"}${duration ? ` lasting ${duration}` : ""}. AI symptom analysis performed. Note: Not a definitive medical diagnosis.`,
  };

  return {
    structured_content, evidence, raw_source_text: sourceText,
    source_language: language, model_name: "deterministic-fallback",
    content_hash: calculateContentHash(structured_content, sourceText),
  };
}

export async function extractWithGroq(sourceText, language) {
  const apiKey = process.env.GROQ_API_KEY || "";
  const defaultModel = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
  const MODELS = [defaultModel, "allam-2-7b"];

  if (!apiKey || !apiKey.trim()) {
    return extractWithGemini(sourceText, language);
  }

  const prompt = `Patient Language: ${language}
Patient Statement: "${sourceText}"

Extract clinical intake information into this exact JSON:
{
  "structured_content": {
    "main_complaint": string|null, "duration": string|null, "symptom_pattern": string|null,
    "medicine_use": string|null, "known_allergies": string|null, "associated_symptoms": string|null,
    "severity": "mild"|"moderate"|"severe", "is_urgent": boolean, "urgent_reason": string|null,
    "follow_up_questions": [string,string,string], "clinical_summary": string
  },
  "evidence": [
    {"field":"Main Complaint","path":"main_complaint","value":string|null,"exact_quote":string|null,"confidence":96,"iconType":"lungs"},
    {"field":"Duration","path":"duration","value":string|null,"exact_quote":string|null,"confidence":94,"iconType":"clock"},
    {"field":"Symptom Pattern","path":"symptom_pattern","value":string|null,"exact_quote":string|null,"confidence":90,"iconType":"chart"},
    {"field":"Medicine Use","path":"medicine_use","value":string|null,"exact_quote":string|null,"confidence":88,"iconType":"pill"},
    {"field":"Known Allergies","path":"known_allergies","value":null,"exact_quote":null,"confidence":0,"iconType":"shield"}
  ]
}
SAFETY: Do NOT diagnose. Do NOT prescribe. If red-flag emergency: set is_urgent:true. Return ONLY valid JSON.`;

  for (const model of MODELS) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model, response_format: { type: "json_object" }, temperature: 0.1,
          messages: [
            { role: "system", content: "You are a Clinical Multilingual Intake Extractor. Return strict JSON matching schema." },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (!res.ok) continue;
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
          : ["Kya aapko bukhar ke saath thand lag rahi hai?", "Kya pehle koi dawa li hai?", "Yeh pareshani pehle bhi hui thi?"],
        clinical_summary: parsed.structured_content?.clinical_summary ?? `Patient reported ${parsed.structured_content?.main_complaint || "symptoms"}.`,
      };
      return { structured_content, evidence, raw_source_text: sourceText, source_language: language, model_name: `groq/${model}`, content_hash: calculateContentHash(structured_content, sourceText) };
    } catch (_) {}
  }
  return extractWithGemini(sourceText, language);
}

export async function extractWithGemini(sourceText, language) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim() || apiKey === "your_gemini_api_key") {
    return deterministicClinicalFallback(sourceText, language);
  }

  const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";
  const MODELS = [modelName, "gemini-2.0-flash-lite", "gemini-1.5-flash"];

  const prompt = `Patient Language: ${language}\nPatient Statement: "${sourceText}"\n\nExtract clinical intake information into this exact JSON:\n{\n  "structured_content": { "main_complaint": string|null, "duration": string|null, "symptom_pattern": string|null, "medicine_use": string|null, "known_allergies": string|null, "associated_symptoms": string|null, "severity": "mild"|"moderate"|"severe", "is_urgent": boolean, "urgent_reason": string|null, "follow_up_questions": [string,string,string], "clinical_summary": string },\n  "evidence": [{"field":"Main Complaint","path":"main_complaint","value":string|null,"exact_quote":string|null,"confidence":96,"iconType":"lungs"},{"field":"Duration","path":"duration","value":string|null,"exact_quote":string|null,"confidence":94,"iconType":"clock"},{"field":"Symptom Pattern","path":"symptom_pattern","value":string|null,"exact_quote":string|null,"confidence":90,"iconType":"chart"},{"field":"Medicine Use","path":"medicine_use","value":string|null,"exact_quote":string|null,"confidence":88,"iconType":"pill"},{"field":"Known Allergies","path":"known_allergies","value":null,"exact_quote":null,"confidence":0,"iconType":"shield"}]\n}\nReturn ONLY valid JSON.`;

  for (const model of [...new Set(MODELS)]) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
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
          : ["Kya aapko bukhar ke saath thand lag rahi hai?", "Kya pehle koi dawa li hai?", "Yeh pareshani pehle bhi hui thi?"],
        clinical_summary: parsed.structured_content?.clinical_summary ?? `Patient reported ${parsed.structured_content?.main_complaint || "symptoms"}.`,
      };
      return { structured_content, evidence, raw_source_text: sourceText, source_language: language, model_name: model, content_hash: calculateContentHash(structured_content, sourceText) };
    } catch (_) {}
  }
  return deterministicClinicalFallback(sourceText, language);
}
