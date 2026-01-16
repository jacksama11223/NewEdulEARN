
import React, { useState, useEffect, useContext, createContext, useMemo, useCallback, useRef, ReactNode } from 'react';
import { MOCK_DATA } from '../data/mockData';
import { Database, User, ServiceStatus, MockTestResultStatus, FeatureFlag, Flashcard, LearningNode, QuizQuestion, GeneratedModule, PersonalNote, SpaceJunk, ShopItem, FlashcardDeck, Task, Notification, Announcement, StudyGroup, GroupChatMessage, LearningPath, Course, ChatMessage, Assignment, Quiz, QuizSubmission, CourseStructure, Lesson, ModuleItem, Module } from '../types';
import { io, Socket } from 'socket.io-client';
import { generateLegacyArchiveContent } from '../services/geminiService';

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

const SOUNDS = {
    notification: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
    sent: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3', 
    success: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', 
    cash: 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3',
    level_up: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
    error: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3',
    click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
    tap: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
    celebration: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3', 
    reward: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
    keyboard_mech: 'https://assets.mixkit.co/active_storage/sfx/2364/2364-preview.mp3'
};

type SoundType = keyof typeof SOUNDS;

// --- Interfaces ---

export interface AuthContextType {
    user: User | null;
    isLocked: boolean;
    login: (u: string, p: string) => Promise<void>;
    logout: () => void;
    error: string | null;
}

export interface GlobalStateContextType {
    serviceStatus: ServiceStatus;
    toggleServiceStatus: (service: string) => void;
    featureFlags: Record<string, FeatureFlag>;
    setFeatureFlag: (key: string, status: any, specificUsers?: string) => void;
    pomodoro: { isActive: boolean; seconds: number; mode: 'focus' | 'break' };
    setPomodoro: React.Dispatch<React.SetStateAction<{ isActive: boolean; seconds: number; mode: 'focus' | 'break' }>>;
    deepWorkMode: boolean;
    setDeepWorkMode: (mode: boolean) => void;
    page: string;
    setPage: (page: string, params?: any) => void;
    pageParams: any;
    shopIntent: { isOpen: boolean; targetItemId?: string };
    setShopIntent: React.Dispatch<React.SetStateAction<{ isOpen: boolean; targetItemId?: string }>>;
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

export interface DataContextType {
    db: Database;
    unreadCounts: { chat: number; group: number; alert: number }; 
    resetUnreadCount: (type: 'chat' | 'group' | 'alert') => void;
    
    // SRS State
    dueFlashcardsCount: number;
    fetchDueFlashcards: (userId: string) => Promise<any[]>;
    fetchUpcomingFlashcards: (userId: string, page?: number, limit?: number) => Promise<{ cards: any[], total: number, page: number, totalPages: number }>; 
    recordCardReview: (data: { cardId: string, rating: 'easy'|'medium'|'hard', sourceType: string, sourceId: string, nodeId?: string }) => Promise<void>;

    playSound: (type: SoundType) => void;
    connectSocket: (userId: string) => void; // NEW: Expose connectSocket
    syncUserToDb: (user: User) => void; 
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
    deleteUser: (userId: string) => void; 
    sendAnnouncement: (text: string) => void;
    unlockAllUsers: () => void;
    registerUser: (u: string, p: string, name: string, role: any) => Promise<void>;
    completeOnboarding: (userId: string) => void;
    dismissAnnouncement: (id: string) => void;
    markNotificationRead: (userId: string, notifId: string) => void;
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
    sendChatMessage: (fromId: string, toId: string, text: string, challenge?: any, intel?: any, trade?: any, gradeDispute?: any, reward?: any, squadronInvite?: any) => void;
    sendGroupMessage: (groupId: string, user: User, text: string, metadata?: { isSOS?: boolean, isWhisper?: boolean }) => void;
    deleteGroupMessage: (groupId: string, msgId: string) => void; 
    joinGroup: (groupId: string, userId: string, inviteMsgId?: string) => void;
    createGroup: (name: string, creatorId: string) => void;
    createRaidParty: (name: string, creatorId: string, memberIds: string[], bossName: string) => void;
    resolveSOS: (groupId: string, msgId: string, rescuerId: string) => void;
    processTrade: (msgId: string, buyerId: string) => void;
    sendReward: (teacherId: string, studentId: string, type: 'diamond' | 'item', value: number | string, message: string) => void;
    createFlashcardDeck: (userId: string, title: string, cards: Flashcard[]) => void;
    deleteFlashcardDeck: (deckId: string) => void;
    renameFlashcardDeck: (deckId: string, newTitle: string) => void;
    addFlashcardToDeck: (deckId: string, cards: Flashcard[]) => void;
    updateFlashcardInDeck: (deckId: string, card: Flashcard) => void;
    createStandaloneQuiz: (title: string, questions: QuizQuestion[]) => void;
    updateScratchpad: (userId: string, content: string) => void;
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
    createLearningPath: (userId: string, title: string, topic: string, nodes: LearningNode[], meta: any, wagerAmount?: number) => Promise<string>;
    assignLearningPath: (teacherName: string, studentIds: string[], pathData: any) => Promise<void>; 
    updateNodeProgress: (pathId: string, nodeId: string, data: Partial<LearningNode>) => void;
    unlockNextNode: (pathId: string, nodeId: string) => void;
    extendLearningPath: (pathId: string, newNodes: LearningNode[]) => void;
    skipLearningPath: (userId: string, pathId: string) => void;
    addTask: (userId: string, text: string) => void;
    toggleTaskCompletion: (taskId: string, isCompleted: boolean) => void; 
    deleteTask: (taskId: string) => void;
    archiveCompletedTasks: (userId: string) => void;
    createFileAssignment: (title: string, courseId: string) => void;
    createQuizAssignment: (title: string, courseId: string, questions: QuizQuestion[]) => void;
    createBossChallenge: (courseId: string, title: string, description: string, xp: number) => void;
    sendIntervention: (assignmentId: string, questionId: string, note: string, studentIds: string[]) => void;
    adminCreateCourse: (name: string, teacherName: string, modules: GeneratedModule[], defaultPersona?: string, autoSeedApiKey?: string, isBeta?: boolean) => Promise<void>;
    generateArchive: (apiKey: string, type: 'course'|'squadron', id: string, name: string) => Promise<string>;
    addCommunityQuestion: (userId: string, nodeId: string, question: QuizQuestion) => void;
    addLessonToCourse: (courseId: string, title: string, content: string) => void;
    editLessonContent: (lessonId: string, newContent: string) => void; 
    updateCourseSettings: (courseId: string, settings: Partial<Course>) => void;
    fetchUserData: (userId: string) => Promise<void>;
}

// --- CONTEXT DEFINITIONS ---
export const AuthContext = createContext<AuthContextType | null>(null);
export const DataContext = createContext<DataContextType | null>(null);
export const GlobalStateContext = createContext<GlobalStateContextType | null>(null);
export const PageContext = createContext<PageContextType | null>(null);
export const MusicContext = createContext<MusicContextType | null>(null);
export const PetContext = createContext<PetContextType | null>(null);

// --- DATA PROVIDER ---
export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [db, setDb] = useState<Database>(MOCK_DATA);
    const [pdfStorage, setPdfStorage] = useState<Record<string, File>>({});
    const [unreadCounts, setUnreadCounts] = useState({ chat: 0, group: 0, alert: 0 }); 
    const [dueFlashcardsCount, setDueFlashcardsCount] = useState(0); 
    const [socket, setSocket] = useState<Socket | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null); // To track which rooms to join

    // Audio Refs
    const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

    useEffect(() => {
        Object.keys(SOUNDS).forEach(key => {
            audioRefs.current[key] = new Audio(SOUNDS[key as SoundType]);
        });
    }, []);

    const playSound = (type: SoundType) => {
        const audio = audioRefs.current[type];
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.error("Sound play failed", e));
        }
    };

    // --- HELPER FUNCTIONS ---
    const updateDb = (updater: (prev: Database) => Database) => {
        setDb(prev => updater(prev));
    };

    const syncUserToDb = (user: User) => {
        updateDb(prev => ({
            ...prev,
            USERS: { ...prev.USERS, [user.id]: user }
        }));
    };

    const resetUnreadCount = (type: 'chat' | 'group' | 'alert') => {
        setUnreadCounts(prev => ({ ...prev, [type]: 0 }));
    };

    // --- SOCKET.IO CONNECTION & LISTENERS ---
    const connectSocket = useCallback((userId: string) => {
        if (socket) socket.disconnect();

        // 1. Store userId to help with delayed group joining
        setCurrentUserId(userId);

        const newSocket = io(BASE_URL);
        
        newSocket.on('connect', () => {
            console.log("🔌 Socket connected:", newSocket.id);
            newSocket.emit('join_user', userId);
        });

        // 1-on-1 Chat Listener
        newSocket.on('receive_message', (msg: ChatMessage) => {
            updateDb(prev => {
                const key = [msg.from, msg.to].sort().join('_');
                const existing = prev.CHAT_MESSAGES[key] || [];
                
                // FIX: Check for duplicates to prevent "echo"
                if (existing.some(m => m.id === msg.id)) {
                    return prev;
                }

                return {
                    ...prev,
                    CHAT_MESSAGES: {
                        ...prev.CHAT_MESSAGES,
                        [key]: [...existing, msg]
                    }
                };
            });

            // Notification Logic
            if (msg.from !== userId) {
                playSound('notification');
                setUnreadCounts(prev => ({ ...prev, chat: prev.chat + 1 }));
            }
        });

        // Group Chat Listener
        newSocket.on('receive_group_message', (msg: GroupChatMessage) => {
            updateDb(prev => {
                const existing = prev.GROUP_CHAT_MESSAGES[msg.groupId] || [];
                // Check duplicate just in case
                if (existing.some(m => m.id === msg.id)) return prev;

                return {
                    ...prev,
                    GROUP_CHAT_MESSAGES: {
                        ...prev.GROUP_CHAT_MESSAGES,
                        [msg.groupId]: [...existing, msg]
                    }
                };
            });

            if (msg.user.id !== userId) {
                playSound('notification');
                setUnreadCounts(prev => ({ ...prev, group: prev.group + 1 }));
            }
        });

        // FIX: Group Chat Deletion Listener
        newSocket.on('group_message_deleted', ({ msgId, groupId }: { msgId: string, groupId: string }) => {
            updateDb(prev => {
                const existing = prev.GROUP_CHAT_MESSAGES[groupId] || [];
                return {
                    ...prev,
                    GROUP_CHAT_MESSAGES: {
                        ...prev.GROUP_CHAT_MESSAGES,
                        [groupId]: existing.filter(m => m.id !== msgId)
                    }
                };
            });
        });

        // Generic Notifications
        newSocket.on('receive_notification', (notif: Notification) => {
             if (userId) {
                 updateDb(prev => ({
                     ...prev,
                     NOTIFICATIONS: {
                         ...prev.NOTIFICATIONS,
                         [userId]: [...(prev.NOTIFICATIONS[userId] || []), notif]
                     }
                 }));
             }
             playSound('notification');
             setUnreadCounts(prev => ({ ...prev, alert: prev.alert + 1 }));
        });

        // NEW: Listen for Database Updates (Sync)
        newSocket.on('db_update', (payload: { type: string, data: any }) => {
            if (payload.type === 'COURSE') {
                const course = payload.data;
                updateDb(prev => {
                    const exists = prev.COURSES.find(c => c.id === course.id);
                    if (exists) {
                        return { ...prev, COURSES: prev.COURSES.map(c => c.id === course.id ? course : c) };
                    } else {
                        // Init empty structure for new course
                        const newStructure = { modules: course.modules || [] };
                        return { 
                            ...prev, 
                            COURSES: [...prev.COURSES, course],
                            COURSE_STRUCTURE: { ...prev.COURSE_STRUCTURE, [course.id]: newStructure }
                        };
                    }
                });
            } else if (payload.type === 'ASSIGNMENT') {
                const asg = payload.data;
                updateDb(prev => ({
                    ...prev,
                    ASSIGNMENTS: { ...prev.ASSIGNMENTS, [asg.id]: asg }
                }));
            } else if (payload.type === 'QUIZ') {
                const quiz = payload.data;
                updateDb(prev => ({
                    ...prev,
                    QUIZZES: { ...prev.QUIZZES, [quiz.id]: quiz }
                }));
            } else if (payload.type === 'LESSON') {
                const lesson = payload.data;
                updateDb(prev => ({
                    ...prev,
                    LESSONS: { ...prev.LESSONS, [lesson.id]: lesson }
                }));
            } else if (payload.type === 'GROUP') {
                // Update group list if a new group is created or updated
                const group = payload.data;
                updateDb(prev => {
                    const exists = prev.STUDY_GROUPS.some(g => g.id === group.id);
                    let newGroups = prev.STUDY_GROUPS;
                    if (exists) {
                        newGroups = prev.STUDY_GROUPS.map(g => g.id === group.id ? group : g);
                    } else {
                        newGroups = [...prev.STUDY_GROUPS, group];
                    }
                    return { ...prev, STUDY_GROUPS: newGroups };
                });
            }
        });

        // FIX: Listen for assigned learning paths
        newSocket.on('learning_path_assigned', (path: LearningPath) => {
            if (path && path.creatorId === userId) { // Ensure it's for me (double check)
                updateDb(prev => ({
                    ...prev,
                    LEARNING_PATHS: {
                        ...prev.LEARNING_PATHS,
                        [path.id]: path
                    }
                }));
            }
        });

        setSocket(newSocket);
    }, []); 

    // --- FIX: REACTIVE GROUP JOINING ---
    // Ensure socket joins group rooms whenever 'db.STUDY_GROUPS' changes (loaded from API)
    useEffect(() => {
        if (socket && currentUserId && db.STUDY_GROUPS) {
            const currentUser = db.USERS[currentUserId];
            // Admin and Teacher must join ALL groups to see realtime messages even if not a direct member
            const shouldMonitorAll = currentUser?.role === 'ADMIN' || currentUser?.role === 'TEACHER';

            db.STUDY_GROUPS.forEach(g => {
                if (shouldMonitorAll || g.members.includes(currentUserId)) {
                    // console.log(`🛰️ Joining room for group: ${g.name} (${g.id})`);
                    socket.emit('join_group', g.id);
                }
            });
        }
    }, [socket, currentUserId, db.STUDY_GROUPS, db.USERS]);


    const fetchDueFlashcards = async (userId: string) => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); 

            const res = await fetch(`${BACKEND_URL}/reviews/due/${userId}`, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!res.ok) throw new Error(`Status: ${res.status}`);
            
            const cards = await res.json();
            setDueFlashcardsCount(cards.length);
            return cards;
        } catch (e) {
            console.error("Failed to fetch due cards (SRS):", e);
            return [];
        }
    };

    const fetchUpcomingFlashcards = async (userId: string, page: number = 1, limit: number = 10) => {
        try {
            const res = await fetch(`${BACKEND_URL}/reviews/upcoming/${userId}?page=${page}&limit=${limit}`);
            if (!res.ok) throw new Error(`Status: ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("Failed to fetch upcoming cards:", e);
            return { cards: [], total: 0, page: 1, totalPages: 1 };
        }
    };

    const recordCardReview = async (data: { cardId: string, rating: 'easy'|'medium'|'hard', sourceType: string, sourceId: string, nodeId?: string }) => {
        try {
            await fetch(`${BACKEND_URL}/reviews/record`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            setDueFlashcardsCount(prev => Math.max(0, prev - 1));
        } catch (e) {
            console.error("Failed to record review:", e);
        }
    };

    // --- FETCH USER DATA (SYNC FROM BACKEND) ---
    const fetchUserData = async (userId: string) => {
        console.log("📥 Fetching User Data for:", userId);
        try {
            // 1. Fetch Users (for Contacts & Online Status)
            try {
                const usersRes = await fetch(`${BACKEND_URL}/users`);
                if (usersRes.ok) {
                    const usersArr: User[] = await usersRes.json();
                    const usersMap: Record<string, User> = {};
                    usersArr.forEach(u => usersMap[u.id] = u);
                    updateDb(prev => ({
                        ...prev,
                        USERS: usersMap
                    }));
                }
            } catch (e) { console.error("Users fetch error", e); }

            // 1b. Fetch Courses (Crucial for Admin/Teacher updates)
            try {
                const coursesRes = await fetch(`${BACKEND_URL}/courses`);
                if (coursesRes.ok) {
                    const coursesArr: Course[] = await coursesRes.json();
                    
                    // Reconstruct COURSE_STRUCTURE
                    const structureMap: Record<string, CourseStructure> = {};
                    coursesArr.forEach(c => {
                        structureMap[c.id] = { modules: (c as any).modules || [] };
                    });

                    updateDb(prev => ({
                        ...prev,
                        COURSES: coursesArr,
                        COURSE_STRUCTURE: structureMap
                    }));
                }
            } catch (e) { console.error("Courses fetch error", e); }

            // 1c. Fetch Assignments
            try {
                const asgRes = await fetch(`${BACKEND_URL}/assignments`);
                if(asgRes.ok) {
                    const asgs: Assignment[] = await asgRes.json();
                    const asgMap: Record<string, Assignment> = {};
                    asgs.forEach(a => asgMap[a.id] = a);
                    updateDb(prev => ({ ...prev, ASSIGNMENTS: asgMap }));
                }
            } catch (e) { console.error("Assignments fetch error", e); }


            // fetch quizzez
            try {
                const quizRes = await fetch(`${BACKEND_URL}/quizzes`);
                if (quizRes.ok) {
                    const quizzes: Quiz[] = await quizRes.json();
                    const quizMap: Record<string, Quiz> = {};
                    quizzes.forEach(q => quizMap[q.id] = q);
                    updateDb(prev => ({ ...prev, QUIZZES: quizMap }));
                }
            } catch (e) { console.error("Quizzes fetch error", e); }

            // 1d. Fetch Lessons (FIX: Ensure lessons are loaded from backend)
            try {
                const lessonsRes = await fetch(`${BACKEND_URL}/lessons`);
                if (lessonsRes.ok) {
                    const lessonsArr: Lesson[] = await lessonsRes.json();
                    const lessonsMap: Record<string, Lesson> = {};
                    lessonsArr.forEach(l => lessonsMap[l.id] = l);
                    
                    updateDb(prev => ({ 
                        ...prev, 
                        LESSONS: { ...prev.LESSONS, ...lessonsMap } 
                    }));
                }
            } catch (e) { console.error("Lessons fetch error", e); }

            // 2. Fetch Learning Paths
            const pathsRes = await fetch(`${BACKEND_URL}/paths/${userId}`);
            if (pathsRes.ok) {
                const pathsArr: LearningPath[] = await pathsRes.json();
                const pathsMap: Record<string, LearningPath> = {};
                pathsArr.forEach(p => pathsMap[p.id] = p);
                
                updateDb(prev => ({
                    ...prev,
                    LEARNING_PATHS: { ...prev.LEARNING_PATHS, ...pathsMap }
                }));
                console.log("✅ Paths loaded:", pathsArr.length);
            }

            // 3. Fetch Personal Notes
            // FIX: Ensure ID mapping if backend returns _id
            const notesRes = await fetch(`${BACKEND_URL}/notes/${userId}`);
            if (notesRes.ok) {
                const notesArr: any[] = await notesRes.json();
                const notesMap: Record<string, PersonalNote> = {};
                notesArr.forEach(n => {
                    const fixedNote = { ...n, id: n.id || n._id }; // Fallback to _id if id missing
                    notesMap[fixedNote.id] = fixedNote;
                });
                
                updateDb(prev => ({
                    ...prev,
                    PERSONAL_NOTES: { ...prev.PERSONAL_NOTES, ...notesMap }
                }));
            }

            // 4. Fetch Decks
            // FIX: Ensure ID mapping if backend returns _id
            const decksRes = await fetch(`${BACKEND_URL}/decks/${userId}`);
            if (decksRes.ok) {
                const decksArr: any[] = await decksRes.json();
                const decksMap: Record<string, FlashcardDeck> = {};
                decksArr.forEach(d => {
                    const fixedDeck = { ...d, id: d.id || d._id }; // Fallback to _id if id missing
                    decksMap[fixedDeck.id] = fixedDeck;
                });
                
                updateDb(prev => ({
                    ...prev,
                    FLASHCARD_DECKS: { ...prev.FLASHCARD_DECKS, ...decksMap }
                }));
            }

            // 5. Fetch Groups (To ensure we know which rooms to join)
            const groupsRes = await fetch(`${BACKEND_URL}/groups`);
            if (groupsRes.ok) {
                const groupsArr: StudyGroup[] = await groupsRes.json();
                updateDb(prev => ({
                    ...prev,
                    STUDY_GROUPS: groupsArr
                }));
            }

            // 6. Fetch 1-on-1 Chat History
            try {
                const chatRes = await fetch(`${BACKEND_URL}/chat/history/${userId}`);
                if (chatRes.ok) {
                    const messages: ChatMessage[] = await chatRes.json();
                    const chatMap: Record<string, ChatMessage[]> = {};

                    messages.forEach(msg => {
                        // Key for chat is sorted user IDs: "user1_user2"
                        const participants = [msg.from, msg.to].sort();
                        const key = participants.join('_');

                        if (!chatMap[key]) chatMap[key] = [];
                        chatMap[key].push(msg);
                    });

                    updateDb(prev => ({
                        ...prev,
                        CHAT_MESSAGES: { ...prev.CHAT_MESSAGES, ...chatMap }
                    }));
                }
            } catch (err) { console.error("Chat fetch error", err); }

            // 7. Fetch Group Chat History
            try {
                const groupRes = await fetch(`${BACKEND_URL}/group-chat/all`);
                if (groupRes.ok) {
                    const messages: GroupChatMessage[] = await groupRes.json();
                    const groupMap: Record<string, GroupChatMessage[]> = {};

                    messages.forEach(msg => {
                        if (!groupMap[msg.groupId]) groupMap[msg.groupId] = [];
                        groupMap[msg.groupId].push(msg);
                    });

                    updateDb(prev => ({
                        ...prev,
                        GROUP_CHAT_MESSAGES: { ...prev.GROUP_CHAT_MESSAGES, ...groupMap }
                    }));
                }
            } catch (err) { console.error("Group chat fetch error", err); }
            
            // 8. Update SRS counts immediately
            fetchDueFlashcards(userId);

        } catch (e) {
            console.error("❌ Failed to sync user data:", e);
        }
    };

    // --- OTHER METHODS (Implementing based on original mock behavior) ---
    
    const setApiKey = (userId: string, key: string) => {
        updateDb(prev => ({
            ...prev,
            USERS: { ...prev.USERS, [userId]: { ...prev.USERS[userId], apiKey: key } }
        }));
    };

    const markLessonComplete = (userId: string, lessonId: string) => {
        updateDb(prev => {
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

    // ... Implementation of other methods (simplified for fix) ...
    // Note: In a real app these would call API endpoints. Here we update mock DB.
    
    const submitFileAssignment = (assignmentId: string, studentId: string, fileName: string) => {
        updateDb(prev => {
            const subs = prev.FILE_SUBMISSIONS[assignmentId] || [];
            const newSub = {
                id: `sub_${Date.now()}`,
                studentId,
                studentName: prev.USERS[studentId]?.name || 'Student',
                status: 'Đã nộp' as const,
                grade: null,
                feedback: null,
                fileName,
                timestamp: new Date().toISOString()
            };
            return {
                ...prev,
                FILE_SUBMISSIONS: { ...prev.FILE_SUBMISSIONS, [assignmentId]: [...subs, newSub] }
            };
        });
    };

    const gradeFileSubmission = (assignmentId: string, studentId: string, grade: number, feedback: string) => {
        updateDb(prev => {
            const subs = prev.FILE_SUBMISSIONS[assignmentId] || [];
            const updatedSubs = subs.map(sub => sub.studentId === studentId ? { ...sub, grade, feedback } : sub);
            return {
                ...prev,
                FILE_SUBMISSIONS: { ...prev.FILE_SUBMISSIONS, [assignmentId]: updatedSubs }
            };
        });
    };

    const submitQuiz = (quizId: string, userId: string, answers: Record<string, number>) => {
        // Mock score calc would happen here or backend
        // For simplicity, we just store it
        const quiz = db.QUIZZES[quizId];
        let score = 0;
        if(quiz) {
            quiz.questions.forEach(q => {
                if(answers[q.id] === q.correctAnswer) score++;
            });
        }
        
        updateDb(prev => ({
            ...prev,
            QUIZ_SUBMISSIONS: {
                ...prev.QUIZ_SUBMISSIONS,
                [quizId]: {
                    ...prev.QUIZ_SUBMISSIONS[quizId],
                    [userId]: {
                        score,
                        total: quiz?.questions.length || 0,
                        percentage: quiz?.questions.length ? (score/quiz.questions.length)*100 : 0,
                        timestamp: new Date().toISOString(),
                        answers
                    }
                }
            }
        }));
    };

    // Placeholder implementations for other methods to satisfy interface
    const updateQuizQuestions = async (quizId: string, questions: QuizQuestion[]) => {
        // 1. Optimistic UI Update
        updateDb(prev => {
            const q = prev.QUIZZES[quizId];
            const updatedQuiz = q 
                ? { ...q, questions } 
                : { id: quizId, questions, title: 'Updated Quiz' };
            
            return {
                ...prev,
                QUIZZES: { ...prev.QUIZZES, [quizId]: updatedQuiz }
            };
        });

        // 2. Persist to Backend
        try {
            const currentQuiz = db.QUIZZES[quizId];
            
            // Backend endpoint handles UPSERT with POST
            const res = await fetch(`${BACKEND_URL}/quizzes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: quizId,
                    title: currentQuiz?.title || "Quiz", // Preserve title if exists
                    questions
                })
            });
            
            if (!res.ok) throw new Error("Failed to save quiz to server");
            
        } catch (e) {
            console.error("API Error updating quiz:", e);
            // Optionally revert DB state here if critical
        }
    };
    
    const addDiscussionPost = (lessonId: string, user: User, text: string) => {
        updateDb(prev => {
            const posts = prev.DISCUSSION[lessonId] || [];
            return {
                ...prev,
                DISCUSSION: { ...prev.DISCUSSION, [lessonId]: [...posts, { id: `d_${Date.now()}`, user: user.name, text, timestamp: new Date() }] }
            };
        });
    };

    const addVideoNote = (lessonId: string, userId: string, timestamp: number, text: string) => {
        updateDb(prev => {
            const notes = prev.VIDEO_NOTES[lessonId] || [];
            return {
                ...prev,
                VIDEO_NOTES: { ...prev.VIDEO_NOTES, [lessonId]: [...notes, { id: `vn_${Date.now()}`, userId, lessonId, timestamp, text, createdAt: new Date().toISOString() }] }
            };
        });
    };

    const deleteVideoNote = (lessonId: string, noteId: string) => {
        updateDb(prev => {
            const notes = prev.VIDEO_NOTES[lessonId] || [];
            return {
                ...prev,
                VIDEO_NOTES: { ...prev.VIDEO_NOTES, [lessonId]: notes.filter(n => n.id !== noteId) }
            };
        });
    };

    const runMockTest = (type: 'unit' | 'integration' | 'e2e') => {
        updateDb(prev => ({
            ...prev,
            MOCK_TEST_RESULTS: { ...prev.MOCK_TEST_RESULTS, [type]: 'RUNNING' }
        }));
        setTimeout(() => {
            updateDb(prev => ({
                ...prev,
                MOCK_TEST_RESULTS: { ...prev.MOCK_TEST_RESULTS, [type]: Math.random() > 0.3 ? 'PASS' : 'FAIL' }
            }));
        }, 3000);
    };

    const toggleUserLock = (userId: string) => {
        updateDb(prev => ({
            ...prev,
            USERS: { ...prev.USERS, [userId]: { ...prev.USERS[userId], isLocked: !prev.USERS[userId].isLocked } }
        }));
    };

        const deleteUser = async (uid: string) => {
        try {
            const res = await fetch(`${BACKEND_URL}/users/${uid}`, { method: 'DELETE' });
            if (res.ok) {
                updateDb(prev => {
                    const n = { ...prev.USERS };
                    delete n[uid];
                    return { ...prev, USERS: n };
                });
            } else {
                console.error("Failed to delete user from server");
                alert("Lỗi: Không thể xóa người dùng khỏi hệ thống (Backend Error).");
            }
        } catch (e) {
            console.error("Delete user error:", e);
            alert("Lỗi kết nối: Không thể xóa người dùng.");
        }
    };

    const sendAnnouncement = (text: string) => {
        updateDb(prev => ({
            ...prev,
            ANNOUNCEMENTS: [{ id: `ann_${Date.now()}`, text, timestamp: new Date() }, ...prev.ANNOUNCEMENTS]
        }));
    };

    const unlockAllUsers = () => {
        updateDb(prev => {
            const newUsers = { ...prev.USERS };
            Object.keys(newUsers).forEach(k => newUsers[k].isLocked = false);
            return { ...prev, USERS: newUsers };
        });
    };

    const registerUser = async (u: string, p: string, name: string, role: any) => {
        try {
            // GỌI API ĐĂNG KÝ XUỐNG SERVER
            const response = await fetch(`${BACKEND_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: u, password: p, name, role }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Đăng ký thất bại");
            }

            // Cập nhật giao diện ngay lập tức (Optimistic UI)
            updateDb(prev => ({
                ...prev,
                USERS: { ...prev.USERS, [u]: { id: u, password: p, name, role, isLocked: false, apiKey: null, hasSeenOnboarding: false, gamification: { points: 0, diamonds: 0, inventory: ['skin_default'], equippedSkin: 'skin_default' } as any } }
            }));
        } catch (e) {
            console.error("Registration error:", e);
            throw e; // Ném lỗi để màn hình đăng ký hiển thị thông báo đỏ
        }
    };

    const completeOnboarding = (userId: string) => {
        updateDb(prev => ({
            ...prev,
            USERS: { ...prev.USERS, [userId]: { ...prev.USERS[userId], hasSeenOnboarding: true } }
        }));
    };

    const dismissAnnouncement = (id: string) => { /* Mock */ };
    const markNotificationRead = (userId: string, notifId: string) => { /* Mock */ };
    
    const buyShopItem = (itemId: string) => {
        const item = db.SHOP_ITEMS.find(i => i.id === itemId);
        if(!item) throw new Error("Item not found");
        updateDb(prev => {
            const game = prev.GAMIFICATION;
            if(game.inventory.includes(itemId)) throw new Error("Already owned");
            if(item.currency === 'diamond' && game.diamonds < item.cost) throw new Error("Not enough diamonds");
            if(item.currency === 'xp' && game.points < item.cost) throw new Error("Not enough XP");
            
            return {
                ...prev,
                GAMIFICATION: {
                    ...game,
                    points: item.currency === 'xp' ? game.points - item.cost : game.points,
                    diamonds: item.currency === 'diamond' ? game.diamonds - item.cost : game.diamonds,
                    inventory: [...game.inventory, itemId]
                }
            };
        });
        playSound('cash');
    };

    const equipShopItem = (itemId: string) => {
        updateDb(prev => ({ ...prev, GAMIFICATION: { ...prev.GAMIFICATION, equippedSkin: itemId } }));
    };

    const equipPet = (itemId: string) => {
        updateDb(prev => ({ ...prev, GAMIFICATION: { ...prev.GAMIFICATION, equippedPet: itemId } }));
    };

    const checkDailyDiamondReward = () => {
        const today = new Date().toDateString();
        if (db.GAMIFICATION.lastStudyDate !== today) {
            updateDb(prev => ({
                ...prev,
                GAMIFICATION: {
                    ...prev.GAMIFICATION,
                    diamonds: prev.GAMIFICATION.diamonds + 5,
                    lastStudyDate: today,
                    streakDays: prev.GAMIFICATION.streakDays + 1
                }
            }));
            playSound('reward');
            return true;
        }
        return false;
    };

    const unlockSecretReward = (userId: string, type: 'skin'|'diamond', value: string|number) => {
        if(type === 'diamond') {
            updateDb(prev => ({ ...prev, GAMIFICATION: { ...prev.GAMIFICATION, diamonds: prev.GAMIFICATION.diamonds + (value as number) } }));
        } else {
            updateDb(prev => ({ ...prev, GAMIFICATION: { ...prev.GAMIFICATION, inventory: [...prev.GAMIFICATION.inventory, value as string] } }));
        }
        playSound('celebration');
    };

    const collectSpaceJunk = (junk: SpaceJunk) => {
        updateDb(prev => ({ ...prev, GAMIFICATION: { ...prev.GAMIFICATION, junkInventory: [...prev.GAMIFICATION.junkInventory, junk] } }));
        playSound('item_pickup' as any); // Assuming sound exists or handled
    };

    const recycleSpaceJunk = (junkId: string) => {
        const junk = db.GAMIFICATION.junkInventory.find(j => j.id === junkId);
        if(junk) {
            updateDb(prev => ({
                ...prev,
                GAMIFICATION: {
                    ...prev.GAMIFICATION,
                    junkInventory: prev.GAMIFICATION.junkInventory.filter(j => j.id !== junkId),
                    points: prev.GAMIFICATION.points + junk.xpValue
                }
            }));
            playSound('cash');
        }
    };

    const awardXP = (amount: number) => {
        updateDb(prev => ({ ...prev, GAMIFICATION: { ...prev.GAMIFICATION, points: prev.GAMIFICATION.points + amount } }));
        playSound('level_up');
    };

    const restoreStreak = () => { /* Mock */ };
    const recordSpeedRunResult = (userId: string, score: number) => { /* Mock */ };
    
    // --- REALTIME CHAT (Sending) ---
    const sendChatMessage = async (fromId: string, toId: string, text: string, challenge?: any, intel?: any, trade?: any, gradeDispute?: any, reward?: any, squadronInvite?: any) => {
        const payload = { id: `msg_${Date.now()}`, from: fromId, to: toId, text, challenge, intel, trade, gradeDispute, reward, squadronInvite };
        
        // Optimistic UI Update
        const key = [fromId, toId].sort().join('_');
        updateDb(prev => ({
            ...prev,
            CHAT_MESSAGES: {
                ...prev.CHAT_MESSAGES,
                [key]: [...(prev.CHAT_MESSAGES[key] || []), { ...payload, timestamp: new Date() }]
            }
        }));
        playSound('sent');

        // Send to Backend
        try {
            await fetch(`${BACKEND_URL}/chat/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) { console.error("Send message failed", e); }
    };

    const sendGroupMessage = async (groupId: string, user: User, text: string, metadata?: { isSOS?: boolean, isWhisper?: boolean }) => {
        const payload = {
            id: `gmsg_${Date.now()}`,
            groupId,
            user: { id: user.id, name: user.name, role: user.role },
            text,
            isSOS: metadata?.isSOS,
            isWhisper: metadata?.isWhisper,
            sosStatus: metadata?.isSOS ? 'PENDING' : undefined
        };

        // Optimistic UI Update
        updateDb(prev => ({
            ...prev,
            GROUP_CHAT_MESSAGES: {
                ...prev.GROUP_CHAT_MESSAGES,
                [groupId]: [...(prev.GROUP_CHAT_MESSAGES[groupId] || []), { ...payload, timestamp: new Date() }]
            }
        }));
        
        if(metadata?.isSOS) playSound('notification');
        else playSound('sent');

        // Send to Backend
        try {
            await fetch(`${BACKEND_URL}/group-chat/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) { console.error("Send group message failed", e); }
    };

    const deleteGroupMessage = async (groupId: string, msgId: string) => {
        // Optimistic UI
        updateDb(prev => ({
            ...prev,
            GROUP_CHAT_MESSAGES: {
                ...prev.GROUP_CHAT_MESSAGES,
                [groupId]: (prev.GROUP_CHAT_MESSAGES[groupId] || []).filter(m => m.id !== msgId)
            }
        }));
        
        try {
            await fetch(`${BACKEND_URL}/group-chat/${msgId}`, { method: 'DELETE' });
        } catch (e) { console.error(e); }
    };

    const joinGroup = async (groupId: string, userId: string, inviteMsgId?: string) => {
        try {
            const res = await fetch(`${BACKEND_URL}/groups/${groupId}/join`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            if (res.ok) {
                // Fetch updated groups to refresh UI
                const groupsRes = await fetch(`${BACKEND_URL}/groups`);
                const groups = await groupsRes.json();
                updateDb(prev => ({ ...prev, STUDY_GROUPS: groups }));
                
                // If via invite message, could update its status here
            }
        } catch (e) { console.error(e); }
    };

    const createGroup = async (name: string, creatorId: string) => {
        try {
            // FIX: Generate ID on client to satisfy Backend Schema requirements
            const newGroupId = `g_${Date.now()}`;
            
            const res = await fetch(`${BACKEND_URL}/groups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    id: newGroupId, 
                    name, 
                    members: [creatorId] 
                }) 
            });

            if (res.ok) {
                const group: StudyGroup = await res.json();
                
                // --- FIX: XÓA PHẦN TỰ CẬP NHẬT Ở ĐÂY ---
                // Chúng ta sẽ dựa vào sự kiện socket 'db_update' từ server gửi về để cập nhật UI.
                // Nếu giữ lại dòng dưới đây, UI sẽ hiển thị 2 nhóm (1 do hàm này thêm, 1 do socket thêm).
                
                /* 
                updateDb(prev => ({
                    ...prev,
                    STUDY_GROUPS: [...prev.STUDY_GROUPS, group]
                }));
                */

                // Join the socket room for real-time updates
                if (socket) socket.emit('join_group', group.id);
            } else {
                const errData = await res.json();
                console.error("Failed to create group on server:", errData);
                alert(`Lỗi: Không thể tạo phi đội. ${errData.message || ''}`);
            }
        } catch (e) {
            console.error("Create group network error:", e);
            alert("Lỗi kết nối: Không thể tạo phi đội.");
        }
    };

    const createRaidParty = () => {};
    const resolveSOS = (groupId: string, msgId: string, rescuerId: string) => {
        updateDb(prev => {
            const msgs = prev.GROUP_CHAT_MESSAGES[groupId] || [];
            const updated = msgs.map(m => m.id === msgId ? { ...m, sosStatus: 'RESOLVED', rescuerName: prev.USERS[rescuerId].name } : m);
            return {
                ...prev,
                GROUP_CHAT_MESSAGES: { ...prev.GROUP_CHAT_MESSAGES, [groupId]: updated }
            };
        });
    };

    const processTrade = (msgId: string, buyerId: string) => { /* Mock */ };
    const sendReward = (teacherId: string, studentId: string, type: 'diamond' | 'item', value: number | string, message: string) => {
        // Reuse sendChatMessage logic
        sendChatMessage(teacherId, studentId, "🎁 You received a reward!", undefined, undefined, undefined, undefined, { type, value, message });
    };

    const createFlashcardDeck = async (userId: string, title: string, cards: Flashcard[]) => {
        // FIX: GENERATE ID FRONTEND SIDE TO AVOID SYNC ISSUES
        const newDeckId = `deck_${Date.now()}`;
        try {
            const res = await fetch(`${BACKEND_URL}/decks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: newDeckId, userId, title, cards })
            });
            if (res.ok) {
                const deck = await res.json();
                updateDb(prev => ({ 
                    ...prev, 
                    FLASHCARD_DECKS: { ...prev.FLASHCARD_DECKS, [deck.id]: deck } 
                }));
            }
        } catch (e) {
            console.error("API Error Create Deck:", e);
        }
    };

    const deleteFlashcardDeck = async (deckId: string) => {
        try {
            await fetch(`${BACKEND_URL}/decks/${deckId}`, { method: 'DELETE' });
            updateDb(prev => {
                const newDecks = { ...prev.FLASHCARD_DECKS };
                delete newDecks[deckId];
                return { ...prev, FLASHCARD_DECKS: newDecks };
            });
        } catch (e) { console.error(e); }
    };

    const renameFlashcardDeck = (deckId: string, newTitle: string) => {
        updateDb(prev => ({
            ...prev,
            FLASHCARD_DECKS: { ...prev.FLASHCARD_DECKS, [deckId]: { ...prev.FLASHCARD_DECKS[deckId], title: newTitle } }
        }));
    };

    const addFlashcardToDeck = () => {};
    const updateFlashcardInDeck = (deckId: string, card: Flashcard) => {
        updateDb(prev => {
            const deck = prev.FLASHCARD_DECKS[deckId];
            if(!deck) return prev;
            const newCards = deck.cards.map(c => c.id === card.id ? card : c);
            return { ...prev, FLASHCARD_DECKS: { ...prev.FLASHCARD_DECKS, [deckId]: { ...deck, cards: newCards } } };
        });
    };

    const createStandaloneQuiz = () => {};
    
    const updateScratchpad = (userId: string, content: string) => {
        updateDb(prev => ({ ...prev, SCRATCHPAD: { ...prev.SCRATCHPAD, [userId]: content } }));
    };

    const createPersonalNote = async (userId: string, title: string, content: string, links?: any) => {
        // FIX: GENERATE ID FRONTEND SIDE TO AVOID SYNC ISSUES
        const newNoteId = `note_${Date.now()}`;
        try {
            const res = await fetch(`${BACKEND_URL}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: newNoteId, userId, title, content, ...links })
            });
            if (res.ok) {
                const note = await res.json();
                updateDb(prev => ({ ...prev, PERSONAL_NOTES: { ...prev.PERSONAL_NOTES, [note.id]: note } }));
            }
        } catch (e) { console.error(e); }
    };

    const updatePersonalNote = async (noteId: string, updates: Partial<PersonalNote>) => {
        try {
            await fetch(`${BACKEND_URL}/notes/${noteId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            updateDb(prev => ({
                ...prev,
                PERSONAL_NOTES: { ...prev.PERSONAL_NOTES, [noteId]: { ...prev.PERSONAL_NOTES[noteId], ...updates, updatedAt: new Date().toISOString() } }
            }));
        } catch(e) { console.error(e); }
    };

    const deletePersonalNote = async (noteId: string) => {
        try {
            await fetch(`${BACKEND_URL}/notes/${noteId}`, { method: 'DELETE' });
            updateDb(prev => {
                const newNotes = { ...prev.PERSONAL_NOTES };
                delete newNotes[noteId];
                return { ...prev, PERSONAL_NOTES: newNotes };
            });
        } catch(e) { console.error(e); }
    };

    const saveNodeNote = (userId: string, pathId: string, nodeId: string, content: string) => {
        const key = `${pathId}_${nodeId}_${userId}`;
        updateDb(prev => ({
            ...prev,
            NODE_NOTES: { ...prev.NODE_NOTES, [key]: { id: key, userId, title: 'Node Note', content, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }
        }));
    };

    const savePdfToNote = async (noteId: string, file: File) => {
        setPdfStorage(prev => ({ ...prev, [noteId]: file }));
        updatePersonalNote(noteId, { pdfFileId: noteId });
    };

    const getPdfForNote = async (fileId: string) => {
        return pdfStorage[fileId] || null;
    };

    const removePdfFromNote = (noteId: string) => {
        setPdfStorage(prev => {
            const newStorage = { ...prev };
            delete newStorage[noteId];
            return newStorage;
        });
        updatePersonalNote(noteId, { pdfFileId: undefined });
    };

    const shareNoteToSquadron = (noteId: string, groupId: string) => {
        updatePersonalNote(noteId, { sharedWithSquadronId: groupId });
    };

    const unshareNote = (noteId: string) => {
        updatePersonalNote(noteId, { sharedWithSquadronId: undefined });
    };

    const unlockSharedNote = (noteId: string, userId: string) => {
        updateDb(prev => {
            const note = prev.PERSONAL_NOTES[noteId];
            if(!note) return prev;
            return {
                ...prev,
                PERSONAL_NOTES: { ...prev.PERSONAL_NOTES, [noteId]: { ...note, unlockedBy: [...(note.unlockedBy || []), userId] } }
            };
        });
    };

    const addNoteComment = (noteId: string, userId: string, content: string, highlightedText?: string) => {
        updateDb(prev => {
            const note = prev.PERSONAL_NOTES[noteId];
            if(!note) return prev;
            const newComment = {
                id: `cmt_${Date.now()}`,
                userId,
                userName: prev.USERS[userId]?.name || 'User',
                content,
                highlightedText,
                timestamp: new Date().toISOString()
            };
            return {
                ...prev,
                PERSONAL_NOTES: { ...prev.PERSONAL_NOTES, [noteId]: { ...note, comments: [...(note.comments || []), newComment] } }
            };
        });
    };

    
    const createLearningPath = async (creatorId: string, title: string, topic: string, nodes: LearningNode[], surveyData: any, wagerAmount?: number) => {
        try {
            // FIX: Generate ID client-side
            const newId = `lp_${Date.now()}`;

            const payload = {
                id: newId, // Required by Backend Schema
                creatorId,
                title,
                topic,
                nodes, // Nodes should already have IDs from generator
                targetLevel: surveyData.level,
                goal: surveyData.goal,
                dailyCommitment: surveyData.time,
                wager: wagerAmount ? {
                    amount: wagerAmount,
                    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days later
                    isResolved: false
                } : undefined
            };

            const res = await fetch(`${BACKEND_URL}/paths`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || "Failed to create path on server");
            }

            const createdPath = await res.json();
            
            // Optimistic Update (Optional, usually Socket handles this, but good for instant feedback)
            updateDb(prev => ({
                ...prev,
                LEARNING_PATHS: {
                    ...prev.LEARNING_PATHS,
                    [createdPath.id]: createdPath
                }
            }));

            return createdPath.id; // Return ID so UI can navigate or show modal
        } catch (e: any) {
            console.error("Create Path Error:", e);
            throw e; // Rethrow to be caught by Page component
        }
    };


    // FIX: Implement assignLearningPath
    const assignLearningPath = async (teacherName: string, studentIds: string[], pathData: any) => {
        try {
            const payload = { teacherName, studentIds, pathData };
            const res = await fetch(`${BACKEND_URL}/paths/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to assign path");
            }
            console.log("✅ Learning Path Assigned successfully");
        } catch (e) {
            console.error("Assign Path Error:", e);
            throw e;
        }
    };

    const updateNodeProgress = async (pathId: string, nodeId: string, updates: Partial<LearningNode>) => {
        // 1. Calculate new state based on current db
        const path = db.LEARNING_PATHS[pathId];
        if (!path) return;

        const updatedNodes = path.nodes.map(n => 
            n.id === nodeId ? { ...n, ...updates } : n
        );
        
        const updatedPath = { ...path, nodes: updatedNodes };

        // 2. Optimistic UI Update
        updateDb(prev => ({
            ...prev,
            LEARNING_PATHS: {
                ...prev.LEARNING_PATHS,
                [pathId]: updatedPath
            }
        }));

        // 3. Persist to Backend
        try {
            await fetch(`${BACKEND_URL}/paths/${pathId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedPath)
            });
        } catch (e) {
            console.error("Failed to save node progress to server:", e);
            // Optional: Revert UI if needed, or show error toast
        }
    };

    const unlockNextNode = (pathId: string, currentNodeId: string) => {
        const path = db.LEARNING_PATHS[pathId];
        if (!path) return;
        
        const currentIndex = path.nodes.findIndex(n => n.id === currentNodeId);
        if (currentIndex !== -1 && currentIndex < path.nodes.length - 1) {
            const nextNode = path.nodes[currentIndex + 1];
            if (nextNode.isLocked) {
                updateNodeProgress(pathId, nextNode.id, { isLocked: false });
            }
        }
    };

    const extendLearningPath = async (pathId: string, newNodes: LearningNode[]) => {
        const path = db.LEARNING_PATHS[pathId];
        if (!path) return;

        const updatedNodes = [...path.nodes, ...newNodes];
        const updatedPath = { ...path, nodes: updatedNodes };

        // 1. Optimistic Update
        updateDb(prev => ({
            ...prev,
            LEARNING_PATHS: {
                ...prev.LEARNING_PATHS,
                [pathId]: updatedPath
            }
        }));

        // 2. Persist to Backend
        try {
            await fetch(`${BACKEND_URL}/paths/${pathId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedPath)
            });
        } catch (e) {
            console.error("Failed to extend path on server:", e);
        }
    };

    const skipLearningPath = (userId: string, pathId: string) => {
        updateDb(prev => {
            const path = prev.LEARNING_PATHS[pathId];
            if(!path) return prev;
            const newNodes = path.nodes.map(n => ({ ...n, isLocked: false, isCompleted: true }));
            return { ...prev, LEARNING_PATHS: { ...prev.LEARNING_PATHS, [pathId]: { ...path, nodes: newNodes } } };
        });
    };

    const addTask = (userId: string, text: string) => {
        const task: Task = {
            id: `task_${Date.now()}`,
            userId,
            text,
            isCompleted: false,
            isArchived: false,
            createdAt: new Date().toISOString()
        };
        updateDb(prev => ({ ...prev, TASKS: { ...prev.TASKS, [task.id]: task } }));
    };

    const toggleTaskCompletion = (taskId: string, isCompleted: boolean) => {
        updateDb(prev => {
            const task = prev.TASKS[taskId];
            if (!task) return prev;
            return {
                ...prev,
                TASKS: {
                    ...prev.TASKS,
                    [taskId]: {
                        ...task,
                        isCompleted: isCompleted,
                        completedAt: isCompleted ? new Date().toISOString() : undefined
                    }
                }
            };
        });
    };

    const deleteTask = (taskId: string) => {
        updateDb(prev => {
            const newTasks = { ...prev.TASKS };
            delete newTasks[taskId];
            return { ...prev, TASKS: newTasks };
        });
    };
    const archiveCompletedTasks = (userId: string) => { /* Mock */ };
    
    // --- UPDATED: Persist Assignment Creation to Backend ---
    const createFileAssignment = async (title: string, courseId: string) => {
        const asg: Assignment = {
            id: `a_${Date.now()}`,
            courseId,
            title,
            type: 'file'
        };
        
        // Optimistic UI
        updateDb(prev => ({ ...prev, ASSIGNMENTS: { ...prev.ASSIGNMENTS, [asg.id]: asg } }));

        try {
            await fetch(`${BACKEND_URL}/assignments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(asg)
            });
        } catch(e) { console.error("Create Assignment API Failed", e); }
    };

    const createQuizAssignment = async (title: string, courseId: string, questions: QuizQuestion[]) => {
        const quizId = `qz_${Date.now()}`;
        const quiz: Quiz = {
            id: quizId,
            questions
        };
        const asg: Assignment = {
            id: `a_${Date.now()}`,
            courseId,
            title,
            type: 'quiz',
            quizId: quiz.id
        };

        // Optimistic UI
        updateDb(prev => ({
            ...prev,
            QUIZZES: { ...prev.QUIZZES, [quiz.id]: quiz },
            ASSIGNMENTS: { ...prev.ASSIGNMENTS, [asg.id]: asg }
        }));

        try {
            // Save Quiz First
            await fetch(`${BACKEND_URL}/quizzes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(quiz)
            });
            // Save Assignment
            await fetch(`${BACKEND_URL}/assignments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(asg)
            });
        } catch(e) { console.error("Create Quiz Assignment API Failed", e); }
    };

    const createBossChallenge = async (courseId: string, title: string, description: string, xp: number) => {
        const asg: Assignment = {
            id: `boss_${Date.now()}`,
            courseId,
            title,
            description,
            type: 'file', // Simplified
            isBoss: true,
            rank: 'S',
            rewardXP: xp
        };
        updateDb(prev => ({ ...prev, ASSIGNMENTS: { ...prev.ASSIGNMENTS, [asg.id]: asg } }));
        
        try {
            await fetch(`${BACKEND_URL}/assignments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(asg)
            });
        } catch(e) { console.error("Create Boss Challenge API Failed", e); }
    };

    const sendIntervention = (assignmentId: string, questionId: string, note: string, studentIds: string[]) => { /* Mock */ };
    
    // --- UPDATED: Persist Course Creation to Backend ---
    const adminCreateCourse = async (name: string, teacherName: string, modules: GeneratedModule[], defaultPersona?: string, autoSeedApiKey?: string, isBeta?: boolean) => {
        const courseId = `c_${Date.now()}`;
        
        // 1. Persist Items
        const persistedModules: Module[] = [];
        
        for (let i = 0; i < modules.length; i++) {
            const m = modules[i];
            const modItems: ModuleItem[] = [];
            
            for (let j = 0; j < m.items.length; j++) {
                const it = m.items[j];
                const itemId = `item_${Date.now()}_${i}_${j}`;
                
                if (it.type.includes('lesson')) {
                    const lesson: Lesson = {
                        id: itemId,
                        courseId: courseId,
                        title: it.title,
                        type: it.type === 'lesson_video' ? 'video' : 'text',
                        content: it.contentOrDescription
                    };
                    // API Call
                    await fetch(`${BACKEND_URL}/lessons`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(lesson)
                    });
                    
                    // Optimistic update
                    updateDb(prev => ({ ...prev, LESSONS: { ...prev.LESSONS, [lesson.id]: lesson } }));
                    modItems.push({ type: 'lesson', id: itemId });
                } else {
                    const asg: Assignment = {
                        id: itemId,
                        courseId: courseId,
                        title: it.title,
                        type: it.type === 'assignment_quiz' ? 'quiz' : 'file',
                        description: it.contentOrDescription
                    };
                    // API Call
                    await fetch(`${BACKEND_URL}/assignments`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(asg)
                    });

                    // Optimistic update
                    updateDb(prev => ({ ...prev, ASSIGNMENTS: { ...prev.ASSIGNMENTS, [asg.id]: asg } }));
                    modItems.push({ type: 'assignment', id: itemId });
                }
            }
            persistedModules.push({ id: `m_${i}`, name: m.title, items: modItems });
        }

        const course: Course = {
            id: courseId,
            name,
            teacher: teacherName,
            defaultPersona
        };

        const structure: CourseStructure = {
            modules: persistedModules
        };

        // 2. Persist Course (with structure nested or linked)
        // Note: The backend model expects modules inside course usually, but our frontend state splits them.
        // We will send the full object to a route that handles it or update the course object to contain modules.
        const courseWithModules = { ...course, modules: persistedModules };
        
        await fetch(`${BACKEND_URL}/courses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(courseWithModules)
        });

        updateDb(prev => ({
            ...prev,
            COURSES: [...prev.COURSES, course],
            COURSE_STRUCTURE: { ...prev.COURSE_STRUCTURE, [course.id]: structure }
        }));
    };

    const generateArchive = async (apiKey: string, type: 'course'|'squadron', id: string, name: string): Promise<string> => {
        // Call service
        return generateLegacyArchiveContent(apiKey, {}, type, name);
    };

    const addCommunityQuestion = (userId: string, nodeId: string, question: QuizQuestion) => {
        updateDb(prev => ({ ...prev, COMMUNITY_QUESTIONS: [...prev.COMMUNITY_QUESTIONS, { userId, nodeId, question }] }));
    };

    const addLessonToCourse = (courseId: string, title: string, content: string) => {
        const lesson: Lesson = {
            id: `l_${Date.now()}`,
            courseId,
            title,
            type: 'text',
            content
        };
        // Very simplified: append to first module of course
        updateDb(prev => {
            const structure = prev.COURSE_STRUCTURE[courseId];
            if(structure && structure.modules.length > 0) {
                structure.modules[0].items.push({ type: 'lesson', id: lesson.id });
            }
            return { ...prev, LESSONS: { ...prev.LESSONS, [lesson.id]: lesson } };
        });
    };

    const editLessonContent = (lessonId: string, newContent: string) => {
        updateDb(prev => ({
            ...prev,
            LESSONS: { ...prev.LESSONS, [lessonId]: { ...prev.LESSONS[lessonId], content: newContent } }
        }));
    };

    const updateCourseSettings = (courseId: string, settings: Partial<Course>) => {
        updateDb(prev => ({
            ...prev,
            COURSES: prev.COURSES.map(c => c.id === courseId ? { ...c, ...settings } : c)
        }));
    };

    return (
        <DataContext.Provider value={{
            db, syncUserToDb, unreadCounts, resetUnreadCount, playSound, connectSocket,
            setApiKey, markLessonComplete, submitFileAssignment, gradeFileSubmission, submitQuiz, updateQuizQuestions,
            addDiscussionPost, addVideoNote, deleteVideoNote, runMockTest, toggleUserLock, deleteUser, sendAnnouncement, unlockAllUsers,
            registerUser, completeOnboarding, dismissAnnouncement, markNotificationRead, buyShopItem, equipShopItem, equipPet,
            checkDailyDiamondReward, unlockSecretReward, collectSpaceJunk, recycleSpaceJunk, awardXP, restoreStreak,
            recordSpeedRunResult, sendChatMessage, sendGroupMessage, deleteGroupMessage, joinGroup, createGroup, createRaidParty, resolveSOS, processTrade,
            createFlashcardDeck, deleteFlashcardDeck, renameFlashcardDeck, addFlashcardToDeck, updateFlashcardInDeck, createStandaloneQuiz, updateScratchpad, createPersonalNote, updatePersonalNote,
            deletePersonalNote, saveNodeNote, savePdfToNote, getPdfForNote, removePdfFromNote, shareNoteToSquadron, unshareNote,
            unlockSharedNote, addNoteComment, createLearningPath, assignLearningPath, updateNodeProgress, unlockNextNode, extendLearningPath,
            skipLearningPath, addTask, toggleTaskCompletion, deleteTask, archiveCompletedTasks, createFileAssignment, createQuizAssignment, createBossChallenge, sendIntervention,
            adminCreateCourse, generateArchive, addCommunityQuestion, addLessonToCourse, editLessonContent, updateCourseSettings, sendReward,
            fetchUserData,
            dueFlashcardsCount, fetchDueFlashcards, recordCardReview,
            fetchUpcomingFlashcards
        }}>
            {children}
        </DataContext.Provider>
    );
};

// ... (Other providers: GlobalStateProvider, PageProvider, AuthProvider, MusicProvider, PetProvider)
export const GlobalStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [serviceStatus, setServiceStatus] = useState<ServiceStatus>({
        user_management: 'OPERATIONAL', course_management: 'OPERATIONAL', content_delivery: 'OPERATIONAL', assessment_taking: 'OPERATIONAL', storage_service: 'OPERATIONAL', grading_service: 'OPERATIONAL', notification_service: 'OPERATIONAL', chat_service: 'OPERATIONAL', group_service: 'OPERATIONAL', forum_service: 'OPERATIONAL', ai_tutor_service: 'OPERATIONAL', ai_assistant_service: 'OPERATIONAL', personalization: 'OPERATIONAL', analytics: 'OPERATIONAL'
    });
    const [featureFlags, setFeatureFlags] = useState<Record<string, FeatureFlag>>({});
    const [pomodoro, setPomodoro] = useState<{ isActive: boolean; seconds: number; mode: 'focus' | 'break' }>({ isActive: false, seconds: 25 * 60, mode: 'focus' });
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

    const setFeatureFlag = (key: string, status: any, specificUsers: string = '') => { setFeatureFlags(prev => ({ ...prev, [key]: { status, specificUsers } })); };
    const setPage = (newPage: string, params?: any) => { setPageInternal(newPage); setPageParams(params || null); };

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
    const { fetchUserData, syncUserToDb, connectSocket } = useContext(DataContext)!;
    const { navigate } = useContext(PageContext)!;
    
    const [user, setUser] = useState<User | null>(null);
    const [error, setError] = useState<string | null>(null);

    const login = async (u: string, p: string) => {
        try {
            const response = await fetch(`${BACKEND_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: u, password: p }), });
            const data = await response.json();
            if (response.ok) {
                const loggedUser: User = { id: data.id, name: data.name, role: data.role, isLocked: data.isLocked || false, apiKey: null, hasSeenOnboarding: data.hasSeenOnboarding || false, squadronId: data.squadronId };
                setUser(loggedUser);
                setError(null);
                syncUserToDb(loggedUser);
                // Call real fetch to populate context from DB
                await fetchUserData(loggedUser.id);
                // Init Socket
                connectSocket(loggedUser.id);
                navigate('dashboard');
            } else { setError(data.message || "Login failed"); }
        } catch (err) { console.error("Login API Error:", err); setError("Cannot connect to server."); }
    };

    const logout = () => { setUser(null); navigate('dashboard'); };
    const isLocked = user?.isLocked || false;

    useEffect(() => {
        if (!user) return;
        const heartbeat = () => { fetch(`${BACKEND_URL}/users/heartbeat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) }).catch(e => console.error("Heartbeat failed", e)); };
        heartbeat();
        const interval = setInterval(heartbeat, 30000);
        return () => clearInterval(interval);
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, isLocked, login, logout, error }}>
            {children}
        </AuthContext.Provider>
    );
};

export const MusicProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentTrack, setCurrentTrack] = useState<{ name: string, url: string, tempo?: 'slow' | 'medium' | 'fast' } | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => { if (!audioRef.current) { audioRef.current = new Audio(); } }, []);
    useEffect(() => {
        if (audioRef.current) {
            if (currentTrack) {
                if (audioRef.current.src !== currentTrack.url) { audioRef.current.src = currentTrack.url; if (isPlaying) audioRef.current.play(); } else { if (isPlaying) audioRef.current.play(); else audioRef.current.pause(); }
            } else { audioRef.current.pause(); }
        }
    }, [currentTrack, isPlaying]);

    const playTrack = (track: { name: string, url: string, tempo?: 'slow' | 'medium' | 'fast' }) => { if (currentTrack?.name === track.name) { setIsPlaying(!isPlaying); } else { setCurrentTrack(track); setIsPlaying(true); } };
    const togglePlay = () => { if (currentTrack) setIsPlaying(!isPlaying); };

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
        if (reaction !== 'sleep' && !reaction.startsWith('hover_')) { timeoutRef.current = window.setTimeout(() => { setCurrentReaction('idle'); }, 3000); }
    };

    const say = (text: string, duration: number = 5000) => {
        setPetDialogue(text);
        if (dialogueTimeoutRef.current) clearTimeout(dialogueTimeoutRef.current);
        dialogueTimeoutRef.current = window.setTimeout(() => { setPetDialogue(null); }, duration);
    };

    return (
        <PetContext.Provider value={{ currentReaction, triggerReaction, petDialogue, say, petPosition, setPetPosition }}>
            {children}
        </PetContext.Provider>
    );
};
