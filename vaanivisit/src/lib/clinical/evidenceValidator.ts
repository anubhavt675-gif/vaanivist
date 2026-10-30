import { ClinicalField } from "./schema";

export interface ValidationResult {
  fields: ClinicalField[];
  isValid: boolean;
  verifiedCount: number;
  missingCount: number;
  invalidCount: number;
}

/**
 * Validates factual field evidence against the original source text using deterministic
 * JavaScript UTF-16 substring matching. Prevents hallucinations and fabricated quotes.
 */
export function validateEvidence(
  rawFields: Array<Omit<ClinicalField, "verification_status"> & { verification_status?: string }>,
  sourceText: string
): ValidationResult {
  const normalizedSource = sourceText;
  const lowerSource = sourceText.toLowerCase();

  let verifiedCount = 0;
  let missingCount = 0;
  let invalidCount = 0;

  const validatedFields: ClinicalField[] = rawFields.map((field) => {
    // If the field has no value or is explicitly null/empty/not provided
    if (
      field.value === null ||
      field.value === undefined ||
      field.value.trim() === "" ||
      field.value.toLowerCase().includes("not provided") ||
      field.value.toLowerCase().includes("unknown")
    ) {
      missingCount++;
      return {
        ...field,
        value: null,
        exact_quote: null,
        start_offset: null,
        end_offset: null,
        confidence: 0,
        verification_status: "missing" as const,
      };
    }

    // If there is no quote provided for a non-null value
    if (!field.exact_quote || field.exact_quote.trim() === "") {
      invalidCount++;
      return {
        ...field,
        start_offset: null,
        end_offset: null,
        verification_status: "invalid" as const,
        confidence: Math.min(field.confidence, 40),
      };
    }

    const trimmedQuote = field.exact_quote.trim();
    const quoteLen = trimmedQuote.length;

    // Check if quote matches at the given offsets
    if (
      typeof field.start_offset === "number" &&
      typeof field.end_offset === "number" &&
      field.start_offset >= 0 &&
      field.end_offset <= normalizedSource.length &&
      field.start_offset < field.end_offset
    ) {
      const slice = normalizedSource.slice(field.start_offset, field.end_offset);
      if (slice.trim() === trimmedQuote || slice.toLowerCase().trim() === trimmedQuote.toLowerCase()) {
        verifiedCount++;
        return {
          ...field,
          exact_quote: trimmedQuote,
          verification_status: "verified" as const,
        };
      }
    }

    // If offset was misaligned, search for exact quote in source text
    const exactIndex = normalizedSource.indexOf(trimmedQuote);
    if (exactIndex !== -1) {
      verifiedCount++;
      return {
        ...field,
        exact_quote: trimmedQuote,
        start_offset: exactIndex,
        end_offset: exactIndex + quoteLen,
        verification_status: "verified" as const,
      };
    }

    // Try case-insensitive search
    const lowerQuote = trimmedQuote.toLowerCase();
    const caseIndex = lowerSource.indexOf(lowerQuote);
    if (caseIndex !== -1) {
      verifiedCount++;
      const matchedSlice = normalizedSource.slice(caseIndex, caseIndex + quoteLen);
      return {
        ...field,
        exact_quote: matchedSlice,
        start_offset: caseIndex,
        end_offset: caseIndex + quoteLen,
        verification_status: "verified" as const,
      };
    }

    // If quote cannot be found anywhere in the source text, it is fabricated/invalid!
    invalidCount++;
    return {
      ...field,
      start_offset: null,
      end_offset: null,
      verification_status: "invalid" as const,
      confidence: Math.min(field.confidence, 30),
    };
  });

  return {
    fields: validatedFields,
    isValid: invalidCount === 0,
    verifiedCount,
    missingCount,
    invalidCount,
  };
}

