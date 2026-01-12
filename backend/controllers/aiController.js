
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config();

// Helper to get client per request
const getClient = (req) => {
    // Try header first (User Provided Key), then fallback to server env (if set for testing)
    const apiKey = req.headers['x-api-key'] || process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API Key is required. Please set it in settings or backend env.");
    }
    return new GoogleGenAI({ apiKey });
};

// @desc    Generate Text (Chat, Explain)
// @route   POST /api/ai/generate
export const generateText = async (req, res) => {
    try {
        const { prompt, systemPrompt, config } = req.body;
        
        // Initialize client dynamically with request's API key
        const aiClient = getClient(req);

        // LOGIC: Use 'gemini-3-flash-preview' as the robust default.
        // It replaces 1.5-flash and 2.0-flash for basic tasks.
        let modelName = 'gemini-3-flash-preview';
        let reqConfig = {};

        // Use 'gemini-3-pro-preview' ONLY if Thinking is explicitly requested.
        // This model supports deep reasoning.
        if (config?.useThinking) {
            modelName = 'gemini-3-pro-preview';
            // Set a conservative budget to avoid latency/timeouts on free tiers
            reqConfig.thinkingConfig = { thinkingBudget: 2048 }; 
        }

        if (systemPrompt) {
            reqConfig.systemInstruction = systemPrompt;
        }

        // Guideline: Use ai.models.generateContent to query directly
        const response = await aiClient.models.generateContent({
            model: modelName,
            contents: prompt,
            config: reqConfig
        });

        // Guideline: Extract string output using the .text property (not a method)
        res.json({ text: response.text || "" });

    } catch (error) {
        console.error("Gemini API Error:", error);
        const msg = error.message || "AI Service Error";
        res.status(500).json({ message: msg, error: msg });
    }
};

// @desc    Generate Structured JSON (Quiz, Flashcards)
// @route   POST /api/ai/generate-json
export const generateJson = async (req, res) => {
    try {
        const { prompt, schema, config } = req.body;

        // Initialize client dynamically with request's API key
        const aiClient = getClient(req);

        // CHANGED: Use 'gemini-3-flash-preview' for JSON tasks.
        // It is fast and follows schema instructions well.
        let modelName = 'gemini-3-flash-preview';
        
        const reqConfig = {
            responseMimeType: 'application/json',
            responseSchema: schema
        };

        const response = await aiClient.models.generateContent({
            model: modelName,
            contents: prompt,
            config: reqConfig
        });

        // Guideline: Use .text property for extraction
        const text = response.text || "{}";
        // Ensure clean JSON by stripping potential markdown code blocks
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        try {
            res.json(JSON.parse(cleanText));
        } catch (parseError) {
            console.error("JSON Parse Error:", parseError, "Raw text:", text);
            res.status(500).json({ message: "AI returned invalid JSON", text });
        }

    } catch (error) {
        console.error("Gemini JSON Error:", error);
        const msg = error.message || "AI JSON Generation Error";
        res.status(500).json({ message: msg, error: msg });
    }
};
