import { z } from "zod";

export const ClinicalFieldSchema = z.object({
  field: z.string(),
  path: z.string(),
  value: z.string().nullable(),
  exact_quote: z.string().nullable(),
  start_offset: z.number().nullable(),
  end_offset: z.number().nullable(),
  confidence: z.number().min(0).max(100),
  verification_status: z.enum(["verified", "missing", "ambiguous", "invalid"]),
  iconType: z.enum(["lungs", "clock", "chart", "pill", "shield", "heart", "brain"]),
});

export type ClinicalField = z.infer<typeof ClinicalFieldSchema>;

export const StructuredDraftContentSchema = z.object({
  main_complaint: z.string().nullable().default(null),
  duration: z.string().nullable().default(null),
  symptom_pattern: z.string().nullable().default(null),
  medicine_use: z.string().nullable().default(null),
  known_allergies: z.string().nullable().default(null),
  associated_symptoms: z.string().nullable().default(null),
  severity: z.string().nullable().default(null),
  clinical_summary: z.string().nullable().default(null),
});

export type StructuredDraftContent = z.infer<typeof StructuredDraftContentSchema>;

export const ClinicalDraftResponseSchema = z.object({
  structured_content: StructuredDraftContentSchema,
  evidence: z.array(ClinicalFieldSchema),
  raw_source_text: z.string(),
  source_language: z.enum(["hindi", "hinglish", "english"]),
  model_name: z.string(),
  content_hash: z.string(),
});

export type ClinicalDraftResponse = z.infer<typeof ClinicalDraftResponseSchema>;

