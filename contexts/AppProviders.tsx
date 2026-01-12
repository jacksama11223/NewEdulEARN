import React, { useState, useEffect, useContext, createContext, useMemo, useCallback, useRef, ReactNode } from 'react';
import { MOCK_DATA } from '../data/mockData.ts';
import { Database, User, ServiceStatus, MockTestResultStatus, FeatureFlag, Flashcard, LearningNode, QuizQuestion, GeneratedModule, PersonalNote, SpaceJunk, ShopItem, FlashcardDeck, Task, Notification, Announcement, StudyGroup, GroupChatMessage, LearningPath, Course, ChatMessage, Assignment, Quiz, QuizSubmission, CourseStructure, Lesson } from '../types.ts';
import { convertContentToFlashcards, generateLegacyArchiveContent } from '../services/geminiService.ts';

// SỬ DỤNG BIẾN MÔI TRƯỜNG CHO URL BACKEND
// Khi chạy local, nó sẽ fallback về localhost:5000
// Khi deploy, bạn cần set biến VITE_BACKEND_URL trong cấu hình deployment
const BASE_URL = (import.meta as any).env.VITE_BACKEND_URL || 'http://localhost:5000';
const BACKEND_URL = `${BASE_URL}/api`;

// --- CONTEXT DEFINITIONS ---
// (Giữ nguyên các interface Context vì chúng không đổi)

export interface AuthContextType {
    user: User | null;
    isLocked: boolean;
    login: (u: string, p: string) => Promise<void>;
    logout: () => void;
    error: string | null;
}

export interface DataContextType {
    db: Database;
    setApiKey: (userId: string, key: string) => void;
    markLessonComplete: (userId: string, lessonId: string) => void;
    submitFileAssignment: (assignmentId: string, studentId: string, fileName: string) => void;
    gradeFileSubmission: (assignmentId: string, studentId: string, grade: number, feedback: string) => void;
    submitQuiz: (quizId: string, userId: string, answers: Record<string, number>) => void;
    updateQuizQuestions: (quizId: string, questions: QuizQuestion[]) => void;
    addDiscussionPost: (lessonId: string, user: User, text: string) => void;
    addVideoNote: (lessonId: string, userId: string, timestamp: number, text: string) => void;
    deleteVideoNote: (lessonId: string, noteId: string) => void;
    runMockTest: (type: 'unit' | 'integration' | 'e2e') => void;
    toggleUserLock: (userId: string) => void;
    sendAnnouncement: (text: string) => void;
    unlockAllUsers: () => void;
    registerUser: (u: string, p: string, name: string, role: any) => Promise<void>;
    completeOnboarding: (userId: string) => void;
    dismissAnnouncement: (id: string) => void;
    markNotificationRead: (userId: string, notifId: string) => void;
    
    // Gamification & Shop
    buyShopItem: (itemId: string) => void;
    equipShopItem: (itemId: string) => void;
    equipPet: (itemId: string) => void;
    checkDailyDiamondReward: () => boolean;
    unlockSecretReward: (userId: string, type: 'skin'|'diamond', value: string|number) => void;
    collectSpaceJunk: (junk: SpaceJunk) => void;
    recycleSpaceJunk: (junkId: string) => void;
    awardXP: (amount: number) => void;
    restoreStreak: () => void;
    recordSpeedRunResult: (userId: string, score: number) => void;

    // Chat & Social
    sendChatMessage: (fromId: string, toId: string, text: string, challenge?: any, intel?: any, trade?: any, gradeDispute?: any, reward?: any, squadronInvite?: any) => void;
    sendGroupMessage: (groupId: string, user: User, text: string, metadata?: { isSOS?: boolean, isWhisper?: boolean }) => void;
    joinGroup: (groupId: string, userId: string, inviteMsgId?: string) => void;
    createGroup: (name: string, creatorId: string) => void;
    createRaidParty: (name: string, creatorId: string, memberIds: string[], bossName: string) => void;
    resolveSOS: (groupId: string, msgId: string, rescuerId: string) => void;
    processTrade: (msgId: string, buyerId: string) => void;
    sendReward: (teacherId: string, studentId: string, type: 'diamond' | 'item', value: number | string, message: string) => void;

    // Study & Learning
    createFlashcardDeck: (title: string, cards: Flashcard[]) => void;
    addFlashcardToDeck: (deckId: string, cards: Flashcard[]) => void;
    updateFlashcardInDeck: (deckId: string, card: Flashcard) => void;
    createStandaloneQuiz: (title: string, questions: QuizQuestion[]) => void;
    updateScratchpad: (userId: string, content: string) => void;
    
    // Notebook
    createPersonalNote: (userId: string, title: string, content: string, links?: any) => void;
    updatePersonalNote: (noteId: string, updates: Partial<PersonalNote>) => void;
    deletePersonalNote: (noteId: string) => void;
    saveNodeNote: (userId: string, pathId: string, nodeId: string, content: string) => void;
    savePdfToNote: (noteId: string, file: File) => Promise<void>;
    getPdfForNote: (fileId: string) => Promise<File | null>;
    removePdfFromNote: (noteId: string) => void;
    shareNoteToSquadron: (noteId: string, groupId: string) => void;
    unshareNote: (noteId: string) => void;
    unlockSharedNote: (noteId: string, userId: string) => void;
    addNoteComment: (noteId: string, userId: string, content: string, highlightedText?: string) => void;

    // Learning Path
    createLearningPath: (userId: string, title: string, topic: string, nodes: LearningNode[], meta: any, wagerAmount?: number) => Promise<string>;
    assignLearningPath: (teacherName: string, studentIds: string[], pathData: any) => Promise<void>; // Updated signature
    updateNodeProgress: (pathId: string, nodeId: string, data: Partial<LearningNode>) => void;
    unlockNextNode: (pathId: string, nodeId: string) => void;
    extendLearningPath: (pathId: string, newNodes: LearningNode[]) => void;
    skipLearningPath: (userId: string, pathId: string) => void;

    // Tasks
    addTask: (userId: string, text: string) => void;
    toggleTaskCompletion: (taskId: string, isCompleted: boolean) => void; // NEW
    deleteTask: (taskId: string) => void;
    archiveCompletedTasks: (userId: string) => void;

    // Admin & Teacher
    createFileAssignment: (title: string, courseId: string) => void;
    createQuizAssignment: (title: string, courseId: string, questions: QuizQuestion[]) => void;
    createBossChallenge: (courseId: string, title: string, description: string, xp: number) => void;
    sendIntervention: (assignmentId: string, questionId: string, note: string, studentIds: string[]) => void;
    adminCreateCourse: (name: string, teacherName: string, modules: GeneratedModule[], defaultPersona?: string, autoSeedApiKey?: string, isBeta?: boolean) => Promise<void>;
    generateArchive: (apiKey: string, type: 'course'|'squadron', id: string, name: string) => Promise<string>;
    addCommunityQuestion: (userId: string, nodeId: string, question: QuizQuestion) => void;
    addLessonToCourse: (courseId: string, title: string, content: string) => void;
    editLessonContent: (lessonId: string, newContent: string) => void; // ADDED
    updateCourseSettings: (courseId: string, settings: Partial<Course>) => void;
    fetchUserData: (userId: string) => Promise<void>;
}

export interface GlobalStateContextType {
    serviceStatus: ServiceStatus;
    toggleServiceStatus: (service: string) => void;
    featureFlags: Record<string, FeatureFlag>;
    setFeatureFlag: (key: string, status: any, specificUsers?: string) => void;
    pomodoro: { isActive: boolean; seconds: number; mode: 'focus' | 'break' };
    setPomodoro: React.Dispatch<React.SetStateAction<{ isActive: boolean; seconds: number; mode: 'focus' | 'break' }>>;
    deepWorkMode: boolean;
    setDeepWorkMode: (enabled: boolean) => void;
    page: string;
    setPage: (page: string, params?: any) => void;
    pageParams: any;
    shopIntent: { isOpen: boolean; targetItemId?: string };
    setShopIntent: (intent: { isOpen: boolean; targetItemId?: string }) => void;
}

export interface PageContextType {
    page: string;
    navigate: (page: string, params?: any) => void;
    params: any;
}

export interface MusicContextType {
    currentTrack: { name: string, url: string, tempo?: 'slow' | 'medium' | 'fast' } | null;
    isPlaying: boolean;
    playTrack: (track: { name: string, url: string, tempo?: 'slow' | 'medium' | 'fast' }) => void;
    togglePlay: () => void;
}

export interface PetContextType {
    currentReaction: string;
    triggerReaction: (reaction: string) => void;
    petDialogue: string | null;
    say: (text: string, duration?: number) => void;
    petPosition: React.CSSProperties | null;
    setPetPosition: (pos: React.CSSProperties | null) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);
export const DataContext = createContext<DataContextType | null>(null);
export const GlobalStateContext = createContext<GlobalStateContextType | null>(null);
export const PageContext = createContext<PageContextType | null>(null);
export const MusicContext = createContext<MusicContextType | null>(null);
export const PetContext = createContext<PetContextType | null>(null);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [db, setDb] = useState<Database>(MOCK_DATA);
    const [pdfStorage, setPdfStorage] = useState<Record<string, File>>({});

    // --- GLOBAL DATA FETCHING (Assignments, Quizzes, COURSES, LESSONS) ---
    // Fetch global content that doesn't depend on user login
    const fetchGlobalData = useCallback(async () => {
        try {
            console.log("Fetching global data from:", BACKEND_URL);
            
            // 1. Fetch Courses (contains structure)
            const coursesRes = await fetch(`${BACKEND_URL}/courses`);
            const coursesData: any[] = await coursesRes.json();
            
            const coursesList: Course[] = [];
            const courseStructure: Record<string, CourseStructure> = {};

            coursesData.forEach(c => {
                // Split backend model into frontend separate states
                coursesList.push({
                    id: c.id,
                    name: c.name,
                    teacher: c.teacher,
                    defaultPersona: c.defaultPersona
                });
                courseStructure[c.id] = { modules: c.modules || [] };
            });

            // 2. Fetch Lessons (Content)
            const lessonsRes = await fetch(`${BACKEND_URL}/lessons`);
            const lessonsData: Lesson[] = await lessonsRes.json();
            const lessonsMap: Record<string, Lesson> = {};
            lessonsData.forEach(l => { lessonsMap[l.id] = l; });

            // 3. Fetch Assignments
            const assignRes = await fetch(`${BACKEND_URL}/assignments`);
            const assignments: Assignment[] = await assignRes.json();
            const assignMap: Record<string, Assignment> = {};
            assignments.forEach(a => { assignMap[a.id] = a; });

            // 4. Fetch Quizzes
            const quizzesRes = await fetch(`${BACKEND_URL}/quizzes`);
            const quizzes: Quiz[] = await quizzesRes.json();
            const quizMap: Record<string, Quiz> = {};
            quizzes.forEach(q => { quizMap[q.id] = q; });

            // 5. Fetch Quiz Submissions
            const subRes = await fetch(`${BACKEND_URL}/quiz-submissions`);
            const submissions: QuizSubmission[] = await subRes.json();
            const subMap: Record<string, Record<string, QuizSubmission>> = {};
            // Group by QuizId then StudentId
            submissions.forEach((s: any) => {
                if (!subMap[s.quizId]) subMap[s.quizId] = {};
                subMap[s.quizId][s.studentId] = s;
            });

            // 6. FETCH ALL USERS (FOR CONTACTS & STATUS)
            // This is important to get the current isOnline status of everyone
            const usersRes = await fetch(`${BACKEND_URL}/users`);
            const usersData: any[] = await usersRes.json();
            const usersMap: Record<string, User> = {};
            usersData.forEach(u => {
                usersMap[u.id] = {
                    id: u.id,
                    name: u.name,
                    role: u.role,
                    isLocked: u.isLocked,
                    apiKey: null, // Don't expose keys broadly
                    squadronId: u.squadronId,
                    hasSeenOnboarding: u.hasSeenOnboarding,
                    // Inject dynamic online status from backend (calculated by virtual)
                    isOnline: u.isOnline 
                } as User;
            });

            setDb(prev => ({
                ...prev,
                COURSES: [...prev.COURSES, ...coursesList.filter(nc => !prev.COURSES.some(ec => ec.id === nc.id))], // Merge without dupes
                COURSE_STRUCTURE: { ...prev.COURSE_STRUCTURE, ...courseStructure },
                LESSONS: { ...prev.LESSONS, ...lessonsMap },
                ASSIGNMENTS: { ...prev.ASSIGNMENTS, ...assignMap },
                QUIZZES: { ...prev.QUIZZES, ...quizMap },
                QUIZ_SUBMISSIONS: { ...prev.QUIZ_SUBMISSIONS, ...subMap },
                USERS: { ...prev.USERS, ...usersMap } // Merge users to update status
            }));
        } catch (e) {
            console.error("Failed to fetch global data:", e);
        }
    }, []);

    // Trigger global fetch on mount
    useEffect(() => {
        fetchGlobalData();
    }, [fetchGlobalData]);

    // --- REFRESH USER STATUS LOOP ---
    // Polling mechanism to keep "isOnline" statuses updated for contacts
    useEffect(() => {
        const interval = setInterval(() => {
            fetch(`${BACKEND_URL}/users`)
                .then(res => res.json())
                .then((usersData: any[]) => {
                    const usersMap: Record<string, User> = {};
                    usersData.forEach(u => {
                        usersMap[u.id] = {
                            id: u.id,
                            name: u.name,
                            role: u.role,
                            isLocked: u.isLocked,
                            apiKey: null,
                            squadronId: u.squadronId,
                            hasSeenOnboarding: u.hasSeenOnboarding,
                            isOnline: u.isOnline
                        } as User;
                    });
                    setDb(prev => ({ ...prev, USERS: { ...prev.USERS, ...usersMap } }));
                })
                .catch(e => console.error("Status sync error:", e));
        }, 30000); // Check every 30s

        return () => clearInterval(interval);
    }, []);

    // --- SYNC WITH BACKEND (OPTIMIZED: PARALLEL FETCHING) ---
    const fetchUserData = useCallback(async (userId: string) => {
        try {
            console.log("Fetching user data for:", userId);
            
            // Execute all fetches in parallel
            const [notesRes, tasksRes, chatRes, groupsRes, groupChatRes, pathsRes] = await Promise.all([
                fetch(`${BACKEND_URL}/notes/${userId}`),
                fetch(`${BACKEND_URL}/tasks/${userId}`),
                fetch(`${BACKEND_URL}/chat/history/${userId}`),
                fetch(`${BACKEND_URL}/groups`),
                fetch(`${BACKEND_URL}/group-chat/all`),
                fetch(`${BACKEND_URL}/paths/${userId}`)
            ]);

            const [notes, tasks, chatMessages, groups, groupMessages, paths] = await Promise.all([
                notesRes.json(),
                tasksRes.json(),
                chatRes.json(),
                groupsRes.json(),
                groupChatRes.json(),
                pathsRes.json()
            ]);

            // Process Notes
            const notesMap: Record<string, PersonalNote> = {};
            (notes as any[]).forEach(n => { notesMap[n._id || n.id] = { ...n, id: n._id || n.id }; });

            // Process Tasks
            const tasksMap: Record<string, Task> = {};
            (tasks as any[]).forEach(t => { tasksMap[t._id || t.id] = { ...t, id: t._id || t.id }; });

            // Process Chat
            const chatMap: Record<string, ChatMessage[]> = {};
            (chatMessages as ChatMessage[]).forEach(msg => {
                const key = [msg.from, msg.to || ''].sort().join('_');
                if (!chatMap[key]) chatMap[key] = [];
                const formattedMsg = { ...msg, id: (msg as any)._id || msg.id };
                chatMap[key].push(formattedMsg);
            });

            // Process Groups
            const formattedGroups = (groups as any[]).map((g: any) => ({ ...g, id: g.id || g._id }));

            // Process Group Messages
            const groupChatMap: Record<string, GroupChatMessage[]> = {};
            (groupMessages as any[]).forEach(msg => {
                if (!groupChatMap[msg.groupId]) groupChatMap[msg.groupId] = [];
                groupChatMap[msg.groupId].push({ ...msg, id: msg.id || msg._id });
            });

            // Process Learning Paths
            const pathsMap: Record<string, LearningPath> = {};
            (paths as LearningPath[]).forEach((p: any) => { 
                pathsMap[p.id] = { ...p, id: p.id || p._id }; 
            });

            setDb(prev => ({
                ...prev,
                PERSONAL_NOTES: notesMap,
                TASKS: tasksMap,
                CHAT_MESSAGES: { ...prev.CHAT_MESSAGES, ...chatMap },
                STUDY_GROUPS: formattedGroups,
                GROUP_CHAT_MESSAGES: groupChatMap,
                LEARNING_PATHS: pathsMap
            }));
        } catch (e) {
            console.error("Failed to fetch user data from server:", e);
        }
    }, []);

    const setApiKey = (userId: string, key: string) => {
        setDb(prev => ({
            ...prev,
            USERS: { ...prev.USERS, [userId]: { ...prev.USERS[userId], apiKey: key } }
        }));
    };

    const markLessonComplete = (userId: string, lessonId: string) => {
        setDb(prev => {
            const current = prev.LESSON_PROGRESS[userId] || [];
            if (!current.includes(lessonId)) {
                return {
                    ...prev,
                    LESSON_PROGRESS: { ...prev.LESSON_PROGRESS, [userId]: [...current, lessonId] }
                };
            }
            return prev;
        });
    };

    const submitFileAssignment = (assignmentId: string, studentId: string, fileName: string) => {
        setDb(prev => {
            const subs = prev.FILE_SUBMISSIONS[assignmentId] || [];
            const idx = subs.findIndex(s => s.studentId === studentId);
            const newSub = {
                id: `sub_${studentId}_${assignmentId}`,
                studentId,
                studentName: prev.USERS[studentId]?.name || studentId,
                status: 'Đã nộp' as const,
                grade: null,
                feedback: null,
                fileName,
                timestamp: new Date().toISOString()
            };
            let newSubs = [...subs];
            if (idx >= 0) newSubs[idx] = newSub; else newSubs.push(newSub);
            return { ...prev, FILE_SUBMISSIONS: { ...prev.FILE_SUBMISSIONS, [assignmentId]: newSubs } };
        });
    };

    const gradeFileSubmission = (assignmentId: string, studentId: string, grade: number, feedback: string) => {
        setDb(prev => {
            const subs = prev.FILE_SUBMISSIONS[assignmentId] || [];
            const newSubs = subs.map(s => s.studentId === studentId ? { ...s, grade, feedback } : s);
            return { ...prev, FILE_SUBMISSIONS: { ...prev.FILE_SUBMISSIONS, [assignmentId]: newSubs } };
        });
    };

    // --- QUIZ SUBMISSION WITH PERSISTENCE ---
    const submitQuiz = async (quizId: string, userId: string, answers: Record<string, number>) => {
        const quiz = db.QUIZZES[quizId];
        let score = 0;
        if (quiz) {
            quiz.questions.forEach(q => { if (answers[q.id] === q.correctAnswer) score++; });
        }
        const total = quiz?.questions.length || 0;
        const percentage = total > 0 ? (score/total)*100 : 0;
        
        const submissionPayload = {
            quizId,
            studentId: userId,
            score,
            total,
            percentage,
            answers,
            timestamp: new Date().toISOString()
        };

        // Optimistic Update
        setDb(prev => ({
            ...prev,
            QUIZ_SUBMISSIONS: { ...prev.QUIZ_SUBMISSIONS, [quizId]: { ...prev.QUIZ_SUBMISSIONS[quizId], [userId]: submissionPayload } }
        }));

        // Persist
        try {
            await fetch(`${BACKEND_URL}/quiz-submissions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionPayload)
            });
        } catch (e) {
            console.error("Failed to persist quiz submission", e);
        }
    };

    // --- QUIZ UPDATE WITH PERSISTENCE ---
    const updateQuizQuestions = async (quizId: string, questions: QuizQuestion[]) => {
        // Optimistic Update
        setDb(prev => ({ ...prev, QUIZZES: { ...prev.QUIZZES, [quizId]: { ...prev.QUIZZES[quizId], questions } } }));
        
        // Persist
        try {
            await fetch(`${BACKEND_URL}/quizzes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: quizId, title: db.QUIZZES[quizId]?.title, questions })
            });
        } catch (e) {
            console.error("Failed to update quiz questions", e);
        }
    };

    const addDiscussionPost = (lessonId: string, user: User, text: string) => {
        setDb(prev => {
            const posts = prev.DISCUSSION[lessonId] || [];
            const newPost = { id: `d_${Date.now()}`, user: `${user.name} (${user.id})`, text, timestamp: new Date() };
            return { ...prev, DISCUSSION: { ...prev.DISCUSSION, [lessonId]: [...posts, newPost] } };
        });
    };
    const addVideoNote = (lessonId: string, userId: string, timestamp: number, text: string) => {
        setDb(prev => {
            const notes = prev.VIDEO_NOTES[lessonId] || [];
            const newNote = { id: `vn_${Date.now()}`, userId, lessonId, timestamp, text, createdAt: new Date().toISOString() };
            const newNotes = [...notes, newNote].sort((a, b) => a.timestamp - b.timestamp);
            return { ...prev, VIDEO_NOTES: { ...prev.VIDEO_NOTES, [lessonId]: newNotes } };
        });
    };
    const deleteVideoNote = (lessonId: string, noteId: string) => {
        setDb(prev => ({ ...prev, VIDEO_NOTES: { ...prev.VIDEO_NOTES, [lessonId]: (prev.VIDEO_NOTES[lessonId] || []).filter(n => n.id !== noteId) } }));
    };
    const runMockTest = (type: 'unit' | 'integration' | 'e2e') => {
        setDb(prev => ({ ...prev, MOCK_TEST_RESULTS: { ...prev.MOCK_TEST_RESULTS, [type]: 'RUNNING' } }));
        setTimeout(() => {
            setDb(prev => ({ ...prev, MOCK_TEST_RESULTS: { ...prev.MOCK_TEST_RESULTS, [type]: Math.random() > 0.3 ? 'PASS' : 'FAIL' } }));
        }, 3000);
    };
    const toggleUserLock = (userId: string) => {
        setDb(prev => ({ ...prev, USERS: { ...prev.USERS, [userId]: { ...prev.USERS[userId], isLocked: !prev.USERS[userId].isLocked } } }));
    };
    const sendAnnouncement = (text: string) => {
        setDb(prev => ({ ...prev, ANNOUNCEMENTS: [{ id: `ann_${Date.now()}`, text, timestamp: new Date() }, ...prev.ANNOUNCEMENTS] }));
    };
    const unlockAllUsers = () => {
        setDb(prev => {
            const updatedUsers = { ...prev.USERS };
            Object.keys(updatedUsers).forEach(k => updatedUsers[k].isLocked = false);
            return { ...prev, USERS: updatedUsers };
        });
    };

    const registerUser = async (u: string, p: string, name: string, role: any) => {
        try {
            const response = await fetch(`${BACKEND_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: u, password: p, name, role }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Registration failed");
        } catch (error: any) {
            console.error("Register Error:", error);
            throw error;
        }
    };

    const completeOnboarding = (userId: string) => {
        setDb(prev => ({ ...prev, USERS: { ...prev.USERS, [userId]: { ...prev.USERS[userId], hasSeenOnboarding: true } } }));
    };
    const dismissAnnouncement = (id: string) => {
        setDb(prev => ({ ...prev, ANNOUNCEMENTS: prev.ANNOUNCEMENTS.filter(a => a.id !== id) }));
    };
    const markNotificationRead = (userId: string, notifId: string) => {
        setDb(prev => ({
            ...prev,
            NOTIFICATIONS: { ...prev.NOTIFICATIONS, [userId]: (prev.NOTIFICATIONS[userId] || []).map(n => n.id === notifId ? { ...n, read: true } : n) }
        }));
    };
    const buyShopItem = (itemId: string) => {
        const item = db.SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) throw new Error("Item not found");
        const currency = item.currency === 'diamond' ? 'diamonds' : 'points';
        if (db.GAMIFICATION[currency] < item.cost) throw new Error("Not enough funds");
        setDb(prev => ({
            ...prev,
            GAMIFICATION: { ...prev.GAMIFICATION, [currency]: prev.GAMIFICATION[currency] - item.cost, inventory: [...prev.GAMIFICATION.inventory, itemId] }
        }));
    };
    const equipShopItem = (itemId: string) => {
        setDb(prev => ({ ...prev, GAMIFICATION: { ...prev.GAMIFICATION, equippedSkin: itemId } }));
    };
    const equipPet = (itemId: string) => {
        setDb(prev => ({ ...prev, GAMIFICATION: { ...prev.GAMIFICATION, equippedPet: itemId } }));
    };
    const checkDailyDiamondReward = () => {
        const today = new Date().toDateString();
        if (db.GAMIFICATION.lastStudyDate !== today) {
            setDb(prev => ({ ...prev, GAMIFICATION: { ...prev.GAMIFICATION, diamonds: prev.GAMIFICATION.diamonds + 5, lastStudyDate: today, streakDays: prev.GAMIFICATION.streakDays + 1 } }));
            return true;
        }
        return false;
    };
    const unlockSecretReward = (userId: string, type: 'skin'|'diamond', value: string|number) => {
        setDb(prev => {
            const newState = { ...prev.GAMIFICATION };
            if (type === 'diamond') newState.diamonds += (value as number);
            else newState.inventory = [...newState.inventory, value as string];
            return { ...prev, GAMIFICATION: newState };
        });
    };
    const collectSpaceJunk = (junk: SpaceJunk) => {
        setDb(prev => ({ ...prev, GAMIFICATION: { ...prev.GAMIFICATION, junkInventory: [...prev.GAMIFICATION.junkInventory, junk] } }));
    };
    const recycleSpaceJunk = (junkId: string) => {
        const junk = db.GAMIFICATION.junkInventory.find(j => j.id === junkId);
        if (!junk) return;
        setDb(prev => ({
            ...prev,
            GAMIFICATION: { ...prev.GAMIFICATION, points: prev.GAMIFICATION.points + junk.xpValue, junkInventory: prev.GAMIFICATION.junkInventory.filter(j => j.id !== junkId) }
        }));
    };
    const awardXP = (amount: number) => {
        setDb(prev => ({ ...prev, GAMIFICATION: { ...prev.GAMIFICATION, points: prev.GAMIFICATION.points + amount } }));
    };
    const restoreStreak = () => {
        setDb(prev => ({ ...prev, GAMIFICATION: { ...prev.GAMIFICATION, lastStudyDate: new Date().toDateString() } }));
    };
    const recordSpeedRunResult = (userId: string, score: number) => {
        console.log(`User ${userId} scored ${score} in Speed Run`);
    };
    
    // --- CHAT WITH MONGODB PERSISTENCE ---
    const sendChatMessage = async (fromId: string, toId: string, text: string, challenge?: any, intel?: any, trade?: any, gradeDispute?: any, reward?: any, squadronInvite?: any) => {
        const key = [fromId, toId].sort().join('_');
        const id = `msg_${Date.now()}`;
        const newMsgPayload = { id, from: fromId, to: toId, text, timestamp: new Date(), challenge, intel, trade, gradeDispute, reward, squadronInvite };

        try {
            setDb(prev => {
                const msgs = prev.CHAT_MESSAGES[key] || [];
                return { ...prev, CHAT_MESSAGES: { ...prev.CHAT_MESSAGES, [key]: [...msgs, newMsgPayload] } };
            });

            await fetch(`${BACKEND_URL}/chat/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newMsgPayload)
            });
        } catch (e) {
            console.error("Failed to send chat message:", e);
            alert("Lỗi kết nối! Tin nhắn có thể chưa được lưu.");
        }
    };

    // --- GROUP CHAT WITH MONGODB PERSISTENCE ---
    const sendGroupMessage = async (groupId: string, user: User, text: string, metadata?: { isSOS?: boolean, isWhisper?: boolean }) => {
        const id = `gmsg_${Date.now()}`;
        const newMsgPayload = {
            id,
            groupId,
            user: { id: user.id, name: user.name, role: user.role },
            text,
            isSOS: metadata?.isSOS,
            sosStatus: metadata?.isSOS ? 'PENDING' : undefined,
            isWhisper: metadata?.isWhisper,
            timestamp: new Date()
        };

        try {
            setDb(prev => {
                const msgs = prev.GROUP_CHAT_MESSAGES[groupId] || [];
                return { ...prev, GROUP_CHAT_MESSAGES: { ...prev.GROUP_CHAT_MESSAGES, [groupId]: [...msgs, newMsgPayload] } };
            });

            await fetch(`${BACKEND_URL}/group-chat/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newMsgPayload)
            });
        } catch (e) {
            console.error("Failed to send group message:", e);
        }
    };

    const joinGroup = async (groupId: string, userId: string, inviteMsgId?: string) => {
        try {
            setDb(prev => {
                const groups = prev.STUDY_GROUPS.map(g => g.id === groupId && !g.members.includes(userId) ? { ...g, members: [...g.members, userId] } : g);
                const updatedUsers = { ...prev.USERS, [userId]: { ...prev.USERS[userId], squadronId: groupId } };
                let newChats = prev.CHAT_MESSAGES;
                if (inviteMsgId) {
                    newChats = { ...prev.CHAT_MESSAGES };
                    for (const key in newChats) {
                        newChats[key] = newChats[key].map(m => m.id === inviteMsgId ? { ...m, squadronInvite: { ...m.squadronInvite!, status: 'ACCEPTED' } } : m);
                    }
                }
                return { ...prev, STUDY_GROUPS: groups, USERS: updatedUsers, CHAT_MESSAGES: newChats };
            });

            await fetch(`${BACKEND_URL}/groups/${groupId}/join`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });

        } catch (e) {
            console.error("Failed to join group:", e);
        }
    };

    const createGroup = async (name: string, creatorId: string) => {
        const id = `g_${Date.now()}`;
        const newGroup = { id, name, members: [creatorId] };
        try {
            setDb(prev => ({ 
                ...prev, 
                STUDY_GROUPS: [...prev.STUDY_GROUPS, newGroup],
                USERS: { ...prev.USERS, [creatorId]: { ...prev.USERS[creatorId], squadronId: id } }
            }));

            await fetch(`${BACKEND_URL}/groups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newGroup)
            });
        } catch (e) {
            console.error("Failed to create group:", e);
        }
    };

    const createRaidParty = (name: string, creatorId: string, memberIds: string[], bossName: string) => {
        const groupId = `g_raid_${Date.now()}`;
        createGroup(name, creatorId); // Basic persistence
        
        const systemText = `⚔️ RAID PARTY STARTED!\n\nTarget: **${bossName}**\n\nTất cả thành viên hãy phối hợp để tiêu diệt Boss (hoàn thành bài tập) trước khi hết giờ!`;
        const systemUser: User = { id: 'system', name: 'System', role: 'ADMIN', isLocked: false, apiKey: null, hasSeenOnboarding: true };
        
        setTimeout(() => {
             sendGroupMessage(groupId, systemUser, systemText);
        }, 500);
    };

    const resolveSOS = async (groupId: string, msgId: string, rescuerId: string) => {
        try {
            const rescuerName = db.USERS[rescuerId]?.name || rescuerId;
            
            setDb(prev => {
                const msgs = prev.GROUP_CHAT_MESSAGES[groupId] || [];
                const newMsgs = msgs.map(m => m.id === msgId ? { ...m, sosStatus: 'RESOLVED', rescuerName } : m);
                return { ...prev, GROUP_CHAT_MESSAGES: { ...prev.GROUP_CHAT_MESSAGES, [groupId]: newMsgs } };
            });

            await fetch(`${BACKEND_URL}/group-chat/${msgId}/resolve`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rescuerName })
            });
        } catch (e) {
            console.error("Failed to resolve SOS:", e);
        }
    };

    const processTrade = (msgId: string, buyerId: string) => {
        // Logic trade (giữ nguyên logic mem nhưng cần sync sau này)
    };

    const sendReward = (teacherId: string, studentId: string, type: 'diamond' | 'item', value: number | string, message: string) => {
        const rewardData = { type, value, message };
        sendChatMessage(teacherId, studentId, message, undefined, undefined, undefined, undefined, rewardData);
    };

    const createFlashcardDeck = (title: string, cards: Flashcard[]) => {
        setDb(prev => ({ ...prev, FLASHCARD_DECKS: { ...prev.FLASHCARD_DECKS, [`fd_${Date.now()}`]: { id: `fd_${Date.now()}`, title, cards } } }));
    };
    const addFlashcardToDeck = (deckId: string, cards: Flashcard[]) => {
        setDb(prev => {
            const deck = prev.FLASHCARD_DECKS[deckId];
            if (!deck) return prev;
            return { ...prev, FLASHCARD_DECKS: { ...prev.FLASHCARD_DECKS, [deckId]: { ...deck, cards: [...deck.cards, ...cards] } } };
        });
    };
    const updateFlashcardInDeck = (deckId: string, card: Flashcard) => {
        setDb(prev => {
            const deck = prev.FLASHCARD_DECKS[deckId];
            if (!deck) return prev;
            const newCards = deck.cards.map(c => c.id === card.id ? card : c);
            return { ...prev, FLASHCARD_DECKS: { ...prev.FLASHCARD_DECKS, [deckId]: { ...deck, cards: newCards } } };
        });
    };

    const createStandaloneQuiz = (title: string, questions: QuizQuestion[]) => {
        const quizId = `qz_sa_${Date.now()}`;
        const assignId = `sa_${Date.now()}`;
        setDb(prev => ({
            ...prev,
            ASSIGNMENTS: { ...prev.ASSIGNMENTS, [assignId]: { id: assignId, courseId: 'SELF', title, type: 'quiz', quizId, createdAt: new Date().toISOString() } },
            QUIZZES: { ...prev.QUIZZES, [quizId]: { id: quizId, questions, title } }
        }));
    };

    const updateScratchpad = (userId: string, content: string) => { 
        setDb(prev => ({ ...prev, SCRATCHPAD: { ...prev.SCRATCHPAD, [userId]: content } })); 
    };

    // --- NOTEBOOK SYNC ---
    const createPersonalNote = async (userId: string, title: string, content: string, links?: any) => {
        try {
            const res = await fetch(`${BACKEND_URL}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, title, content, linkedAssignmentId: links?.assignmentId, linkedPathId: links?.pathId })
            });
            const newNote = await res.json();
            setDb(prev => ({ 
                ...prev, 
                PERSONAL_NOTES: { ...prev.PERSONAL_NOTES, [newNote._id]: { ...newNote, id: newNote._id } } 
            }));
        } catch (e) { console.error(e); }
    };

    const updatePersonalNote = async (noteId: string, updates: Partial<PersonalNote>) => {
        try {
            const res = await fetch(`${BACKEND_URL}/notes/${noteId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            const updated = await res.json();
            setDb(prev => ({ 
                ...prev, 
                PERSONAL_NOTES: { ...prev.PERSONAL_NOTES, [noteId]: { ...updated, id: updated._id } } 
            }));
        } catch (e) { console.error(e); }
    };

    const deletePersonalNote = async (noteId: string) => {
        try {
            await fetch(`${BACKEND_URL}/notes/${noteId}`, { method: 'DELETE' });
            setDb(prev => { const newNotes = { ...prev.PERSONAL_NOTES }; delete newNotes[noteId]; return { ...prev, PERSONAL_NOTES: newNotes }; });
        } catch (e) { console.error(e); }
    };

    const saveNodeNote = (userId: string, pathId: string, nodeId: string, content: string) => {
        const key = `${pathId}_${nodeId}_${userId}`;
        setDb(prev => ({ ...prev, NODE_NOTES: { ...prev.NODE_NOTES, [key]: { id: key, userId, title: `Node ${nodeId}`, content, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } } }));
    };

    const savePdfToNote = async (noteId: string, file: File) => {
        const fileId = `pdf_${Date.now()}`;
        setPdfStorage(prev => ({ ...prev, [fileId]: file }));
        updatePersonalNote(noteId, { pdfFileId: fileId });
    };
    const getPdfForNote = async (fileId: string) => { return pdfStorage[fileId] || null; };
    const removePdfFromNote = (noteId: string) => { updatePersonalNote(noteId, { pdfFileId: undefined }); };
    const shareNoteToSquadron = (noteId: string, groupId: string) => { updatePersonalNote(noteId, { sharedWithSquadronId: groupId }); };
    const unshareNote = (noteId: string) => { updatePersonalNote(noteId, { sharedWithSquadronId: undefined }); };
    const unlockSharedNote = (noteId: string, userId: string) => {
        const note = db.PERSONAL_NOTES[noteId];
        if (!note) return;
        if (db.GAMIFICATION.points < 5) throw new Error("Not enough XP to unlock.");
        setDb(prev => ({
            ...prev,
            PERSONAL_NOTES: { ...prev.PERSONAL_NOTES, [noteId]: { ...note, unlockedBy: [...(note.unlockedBy || []), userId] } },
            GAMIFICATION: { ...prev.GAMIFICATION, points: prev.GAMIFICATION.points - 5 }
        }));
    };
    const addNoteComment = (noteId: string, userId: string, content: string, highlightedText?: string) => {
        updatePersonalNote(noteId, { 
            comments: [...(db.PERSONAL_NOTES[noteId]?.comments || []), { id: `c${Date.now()}`, userId, userName: db.USERS[userId]?.name || userId, content, highlightedText, timestamp: new Date().toISOString() } as any] 
        });
    };

    // --- LEARNING PATH ---
    const createLearningPath = async (userId: string, title: string, topic: string, nodes: LearningNode[], meta: any, wagerAmount?: number): Promise<string> => {
        if (wagerAmount && wagerAmount > 0) { if (db.GAMIFICATION.diamonds < wagerAmount) throw new Error("Không đủ Kim Cương để đặt cược."); }
        const id = `lp_${Date.now()}`;
        const deadline = new Date(); deadline.setDate(deadline.getDate() + 7);
        const newPath: LearningPath = { 
            id, creatorId: userId, title, topic, createdAt: new Date().toISOString(), 
            nodes, targetLevel: meta.level, goal: meta.goal, dailyCommitment: meta.time, 
            wager: wagerAmount ? { amount: wagerAmount, deadline: deadline.toISOString(), isResolved: false } : undefined 
        };
        
        try {
            const res = await fetch(`${BACKEND_URL}/paths`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPath)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || "Failed to save path to server");
            }

            setDb(prev => {
                let newGamification = prev.GAMIFICATION;
                if (wagerAmount) { newGamification = { ...prev.GAMIFICATION, diamonds: prev.GAMIFICATION.diamonds - wagerAmount }; }
                return { ...prev, LEARNING_PATHS: { ...prev.LEARNING_PATHS, [id]: newPath }, GAMIFICATION: newGamification };
            });

            return id;
        } catch (e: any) {
            console.error("Failed to sync path creation:", e);
            throw e;
        }
    };

    // --- UPDATED ASSIGN LEARNING PATH: ASYNC & AWAIT ---
    const assignLearningPath = async (teacherName: string, studentIds: string[], pathData: any) => {
        const newPaths: Record<string, LearningPath> = { ...db.LEARNING_PATHS };
        const newNotifs: Record<string, Notification[]> = { ...db.NOTIFICATIONS };

        // Use Promise.all to ensure all backend requests complete
        const promises = studentIds.map(async (studentId) => {
            const id = `lp_${Date.now()}_${studentId}`;
            const assignedPath = { ...pathData, id, creatorId: studentId, createdAt: new Date().toISOString() };
            
            // Optimistic update objects (Note: mutating newPaths locally is safe here before setDb)
            newPaths[id] = assignedPath;
            
            const notif: Notification = { 
                id: `n_assign_${Date.now()}_${studentId}`, 
                text: `👨‍🏫 Giáo viên ${teacherName} đã giao lộ trình học tập mới: "${pathData.title}"`, 
                read: false, 
                type: 'system', 
                timestamp: new Date().toISOString() 
            };
            
            // Handle array immutability for notifications
            const currentNotifs = newNotifs[studentId] || [];
            newNotifs[studentId] = [notif, ...currentNotifs];

            // Backend Sync
            try {
                await fetch(`${BACKEND_URL}/paths`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(assignedPath)
                });
            } catch (e) {
                console.error(`Failed to assign path to ${studentId}:`, e);
                // Optionally handle error (e.g. revert optimistic update), but keeping simple for now
            }
        });

        await Promise.all(promises);

        setDb(prev => ({ 
            ...prev, 
            LEARNING_PATHS: newPaths, 
            NOTIFICATIONS: newNotifs 
        }));
    };

    const updateNodeProgress = (pathId: string, nodeId: string, data: Partial<LearningNode>) => {
        setDb(prev => {
            const path = prev.LEARNING_PATHS[pathId];
            if (!path) return prev;
            const newNodes = path.nodes.map(n => n.id === nodeId ? { ...n, ...data } : n);
            const updatedPath = { ...path, nodes: newNodes };
            
            // Backend Sync
            fetch(`${BACKEND_URL}/paths/${pathId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedPath)
            });

            return { ...prev, LEARNING_PATHS: { ...prev.LEARNING_PATHS, [pathId]: updatedPath } };
        });
    };

    const unlockNextNode = (pathId: string, nodeId: string) => {
        setDb(prev => {
            const path = prev.LEARNING_PATHS[pathId];
            if (!path) return prev;
            const index = path.nodes.findIndex(n => n.id === nodeId);
            if (index >= 0 && index < path.nodes.length - 1) {
                const newNodes = [...path.nodes];
                newNodes[index] = { ...newNodes[index], isCompleted: true };
                newNodes[index + 1] = { ...newNodes[index + 1], isLocked: false };
                const updatedPath = { ...path, nodes: newNodes };
                
                // Backend Sync
                fetch(`${BACKEND_URL}/paths/${pathId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedPath)
                });

                return { ...prev, LEARNING_PATHS: { ...prev.LEARNING_PATHS, [pathId]: updatedPath } };
            }
            const newNodes = [...path.nodes];
            newNodes[index] = { ...newNodes[index], isCompleted: true };
            const updatedPath = { ...path, nodes: newNodes };
            
            fetch(`${BACKEND_URL}/paths/${pathId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedPath)
            });

            return { ...prev, LEARNING_PATHS: { ...prev.LEARNING_PATHS, [pathId]: updatedPath } };
        });
    };

    const extendLearningPath = (pathId: string, newNodes: LearningNode[]) => {
        setDb(prev => {
            const path = prev.LEARNING_PATHS[pathId];
            if (!path) return prev;
            const updatedPath = { ...path, nodes: [...path.nodes, ...newNodes] };
            
            fetch(`${BACKEND_URL}/paths/${pathId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedPath)
            });

            return { ...prev, LEARNING_PATHS: { ...prev.LEARNING_PATHS, [pathId]: updatedPath } };
        });
    };

    const skipLearningPath = (userId: string, pathId: string) => {
        setDb(prev => {
            const path = prev.LEARNING_PATHS[pathId];
            if (!path) return prev;
            const newNodes = path.nodes.map(n => ({ ...n, isLocked: false, isCompleted: true }));
            const updatedPath = { ...path, nodes: newNodes };

            fetch(`${BACKEND_URL}/paths/${pathId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedPath)
            });

            return { ...prev, LEARNING_PATHS: { ...prev.LEARNING_PATHS, [pathId]: updatedPath } };
        });
    };

    // --- TASK SYNC ---
    const addTask = async (userId: string, text: string) => {
        try {
            const res = await fetch(`${BACKEND_URL}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, text })
            });
            const newTask = await res.json();
            setDb(prev => ({ 
                ...prev, 
                TASKS: { ...prev.TASKS, [newTask._id]: { ...newTask, id: newTask._id } } 
            }));
        } catch (e) { console.error(e); }
    };

    // --- NEW: Toggle Task Completion (Updates Backend & Local) ---
    const toggleTaskCompletion = async (taskId: string, isCompleted: boolean) => {
        // 1. Optimistic UI Update
        setDb(prev => ({
            ...prev,
            TASKS: {
                ...prev.TASKS,
                [taskId]: {
                    ...prev.TASKS[taskId],
                    isCompleted,
                    completedAt: isCompleted ? new Date().toISOString() : undefined
                }
            }
        }));

        // 2. Persist to Backend
        try {
            await fetch(`${BACKEND_URL}/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    isCompleted,
                    completedAt: isCompleted ? new Date().toISOString() : null
                })
            });
        } catch (e) {
            console.error("Failed to update task status:", e);
            // Optionally revert UI here on error
        }
    };

    const deleteTask = async (taskId: string) => {
        try {
            await fetch(`${BACKEND_URL}/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isArchived: true })
            });
            setDb(prev => { const newTasks = { ...prev.TASKS }; delete newTasks[taskId]; return { ...prev, TASKS: newTasks }; });
        } catch (e) { console.error(e); }
    };

    // --- UPDATED: Archive Completed Tasks (Sync to Backend) ---
    const archiveCompletedTasks = async (userId: string) => {
        // Find tasks to archive locally
        // Cast to Task[] to avoid TS errors
        const tasksToArchive = (Object.values(db.TASKS) as Task[]).filter(t => t.userId === userId && t.isCompleted && !t.isArchived);
        
        // 1. Optimistic UI Update (Remove from active view locally)
        setDb(prev => {
            const newTasks = { ...prev.TASKS };
            tasksToArchive.forEach(t => {
                if (newTasks[t.id]) newTasks[t.id].isArchived = true;
            });
            return { ...prev, TASKS: newTasks };
        });

        // 2. Persist to Backend (Loop or Bulk)
        try {
            // Simple loop for now since we don't have a bulk endpoint defined yet
            await Promise.all(tasksToArchive.map(t => 
                fetch(`${BACKEND_URL}/tasks/${t.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isArchived: true })
                })
            ));
        } catch (e) {
            console.error("Failed to archive tasks:", e);
        }
    };

    // --- ASSIGNMENT & QUIZ CREATION (WITH PERSISTENCE) ---
    const createFileAssignment = (title: string, courseId: string) => {
        const id = `ass_file_${Date.now()}`;
        const newAssignment: Assignment = { id, courseId, title, type: 'file', createdAt: new Date().toISOString() };
        
        // Optimistic Update
        setDb(prev => ({
            ...prev,
            ASSIGNMENTS: { ...prev.ASSIGNMENTS, [id]: newAssignment },
            FILE_SUBMISSIONS: { ...prev.FILE_SUBMISSIONS, [id]: [] }
        }));

        // Persist
        fetch(`${BACKEND_URL}/assignments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newAssignment)
        });
    };

    const createQuizAssignment = (title: string, courseId: string, questions: QuizQuestion[]) => {
        const assignId = `ass_quiz_${Date.now()}`;
        const quizId = `qz_${Date.now()}`;
        const newAssignment: Assignment = { id: assignId, courseId, title, type: 'quiz', quizId, createdAt: new Date().toISOString() };
        const newQuiz = { id: quizId, questions, title };

        // Optimistic Update
        setDb(prev => ({
            ...prev,
            ASSIGNMENTS: { ...prev.ASSIGNMENTS, [assignId]: newAssignment },
            QUIZZES: { ...prev.QUIZZES, [quizId]: newQuiz },
            QUIZ_SUBMISSIONS: { ...prev.QUIZ_SUBMISSIONS, [quizId]: {} }
        }));

        // Persist Assignment
        fetch(`${BACKEND_URL}/assignments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newAssignment)
        });

        // Persist Quiz
        fetch(`${BACKEND_URL}/quizzes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newQuiz)
        });
    };

    const createBossChallenge = (courseId: string, title: string, description: string, xp: number) => {
        const id = `ass_boss_${Date.now()}`;
        const newAssignment: Assignment = { id, courseId, title, type: 'file', createdAt: new Date().toISOString(), rank: 'S', isBoss: true, rewardXP: xp, description: description };
        
        setDb(prev => ({
            ...prev,
            ASSIGNMENTS: { ...prev.ASSIGNMENTS, [id]: newAssignment },
            FILE_SUBMISSIONS: { ...prev.FILE_SUBMISSIONS, [id]: [] }
        }));

        fetch(`${BACKEND_URL}/assignments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newAssignment)
        });
    };

    const sendIntervention = (assignmentId: string, questionId: string, note: string, studentIds: string[]) => {
        setDb(prev => {
            const newNotifs = { ...prev.NOTIFICATIONS };
            studentIds.forEach(uid => {
                const notif = { id: `int_${Date.now()}_${uid}`, text: `📢 Giáo viên đã gửi lời giảng cho câu hỏi bạn sai trong bài tập.`, read: false, type: 'intervention', timestamp: new Date().toISOString(), metadata: { assignmentId, questionId, teacherNote: note } };
                newNotifs[uid] = [...(newNotifs[uid] || []), notif];
            });
            return { ...prev, NOTIFICATIONS: newNotifs };
        });
    };
    
    // --- ADMIN CREATE COURSE WITH PERSISTENCE ---
    const adminCreateCourse = async (name: string, teacherName: string, modules: GeneratedModule[], defaultPersona?: string, autoSeedApiKey?: string, isBeta?: boolean) => {
        const courseId = `CS_${Date.now()}`;
        const mappedModules = [];

        try {
            // Loop through generated modules
            for (const mod of modules) {
                const modId = `m_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const items = [];

                for (const item of mod.items) {
                    const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                    
                    if (item.type.includes('lesson')) {
                        // Create Lesson Content
                        const lessonData = {
                            id: itemId,
                            courseId: courseId,
                            title: item.title,
                            type: (item.type === 'lesson_video' ? 'video' : 'text') as 'video' | 'text',
                            content: item.contentOrDescription
                        };
                        
                        await fetch(`${BACKEND_URL}/lessons`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(lessonData)
                        });

                        items.push({ type: 'lesson', id: itemId });
                        
                        // Local State Update for Lesson (Optimistic/Immediate)
                        setDb(prev => ({
                            ...prev,
                            LESSONS: { ...prev.LESSONS, [itemId]: lessonData }
                        }));

                    } else {
                        // Create Assignment
                        const assignmentData = {
                            id: itemId,
                            courseId: courseId,
                            title: item.title,
                            type: (item.type === 'assignment_quiz' ? 'quiz' : 'file') as 'file' | 'quiz',
                            description: item.contentOrDescription,
                            createdAt: new Date().toISOString()
                        };

                        await fetch(`${BACKEND_URL}/assignments`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(assignmentData)
                        });

                        items.push({ type: 'assignment', id: itemId });

                        // Local State Update for Assignment
                        setDb(prev => ({
                            ...prev,
                            ASSIGNMENTS: { ...prev.ASSIGNMENTS, [itemId]: assignmentData },
                            // Initialize submissions
                            FILE_SUBMISSIONS: { ...prev.FILE_SUBMISSIONS, [itemId]: [] },
                            // Initialize quiz if quiz
                            ...(item.type === 'assignment_quiz' ? {
                                QUIZZES: { ...prev.QUIZZES, [itemId]: { id: `qz_${itemId}`, title: item.title, questions: [] } },
                                QUIZ_SUBMISSIONS: { ...prev.QUIZ_SUBMISSIONS, [`qz_${itemId}`]: {} }
                            } : {})
                        }));
                    }
                }
                mappedModules.push({ id: modId, name: mod.title, items });
            }

            // Create Course Document
            const courseData = {
                id: courseId,
                name: name,
                teacher: teacherName,
                defaultPersona: defaultPersona,
                modules: mappedModules
            };

            await fetch(`${BACKEND_URL}/courses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(courseData)
            });

            // Update Local State for Course & Structure
            setDb(prev => ({
                ...prev,
                COURSES: [...prev.COURSES, { id: courseId, name, teacher: teacherName, defaultPersona }],
                COURSE_STRUCTURE: { ...prev.COURSE_STRUCTURE, [courseId]: { modules: mappedModules } }
            }));

        } catch (error) {
            console.error("Error creating course:", error);
            throw error;
        }
    };

    const generateArchive = async (apiKey: string, type: 'course'|'squadron', id: string, name: string): Promise<string> => {
        let data: any = {};
        if (type === 'course') { const course = db.COURSES.find(c => c.id === id); data = { course, structure: db.COURSE_STRUCTURE[id] }; } else { const group = db.STUDY_GROUPS.find(g => g.id === id); data = { group, messages: db.GROUP_CHAT_MESSAGES[id] }; }
        return await generateLegacyArchiveContent(apiKey, data, type, name);
    };
    const addCommunityQuestion = (userId: string, nodeId: string, question: QuizQuestion) => {
        setDb(prev => ({ ...prev, COMMUNITY_QUESTIONS: [...prev.COMMUNITY_QUESTIONS, { ...question, authorId: userId, nodeId }] }));
    };
    const addLessonToCourse = (courseId: string, title: string, content: string) => {
        setDb(prev => {
            const newLessonId = `l_note_${Date.now()}`;
            const newLesson = { id: newLessonId, courseId, title, type: 'text' as const, content };
            const courseStructure = prev.COURSE_STRUCTURE[courseId];
            if (!courseStructure) return prev;
            let newModules = [...courseStructure.modules];
            if (newModules.length === 0) { newModules.push({ id: `m_imported_${Date.now()}`, name: "Imported Notes", items: [] }); }
            const targetModuleIndex = newModules.length - 1;
            const targetModule = newModules[targetModuleIndex];
            const updatedModule = { ...targetModule, items: [...targetModule.items, { type: 'lesson' as const, id: newLessonId }] };
            newModules[targetModuleIndex] = updatedModule;
            return { ...prev, LESSONS: { ...prev.LESSONS, [newLessonId]: newLesson }, COURSE_STRUCTURE: { ...prev.COURSE_STRUCTURE, [courseId]: { modules: newModules } } };
        });
    };
    const editLessonContent = (lessonId: string, newContent: string) => {
        setDb(prev => ({ ...prev, LESSONS: { ...prev.LESSONS, [lessonId]: { ...prev.LESSONS[lessonId], content: newContent } } }));
    };
    const updateCourseSettings = (courseId: string, settings: Partial<Course>) => {
        setDb(prev => ({ ...prev, COURSES: prev.COURSES.map(c => c.id === courseId ? { ...c, ...settings } : c) }));
    };

    return (
        <DataContext.Provider value={{
            db, setApiKey, markLessonComplete, submitFileAssignment, gradeFileSubmission, submitQuiz, updateQuizQuestions,
            addDiscussionPost, addVideoNote, deleteVideoNote, runMockTest, toggleUserLock, sendAnnouncement, unlockAllUsers,
            registerUser, completeOnboarding, dismissAnnouncement, markNotificationRead, buyShopItem, equipShopItem, equipPet,
            checkDailyDiamondReward, unlockSecretReward, collectSpaceJunk, recycleSpaceJunk, awardXP, restoreStreak,
            recordSpeedRunResult, sendChatMessage, sendGroupMessage, joinGroup, createGroup, createRaidParty, resolveSOS, processTrade,
            createFlashcardDeck, addFlashcardToDeck, updateFlashcardInDeck, createStandaloneQuiz, updateScratchpad, createPersonalNote, updatePersonalNote,
            deletePersonalNote, saveNodeNote, savePdfToNote, getPdfForNote, removePdfFromNote, shareNoteToSquadron, unshareNote,
            unlockSharedNote, addNoteComment, createLearningPath, assignLearningPath, updateNodeProgress, unlockNextNode, extendLearningPath,
            skipLearningPath, addTask, toggleTaskCompletion, deleteTask, archiveCompletedTasks, createFileAssignment, createQuizAssignment, createBossChallenge, sendIntervention,
            adminCreateCourse, generateArchive, addCommunityQuestion, addLessonToCourse, editLessonContent, updateCourseSettings, sendReward,
            fetchUserData
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const GlobalStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [serviceStatus, setServiceStatus] = useState<ServiceStatus>({
        user_management: 'OPERATIONAL', course_management: 'OPERATIONAL', content_delivery: 'OPERATIONAL', assessment_taking: 'OPERATIONAL', storage_service: 'OPERATIONAL', grading_service: 'OPERATIONAL', notification_service: 'OPERATIONAL', chat_service: 'OPERATIONAL', group_service: 'OPERATIONAL', forum_service: 'OPERATIONAL', ai_tutor_service: 'OPERATIONAL', ai_assistant_service: 'OPERATIONAL', personalization: 'OPERATIONAL', analytics: 'OPERATIONAL'
    });
    const [featureFlags, setFeatureFlags] = useState<Record<string, FeatureFlag>>({});
    const [pomodoro, setPomodoro] = useState<{ isActive: boolean; seconds: number; mode: 'focus' | 'break' }>({
        isActive: false, seconds: 25 * 60, mode: 'focus'
    });
    const [deepWorkMode, setDeepWorkMode] = useState(false);
    const [page, setPageInternal] = useState('dashboard');
    const [pageParams, setPageParams] = useState<any>(null);
    const [shopIntent, setShopIntent] = useState<{ isOpen: boolean; targetItemId?: string }>({ isOpen: false });

    const toggleServiceStatus = (service: string) => {
        setServiceStatus(prev => {
            const current = prev[service];
            const next = current === 'OPERATIONAL' ? 'DEGRADED' : current === 'DEGRADED' ? 'CRITICAL' : 'OPERATIONAL';
            return { ...prev, [service]: next };
        });
    };

    const setFeatureFlag = (key: string, status: any, specificUsers: string = '') => {
        setFeatureFlags(prev => ({ ...prev, [key]: { status, specificUsers } }));
    };

    const setPage = (newPage: string, params?: any) => {
        setPageInternal(newPage);
        setPageParams(params || null);
    };

    return (
        <GlobalStateContext.Provider value={{
            serviceStatus, toggleServiceStatus, featureFlags, setFeatureFlag,
            pomodoro, setPomodoro, deepWorkMode, setDeepWorkMode,
            page, setPage, pageParams,
            shopIntent, setShopIntent
        }}>
            {children}
        </GlobalStateContext.Provider>
    );
};

export const PageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { page, setPage, pageParams } = useContext(GlobalStateContext)!;
    const navigate = (newPage: string, params?: any) => { setPage(newPage, params); };
    return (
        <PageContext.Provider value={{ page, navigate, params: pageParams }}>
            {children}
        </PageContext.Provider>
    );
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { fetchUserData } = useContext(DataContext)!;
    const { navigate } = useContext(PageContext)!;
    
    const [user, setUser] = useState<User | null>(null);
    const [error, setError] = useState<string | null>(null);

    const login = async (u: string, p: string) => {
        try {
            const response = await fetch(`${BACKEND_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: u, password: p }),
            });

            const data = await response.json();

            if (response.ok) {
                const loggedUser: User = {
                    id: data.id,
                    name: data.name,
                    role: data.role,
                    isLocked: data.isLocked || false,
                    apiKey: null,
                    hasSeenOnboarding: data.hasSeenOnboarding || false,
                    squadronId: data.squadronId
                };
                setUser(loggedUser);
                setError(null);
                // No await here! Fire and forget to make UI responsive immediately
                fetchUserData(loggedUser.id);
                navigate('dashboard');
            } else {
                setError(data.message || "Login failed");
            }
        } catch (err) {
            console.error("Login API Error:", err);
            setError("Cannot connect to server.");
        }
    };

    const logout = () => { setUser(null); navigate('dashboard'); };
    const isLocked = user?.isLocked || false;

    // --- HEARTBEAT LOOP ---
    // Sends a pulse to the server every 30s if user is logged in
    useEffect(() => {
        if (!user) return;

        const heartbeat = () => {
            fetch(`${BACKEND_URL}/users/heartbeat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            }).catch(e => console.error("Heartbeat failed", e));
        };

        // Initial call
        heartbeat();

        const interval = setInterval(heartbeat, 30000); // 30 seconds
        return () => clearInterval(interval);
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, isLocked, login, logout, error }}>
            {children}
        </AuthContext.Provider>
    );
};

// ... MusicProvider & PetProvider giữ nguyên ...

export const MusicProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentTrack, setCurrentTrack] = useState<{ name: string, url: string, tempo?: 'slow' | 'medium' | 'fast' } | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
        }
    }, []);

    useEffect(() => {
        if (audioRef.current) {
            if (currentTrack) {
                if (audioRef.current.src !== currentTrack.url) {
                    audioRef.current.src = currentTrack.url;
                    if (isPlaying) audioRef.current.play();
                } else {
                    if (isPlaying) audioRef.current.play();
                    else audioRef.current.pause();
                }
            } else {
                audioRef.current.pause();
            }
        }
    }, [currentTrack, isPlaying]);

    const playTrack = (track: { name: string, url: string, tempo?: 'slow' | 'medium' | 'fast' }) => {
        if (currentTrack?.name === track.name) {
            setIsPlaying(!isPlaying);
        } else {
            setCurrentTrack(track);
            setIsPlaying(true);
        }
    };

    const togglePlay = () => {
        if (currentTrack) setIsPlaying(!isPlaying);
    };

    return (
        <MusicContext.Provider value={{ currentTrack, isPlaying, playTrack, togglePlay }}>
            {children}
        </MusicContext.Provider>
    );
};

export const PetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentReaction, setCurrentReaction] = useState('idle');
    const [petDialogue, setPetDialogue] = useState<string | null>(null);
    const [petPosition, setPetPosition] = useState<React.CSSProperties | null>(null);
    
    const timeoutRef = useRef<number | null>(null);
    const dialogueTimeoutRef = useRef<number | null>(null);

    const triggerReaction = (reaction: string) => {
        setCurrentReaction(reaction);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        
        if (reaction !== 'sleep' && !reaction.startsWith('hover_')) {
             timeoutRef.current = window.setTimeout(() => {
                setCurrentReaction('idle');
            }, 3000);
        }
    };

    const say = (text: string, duration: number = 5000) => {
        setPetDialogue(text);
        if (dialogueTimeoutRef.current) clearTimeout(dialogueTimeoutRef.current);
        dialogueTimeoutRef.current = window.setTimeout(() => {
            setPetDialogue(null);
        }, duration);
    };

    return (
        <PetContext.Provider value={{ currentReaction, triggerReaction, petDialogue, say, petPosition, setPetPosition }}>
            {children}
        </PetContext.Provider>
    );
};