import { createHash } from "crypto";

/**
 * Computes a deterministic SHA-256 hash of structured clinical draft content and source text.
 * Used to detect concurrent modifications and enforce that reviewer approvals apply to the
 * exact content reviewed.
 */
export function calculateContentHash(structuredContent: Record<string, unknown>, sourceText: string): string {
  // Sort keys canonically
  const sortedKeys = Object.keys(structuredContent).sort();
  const canonicalObj: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    canonicalObj[key] = structuredContent[key];
  }

  const payload = JSON.stringify(canonicalObj) + "::SOURCE::" + sourceText.trim();
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

