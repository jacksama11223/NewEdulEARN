
import type { QuizQuestion, LearningNode, Flashcard, ExamQuestion, PlacementTestQuestion, GeneratedModule, RiddleData } from '../types';

// --- CONFIG URL BACKEND ---
const getBackendUrl = () => {
    // 1. Lấy URL từ biến môi trường
    let url = (import.meta as any).env.VITE_BACKEND_URL;
    
    // 2. Nếu không có (đang chạy local), dùng localhost
    if (!url) {
        // Kiểm tra xem đang ở môi trường production hay dev
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            console.error("⚠️ CẢNH BÁO: Chưa cấu hình VITE_BACKEND_URL trên Vercel/Netlify. App sẽ cố kết nối localhost và có thể thất bại.");
        }
        url = 'http://localhost:5000';
    }

    // 3. Xóa dấu gạch chéo '/' ở cuối nếu có (để tránh lỗi //api)
    return url.replace(/\/$/, "");
};

const BASE_URL = getBackendUrl();
const BACKEND_URL = `${BASE_URL}/api`;

console.log("🔗 GeminiService connecting to:", BACKEND_URL);

// Generic Text Call -> Calls Backend
export const callGeminiApi = async (
    apiKey: string, 
    prompt: string, 
    systemPrompt: string | null = null, 
    config?: { useThinking?: boolean; fileData?: { mimeType: string, data: string } }
): Promise<string> => {
    try {
        const response = await fetch(`${BACKEND_URL}/ai/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey // Pass API Key in header
            },
            body: JSON.stringify({
                prompt,
                systemPrompt,
                config
            }),
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || "Failed to call Backend AI Service");
        }

        return data.text || "";
    } catch (e: any) {
        console.error("Backend AI API Error:", e);
        throw new Error(e.message || "AI Service Unavailable");
    }
};

// Generic JSON Schema Call -> Calls Backend
export const callGeminiApiWithSchema = async (
    apiKey: string, 
    prompt: string, 
    schema?: any, 
    config?: { useThinking?: boolean, fileData?: { mimeType: string, data: string } }
): Promise<any> => {
    try {
        const response = await fetch(`${BACKEND_URL}/ai/generate-json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey // Pass API Key in header
            },
            body: JSON.stringify({
                prompt,
                schema,
                config
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to generate structured data from Backend");
        }

        return data;
    } catch (e: any) {
        console.error("Backend JSON API Error:", e);
        throw new Error(e.message || "AI Service Unavailable");
    }
};

// --- IMPLEMENTED FUNCTIONS ---

export const generateNodeFlashcards = async (apiKey: string, nodeTitle: string, nodeDesc: string): Promise<Flashcard[]> => {
    // OPTIMIZATION: Strictly limited to 10 cards to prevent timeouts and token exhaustion
    const prompt = `Generate exactly 10 flashcards for learning node: ${nodeTitle}.
    Description: ${nodeDesc.substring(0, 300)}
    
    Rules:
    1. Keep 'front' and 'back' VERY short and concise.
    2. Focus on key terminology and definitions.
    3. Return strictly JSON: { "flashcards": [{ "front": string, "back": string }] }`;
    
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

    // Disable thinking for speed/cost on simple generation
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema, { useThinking: false });
    return res.flashcards?.map((c: any, i: number) => ({...c, id: `fc_${Date.now()}_${i}`})) || [];
};

export const generateNodeExam = async (apiKey: string, nodeTitle: string): Promise<ExamQuestion[]> => {
    // OPTIMIZATION: Limit to 5 questions
    const prompt = `Generate exactly 5 exam questions for: ${nodeTitle}.
    
    Include these types:
    1. 'mcq': Multiple Choice. 'correctAnswer' MUST be the index string (e.g. "0", "1", "2", "3").
    2. 'fill_gap': Sentence with a blank.

    Return JSON: { "questions": [{ "id": string, "type": "mcq"|"fill_gap", "question": string, "options": [string], "correctAnswer": string, "explanation": string }] }`;
    
    const schema = {
        type: 'OBJECT',
        properties: {
            questions: {
                type: 'ARRAY',
                items: {
                    type: 'OBJECT',
                    properties: {
                        id: { type: 'STRING' },
                        type: { type: 'STRING', enum: ["mcq", "fill_gap"] },
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

    const res = await callGeminiApiWithSchema(apiKey, prompt, schema, { useThinking: false });
    return res.questions || [];
};

export const generateJesterExplanation = async (apiKey: string, questionText: string, correctAnswerText: string): Promise<string> => {
    const prompt = `Explain like I'm 5 (witty/funny): Question: "${questionText}", Correct: "${correctAnswerText}". Language: Vietnamese. Keep it short.`;
    return callGeminiApi(apiKey, prompt, null, { useThinking: true });
};

export const transformNoteToLesson = async (apiKey: string, noteTitle: string, noteContent: string): Promise<string> => {
    // Truncate note content
    const prompt = `Transform to short structured lesson (Markdown): Title: ${noteTitle}, Content: ${noteContent.substring(0, 2000)}`;
    return callGeminiApi(apiKey, prompt, "Curriculum Designer", { useThinking: true });
};

export const convertContentToFlashcards = async (apiKey: string, content: string, options?: { useThinking?: boolean }): Promise<Flashcard[]> => {
    // OPTIMIZATION: Truncate input and limit output count
    const prompt = `Extract 5 key flashcards from: "${content.substring(0, 2000)}". JSON: { "flashcards": [{ "front": "Term", "back": "Short Def" }] }`;
    const schema = { type: 'OBJECT', properties: { flashcards: { type: 'ARRAY', items: { type: 'OBJECT', properties: { front: { type: 'STRING' }, back: { type: 'STRING' } }, required: ["front", "back"] } } }, required: ["flashcards"] };
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema, { useThinking: options?.useThinking });
    return res.flashcards || [];
};

export const generateLegacyArchiveContent = async (apiKey: string, data: any, type: 'course'|'squadron', name: string): Promise<string> => {
    const prompt = `Create nostalgic Legacy Archive for ${type} "${name}". Data: ${JSON.stringify(data).substring(0, 3000)}`;
    return callGeminiApi(apiKey, prompt, "AI Historian", { useThinking: true });
};

export const generateQuickLessonQuiz = async (apiKey: string, title: string, context: string): Promise<QuizQuestion[]> => {
    const prompt = `Generate 3 MCQ for: ${title}. Context: ${context.substring(0, 1000)}. JSON: { "questions": [{ "text": "?", "options": ["A"], "correctAnswer": 0 }] }`;
    const schema = { 
        type: 'OBJECT', 
        properties: { 
            questions: { 
                type: 'ARRAY', 
                items: { 
                    type: 'OBJECT', 
                    properties: { 
                        text: { type: 'STRING' }, 
                        options: { type: 'ARRAY', items: { type: 'STRING' } }, 
                        correctAnswer: { type: 'INTEGER' } 
                    }, 
                    required: ["text", "options", "correctAnswer"] 
                } 
            } 
        }, 
        required: ["questions"]
    };
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema);
    return res.questions?.map((q: any, i: number) => ({...q, id: `q_${Date.now()}_${i}`})) || [];
};

export const generateQuizFromPrompt = async (apiKey: string, userPrompt: string): Promise<QuizQuestion[]> => {
    const prompt = `${userPrompt}. Max 5 questions. JSON: { "questions": [{ "text": "?", "options": ["A"], "correctAnswer": 0 }] }`;
    const schema = { 
        type: 'OBJECT', 
        properties: { 
            questions: { 
                type: 'ARRAY', 
                items: { 
                    type: 'OBJECT', 
                    properties: { 
                        text: { type: 'STRING' }, 
                        options: { type: 'ARRAY', items: { type: 'STRING' } }, 
                        correctAnswer: { type: 'INTEGER' } 
                    }, 
                    required: ["text", "options", "correctAnswer"] 
                } 
            } 
        },
        required: ["questions"]
    };
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema);
    return res.questions?.map((q: any, i: number) => ({...q, id: `q_gen_${Date.now()}_${i}`})) || [];
};

export const detectSchedulingIntent = async (apiKey: string, message: string, currentTime: string): Promise<{ detected: boolean, title?: string, isoTime?: string }> => {
    const prompt = `Analyze scheduling: "${message}". Time: ${currentTime}. JSON: { "detected": bool, "title": str, "isoTime": str }`;
    const schema = { type: 'OBJECT', properties: { detected: { type: 'BOOLEAN' }, title: { type: 'STRING', nullable: true }, isoTime: { type: 'STRING', nullable: true } }, required: ["detected"] };
    return callGeminiApiWithSchema(apiKey, prompt, schema);
};

export const transcribeAudio = async (apiKey: string, base64Audio: string): Promise<string> => {
    const prompt = "Transcribe to text.";
    const fileData = { mimeType: 'audio/mp3', data: base64Audio };
    return callGeminiApi(apiKey, prompt, null, { fileData });
};

export const summarizeTeacherNote = async (apiKey: string, text: string): Promise<string> => {
    return callGeminiApi(apiKey, `Summarize briefly: ${text.substring(0, 1000)}`, null, { useThinking: true });
};

export const evaluateExplanation = async (apiKey: string, problem: string, explanation: string): Promise<{ isHelpful: boolean, reason: string }> => {
    const prompt = `Evaluate explanation for "${problem.substring(0, 200)}". Expl: "${explanation.substring(0, 200)}". JSON: { "isHelpful": bool, "reason": str }`;
    const schema = { type: 'OBJECT', properties: { isHelpful: { type: 'BOOLEAN' }, reason: { type: 'STRING' } }, required: ["isHelpful", "reason"] };
    return callGeminiApiWithSchema(apiKey, prompt, schema);
};

export const generateImageWithGemini = async (apiKey: string, prompt: string, aspectRatio: "1:1" | "16:9" | "9:16"): Promise<string> => {
    throw new Error("Image generation via Backend not yet implemented. Please use text features.");
};

export const convertContentToQuiz = async (apiKey: string, content: string): Promise<QuizQuestion[]> => {
    return generateQuickLessonQuiz(apiKey, "Derived Quiz", content);
};

export const simplifyContent = async (apiKey: string, content: string): Promise<string> => {
    return callGeminiApi(apiKey, `Explain like I'm 5 (short): ${content.substring(0, 2000)}`, null, { useThinking: true });
};

export const generateLearningPathWithGemini = async (apiKey: string, topicOrContent: string, isContent: boolean, context: any): Promise<LearningNode[]> => {
    // OPTIMIZATION: Massive truncation to save tokens and speed up initial tree generation
    // We only need the structure (Title, Desc, Type), not the content.
    const safeInput = topicOrContent.substring(0, 500); 
    
    const prompt = `Generate a learning path outline (exactly 5 nodes) for: "${safeInput}". 
    Level: ${context.level}. 
    
    IMPORTANT:
    1. Only generate Titles and short Descriptions.
    2. DO NOT generate quizzes, flashcards, or detailed content yet.
    3. Max 15 words per description.
    
    Return strictly JSON: { "nodes": [{ "title": string, "description": string, "type": "theory"|"practice"|"challenge" }] }`;
    
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
    
    // Disable thinking mode for path generation to improve speed/cost
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
    const prompt = `Generate 5 placement questions for: ${topic.substring(0, 100)}. JSON: { "questions": [{ "question": str, "options": [str], "correctAnswer": int }] }`;
    const schema = { type: 'OBJECT', properties: { questions: { type: 'ARRAY', items: { type: 'OBJECT', properties: { question: { type: 'STRING' }, options: { type: 'ARRAY', items: { type: 'STRING' } }, correctAnswer: { type: 'INTEGER' } }, required: ["question", "options", "correctAnswer"] } } }, required: ["questions"] };
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema);
    return res.questions?.map((q: any, i: number) => ({...q, id: `pt_${i}`})) || [];
};

export const regenerateSingleNode = async (apiKey: string, pathTopic: string, oldNode: LearningNode, context: string): Promise<LearningNode> => {
    const prompt = `Regenerate node for "${pathTopic}". Old: ${JSON.stringify(oldNode)}. Context: ${context}. Keep desc short. JSON: { "title": str, "description": str, "type": "theory"|"practice"|"challenge" }`;
    const schema = { type: 'OBJECT', properties: { title: { type: 'STRING' }, description: { type: 'STRING' }, type: { type: 'STRING', enum: ["theory", "practice", "challenge"] } }, required: ["title", "description", "type"] };
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema);
    return { ...oldNode, ...res };
};

export const generateAdvancedPath = async (apiKey: string, baseTopic: string, lastNodeTitle: string): Promise<LearningNode[]> => {
    const prompt = `Create 3 advanced extension nodes for "${baseTopic}" after "${lastNodeTitle}". JSON: { "nodes": [{ "title": str, "description": str, "type": "theory"|"practice"|"challenge" }] }`;
    const schema = { type: 'OBJECT', properties: { nodes: { type: 'ARRAY', items: { type: 'OBJECT', properties: { title: { type: 'STRING' }, description: { type: 'STRING' }, type: { type: 'STRING', enum: ["theory", "practice", "challenge"] } }, required: ["title", "description", "type"] } } }, required: ["nodes"] };
    
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema, { useThinking: false });
    return res.nodes?.map((n: any, i: number) => ({ ...n, id: `adv_node_${Date.now()}_${i}`, isLocked: true, isCompleted: false, flashcardsMastered: 0 })) || [];
};

export const enhanceNoteWithGemini = async (apiKey: string, content: string, action: 'summarize' | 'expand' | 'fix' | 'quiz' | 'harvest'): Promise<string> => {
    // Truncate to save tokens
    return callGeminiApi(apiKey, `${action}: ${content.substring(0, 1500)}`, null, { useThinking: true });
};

export const generateCourseSyllabus = async (apiKey: string, topic: string, audience: string): Promise<GeneratedModule[]> => {
    const prompt = `Syllabus for "${topic}" for "${audience}". Max 2 modules. JSON: { "modules": [{ "title": str, "items": [{ "title": str, "type": "lesson_video"|"lesson_text"|"assignment_quiz"|"assignment_file", "contentOrDescription": string }] }] }`;
    const schema = { type: 'OBJECT', properties: { modules: { type: 'ARRAY', items: { type: 'OBJECT', properties: { title: { type: 'STRING' }, items: { type: 'ARRAY', items: { type: 'OBJECT', properties: { title: { type: 'STRING' }, type: { type: 'STRING' }, contentOrDescription: { type: 'STRING' } }, required: ["title", "type", "contentOrDescription"] } } }, required: ["title", "items"] } } }, required: ["modules"] };
    
    // Syllabus is complex, keep thinking true but restrict size
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema, { useThinking: true });
    return res.modules || [];
};

export const generateGatekeeperTest = async (apiKey: string, pathTopic: string, nodesTitle: string[]): Promise<ExamQuestion[]> => {
    const prompt = `Gatekeeper test for "${pathTopic}". Covered: ${nodesTitle.join(', ').substring(0, 500)}. 5 Qs. JSON: { "questions": [{ "id": str, "type": "mcq", "question": str, "options": [str], "correctAnswer": str }] }`;
    const schema = { type: 'OBJECT', properties: { questions: { type: 'ARRAY', items: { type: 'OBJECT', properties: { id: { type: 'STRING' }, type: { type: 'STRING' }, question: { type: 'STRING' }, options: { type: 'ARRAY', items: { type: 'STRING' }, nullable: true }, correctAnswer: { type: 'STRING' } }, required: ["question", "correctAnswer", "type"] } } }, required: ["questions"] };
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema);
    return res.questions || [];
};

export const generateSpeedRunQuestions = async (apiKey: string, topic: string, subtopics: string[]): Promise<ExamQuestion[]> => {
    const prompt = `5 speed run MCQ for "${topic}". JSON: { "questions": [{ "id": str, "type": "mcq", "question": str, "options": [str], "correctAnswer": str }] }`;
    const schema = { type: 'OBJECT', properties: { questions: { type: 'ARRAY', items: { type: 'OBJECT', properties: { id: { type: 'STRING' }, type: { type: 'STRING', enum: ["mcq"] }, question: { type: 'STRING' }, options: { type: 'ARRAY', items: { type: 'STRING' } }, correctAnswer: { type: 'STRING' } }, required: ["question", "correctAnswer", "options"] } } }, required: ["questions"] };
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema);
    return res.questions || [];
};

export const generateTreasureRiddle = async (apiKey: string, topic: string): Promise<RiddleData> => {
    const prompt = `Riddle about "${topic}". JSON: { "question": str, "answer": str, "hint": str }`;
    const schema = { type: 'OBJECT', properties: { question: { type: 'STRING' }, answer: { type: 'STRING' }, hint: { type: 'STRING' } }, required: ["question", "answer", "hint"] };
    return callGeminiApiWithSchema(apiKey, prompt, schema);
};

export const refineTextWithOracle = async (apiKey: string, text: string): Promise<string> => {
    return callGeminiApi(apiKey, `Refine academically: "${text.substring(0, 1000)}"`, null, { useThinking: true });
};

export const generateFlashcardsFromPdf = async (apiKey: string, pdfBase64: string): Promise<{ title: string, cards: Flashcard[] }> => {
    // Only 10 cards to save tokens
    const schema = { type: 'OBJECT', properties: { title: { type: 'STRING' }, flashcards: { type: 'ARRAY', items: { type: 'OBJECT', properties: { front: { type: 'STRING' }, back: { type: 'STRING' } }, required: ["front", "back"] } } }, required: ["title", "flashcards"] };
    try { 
        const fileData = { mimeType: 'application/pdf', data: pdfBase64 };
        const json = await callGeminiApiWithSchema(apiKey, "Extract 10 flashcards from PDF.", schema, { useThinking: true, fileData });
        return { title: json.title || "PDF Deck", cards: (json.flashcards||[]).map((fc:any, i:number) => ({ id: `fc_gen_${Date.now()}_${i}`, front: fc.front, back: fc.back })) }; 
    } catch (e: any) { throw new Error("PDF Flashcard Error: " + e.message); }
};

export const checkNoteConnections = async (apiKey: string, currentNote: string, otherNotes: { id: string, title: string, content: string }[]): Promise<{ noteTitle: string, reason: string }[]> => {
    const dbContext = otherNotes.map(n => `- Title: "${n.title}"\n  Snippet: "${n.content.substring(0, 150).replace(/\n/g, ' ')}..."`).join('\n').substring(0, 1000);
    const prompt = `Find connections. JSON: { "suggestions": [{ "noteTitle": str, "reason": str }] }\nNote: "${currentNote.substring(0, 500)}"\nDB:\n${dbContext}`;
    const schema = { type: 'OBJECT', properties: { suggestions: { type: 'ARRAY', items: { type: 'OBJECT', properties: { noteTitle: { type: 'STRING' }, reason: { type: 'STRING' } }, required: ["noteTitle", "reason"] } } }, required: ["suggestions"] };
    try { 
        const json = await callGeminiApiWithSchema(apiKey, prompt, schema, { useThinking: true });
        return json.suggestions || []; 
    } catch (e) { return []; }
};
