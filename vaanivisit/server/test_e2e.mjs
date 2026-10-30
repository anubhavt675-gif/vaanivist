import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function runTests() {
  console.log("=== STARTING VAANIVISIT API & DATABASE VERIFICATION ===");
  
  // Start server locally on test port
  const { default: express } = await import("express");
  
  // We can test server/index.mjs directly by starting it or querying it
  const port = 3005;
  process.env.PORT = String(port);
  
  const serverModule = await import("./index.mjs");
  
  // Wait 1 second for server to bind
  await new Promise(r => setTimeout(r, 1000));
  
  console.log("Testing 1: GET /api/reviewer/queue");
  const queueRes = await fetch(`http://localhost:${port}/api/reviewer/queue`);
  const queueData = await queueRes.json();
  console.log(`Queue Response status: ${queueRes.status}, records found: ${queueData?.queue?.length}`);
  
  console.log("Testing 2: POST /api/intakes");
  const intakeRes = await fetch(`http://localhost:${port}/api/intakes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source_text: "Mujhe 2 din se tez bukhar aur gala kharab hai.",
      source_language: "hinglish",
      input_method: "text"
    })
  });
  const intakeData = await intakeRes.json();
  console.log(`Intake Response status: ${intakeRes.status}, created ID: ${intakeData?.intake?.id}`);
  
  if (intakeData?.intake?.id) {
    const intakeId = intakeData.intake.id;
    console.log(`Testing 3: POST /api/intakes/${intakeId}/generate-draft (Gemini AI Extraction)`);
    const draftRes = await fetch(`http://localhost:${port}/api/intakes/${intakeId}/generate-draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_text: "Mujhe 2 din se tez bukhar aur gala kharab hai.",
        language: "hinglish"
      })
    });
    const draftData = await draftRes.json();
    console.log(`Draft Response status: ${draftRes.status}, draft ID: ${draftData?.draft?.id}, confidence: ${draftData?.draft?.overall_confidence}`);
    console.log("Extracted evidence items:", draftData?.draft?.evidence?.length);
    
    if (draftData?.draft?.id) {
      const draftId = draftData.draft.id;
      const hash = draftData.draft.content_hash;
      
      console.log(`Testing 4: POST /api/drafts/${draftId}/export (Should be 403 Forbidden because draft is unapproved)`);
      const unapprovedExportRes = await fetch(`http://localhost:${port}/api/drafts/${draftId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "json",
          requested_by: "test-user"
        })
      });
      console.log(`Unapproved Export status: ${unapprovedExportRes.status} (Expected 403)`);
      
      console.log(`Testing 5: POST /api/drafts/${draftId}/review (Reviewer approval)`);
      const reviewRes = await fetch(`http://localhost:${port}/api/drafts/${draftId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: "approved",
          reviewer_notes: "Clinical facts verified. Symptoms consistent with acute viral pharyngitis.",
          content_hash: hash
        })
      });
      const reviewData = await reviewRes.json();
      console.log(`Review Response status: ${reviewRes.status}, new status: ${reviewData?.draft?.status}`);
      
      console.log(`Testing 6: POST /api/drafts/${draftId}/export (Should now SUCCEED with 200 OK because draft is approved)`);
      const approvedExportRes = await fetch(`http://localhost:${port}/api/drafts/${draftId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "json",
          requested_by: "test-user"
        })
      });
      const approvedExportData = await approvedExportRes.json();
      console.log(`Approved Export status: ${approvedExportRes.status}, exported record ID: ${approvedExportData?.export?.id}`);
    }
  }

  console.log("Testing 7: GET /api/ugc/posts");
  const ugcRes = await fetch(`http://localhost:${port}/api/ugc/posts`);
  const ugcData = await ugcRes.json();
  console.log(`UGC Response status: ${ugcRes.status}, posts found: ${ugcData?.posts?.length}`);
  
  console.log("Testing 8: Static HTML serving");
  const htmlRes = await fetch(`http://localhost:${port}/`);
  const htmlText = await htmlRes.text();
  console.log(`HTML response status: ${htmlRes.status}, contains '<div id="root">': ${htmlText.includes('<div id="root">')}`);
  
  console.log("=== ALL END-TO-END VERIFICATION CHECKS COMPLETED ===");
  process.exit(0);
}

runTests().catch(e => {
  console.error("Verification failed:", e);
  process.exit(1);
});

