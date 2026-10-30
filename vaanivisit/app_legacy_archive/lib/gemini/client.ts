import { GoogleGenAI } from "@google/genai";
import { ClinicalDraftResponse, ClinicalField, StructuredDraftContent } from "../clinical/schema";
import { validateEvidence } from "../clinical/evidenceValidator";
import { calculateContentHash } from "../clinical/hasher";

const SYSTEM_INSTRUCTION = `You are VaaniVisit's Clinical Multilingual Intake Extractor.
Extract factual clinical information from patient symptom statements in Hindi, Hinglish, or English.

MANDATORY CLINICAL SAFETY RULES:
1. Extract ONLY facts explicitly stated by the patient.
2. For every extracted factual field, you MUST provide the exact verbatim quote (exact_quote) from the patient's text.
3. Calculate start_offset and end_offset (0-based character indices in the original source text).
4. If a field is NOT mentioned, set value to null, exact_quote to null, and offsets to null. NEVER invent or assume.
5. NEVER invent diagnoses, medications, dosages, or allergies.
6. Preserve negations (e.g. "bukhar nahi hai" means no fever; do not claim fever).
7. Return strictly valid JSON matching the requested structure.`;

/**
 * Fallback deterministic extractor when GEMINI_API_KEY is not configured or during offline testing.
 */
function deterministicExtractionFallback(sourceText: string, language: "hindi" | "hinglish" | "english"): ClinicalDraftResponse {
  const lower = sourceText.toLowerCase();

  // Basic symptom matching for demo/fallback
  let complaint: string | null = null;
  let complaintQuote: string | null = null;
  let duration: string | null = null;
  let durationQuote: string | null = null;
  let pattern: string | null = null;
  let patternQuote: string | null = null;
  let medicine: string | null = null;
  let medicineQuote: string | null = null;

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

  const rawFields: ClinicalField[] = [
    {
      field: "Main Complaint",
      path: "main_complaint",
      value: complaint,
      exact_quote: complaintQuote,
      start_offset: complaintQuote ? sourceText.indexOf(complaintQuote) : null,
      end_offset: complaintQuote ? sourceText.indexOf(complaintQuote) + complaintQuote.length : null,
      confidence: complaint ? 98 : 0,
      verification_status: complaint ? "verified" : "missing",
      iconType: "lungs",
    },
    {
      field: "Duration",
      path: "duration",
      value: duration,
      exact_quote: durationQuote,
      start_offset: durationQuote ? sourceText.indexOf(durationQuote) : null,
      end_offset: durationQuote ? sourceText.indexOf(durationQuote) + durationQuote.length : null,
      confidence: duration ? 95 : 0,
      verification_status: duration ? "verified" : "missing",
      iconType: "clock",
    },
    {
      field: "Symptom Pattern",
      path: "symptom_pattern",
      value: pattern,
      exact_quote: patternQuote,
      start_offset: patternQuote ? sourceText.indexOf(patternQuote) : null,
      end_offset: patternQuote ? sourceText.indexOf(patternQuote) + patternQuote.length : null,
      confidence: pattern ? 92 : 0,
      verification_status: pattern ? "verified" : "missing",
      iconType: "chart",
    },
    {
      field: "Medicine Use",
      path: "medicine_use",
      value: medicine,
      exact_quote: medicineQuote,
      start_offset: medicineQuote ? sourceText.indexOf(medicineQuote) : null,
      end_offset: medicineQuote ? sourceText.indexOf(medicineQuote) + medicineQuote.length : null,
      confidence: medicine ? 88 : 0,
      verification_status: medicine ? "verified" : "missing",
      iconType: "pill",
    },
    {
      field: "Known Allergies",
      path: "known_allergies",
      value: null,
      exact_quote: null,
      start_offset: null,
      end_offset: null,
      confidence: 0,
      verification_status: "missing",
      iconType: "shield",
    },
  ];

  const validation = validateEvidence(rawFields, sourceText);

  const structured_content: StructuredDraftContent = {
    main_complaint: complaint,
    duration,
    symptom_pattern: pattern,
    medicine_use: medicine,
    known_allergies: null,
    associated_symptoms: null,
    severity: null,
    clinical_summary: `Patient reported ${complaint || "symptoms"}${duration ? ` for ${duration}` : ""}.`,
  };

  const content_hash = calculateContentHash(structured_content as unknown as Record<string, unknown>, sourceText);

  return {
    structured_content,
    evidence: validation.fields,
    raw_source_text: sourceText,
    source_language: language,
    model_name: "deterministic-clinical-parser",
    content_hash,
  };
}

/**
 * Primary Clinical Extraction Service using Google Gemini API.
 * Server-side only. Enforces evidence verification and returns canonical draft structure.
 */
export async function extractClinicalDraft(
  sourceText: string,
  language: "hindi" | "hinglish" | "english" = "hinglish"
): Promise<ClinicalDraftResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

  // If API key is not present, use deterministic clinical parser
  if (!apiKey || apiKey.trim() === "" || apiKey === "your_gemini_api_key") {
    return deterministicExtractionFallback(sourceText, language);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Patient Language: ${language}
Patient Statement:
"${sourceText}"

Extract the clinical information into this exact JSON structure:
{
  "structured_content": {
    "main_complaint": string or null,
    "duration": string or null,
    "symptom_pattern": string or null,
    "medicine_use": string or null,
    "known_allergies": string or null,
    "associated_symptoms": string or null,
    "severity": string or null,
    "clinical_summary": string
  },
  "evidence": [
    {
      "field": "Main Complaint",
      "path": "main_complaint",
      "value": string or null,
      "exact_quote": verbatim quote from text or null,
      "start_offset": integer or null,
      "end_offset": integer or null,
      "confidence": integer between 0 and 100,
      "iconType": "lungs"
    },
    {
      "field": "Duration",
      "path": "duration",
      "value": string or null,
      "exact_quote": verbatim quote or null,
      "start_offset": integer or null,
      "end_offset": integer or null,
      "confidence": integer between 0 and 100,
      "iconType": "clock"
    },
    {
      "field": "Symptom Pattern",
      "path": "symptom_pattern",
      "value": string or null,
      "exact_quote": verbatim quote or null,
      "start_offset": integer or null,
      "end_offset": integer or null,
      "confidence": integer between 0 and 100,
      "iconType": "chart"
    },
    {
      "field": "Medicine Use",
      "path": "medicine_use",
      "value": string or null,
      "exact_quote": verbatim quote or null,
      "start_offset": integer or null,
      "end_offset": integer or null,
      "confidence": integer between 0 and 100,
      "iconType": "pill"
    },
    {
      "field": "Known Allergies",
      "path": "known_allergies",
      "value": string or null,
      "exact_quote": verbatim quote or null,
      "start_offset": integer or null,
      "end_offset": integer or null,
      "confidence": integer between 0 and 100,
      "iconType": "shield"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text || "";
    const parsed = JSON.parse(responseText);

    // Run deterministic validation on the returned evidence quotes
    const validation = validateEvidence(parsed.evidence || [], sourceText);

    const structured_content: StructuredDraftContent = {
      main_complaint: parsed.structured_content?.main_complaint ?? null,
      duration: parsed.structured_content?.duration ?? null,
      symptom_pattern: parsed.structured_content?.symptom_pattern ?? null,
      medicine_use: parsed.structured_content?.medicine_use ?? null,
      known_allergies: parsed.structured_content?.known_allergies ?? null,
      associated_symptoms: parsed.structured_content?.associated_symptoms ?? null,
      severity: parsed.structured_content?.severity ?? null,
      clinical_summary: parsed.structured_content?.clinical_summary ?? null,
    };

    const content_hash = calculateContentHash(structured_content as unknown as Record<string, unknown>, sourceText);

    return {
      structured_content,
      evidence: validation.fields,
      raw_source_text: sourceText,
      source_language: language,
      model_name: modelName,
      content_hash,
    };
  } catch (err: unknown) {
    // If Gemini fails or returns invalid response, fallback safely to deterministic parser
    console.error("Gemini AI API error, utilizing deterministic clinical fallback:", err);
    return deterministicExtractionFallback(sourceText, language);
  }
}

