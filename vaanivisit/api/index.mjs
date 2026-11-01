// Vercel Serverless Function - Catch-All API Handler for Vision (subfolder deployment)
import app from "../server/index.mjs";

export default function handler(req, res) {
  return app(req, res);
}
