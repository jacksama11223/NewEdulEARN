
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ ERROR: Missing GEMINI_API_KEY in .env file");
}

export const aiClient = new GoogleGenAI({ apiKey: apiKey });
