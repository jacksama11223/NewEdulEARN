
import express from 'express';
import { generateText, generateJson } from '../controllers/aiController.js';

const router = express.Router();

// POST /api/ai/text
// Body: { prompt, systemPrompt?, config: { useThinking: boolean }, fileData? }
router.post('/text', generateText);

// POST /api/ai/json
// Body: { prompt, schema, config: { useThinking: boolean } }
router.post('/json', generateJson);

export default router;
