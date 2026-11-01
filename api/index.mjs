// Vercel Serverless Function - Single Catch-All API Handler for Vision
import app from "../vaanivisit/server/index.mjs";

export default function handler(req, res) {
  return app(req, res);
}
