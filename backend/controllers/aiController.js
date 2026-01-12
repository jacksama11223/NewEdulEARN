
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config();

const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// @desc    Generate Text (Chat, Explain)
// @route   POST /api/ai/generate
export const generateText = async (req, res) => {
    try {
        const { prompt, systemPrompt, config } = req.body;
        
        // --- STRICT THINKING MODE CONFIGURATION ---
        // As per requirement: Use gemini-3-pro-preview and max thinking budget for complex queries
        let model = 'gemini-3-flash-preview';
        let reqConfig = {};

        if (config?.useThinking) {
            model = 'gemini-3-pro-preview';
            reqConfig = {
                thinkingConfig: { thinkingBudget: 32768 } // Max budget
            };
        }

        if (systemPrompt) {
            reqConfig.systemInstruction = systemPrompt;
        }

        const response = await aiClient.models.generateContent({
            model: model,
            contents: { role: 'user', parts: [{ text: prompt }] },
            config: reqConfig
        });

        res.json({ text: response.text || "" });

    } catch (error) {
        console.error("Gemini API Error:", error);
        res.status(500).json({ message: "AI Service Error", error: error.message });
    }
};

// @desc    Generate Structured JSON (Quiz, Flashcards)
// @route   POST /api/ai/generate-json
export const generateJson = async (req, res) => {
    try {
        const { prompt, schema, config } = req.body;

        // Use Pro model for better JSON adherence and logic
        let model = config?.useThinking ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
        
        const reqConfig = {
            responseMimeType: 'application/json',
            responseSchema: schema
        };

        if (config?.useThinking) {
            reqConfig.thinkingConfig = { thinkingBudget: 32768 };
        }

        const response = await aiClient.models.generateContent({
            model: model,
            contents: prompt,
            config: reqConfig
        });

        // Parse and return JSON
        const text = response.text || "{}";
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        res.json(JSON.parse(cleanText));

    } catch (error) {
        console.error("Gemini JSON Error:", error);
        res.status(500).json({ message: "AI JSON Generation Error", error: error.message });
    }
};
