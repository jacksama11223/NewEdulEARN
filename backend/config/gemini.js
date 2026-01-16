import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

// Guideline: obtain API key exclusively from the environment variable process.env.API_KEY
const apiKey = process.env.API_KEY;

if (!apiKey) {
    console.error("❌ ERROR: Missing API_KEY in environment variables");
}

export const aiClient = new GoogleGenAI({ apiKey: apiKey });