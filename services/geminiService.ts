
import { GoogleGenAI, Type, Schema } from "@google/genai";
import type { QuizQuestion, LearningNode, Flashcard, ExamQuestion, PlacementTestQuestion, GeneratedModule, RiddleData } from '../types';

const getGeminiClient = (apiKey: string) => {
    return new GoogleGenAI({ apiKey });
};

// Generic Text Call
export const callGeminiApi = async (
    apiKey: string, 
    prompt: string, 
    systemPrompt: string | null = null, 
    config?: { useThinking?: boolean; fileData?: { mimeType: string, data: string } }
): Promise<string> => {
    const ai = getGeminiClient(apiKey);
    
    let model = 'gemini-3-flash-preview';
    
    if (config?.useThinking) {
        model = 'gemini-3-pro-preview';
    } else if (config?.fileData) {
        if (config.fileData.mimeType.startsWith('image/')) {
            model = 'gemini-2.5-flash-image';
        } else if (config.fileData.mimeType.startsWith('video/') || config.fileData.mimeType.startsWith('audio/')) {
            model = 'gemini-2.5-flash-native-audio-preview-12-2025';
        } else if (config.fileData.mimeType === 'application/pdf') {
            model = 'gemini-2.5-flash';
        }
    }

    const parts: any[] = [{ text: prompt }];
    if (config?.fileData) {
        parts.push({ inlineData: config.fileData });
    }

    const reqConfig: any = {};
    if (systemPrompt) reqConfig.systemInstruction = systemPrompt;
    if (config?.useThinking) reqConfig.thinkingConfig = { thinkingBudget: 32768 };

    try {
        const response = await ai.models.generateContent({
            model,
            contents: { role: 'user', parts },
            config: reqConfig
        });
        return response.text || "";
    } catch (e: any) {
        console.error("Gemini API Error:", e);
        throw new Error(e.message || "Failed to call Gemini API");
    }
};

// Generic JSON Schema Call
export const callGeminiApiWithSchema = async (
    apiKey: string, 
    prompt: string, 
    schema?: Schema,
    config?: { useThinking?: boolean }
): Promise<any> => {
    const ai = getGeminiClient(apiKey);
    let model = 'gemini-3-flash-preview';

    if (config?.useThinking) {
        model = 'gemini-3-pro-preview';
    }

    const reqConfig: any = {
        responseMimeType: 'application/json',
        responseSchema: schema
    };

    if (config?.useThinking) {
        reqConfig.thinkingConfig = { thinkingBudget: 32768 };
    }

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: reqConfig
        });
        const text = response.text || "{}";
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (e: any) {
        console.error("Gemini Schema API Error:", e);
        throw new Error(e.message || "Failed to generate structured data");
    }
};

// ... [Keep other functions unchanged: generateJesterExplanation, transformNoteToLesson, convertContentToFlashcards, generateLegacyArchiveContent, generateQuickLessonQuiz, generateQuizFromPrompt, detectSchedulingIntent, transcribeAudio, summarizeTeacherNote, evaluateExplanation, generateImageWithGemini, convertContentToQuiz, simplifyContent, generateLearningPathWithGemini, generatePlacementTest, regenerateSingleNode] ...

// 17. generateNodeFlashcards (UPDATED: 30 Cards)
export const generateNodeFlashcards = async (apiKey: string, nodeTitle: string, nodeDesc: string): Promise<Flashcard[]> => {
    const prompt = `Generate exactly 30 flashcards for learning node: ${nodeTitle} - ${nodeDesc}.
    Ensure definitions are clear, concise, and educational.
    Return JSON: { "flashcards": [{ "front": string, "back": string }] }`;
    
    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            flashcards: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        front: { type: Type.STRING },
                        back: { type: Type.STRING }
                    },
                    required: ["front", "back"]
                }
            }
        }
    };

    const res = await callGeminiApiWithSchema(apiKey, prompt, schema);
    return res.flashcards?.map((c: any, i: number) => ({...c, id: `fc_${Date.now()}_${i}`})) || [];
};

// 18. generateNodeExam (UPDATED: Support arrange_words & strict MCQ index)
export const generateNodeExam = async (apiKey: string, nodeTitle: string): Promise<ExamQuestion[]> => {
    const prompt = `Generate exactly 20 exam questions for: ${nodeTitle}.
    
    Include these types:
    1. 'mcq': Multiple Choice. 'correctAnswer' MUST be the index string (e.g. "0", "1", "2", "3").
    2. 'arrange_words': Scrambled sentence. 'question' is "Arrange the words". 'options' contains the shuffled words. 'correctAnswer' is the full correct sentence string.
    3. 'fill_gap': Sentence with a blank. 'options' contains the word choices. 'correctAnswer' is the correct word string.

    Return JSON: { "questions": [{ "id": string, "type": "mcq"|"arrange_words"|"fill_gap", "question": string, "options": [string], "correctAnswer": string, "explanation": string }] }`;
    
    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            questions: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        type: { type: Type.STRING, enum: ["mcq", "arrange_words", "fill_gap"] },
                        question: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
                        correctAnswer: { type: Type.STRING },
                        explanation: { type: Type.STRING }
                    },
                    required: ["question", "correctAnswer", "type"]
                }
            }
        }
    };

    // Use Thinking Mode for exams to ensure higher quality questions and distractors
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema, { useThinking: true });
    return res.questions || [];
};

// ... [Keep rest of file unchanged] ...
export const generateJesterExplanation = async (apiKey: string, questionText: string, correctAnswerText: string): Promise<string> => {
    const prompt = `Explain like I'm 5 (witty/funny): Question: "${questionText}", Correct: "${correctAnswerText}". Language: Vietnamese.`;
    return callGeminiApi(apiKey, prompt, null, { useThinking: true });
};
export const transformNoteToLesson = async (apiKey: string, noteTitle: string, noteContent: string): Promise<string> => {
    const prompt = `Transform to structured lesson (Markdown): Title: ${noteTitle}, Content: ${noteContent}`;
    return callGeminiApi(apiKey, prompt, "Curriculum Designer", { useThinking: true });
};
export const convertContentToFlashcards = async (apiKey: string, content: string, options?: { useThinking?: boolean }): Promise<Flashcard[]> => {
    const prompt = `Extract flashcards from: "${content.substring(0, 5000)}". JSON: { "flashcards": [{ "front": "Term", "back": "Def" }] }`;
    const schema: Schema = { type: Type.OBJECT, properties: { flashcards: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { front: { type: Type.STRING }, back: { type: Type.STRING } }, required: ["front", "back"] } } } };
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema, { useThinking: options?.useThinking });
    return res.flashcards || [];
};
export const generateLegacyArchiveContent = async (apiKey: string, data: any, type: 'course'|'squadron', name: string): Promise<string> => {
    const prompt = `Create nostalgic Legacy Archive for ${type} "${name}". Data: ${JSON.stringify(data).substring(0, 10000)}`;
    return callGeminiApi(apiKey, prompt, "AI Historian", { useThinking: true });
};
export const generateQuickLessonQuiz = async (apiKey: string, title: string, context: string): Promise<QuizQuestion[]> => {
    const prompt = `Generate 3 MCQ for: ${title}. Context: ${context.substring(0, 2000)}. JSON: { "questions": [{ "text": "?", "options": ["A"], "correctAnswer": 0 }] }`;
    const schema: Schema = { type: Type.OBJECT, properties: { questions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } }, correctAnswer: { type: Type.INTEGER } }, required: ["text", "options", "correctAnswer"] } } } };
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema);
    return res.questions?.map((q: any, i: number) => ({...q, id: `q_${Date.now()}_${i}`})) || [];
};
export const generateQuizFromPrompt = async (apiKey: string, userPrompt: string): Promise<QuizQuestion[]> => {
    const prompt = `${userPrompt}. JSON: { "questions": [{ "text": "?", "options": ["A"], "correctAnswer": 0 }] }`;
    const schema: Schema = { type: Type.OBJECT, properties: { questions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } }, correctAnswer: { type: Type.INTEGER } }, required: ["text", "options", "correctAnswer"] } } } };
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema);
    return res.questions?.map((q: any, i: number) => ({...q, id: `q_gen_${Date.now()}_${i}`})) || [];
};
export const detectSchedulingIntent = async (apiKey: string, message: string, currentTime: string): Promise<{ detected: boolean, title?: string, isoTime?: string }> => {
    const prompt = `Analyze scheduling: "${message}". Time: ${currentTime}. JSON: { "detected": bool, "title": str, "isoTime": str }`;
    const schema: Schema = { type: Type.OBJECT, properties: { detected: { type: Type.BOOLEAN }, title: { type: Type.STRING, nullable: true }, isoTime: { type: Type.STRING, nullable: true } } };
    return callGeminiApiWithSchema(apiKey, prompt, schema);
};
export const transcribeAudio = async (apiKey: string, base64Audio: string): Promise<string> => {
    const ai = getGeminiClient(apiKey);
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash-native-audio-preview-12-2025', contents: { parts: [{ inlineData: { mimeType: 'audio/mp3', data: base64Audio } }, { text: "Transcribe to text." }] } });
    return response.text || "";
};
export const summarizeTeacherNote = async (apiKey: string, text: string): Promise<string> => {
    return callGeminiApi(apiKey, `Summarize: ${text}`, null, { useThinking: true });
};
export const evaluateExplanation = async (apiKey: string, problem: string, explanation: string): Promise<{ isHelpful: boolean, reason: string }> => {
    const prompt = `Evaluate explanation for "${problem}". Expl: "${explanation}". JSON: { "isHelpful": bool, "reason": str }`;
    const schema: Schema = { type: Type.OBJECT, properties: { isHelpful: { type: Type.BOOLEAN }, reason: { type: Type.STRING } } };
    return callGeminiApiWithSchema(apiKey, prompt, schema);
};
export const generateImageWithGemini = async (apiKey: string, prompt: string, aspectRatio: "1:1" | "16:9" | "9:16"): Promise<string> => {
    const ai = getGeminiClient(apiKey);
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts: [{ text: prompt }] }, config: { imageConfig: { aspectRatio } } });
    for (const part of response.candidates?.[0]?.content?.parts || []) { if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; }
    throw new Error("No image generated.");
};
export const convertContentToQuiz = async (apiKey: string, content: string): Promise<QuizQuestion[]> => {
    return generateQuickLessonQuiz(apiKey, "Derived Quiz", content);
};
export const simplifyContent = async (apiKey: string, content: string): Promise<string> => {
    return callGeminiApi(apiKey, `Explain like I'm 5: ${content.substring(0, 5000)}`, null, { useThinking: true });
};
export const generateLearningPathWithGemini = async (apiKey: string, topicOrContent: string, isContent: boolean, context: any): Promise<LearningNode[]> => {
    const prompt = `Generate learning path for: ${topicOrContent.substring(0, 1000)}. Level ${context.level}. JSON: { "nodes": [{ "title": str, "description": str, "type": "theory"|"practice"|"challenge" }] }`;
    const schema: Schema = { type: Type.OBJECT, properties: { nodes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, type: { type: Type.STRING, enum: ["theory", "practice", "challenge"] } }, required: ["title", "description", "type"] } } } };
    
    // Use Thinking for better curriculum design
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema, { useThinking: true });
    return res.nodes?.map((n: any, i: number) => ({ ...n, id: `node_${Date.now()}_${i}`, isLocked: i > 0, isCompleted: false, flashcardsMastered: 0 })) || [];
};
export const generatePlacementTest = async (apiKey: string, topic: string): Promise<PlacementTestQuestion[]> => {
    const prompt = `Generate 5 placement questions for: ${topic}. JSON: { "questions": [{ "question": str, "options": [str], "correctAnswer": int }] }`;
    const schema: Schema = { type: Type.OBJECT, properties: { questions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } }, correctAnswer: { type: Type.INTEGER } }, required: ["question", "options", "correctAnswer"] } } } };
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema);
    return res.questions?.map((q: any, i: number) => ({...q, id: `pt_${i}`})) || [];
};
export const regenerateSingleNode = async (apiKey: string, pathTopic: string, oldNode: LearningNode, context: string): Promise<LearningNode> => {
    const prompt = `Regenerate node for "${pathTopic}". Old: ${JSON.stringify(oldNode)}. Context: ${context}. JSON: { "title": str, "description": str, "type": "theory"|"practice"|"challenge" }`;
    const schema: Schema = { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, type: { type: Type.STRING, enum: ["theory", "practice", "challenge"] } } };
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema);
    return { ...oldNode, ...res };
};
export const generateAdvancedPath = async (apiKey: string, baseTopic: string, lastNodeTitle: string): Promise<LearningNode[]> => {
    const prompt = `Create advanced extension for "${baseTopic}" after "${lastNodeTitle}". JSON: { "nodes": [{ "title": str, "description": str, "type": "theory"|"practice"|"challenge" }] }`;
    const schema: Schema = { type: Type.OBJECT, properties: { nodes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, type: { type: Type.STRING, enum: ["theory", "practice", "challenge"] } }, required: ["title", "description", "type"] } } } };
    
    // Use Thinking for advanced path design
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema, { useThinking: true });
    return res.nodes?.map((n: any, i: number) => ({ ...n, id: `adv_node_${Date.now()}_${i}`, isLocked: true, isCompleted: false, flashcardsMastered: 0 })) || [];
};
export const enhanceNoteWithGemini = async (apiKey: string, content: string, action: 'summarize' | 'expand' | 'fix' | 'quiz' | 'harvest'): Promise<string> => {
    return callGeminiApi(apiKey, `${action}: ${content}`, null, { useThinking: true });
};
export const generateCourseSyllabus = async (apiKey: string, topic: string, audience: string): Promise<GeneratedModule[]> => {
    const prompt = `Syllabus for "${topic}" for "${audience}". JSON: { "modules": [{ "title": str, "items": [{ "title": str, "type": "lesson_video"|"lesson_text"|"assignment_quiz"|"assignment_file", "contentOrDescription": str }] }] }`;
    const schema: Schema = { type: Type.OBJECT, properties: { modules: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, items: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, type: { type: Type.STRING }, contentOrDescription: { type: Type.STRING } }, required: ["title", "type", "contentOrDescription"] } } }, required: ["title", "items"] } } } };
    
    // Use Thinking for syllabus design
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema, { useThinking: true });
    return res.modules || [];
};
export const generateGatekeeperTest = async (apiKey: string, pathTopic: string, nodesTitle: string[]): Promise<ExamQuestion[]> => {
    const prompt = `Gatekeeper test for "${pathTopic}". Covered: ${nodesTitle.join(', ')}. 5 Qs. JSON: { "questions": [{ "id": str, "type": "mcq", "question": str, "options": [str], "correctAnswer": str }] }`;
    const schema: Schema = { type: Type.OBJECT, properties: { questions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, type: { type: Type.STRING }, question: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true }, correctAnswer: { type: Type.STRING } }, required: ["question", "correctAnswer", "type"] } } } };
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema);
    return res.questions || [];
};
export const generateSpeedRunQuestions = async (apiKey: string, topic: string, subtopics: string[]): Promise<ExamQuestion[]> => {
    const prompt = `10 speed run MCQ for "${topic}". JSON: { "questions": [{ "id": str, "type": "mcq", "question": str, "options": [str], "correctAnswer": str }] }`;
    const schema: Schema = { type: Type.OBJECT, properties: { questions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, type: { type: Type.STRING, enum: ["mcq"] }, question: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } }, correctAnswer: { type: Type.STRING } }, required: ["question", "correctAnswer", "options"] } } } };
    const res = await callGeminiApiWithSchema(apiKey, prompt, schema);
    return res.questions || [];
};
export const generateTreasureRiddle = async (apiKey: string, topic: string): Promise<RiddleData> => {
    const prompt = `Riddle about "${topic}". JSON: { "question": str, "answer": str, "hint": str }`;
    const schema: Schema = { type: Type.OBJECT, properties: { question: { type: Type.STRING }, answer: { type: Type.STRING }, hint: { type: Type.STRING } }, required: ["question", "answer", "hint"] };
    return callGeminiApiWithSchema(apiKey, prompt, schema);
};
export const refineTextWithOracle = async (apiKey: string, text: string): Promise<string> => {
    return callGeminiApi(apiKey, `Refine academically: "${text}"`, null, { useThinking: true });
};
export const generateFlashcardsFromPdf = async (apiKey: string, pdfBase64: string): Promise<{ title: string, cards: Flashcard[] }> => {
    const ai = getGeminiClient(apiKey);
    const schema: Schema = { type: Type.OBJECT, properties: { title: { type: Type.STRING }, flashcards: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { front: { type: Type.STRING }, back: { type: Type.STRING } }, required: ["front", "back"] } } }, required: ["title", "flashcards"] };
    try { const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: { role: 'user', parts: [{ text: "Extract 20 flashcards from PDF." }, { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } }] }, config: { responseMimeType: 'application/json', responseSchema: schema, thinkingConfig: { thinkingBudget: 32768 } } }); const json = JSON.parse(response.text!.replace(/```json|```/g, '').trim()); return { title: json.title || "PDF Deck", cards: (json.flashcards||[]).map((fc:any, i:number) => ({ id: `fc_gen_${Date.now()}_${i}`, front: fc.front, back: fc.back })) }; } catch (e: any) { throw new Error("PDF Flashcard Error: " + e.message); }
};
export const checkNoteConnections = async (apiKey: string, currentNote: string, otherNotes: { id: string, title: string, content: string }[]): Promise<{ noteTitle: string, reason: string }[]> => {
    const dbContext = otherNotes.map(n => `- Title: "${n.title}"\n  Snippet: "${n.content.substring(0, 300).replace(/\n/g, ' ')}..."`).join('\n');
    const prompt = `Find connections between note and database. JSON: { "suggestions": [{ "noteTitle": str, "reason": str }] }\nNote: "${currentNote}"\nDB:\n${dbContext}`;
    try { const responseText = await callGeminiApi(apiKey, prompt, null, { useThinking: true }); return JSON.parse(responseText.replace(/```json|```/g, '').trim()).suggestions || []; } catch (e) { return []; }
};
