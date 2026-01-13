
import type { QuizQuestion, LearningNode, Flashcard, ExamQuestion, PlacementTestQuestion, GeneratedModule, RiddleData } from '../types';

// --- CONFIG URL BACKEND ---
const getBackendUrl = () => {
    let url = (import.meta as any).env.VITE_BACKEND_URL;
    if (!url) {
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            console.error("⚠️ CẢNH BÁO: Chưa cấu hình VITE_BACKEND_URL.");
        }
        url = 'http://localhost:5000';
    }
    return url.replace(/\/$/, "");
};

const BASE_URL = getBackendUrl();
const BACKEND_URL = `${BASE_URL}/api`;

console.log("🔗 GeminiService connecting to:", BACKEND_URL);

// --- UTILITIES: RETRY LOGIC (Exponential Backoff) ---
const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

async function fetchWithRetry(url: string, options: any, retries = 3, backoff = 1000) {
    try {
        const response = await fetch(url, options);
        
        // Handle 429 (Too Many Requests) or 503 (Service Unavailable)
        if (response.status === 429 || response.status === 503) {
            if (retries > 0) {
                console.warn(`⚠️ Gặp lỗi ${response.status}. Đang thử lại sau ${backoff}ms... (Còn ${retries} lần)`);
                await wait(backoff);
                return fetchWithRetry(url, options, retries - 1, backoff * 2);
            }
        }
        
        return response;
    } catch (error) {
        if (retries > 0) {
            console.warn(`⚠️ Lỗi mạng. Đang thử lại... (${retries})`);
            await wait(backoff);
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        throw error;
    }
}

// Generic Text Call
export const callGeminiApi = async (
    apiKey: string, 
    prompt: string, 
    systemPrompt: string | null = null, 
    config?: { useThinking?: boolean; fileData?: { mimeType: string, data: string } }
): Promise<string> => {
    try {
        const response = await fetchWithRetry(`${BACKEND_URL}/ai/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify({
                prompt,
                systemPrompt,
                config
            }),
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || `Lỗi AI Server (${response.status})`);
        }

        return data.text || "";
    } catch (e: any) {
        console.error("Backend AI API Error:", e);
        throw new Error(e.message || "AI Service Unavailable");
    }
};

// Generic JSON Schema Call
export const callGeminiApiWithSchema = async (
    apiKey: string, 
    prompt: string, 
    schema?: any, 
    config?: { useThinking?: boolean, fileData?: { mimeType: string, data: string } }
): Promise<any> => {
    try {
        const response = await fetchWithRetry(`${BACKEND_URL}/ai/generate-json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify({
                prompt,
                schema,
                config
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `Lỗi AI JSON (${response.status})`);
        }

        return data;
    } catch (e: any) {
        console.error("Backend JSON API Error:", e);
        throw new Error(e.message || "AI Service Unavailable");
    }
};

// --- IMPLEMENTED FUNCTIONS ---

export const generateNodeFlashcards = async (apiKey: string, nodeTitle: string, nodeDesc: string): Promise<Flashcard[]> => {
    // OPTIMIZATION: Updated to 30 items as requested.
    const prompt = `Generate exactly 30 flashcards for learning node: ${nodeTitle}.
    Description Context: ${nodeDesc.substring(0, 500)}
    
    Rules:
    1. Front: Term/Concept (Short).
    2. Back: Definition/Answer (Concise).
    3. Return strictly JSON.`;
    
    const schema = {
        type: 'OBJECT',
        properties: {
            flashcards: {
                type: 'ARRAY',
                items: {
                    type: 'OBJECT',
                    properties: {
                        front: { type: 'STRING' },
                        back: { type: 'STRING' }
                    },
                    required: ["front", "back"]
                }
            }
        },
        required: ["flashcards"]
    };

    // Note: Generating 30 items is heavy. Use Flash model (useThinking: false) for speed and to avoid timeouts.
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema, { useThinking: false });
    return res.flashcards?.map((c: any, i: number) => ({...c, id: `fc_${Date.now()}_${i}`})) || [];
};

export const generateNodeExam = async (apiKey: string, nodeTitle: string): Promise<ExamQuestion[]> => {
    // Exam needs logic -> Updated to 20 questions. Added explicit instructions for arrange_words options.
    const prompt = `Generate exactly 20 exam questions for: ${nodeTitle}.
    Include types: 'mcq' (Multiple Choice), 'fill_gap' (Fill in the blank), and 'arrange_words' (Sentence Building).
    
    CRITICAL RULES:
    1. For 'mcq': 'correctAnswer' must be the index string "0", "1", "2", or "3".
    2. For 'arrange_words': 
       - 'question' should be "Arrange the words to form a correct sentence".
       - 'correctAnswer' should be the full correct sentence.
       - 'options' MUST contain the individual words of the correct answer, randomly shuffled. You may add 1-2 distractor words.
    3. Return JSON.`;
    
    const schema = {
        type: 'OBJECT',
        properties: {
            questions: {
                type: 'ARRAY',
                items: {
                    type: 'OBJECT',
                    properties: {
                        id: { type: 'STRING' },
                        type: { type: 'STRING', enum: ["mcq", "fill_gap", "arrange_words"] },
                        question: { type: 'STRING' },
                        options: { type: 'ARRAY', items: { type: 'STRING' }, nullable: true },
                        correctAnswer: { type: 'STRING' },
                        explanation: { type: 'STRING' }
                    },
                    required: ["question", "correctAnswer", "type"]
                }
            }
        },
        required: ["questions"]
    };

    // Generating 20 complex questions benefits from Thinking Mode but can be slow. 
    // We use Thinking Mode to ensure logical correctness of 'arrange_words' and distractors.
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema, { useThinking: true });
    return res.questions || [];
};

export const generateJesterExplanation = async (apiKey: string, questionText: string, correctAnswerText: string): Promise<string> => {
    return callGeminiApi(apiKey, `Explain specifically why "${correctAnswerText}" is correct for "${questionText}" using a funny, Jester persona. Keep it short.`, null, { useThinking: true });
};

export const transformNoteToLesson = async (apiKey: string, noteTitle: string, noteContent: string): Promise<string> => {
    return callGeminiApi(apiKey, `Transform to markdown lesson: Title: ${noteTitle}, Content: ${noteContent.substring(0, 3000)}`, "Curriculum Designer", { useThinking: true });
};

export const convertContentToFlashcards = async (apiKey: string, content: string, options?: { useThinking?: boolean }): Promise<Flashcard[]> => {
    const prompt = `Extract 5-10 key flashcards from text. JSON only. Content: "${content.substring(0, 2000)}"`;
    const schema = { type: 'OBJECT', properties: { flashcards: { type: 'ARRAY', items: { type: 'OBJECT', properties: { front: { type: 'STRING' }, back: { type: 'STRING' } }, required: ["front", "back"] } } }, required: ["flashcards"] };
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema, { useThinking: options?.useThinking });
    return res.flashcards || [];
};

export const generateLegacyArchiveContent = async (apiKey: string, data: any, type: 'course'|'squadron', name: string): Promise<string> => {
    const prompt = `Create nostalgic Legacy Archive for ${type} "${name}". Data Summary: ${JSON.stringify(data).substring(0, 2000)}`;
    return callGeminiApi(apiKey, prompt, "AI Historian", { useThinking: true });
};

export const generateQuickLessonQuiz = async (apiKey: string, title: string, context: string): Promise<QuizQuestion[]> => {
    const prompt = `Generate 3 MCQ for: ${title}. Context: ${context.substring(0, 1000)}. JSON Output.`;
    const schema = { type: 'OBJECT', properties: { questions: { type: 'ARRAY', items: { type: 'OBJECT', properties: { text: { type: 'STRING' }, options: { type: 'ARRAY', items: { type: 'STRING' } }, correctAnswer: { type: 'INTEGER' } }, required: ["text", "options", "correctAnswer"] } } }, required: ["questions"] };
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema, { useThinking: true });
    return res.questions?.map((q: any, i: number) => ({...q, id: `q_${Date.now()}_${i}`})) || [];
};

export const generateQuizFromPrompt = async (apiKey: string, userPrompt: string): Promise<QuizQuestion[]> => {
    const prompt = `${userPrompt}. Max 5 questions. JSON Output.`;
    const schema = { type: 'OBJECT', properties: { questions: { type: 'ARRAY', items: { type: 'OBJECT', properties: { text: { type: 'STRING' }, options: { type: 'ARRAY', items: { type: 'STRING' } }, correctAnswer: { type: 'INTEGER' } }, required: ["text", "options", "correctAnswer"] } } }, required: ["questions"] };
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema, { useThinking: true });
    return res.questions?.map((q: any, i: number) => ({...q, id: `q_gen_${Date.now()}_${i}`})) || [];
};

export const detectSchedulingIntent = async (apiKey: string, message: string, currentTime: string): Promise<{ detected: boolean, title?: string, isoTime?: string }> => {
    const prompt = `Analyze scheduling: "${message}". CurrentTime: ${currentTime}. JSON only.`;
    const schema = { type: 'OBJECT', properties: { detected: { type: 'BOOLEAN' }, title: { type: 'STRING', nullable: true }, isoTime: { type: 'STRING', nullable: true } }, required: ["detected"] };
    return callGeminiApiWithSchema(apiKey, prompt, schema); // No thinking needed for simple NER
};

export const transcribeAudio = async (apiKey: string, base64Audio: string): Promise<string> => {
    return callGeminiApi(apiKey, "Transcribe audio to text.", null, { fileData: { mimeType: 'audio/mp3', data: base64Audio } });
};

export const summarizeTeacherNote = async (apiKey: string, text: string): Promise<string> => {
    return callGeminiApi(apiKey, `Summarize briefly: ${text.substring(0, 2000)}`, null, { useThinking: true });
};

export const evaluateExplanation = async (apiKey: string, problem: string, explanation: string): Promise<{ isHelpful: boolean, reason: string }> => {
    const prompt = `Evaluate explanation for "${problem.substring(0, 200)}". Expl: "${explanation.substring(0, 300)}". JSON: {isHelpful, reason}`;
    const schema = { type: 'OBJECT', properties: { isHelpful: { type: 'BOOLEAN' }, reason: { type: 'STRING' } }, required: ["isHelpful", "reason"] };
    return callGeminiApiWithSchema(apiKey, prompt, schema, { useThinking: true });
};

export const generateImageWithGemini = async (apiKey: string, prompt: string, aspectRatio: "1:1" | "16:9" | "9:16"): Promise<string> => {
    throw new Error("Image generation via Backend not yet implemented.");
};

export const convertContentToQuiz = async (apiKey: string, content: string): Promise<QuizQuestion[]> => {
    return generateQuickLessonQuiz(apiKey, "Derived Quiz", content);
};

export const simplifyContent = async (apiKey: string, content: string): Promise<string> => {
    return callGeminiApi(apiKey, `Explain like I'm 5 (short): ${content.substring(0, 3000)}`, null, { useThinking: true });
};

// --- CRITICAL FIX: LEARNING PATH GENERATION ---
export const generateLearningPathWithGemini = async (apiKey: string, topicOrContent: string, isContent: boolean, context: any): Promise<LearningNode[]> => {
    // 1. INPUT TRUNCATION: Massive truncation to save tokens and prevent 429.
    // We only need the core topic to generate titles.
    const safeInput = topicOrContent.substring(0, 500); 
    
    // 2. PROMPT OPTIMIZATION: Short, Strict JSON instruction.
    const prompt = `Create a learning path outline (5 nodes) for: "${safeInput}". 
    Level: ${context.level}. 
    Goal: ${context.goal}.
    
    Output strictly JSON: { "nodes": [{ "title": string, "description": string, "type": "theory"|"practice"|"challenge" }] }
    
    Requirements:
    - Description max 10 words.
    - NO extra text.
    - NO intro/outro.`;
    
    const schema = { 
        type: 'OBJECT', 
        properties: { 
            nodes: { 
                type: 'ARRAY', 
                items: { 
                    type: 'OBJECT', 
                    properties: { 
                        title: { type: 'STRING' }, 
                        description: { type: 'STRING' }, 
                        type: { type: 'STRING' }
                    }, 
                    required: ["title", "description", "type"] 
                } 
            } 
        }, 
        required: ["nodes"] 
    };
    
    // 3. DISABLE THINKING MODE: Generating a simple list does NOT require deep reasoning.
    // This drastically reduces latency (from 30s to 3s) and prevents 429 token limits.
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema, { useThinking: false });
    
    return res.nodes?.map((n: any, i: number) => {
        const safeType = ['theory', 'practice', 'challenge'].includes(n.type) ? n.type : 'theory';
        return { 
            ...n, 
            type: safeType,
            id: `node_${Date.now()}_${i}`, 
            isLocked: i > 0, 
            isCompleted: false, 
            flashcardsMastered: 0 
        };
    }) || [];
};

export const generatePlacementTest = async (apiKey: string, topic: string): Promise<PlacementTestQuestion[]> => {
    const prompt = `Generate 5 placement questions for: ${topic.substring(0, 200)}. JSON Output.`;
    const schema = { type: 'OBJECT', properties: { questions: { type: 'ARRAY', items: { type: 'OBJECT', properties: { question: { type: 'STRING' }, options: { type: 'ARRAY', items: { type: 'STRING' } }, correctAnswer: { type: 'INTEGER' } }, required: ["question", "options", "correctAnswer"] } } }, required: ["questions"] };
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema, { useThinking: false }); // Flash for speed
    return res.questions?.map((q: any, i: number) => ({...q, id: `pt_${i}`})) || [];
};

export const regenerateSingleNode = async (apiKey: string, pathTopic: string, oldNode: LearningNode, context: string): Promise<LearningNode> => {
    const prompt = `Regenerate node for "${pathTopic}". Old: ${oldNode.title}. Context: ${context}. JSON Output.`;
    const schema = { type: 'OBJECT', properties: { title: { type: 'STRING' }, description: { type: 'STRING' }, type: { type: 'STRING', enum: ["theory", "practice", "challenge"] } }, required: ["title", "description", "type"] };
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema, { useThinking: true }); // Thinking okay here for single node quality
    return { ...oldNode, ...res };
};

export const generateAdvancedPath = async (apiKey: string, baseTopic: string, lastNodeTitle: string): Promise<LearningNode[]> => {
    const prompt = `Create 3 advanced nodes for "${baseTopic}" after "${lastNodeTitle}". JSON Output.`;
    const schema = { type: 'OBJECT', properties: { nodes: { type: 'ARRAY', items: { type: 'OBJECT', properties: { title: { type: 'STRING' }, description: { type: 'STRING' }, type: { type: 'STRING', enum: ["theory", "practice", "challenge"] } }, required: ["title", "description", "type"] } } }, required: ["nodes"] };
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema, { useThinking: true });
    return res.nodes?.map((n: any, i: number) => ({ ...n, id: `adv_node_${Date.now()}_${i}`, isLocked: true, isCompleted: false, flashcardsMastered: 0 })) || [];
};

export const enhanceNoteWithGemini = async (apiKey: string, content: string, action: 'summarize' | 'expand' | 'fix' | 'quiz' | 'harvest'): Promise<string> => {
    return callGeminiApi(apiKey, `${action}: ${content.substring(0, 2000)}`, null, { useThinking: true });
};

export const generateCourseSyllabus = async (apiKey: string, topic: string, audience: string): Promise<GeneratedModule[]> => {
    const prompt = `Syllabus for "${topic}" for "${audience}". Max 2 modules. JSON Output.`;
    const schema = { type: 'OBJECT', properties: { modules: { type: 'ARRAY', items: { type: 'OBJECT', properties: { title: { type: 'STRING' }, items: { type: 'ARRAY', items: { type: 'OBJECT', properties: { title: { type: 'STRING' }, type: { type: 'STRING' }, contentOrDescription: { type: 'STRING' } }, required: ["title", "type", "contentOrDescription"] } } }, required: ["title", "items"] } } }, required: ["modules"] };
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema, { useThinking: true });
    return res.modules || [];
};

export const generateGatekeeperTest = async (apiKey: string, pathTopic: string, nodesTitle: string[]): Promise<ExamQuestion[]> => {
    const prompt = `Gatekeeper test for "${pathTopic}". Covered: ${nodesTitle.join(', ').substring(0, 500)}. 5 Qs. JSON Output.`;
    const schema = { type: 'OBJECT', properties: { questions: { type: 'ARRAY', items: { type: 'OBJECT', properties: { id: { type: 'STRING' }, type: { type: 'STRING' }, question: { type: 'STRING' }, options: { type: 'ARRAY', items: { type: 'STRING' }, nullable: true }, correctAnswer: { type: 'STRING' } }, required: ["question", "correctAnswer", "type"] } } }, required: ["questions"] };
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema, { useThinking: true });
    return res.questions || [];
};

export const generateSpeedRunQuestions = async (apiKey: string, topic: string, subtopics: string[]): Promise<ExamQuestion[]> => {
    const prompt = `5 speed run MCQ for "${topic}". JSON Output.`;
    const schema = { type: 'OBJECT', properties: { questions: { type: 'ARRAY', items: { type: 'OBJECT', properties: { id: { type: 'STRING' }, type: { type: 'STRING', enum: ["mcq"] }, question: { type: 'STRING' }, options: { type: 'ARRAY', items: { type: 'STRING' } }, correctAnswer: { type: 'STRING' } }, required: ["question", "correctAnswer", "options"] } } }, required: ["questions"] };
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema, { useThinking: true });
    return res.questions || [];
};

export const generateTreasureRiddle = async (apiKey: string, topic: string): Promise<RiddleData> => {
    const prompt = `Riddle about "${topic}". JSON Output.`;
    const schema = { type: 'OBJECT', properties: { question: { type: 'STRING' }, answer: { type: 'STRING' }, hint: { type: 'STRING' } }, required: ["question", "answer", "hint"] };
    return callGeminiApiWithSchema(apiKey, prompt, schema, { useThinking: true });
};

export const refineTextWithOracle = async (apiKey: string, text: string): Promise<string> => {
    return callGeminiApi(apiKey, `Refine academically: "${text.substring(0, 1500)}"`, null, { useThinking: true });
};

export const generateFlashcardsFromPdf = async (apiKey: string, pdfBase64: string): Promise<{ title: string, cards: Flashcard[] }> => {
    const schema = { type: 'OBJECT', properties: { title: { type: 'STRING' }, flashcards: { type: 'ARRAY', items: { type: 'OBJECT', properties: { front: { type: 'STRING' }, back: { type: 'STRING' } }, required: ["front", "back"] } } }, required: ["title", "flashcards"] };
    try { 
        const fileData = { mimeType: 'application/pdf', data: pdfBase64 };
        const json = await callGeminiApiWithSchema(apiKey, "Extract 10 flashcards from PDF.", schema, { useThinking: true, fileData });
        return { title: json.title || "PDF Deck", cards: (json.flashcards||[]).map((fc:any, i:number) => ({ id: `fc_gen_${Date.now()}_${i}`, front: fc.front, back: fc.back })) }; 
    } catch (e: any) { throw new Error("PDF Flashcard Error: " + e.message); }
};

export const checkNoteConnections = async (apiKey: string, currentNote: string, otherNotes: { id: string, title: string, content: string }[]): Promise<{ noteTitle: string, reason: string }[]> => {
    const dbContext = otherNotes.map(n => `- Title: "${n.title}"\n  Snippet: "${n.content.substring(0, 100).replace(/\n/g, ' ')}..."`).join('\n').substring(0, 1000);
    const prompt = `Find connections. JSON: { "suggestions": [{ "noteTitle": str, "reason": str }] }\nNote: "${currentNote.substring(0, 500)}"\nDB:\n${dbContext}`;
    const schema = { type: 'OBJECT', properties: { suggestions: { type: 'ARRAY', items: { type: 'OBJECT', properties: { noteTitle: { type: 'STRING' }, reason: { type: 'STRING' } }, required: ["noteTitle", "reason"] } } }, required: ["suggestions"] };
    try { 
        const json = await callGeminiApiWithSchema(apiKey, prompt, schema, { useThinking: true });
        return json.suggestions || []; 
    } catch (e) { return []; }
};
