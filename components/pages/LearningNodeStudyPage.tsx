
import React, { useState, useContext, useEffect } from 'react';
import { AuthContext, DataContext, PageContext, GlobalStateContext, PetContext } from '../../contexts/AppProviders';
import { generateNodeFlashcards, generateNodeExam, generateAdvancedPath } from '../../services/geminiService';
import type { Flashcard, ExamQuestion } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';
import NodeNoteModal from '../modals/NodeNoteModal';
import ChallengerModal from '../modals/ChallengerModal';

interface LearningNodeStudyPageProps {
    pathId: string;
    nodeId: string;
    isLastNode: boolean;
}

type StudyPhase = 'START' | 'GEN_FLASHCARDS' | 'STUDY_FLASHCARDS' | 'HARVEST' | 'GEN_EXAM' | 'TAKE_EXAM' | 'RESULT' | 'EXTENDING_PATH';

// ... existing SkinAtmosphere ...
const SkinAtmosphere: React.FC<{ skinId: string }> = ({ skinId }) => {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {/* BASE ATMOSPHERE based on skin */}
            {skinId === 'skin_fire' && (
                <>
                    <div className="absolute inset-0 bg-red-900/10 mix-blend-overlay"></div>
                    <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-red-900/30 to-transparent"></div>
                </>
            )}
             {skinId === 'skin_forest' && (
                <>
                    <div className="absolute inset-0 bg-green-900/10 mix-blend-overlay"></div>
                    {/* Fireflies */}
                     <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-green-400 rounded-full blur-[2px] animate-pulse"></div>
                     <div className="absolute top-3/4 right-1/4 w-1.5 h-1.5 bg-yellow-300 rounded-full blur-[1px] animate-pulse" style={{ animationDelay: '1s'}}></div>
                </>
            )}
             {skinId === 'skin_neon' && (
                <>
                    <div className="absolute inset-0 bg-blue-900/10 mix-blend-overlay"></div>
                    <div className="absolute top-0 w-full h-px bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)]"></div>
                    <div className="absolute bottom-0 w-full h-px bg-purple-400 shadow-[0_0_15px_rgba(192,132,252,0.8)]"></div>
                </>
            )}
            {skinId === 'skin_galaxy' && (
                 <>
                    <div className="absolute inset-0 bg-indigo-900/20 mix-blend-overlay"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px]"></div>
                 </>
            )}
        </div>
    );
}

// Helper for dynamic font size
const getFontSize = (text: string) => {
    if (text.length < 20) return 'text-4xl';
    if (text.length < 50) return 'text-2xl';
    if (text.length < 100) return 'text-xl';
    return 'text-lg';
};

const LearningNodeStudyPage: React.FC<LearningNodeStudyPageProps> = ({ pathId, nodeId, isLastNode }) => {
    const { user } = useContext(AuthContext)!;
    const { db, updateNodeProgress, unlockNextNode, extendLearningPath, checkDailyDiamondReward, unlockSecretReward } = useContext(DataContext)!;
    const { navigate, params } = useContext(PageContext)!;
    const { setPage: setGlobalPage } = useContext(GlobalStateContext)!;
    const { triggerReaction, say } = useContext(PetContext)!; // Added PetContext
    
    const node = db.LEARNING_PATHS?.[pathId]?.nodes.find(n => n.id === nodeId);

    const [phase, setPhase] = useState<StudyPhase>('START');
    const [error, setError] = useState<string | null>(null);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [isChallengerModalOpen, setIsChallengerModalOpen] = useState(false);
    
    // Specific state for Auto-Harvest
    const [triggerHarvest, setTriggerHarvest] = useState(false);

    // Flashcard State
    const [flashcardQueue, setFlashcardQueue] = useState<Flashcard[]>([]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [masteredCount, setMasteredCount] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isReviewing, setIsReviewing] = useState(false);
    // NEW: Flashcard Editing State
    const [isEditingCard, setIsEditingCard] = useState(false);
    const [editFront, setEditFront] = useState('');
    const [editBack, setEditBack] = useState('');

    // Exam State (Duolingo Style)
    const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [examAnswers, setExamAnswers] = useState<Record<string, string>>({}); // For arrange_words: space-separated words
    const [examResults, setExamResults] = useState<Record<string, boolean>>({}); // Track correct/incorrect per Q
    const [isAnswerChecked, setIsAnswerChecked] = useState(false); 
    const [examScore, setExamScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [sessionXp, setSessionXp] = useState(0);

    // Skin State
    const equippedSkinId = db.GAMIFICATION.equippedSkin;
    const activeSkin = db.SHOP_ITEMS.find(i => i.id === equippedSkinId) || db.SHOP_ITEMS[0];

    useEffect(() => {
        if (node) {
            setMasteredCount(node.flashcardsMastered || 0);
            setExamScore(node.examScore || 0);
        }
    }, [node]);

    if (!node) return <div className="text-center p-8 text-white">Lỗi: Node không tồn tại.</div>;

    // --- UTILS ---
    const playSound = (type: 'correct' | 'wrong' | 'finish') => {
        // Placeholder for sound effects
    };

    // --- SRS LOGIC (Duolingo Style) ---
    const calculateNextReview = (currentBox: number, difficulty: 'easy' | 'medium' | 'hard'): { box: number, nextReview: number } => {
        const now = Date.now();
        const ONE_HOUR = 60 * 60 * 1000;
        const ONE_DAY = 24 * ONE_HOUR;

        if (difficulty === 'hard') {
            return { box: 0, nextReview: now }; // Immediate repeat
        } else if (difficulty === 'medium') {
            return { box: currentBox, nextReview: now }; // Repeat in session, keep progress
        } else {
            // Easy
            const newBox = currentBox + 1;
            let interval = 0;
            switch (newBox) {
                case 1: interval = 4 * ONE_HOUR; break;
                case 2: interval = 1 * ONE_DAY; break;
                case 3: interval = 3 * ONE_DAY; break;
                case 4: interval = 7 * ONE_DAY; break;
                case 5: interval = 14 * ONE_DAY; break;
                default: interval = 30 * ONE_DAY; break;
            }
            return { box: newBox, nextReview: now + interval };
        }
    };

    // --- ACTIONS ---

    const generateAndStartFlashcards = async (mode: 'new' | 'review') => {
        setPhase('GEN_FLASHCARDS');
        
        let existingCards = node.flashcards || [];
        let queue: Flashcard[] = [];

        if (existingCards.length === 0) {
             const apiKey = user ? db.USERS[user.id]?.apiKey : null;
            if (!apiKey) { 
                setError("Vui lòng cấu hình API Key."); 
                setGlobalPage('api_key', { isApiKeyModalOpen: true });
                setPhase('START'); 
                return; 
            }

            try {
                // Requesting 30 cards as per user request
                const rawCards = await generateNodeFlashcards(apiKey, node.title, node.description);
                existingCards = rawCards.map(c => ({ ...c, box: 0, nextReview: 0 }));
                updateNodeProgress(pathId, node.id, { flashcards: existingCards });
            } catch (e) {
                setError("Lỗi kết nối AI. Vui lòng thử lại.");
                setPhase('START');
                return;
            }
        }

        const now = Date.now();
        
        if (mode === 'new') {
            queue = existingCards.filter(c => c.nextReview <= now || c.box === 0);
            if (queue.length === 0) {
                queue = existingCards.sort(() => 0.5 - Math.random()).slice(0, 10);
            }
        } else {
             queue = existingCards;
        }

        setFlashcardQueue(queue);
        setPhase('STUDY_FLASHCARDS');
        setCurrentCardIndex(0);
        setIsFlipped(false);
        setSessionXp(0);
    };

    useEffect(() => {
        if (params?.mode === 'repair') {
            setTimeout(() => {
                setIsReviewing(true);
                generateAndStartFlashcards('review');
            }, 500);
        }
    }, [params]);

    const startFlashcards = async () => {
        setIsReviewing(false);
        await generateAndStartFlashcards('new');
    };

    const reviewFlashcards = async () => {
        setIsReviewing(true);
        await generateAndStartFlashcards('review');
    };

    // --- FLASHCARD EDIT HANDLERS ---
    const handleEditCardStart = (e: React.MouseEvent) => {
        e.stopPropagation();
        const currentCard = flashcardQueue[currentCardIndex];
        setEditFront(currentCard.front);
        setEditBack(currentCard.back);
        setIsEditingCard(true);
    };

    const handleEditCardSave = (e: React.MouseEvent) => {
        e.stopPropagation();
        const currentCard = flashcardQueue[currentCardIndex];
        const updatedCard = { ...currentCard, front: editFront, back: editBack };
        
        // Update Queue
        const newQueue = [...flashcardQueue];
        newQueue[currentCardIndex] = updatedCard;
        setFlashcardQueue(newQueue);

        // Update Persistence
        const fullList = node.flashcards ? node.flashcards.map(c => c.id === updatedCard.id ? updatedCard : c) : [];
        updateNodeProgress(pathId, node.id, { flashcards: fullList });

        setIsEditingCard(false);
    };

    const handleEditCardCancel = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditingCard(false);
    };

    const handleFlashcardResult = (difficulty: 'easy' | 'medium' | 'hard') => {
        const currentCard = flashcardQueue[currentCardIndex];
        const nextQueue = [...flashcardQueue];
        
        const { box: newBox, nextReview } = calculateNextReview(currentCard.box || 0, difficulty);
        
        const updatedCard = { 
            ...currentCard, 
            box: newBox, 
            nextReview: nextReview,
            lastReviewed: Date.now() 
        };

        const fullList = node.flashcards ? node.flashcards.map(c => c.id === updatedCard.id ? updatedCard : c) : [];
        
        const newMasteredCount = fullList.filter(c => c.box > 0).length;
        
        updateNodeProgress(pathId, node.id, { 
            flashcards: fullList,
            flashcardsMastered: newMasteredCount,
            // @ts-ignore
            lastReviewed: Date.now() 
        });
        setMasteredCount(newMasteredCount);

        let xpGain = 0;

        if (difficulty === 'easy') {
            nextQueue.splice(currentCardIndex, 1); 
            xpGain = 10;
            playSound('correct');
        } else {
            const cardToMove = nextQueue.splice(currentCardIndex, 1)[0];
            nextQueue.push(cardToMove);
            playSound('wrong');
        }
        
        setSessionXp(prev => prev + xpGain);
        setFlashcardQueue(nextQueue);
        setIsFlipped(false);
        setIsEditingCard(false); // Ensure edit mode is closed
        
        if (nextQueue.length === 0) {
             playSound('finish');
             if (node.type === 'theory' && !isReviewing) {
                 setPhase('HARVEST');
             } else {
                 if (isReviewing && user) {
                     unlockSecretReward(user.id, 'diamond', 10);
                     alert("🔧 BẢO TRÌ THÀNH CÔNG!\nNode đã sáng bóng trở lại.\n💎 +10 Kim Cương.");
                 }
                 const gotReward = checkDailyDiamondReward();
                 if (gotReward) alert("💎 Chúc mừng! Bạn nhận được 5 Kim Cương cho buổi học hôm nay!");
                 
                 // Unlock exam if mastered count > 10 (updated logic)
                 if (!node.isExamUnlocked && newMasteredCount >= 10) {
                     updateNodeProgress(pathId, node.id, { isExamUnlocked: true });
                     alert("🎉 Bạn đã thuộc trên 50% từ vựng! Bài kiểm tra đã được mở khóa.");
                 }
                 setPhase('START');
                 if (isReviewing) navigate('learning_path_detail', { pathId });
             }
        } else {
            setCurrentCardIndex(0);
        }
    };

    const startExam = async () => {
        if (node.examQuestions && node.examQuestions.length > 0) {
            setExamQuestions(node.examQuestions);
            setExamAnswers({});
            setExamResults({});
            setCurrentQuestionIndex(0);
            setIsAnswerChecked(false);
            setCombo(0);
            setSessionXp(0);
            setPhase('TAKE_EXAM');
            return;
        }

        setPhase('GEN_EXAM');
        const apiKey = user ? db.USERS[user.id]?.apiKey : null;
        if (!apiKey) { setError("Thiếu API Key."); setPhase('START'); return; }

        try {
            const questions = await generateNodeExam(apiKey, node.title);
            updateNodeProgress(pathId, node.id, { examQuestions: questions });
            
            setExamQuestions(questions);
            setExamAnswers({});
            setExamResults({});
            setCurrentQuestionIndex(0);
            setIsAnswerChecked(false);
            setCombo(0);
            setSessionXp(0);
            setPhase('TAKE_EXAM');
        } catch (e) {
            setError("Lỗi tạo bài kiểm tra.");
            setPhase('START');
        }
    };

    // --- ARRANGE WORDS LOGIC ---
    const handleWordSelect = (word: string, qId: string) => {
        if (isAnswerChecked) return;
        const currentAns = examAnswers[qId] || "";
        const words = currentAns ? currentAns.split(' ') : [];
        const newAns = [...words, word].join(' ');
        setExamAnswers({ ...examAnswers, [qId]: newAns });
    };

    const handleWordRemove = (indexToRemove: number, qId: string) => {
        if (isAnswerChecked) return;
        const currentAns = examAnswers[qId] || "";
        const words = currentAns.split(' ');
        words.splice(indexToRemove, 1);
        setExamAnswers({ ...examAnswers, [qId]: words.join(' ') });
    };

    const handleCheckAnswer = () => {
        const q = examQuestions[currentQuestionIndex];
        let userAns = (examAnswers[q.id] || "").trim();
        let correct = q.correctAnswer.trim();
        let isCorrect = false;

        // FIXED LOGIC: Strict string comparison for index-based MCQ
        if (q.type === 'mcq') {
            isCorrect = String(userAns) === String(correct);
        } else {
            // For text/arrange, normalize spaces and punctuation
            const normalize = (s: string) => s.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").replace(/\s{2,}/g," ").trim();
            isCorrect = normalize(userAns) === normalize(correct);
        }

        setExamResults(prev => ({ ...prev, [q.id]: isCorrect }));
        setIsAnswerChecked(true);

        if (isCorrect) {
            const newCombo = combo + 1;
            setCombo(newCombo);
            setSessionXp(prev => prev + 10 + (newCombo * 2)); // Bonus combo XP
            playSound('correct');

            // --- FLOW: COMBO HYPE MAN ---
            if (newCombo === 3) {
                triggerReaction('success'); 
                say("ON FIRE! 🔥🔥🔥", 3000);
            } else if (newCombo === 5) {
                triggerReaction('love');
                say("Tuyệt đỉnh! Không ai cản được bạn!", 3000);
            }

        } else {
            setCombo(0);
            playSound('wrong');
            triggerReaction('sad');
        }
    };

    const handleContinueExam = () => {
        if (currentQuestionIndex < examQuestions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setIsAnswerChecked(false);
        } else {
            // Finish Exam
            const correctCount = Object.values(examResults).filter(Boolean).length;
            const percentage = (correctCount / examQuestions.length) * 100;
            setExamScore(percentage);
            setPhase('RESULT');
            updateNodeProgress(pathId, node.id, { 
                examScore: percentage,
                // @ts-ignore
                lastReviewed: Date.now() 
            });
            
            if (percentage >= 50) {
                unlockNextNode(pathId, node.id);
            }
            playSound(percentage >= 50 ? 'finish' : 'wrong');
        }
    };

    const handleExtension = async () => {
        setPhase('EXTENDING_PATH');
        const apiKey = user ? db.USERS[user.id]?.apiKey : null;
        if (!apiKey) return;
        try {
            const path = db.LEARNING_PATHS[pathId];
            const newNodes = await generateAdvancedPath(apiKey, path.title, node.title);
            extendLearningPath(pathId, newNodes);
            navigate('learning_path_detail', { pathId });
        } catch (e) {
            setError("Lỗi tạo lộ trình nâng cao.");
            setPhase('RESULT');
        }
    };

    const handleBack = () => {
        if (phase === 'START' || phase === 'RESULT') {
            navigate('learning_path_detail', { pathId });
        } else {
            setPhase('START');
        }
    };

    // --- HARVEST FLOW ACTIONS ---
    const handleStartHarvest = () => {
        setTriggerHarvest(true); 
        setIsNoteModalOpen(true);
    };

    const handleSkipHarvest = () => {
        setPhase('START');
        alert("Đã hoàn thành bài học!");
    };

    const onNoteModalClose = () => {
        setIsNoteModalOpen(false);
        setTriggerHarvest(false);
        setPhase('START');
        alert("🎉 Đã lưu kiến thức vào sổ tay! (+50 XP)");
    };

    // --- UI COMPONENTS ---

    const renderHeader = (title: string, subtitle?: string) => (
        <div className="flex justify-between items-center mb-6 px-4 relative z-10">
            <button 
                onClick={handleBack}
                className="group w-auto px-4 h-12 rounded-full flex items-center justify-center bg-white/10 border border-white/20 text-white hover:bg-red-500/20 hover:border-red-400 hover:text-red-200 hover:shadow-[0_0_20px_rgba(248,113,113,0.5)] transition-all duration-300 backdrop-blur-md"
            >
                <span className="font-bold mr-2">&larr;</span>
                <span className="font-medium text-sm">Quay lại {phase === 'START' ? 'Lộ trình' : 'Menu Level'}</span>
            </button>
            <div className="flex flex-col items-center">
                <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300 uppercase tracking-wider filter drop-shadow-lg">{title}</h2>
                {subtitle && <span className="text-xs text-blue-200">{subtitle}</span>}
            </div>
            <div className="flex items-center space-x-2 bg-black/40 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                <span className="text-lg animate-pulse">💎</span>
                <span className="text-blue-300 font-bold text-sm">{sessionXp} XP</span>
            </div>
        </div>
    );

    const renderProgressBar = (current: number, total: number) => (
        <div className="w-full bg-gray-800/50 h-4 rounded-full mb-6 relative overflow-hidden border border-white/10 backdrop-blur-sm z-10">
            <div 
                className="bg-gradient-to-r from-green-400 to-emerald-600 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(34,197,94,0.5)]" 
                style={{ width: `${((current + 1) / total) * 100}%` }}
            >
                <div className="absolute top-0 left-0 w-full h-full bg-white opacity-30 animate-shimmer"></div>
            </div>
        </div>
    );

    const renderStart = () => {
        const isRepairMode = params?.mode === 'repair';
        const isExamReady = masteredCount >= 10;
        const isPassed = (node.examScore || 0) >= 50;

        return (
            <div className="flex flex-col items-center justify-center min-h-[600px] space-y-8 animate-pop-in relative">
                <div className="absolute top-0 left-0 w-full flex justify-between items-start z-20">
                    <button 
                        onClick={handleBack}
                        className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-blue-200 hover:bg-blue-500/20 hover:text-white hover:border-blue-400 hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-300 backdrop-blur-md"
                    >
                        <span>&larr;</span> <span>Quay lại Lộ trình</span>
                    </button>
                    <button 
                        onClick={() => setIsNoteModalOpen(true)}
                        className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-indigo-900/30 border border-indigo-500/50 text-indigo-200 hover:bg-indigo-500/20 hover:text-white hover:border-indigo-400 hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all duration-300 backdrop-blur-md"
                    >
                        <span>📝</span> <span>Sổ tay thông minh</span>
                    </button>
                </div>

                <div className="relative mt-12">
                    <div className={`text-9xl animate-bounce-subtle filter drop-shadow-[0_0_30px_rgba(255,255,255,0.2)] ${isRepairMode ? 'grayscale contrast-125' : ''}`}>
                        {isRepairMode ? '🏚️' : '🎓'}
                    </div>
                    {isRepairMode && <div className="absolute -top-4 -right-4 text-6xl animate-pulse">⚠️</div>}
                    {isPassed && !isRepairMode && <div className="absolute -bottom-2 -right-2 text-5xl animate-pulse">👑</div>}
                </div>
                
                <div className="text-center space-y-2 z-10">
                    <h1 className={`text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br tracking-tight drop-shadow-lg ${isRepairMode ? 'from-orange-400 to-red-500' : 'from-white to-blue-200'}`}>
                        {isRepairMode ? `BẢO TRÌ: ${node.title}` : node.title}
                    </h1>
                    <p className="text-xl text-blue-100/80 max-w-lg mx-auto">{node.description}</p>
                    {isRepairMode && <p className="text-sm text-orange-300 font-bold bg-orange-900/30 px-3 py-1 rounded inline-block border border-orange-500/30">Kiến thức này đang bị mai một! Cần ôn tập gấp.</p>}
                </div>
                
                <div className="w-full max-w-md space-y-4 z-10">
                    {/* Progress Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 backdrop-blur-lg p-4 rounded-3xl border border-white/10 flex flex-col items-center hover:bg-white/10 transition-colors">
                            <span className="text-3xl mb-1">🧠</span>
                            <span className="text-blue-200 text-xs uppercase font-bold tracking-wider">Từ vựng</span>
                            <span className={`text-2xl font-black mt-1 ${isExamReady ? 'text-green-400' : 'text-yellow-400'}`}>{masteredCount}/30</span>
                        </div>
                        <div className="bg-white/5 backdrop-blur-lg p-4 rounded-3xl border border-white/10 flex flex-col items-center hover:bg-white/10 transition-colors">
                            <span className="text-3xl mb-1">📝</span>
                            <span className="text-blue-200 text-xs uppercase font-bold tracking-wider">Kiểm tra</span>
                            <span className={`text-2xl font-black mt-1 ${isPassed ? 'text-green-400' : 'text-gray-400'}`}>
                                {node.examScore ? `${node.examScore.toFixed(0)}%` : '--'}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-4 pt-6">
                        <button onClick={startFlashcards} className="btn btn-primary w-full text-lg py-4 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.5)] hover:shadow-[0_0_30px_rgba(37,99,235,0.8)] hover:scale-[1.02] transition-all">
                            {isRepairMode ? '🔧 Bắt đầu Bảo Trì (Review Mode)' : (masteredCount < 30 ? '🚀 Bắt đầu Học Từ Vựng' : '🔄 Ôn tập lại Từ vựng')}
                        </button>

                        <button 
                            onClick={startExam} 
                            disabled={!isExamReady || isRepairMode}
                            className={`btn w-full text-lg py-4 rounded-2xl transition-all ${isExamReady && !isRepairMode ? 'btn-success text-white shadow-[0_0_20px_rgba(5,150,105,0.5)] hover:scale-[1.02]' : 'bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700'}`}
                        >
                            {isExamReady ? '⚔️ Làm bài Kiểm tra' : '🔒 Khóa Kiểm tra (Cần 10 từ)'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderFlashcardPhase = () => {
        const card = flashcardQueue[currentCardIndex];
        if (!card) return <div className="text-center mt-20 text-white">Đang tải dữ liệu...</div>;
        
        const skinClass = activeSkin ? activeSkin.cssClass : 'bg-gray-800 border-gray-600';

        return (
            <div className="max-w-lg mx-auto w-full h-full flex flex-col relative">
                <SkinAtmosphere skinId={equippedSkinId} />
                
                {renderHeader(isReviewing ? "Ôn tập (Bảo trì)" : "Học từ mới", `${flashcardQueue.length} thẻ còn lại`)}
                
                <div className="flex-1 flex flex-col items-center justify-center perspective-1000 min-h-[400px] z-10 relative">
                    <div 
                        className="relative w-full h-80 cursor-pointer group perspective-1000"
                        onClick={() => setIsFlipped(!isFlipped)}
                    >
                        {isEditingCard ? (
                            /* EDIT MODE UI */
                            <div className="w-full h-full bg-gray-800 border-2 border-yellow-500/50 rounded-2xl p-6 flex flex-col gap-4 shadow-2xl animate-fade-in cursor-default" onClick={e => e.stopPropagation()}>
                                <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-widest text-center">🔧 Chỉnh sửa Thẻ</h3>
                                
                                <div className="flex-1 flex flex-col gap-1">
                                    <label className="text-[10px] text-gray-400 uppercase font-bold">Mặt trước</label>
                                    <textarea 
                                        className="w-full bg-black/30 border border-gray-600 rounded p-2 text-white text-sm resize-none focus:border-yellow-500 outline-none flex-1"
                                        value={editFront}
                                        onChange={e => setEditFront(e.target.value)}
                                    />
                                </div>
                                
                                <div className="flex-1 flex flex-col gap-1">
                                    <label className="text-[10px] text-gray-400 uppercase font-bold">Mặt sau</label>
                                    <textarea 
                                        className="w-full bg-black/30 border border-gray-600 rounded p-2 text-white text-sm resize-none focus:border-yellow-500 outline-none flex-1"
                                        value={editBack}
                                        onChange={e => setEditBack(e.target.value)}
                                    />
                                </div>

                                <div className="flex gap-2 justify-end pt-2">
                                    <button onClick={handleEditCardCancel} className="btn btn-xs btn-secondary">Hủy</button>
                                    <button onClick={handleEditCardSave} className="btn btn-xs btn-primary bg-yellow-600 hover:bg-yellow-500 text-black font-bold">💾 Lưu</button>
                                </div>
                            </div>
                        ) : (
                            /* NORMAL VIEW MODE */
                            <div className={`relative w-full h-full transition-all duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                                {/* Front */}
                                <div className={`absolute inset-0 backface-hidden backdrop-blur-xl border rounded-[2rem] flex flex-col items-center justify-center p-8 shadow-[0_0_30px_rgba(0,0,0,0.3)] group-hover:scale-[1.02] transition-transform overflow-y-auto custom-scrollbar ${skinClass}`} style={{ backfaceVisibility: 'hidden' }}>
                                    <h3 className={`${getFontSize(card.front)} font-bold mb-4 text-center drop-shadow-md text-gray-200`}>{card.front}</h3>
                                    <p className="opacity-60 text-xs uppercase tracking-[0.2em] font-bold mt-auto animate-pulse">Chạm để lật</p>
                                    {card.box !== undefined && <span className="absolute top-4 right-4 text-xs opacity-50 font-mono">Box: {card.box}</span>}
                                    
                                    {/* Edit Button Front */}
                                    <button 
                                        onClick={handleEditCardStart}
                                        className="absolute top-4 left-4 p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-colors z-20"
                                        title="Sửa nội dung"
                                    >
                                        ✏️
                                    </button>
                                </div>
                                {/* Back */}
                                <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-blue-600 to-indigo-700 border border-white/20 rounded-[2rem] flex flex-col items-center justify-center p-8 shadow-[0_0_40px_rgba(37,99,235,0.4)] rotate-y-180 overflow-y-auto custom-scrollbar" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                                    <p className={`${getFontSize(card.back)} text-white font-medium text-center leading-relaxed drop-shadow-md`}>{card.back}</p>
                                    
                                    {/* Edit Button Back */}
                                    <button 
                                        onClick={handleEditCardStart}
                                        className="absolute top-4 left-4 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors z-20"
                                        title="Sửa nội dung"
                                    >
                                        ✏️
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {!isEditingCard && (
                    <div className={`grid grid-cols-3 gap-4 mt-8 transition-opacity duration-300 z-10 ${isFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                        <button onClick={() => handleFlashcardResult('hard')} className="btn bg-red-500/20 text-red-200 border border-red-500/50 hover:bg-red-500 hover:text-white py-4 text-sm rounded-2xl backdrop-blur-md shadow-lg">
                            Khó (Lặp lại)
                        </button>
                        <button onClick={() => handleFlashcardResult('medium')} className="btn bg-yellow-500/20 text-yellow-200 border border-yellow-500/50 hover:bg-yellow-500 hover:text-white py-4 text-sm rounded-2xl backdrop-blur-md shadow-lg">
                            Bình thường
                        </button>
                        <button onClick={() => handleFlashcardResult('easy')} className="btn bg-green-500/20 text-green-200 border border-green-500/50 hover:bg-green-500 hover:text-white py-4 text-sm rounded-2xl backdrop-blur-md shadow-lg">
                            Dễ (Qua)
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const renderExamPhase = () => {
        const q = examQuestions[currentQuestionIndex];
        if (!q) return <div className="text-center mt-20 text-white">Đang tải bài thi...</div>;

        const isCorrect = examResults[q.id];
        
        // --- RENDER LOGIC FOR ARRANGE_WORDS & FILL_GAP (Word Bank Style) ---
        if (q.type === 'arrange_words' || q.type === 'fill_gap') {
            const selectedWords = (examAnswers[q.id] || "").split(' ').filter(Boolean);
            
            // --- CRITICAL FIX: ENSURE WORD BANK HAS ITEMS ---
            // If API didn't return options, generate them from correct answer
            let bankOptions: string[] = [];
            if (q.options && q.options.length > 0) {
                bankOptions = q.options;
            } else {
                // FALLBACK: Generate shuffled words from correct answer
                const correctWords = q.correctAnswer.split(' ');
                // Add some basic distractors if API failed
                const commonDistractors = ["is", "are", "the", "a", "an", "not", "very", "do", "does"];
                const distractors = commonDistractors.sort(() => 0.5 - Math.random()).slice(0, 3);
                bankOptions = [...correctWords, ...distractors].sort(() => 0.5 - Math.random());
            }

            // Logic to disable used words in bank
            const getAvailableBankItems = () => {
                const usedCounts: Record<string, number> = {};
                selectedWords.forEach(w => usedCounts[w] = (usedCounts[w] || 0) + 1);
                
                return bankOptions.map((opt, idx) => {
                    const isUsed = (usedCounts[opt] || 0) > 0;
                    if (isUsed) usedCounts[opt]--; // Decrement available count
                    return { text: opt, index: idx, disabled: isUsed };
                });
            };

            const bankItems = getAvailableBankItems();

            return (
                <div className="max-w-2xl mx-auto w-full flex flex-col min-h-screen pb-24">
                    <SkinAtmosphere skinId={equippedSkinId} />
                    {renderHeader("Sắp xếp câu")}
                    {renderProgressBar(currentQuestionIndex, examQuestions.length)}
                    
                    <div className="flex-1 relative z-10 flex flex-col">
                        <h2 className="text-2xl font-bold text-white mb-8 leading-snug drop-shadow-md">
                            {q.question}
                        </h2>

                        {/* TARGET AREA (Sentence Building) */}
                        <div className="min-h-[80px] border-b-2 border-white/20 mb-8 flex flex-wrap gap-2 p-2 items-center">
                            {selectedWords.map((word, idx) => (
                                <button 
                                    key={`sel-${idx}`}
                                    onClick={() => handleWordRemove(idx, q.id)}
                                    disabled={isAnswerChecked}
                                    className="px-4 py-2 rounded-xl bg-white text-blue-900 font-bold shadow-md hover:bg-red-100 transition-colors animate-pop-in"
                                >
                                    {word}
                                </button>
                            ))}
                            {selectedWords.length === 0 && <span className="text-gray-500 italic">Chọn từ bên dưới...</span>}
                        </div>

                        {/* WORD BANK */}
                        <div className="flex flex-wrap gap-3 justify-center">
                            {bankItems.map((item) => (
                                <button
                                    key={`opt-${item.index}`}
                                    onClick={() => handleWordSelect(item.text, q.id)}
                                    disabled={item.disabled || isAnswerChecked}
                                    className={`px-4 py-3 rounded-xl font-bold text-lg shadow-sm border-b-4 transition-all active:border-b-0 active:translate-y-1 
                                        ${item.disabled 
                                            ? 'bg-gray-700 text-gray-500 border-gray-600 opacity-50 cursor-default' 
                                            : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100'}`}
                                >
                                    {item.text}
                                </button>
                            ))}
                        </div>
                    </div>

                    {renderFooter(q, isCorrect)}
                </div>
            );
        }

        // --- RENDER LOGIC FOR MCQ & TEXT INPUT ---
        return (
            <div className="max-w-2xl mx-auto w-full flex flex-col min-h-screen pb-24">
                <SkinAtmosphere skinId={equippedSkinId} />
                
                {renderHeader("Kiểm tra kiến thức")}
                {renderProgressBar(currentQuestionIndex, examQuestions.length)}
                
                {combo > 1 && (
                    <div className="absolute top-20 right-4 animate-pop-in flex flex-col items-center rotate-12 z-20">
                        <span className="text-5xl filter drop-shadow-lg">🔥</span>
                        <span className="text-orange-400 font-black text-xl italic bg-black/80 px-3 py-1 rounded-xl border border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]">{combo} COMBO!</span>
                    </div>
                )}

                <div className="flex-1 relative z-10">
                    <h2 className="text-3xl font-bold text-white mb-8 leading-snug drop-shadow-md">{q.question}</h2>

                    <div className="space-y-4">
                        {q.type === 'mcq' && q.options?.map((opt, idx) => {
                            const isSelected = examAnswers[q.id] === String(idx);
                            let optionClass = "bg-white/5 border-white/10 hover:bg-white/10"; // Default
                            
                            if (isAnswerChecked) {
                                if (String(idx) === q.correctAnswer) optionClass = "bg-green-500/20 border-green-500 text-green-200 shadow-[0_0_15px_rgba(34,197,94,0.3)]";
                                else if (isSelected) optionClass = "bg-red-500/20 border-red-500 text-red-200";
                                else optionClass = "opacity-50 bg-black/20 border-transparent";
                            } else if (isSelected) {
                                optionClass = "bg-blue-500/20 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)] scale-[1.01]";
                            }

                            return (
                                <button 
                                    key={idx} 
                                    onClick={() => !isAnswerChecked && setExamAnswers({...examAnswers, [q.id]: String(idx)})}
                                    disabled={isAnswerChecked}
                                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 backdrop-blur-md flex items-center ${optionClass}`}
                                >
                                    <div className={`w-8 h-8 rounded-lg border-2 mr-4 flex items-center justify-center font-bold text-sm ${isSelected ? 'border-blue-400 bg-blue-500 text-white' : 'border-gray-500 text-gray-400'}`}>
                                        {String.fromCharCode(65 + idx)}
                                    </div>
                                    <span className="text-lg font-medium">{opt}</span>
                                </button>
                            );
                        })}

                        {(q.type === 'short_answer') && (
                            <div className="relative">
                                <input 
                                    type="text" 
                                    disabled={isAnswerChecked}
                                    className={`w-full p-5 bg-white/5 border-2 rounded-2xl text-white text-xl outline-none focus:border-blue-400 focus:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all backdrop-blur-md ${
                                        isAnswerChecked 
                                            ? (isCorrect ? 'border-green-500 text-green-300' : 'border-red-500 text-red-300') 
                                            : 'border-white/20'
                                    }`}
                                    placeholder="Nhập đáp án..."
                                    value={examAnswers[q.id] || ''}
                                    onChange={(e) => setExamAnswers({...examAnswers, [q.id]: e.target.value})}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {renderFooter(q, isCorrect)}
            </div>
        );
    };

    const renderFooter = (q: ExamQuestion, isCorrect: boolean) => {
        const hasAnswered = !!examAnswers[q.id];
        
        return (
            <div className={`fixed bottom-0 left-0 w-full p-4 border-t border-white/10 backdrop-blur-xl z-30 transition-colors duration-300 ${
                isAnswerChecked 
                    ? (isCorrect ? 'bg-green-900/30' : 'bg-red-900/30') 
                    : 'bg-gray-900/60'
            }`}>
                <div className="max-w-2xl mx-auto">
                    {isAnswerChecked ? (
                        <div className="flex flex-col animate-pop-in space-y-4">
                            <div className="flex items-center space-x-4">
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl shadow-lg flex-shrink-0 ${isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                    {isCorrect ? '✓' : '✕'}
                                </div>
                                <div>
                                    <p className={`font-black text-2xl ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                                        {isCorrect ? 'CHÍNH XÁC!' : 'SAI RỒI'}
                                    </p>
                                    {isCorrect && <p className="text-sm text-green-200 font-medium">+XP Bonus!</p>}
                                </div>
                            </div>
                            
                            {/* EXPLANATION AREA */}
                            {!isCorrect && (
                                <div className="bg-red-900/20 p-4 rounded-xl border border-red-500/30">
                                    <p className="text-red-300 text-xs font-bold uppercase mb-1">Đáp án đúng:</p>
                                    <p className="text-white font-bold text-lg mb-2">
                                        {q.type === 'mcq' && q.options 
                                            ? q.options[parseInt(q.correctAnswer)] 
                                            : q.correctAnswer}
                                    </p>
                                    {q.explanation && (
                                        <p className="text-gray-300 text-sm italic border-t border-red-500/20 pt-2">
                                            💡 {q.explanation}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end">
                                <button onClick={handleContinueExam} className={`btn px-10 py-3 text-lg rounded-full shadow-lg font-bold tracking-wide ${isCorrect ? 'btn-success' : 'btn-danger'}`}>
                                    TIẾP TỤC
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full flex justify-end">
                            <button 
                                onClick={handleCheckAnswer} 
                                disabled={!hasAnswered}
                                className="btn btn-primary px-10 py-3 text-lg w-full sm:w-auto rounded-full font-bold tracking-wide shadow-[0_0_20px_rgba(37,99,235,0.5)]"
                            >
                                KIỂM TRA
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const renderResult = () => {
        // UPDATED: Pass condition is 50%
        const isPass = examScore >= 50;
        const isPerfect = examScore === 100;

        return (
            <div className="text-center py-8 space-y-6">
                <div className="text-6xl">{isPerfect ? '👑' : isPass ? '🎉' : '😢'}</div>
                <h2 className={`text-3xl font-bold ${isPass ? 'text-green-400' : 'text-red-500'}`}>
                    {isPerfect ? 'TUYỆT ĐỐI!' : isPass ? 'VƯỢT QUA!' : 'CHƯA ĐẠT'}
                </h2>
                <p className="text-gray-300 text-xl">Điểm số: {examScore.toFixed(0)}%</p>
                
                {isPass ? (
                    <div className="space-y-3">
                        <p className="text-green-300">Level tiếp theo đã được mở khóa!</p>
                        
                        {/* CHALLENGER BUTTON */}
                        {isPerfect && (
                            <div className="bg-yellow-900/30 border border-yellow-500 p-4 rounded-lg my-4 animate-pulse">
                                <p className="text-yellow-400 font-bold mb-2">Bạn là bậc thầy của Level này!</p>
                                <button 
                                    onClick={() => setIsChallengerModalOpen(true)}
                                    className="btn w-full bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-bold shadow-lg"
                                >
                                    ⚔️ Thách đấu người khác
                                </button>
                            </div>
                        )}

                        {isLastNode ? (
                            <div className="mt-6 p-4 border border-purple-500 bg-purple-900/20 rounded-lg">
                                <p className="font-bold text-purple-300 mb-2">Bạn đã hoàn thành tất cả level hiện tại!</p>
                                <button onClick={handleExtension} className="btn btn-primary bg-purple-600 hover:bg-purple-500 w-full">
                                    ✨ Nhờ AI tạo Lộ trình Nâng cao
                                </button>
                            </div>
                        ) : (
                            <button onClick={handleBack} className="btn btn-primary w-full">Tiếp tục hành trình</button>
                        )}
                    </div>
                ) : (
                    <button onClick={() => setPhase('START')} className="btn btn-secondary w-full">Thử lại</button>
                )}
            </div>
        );
    };

    // ... existing renderHarvest ...
    const renderHarvest = () => {
        return (
            <div className="flex flex-col items-center justify-center min-h-[600px] space-y-8 animate-pop-in">
                <div className="relative">
                    <div className="text-9xl animate-bounce-subtle filter drop-shadow-[0_0_30px_rgba(234,179,8,0.4)]">🌾</div>
                    <div className="absolute -top-2 -right-2 text-6xl animate-pulse">✨</div>
                </div>
                
                <div className="text-center space-y-3 max-w-lg">
                    <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-200 to-yellow-500 uppercase tracking-wide">
                        Thu Hoạch Kiến Thức
                    </h2>
                    <p className="text-gray-300 text-lg">
                        Đừng để kiến thức trôi đi! Hãy biến những gì vừa học thành tài sản của bạn.
                    </p>
                    <p className="text-sm text-yellow-400/80 bg-yellow-900/20 px-4 py-2 rounded-lg inline-block border border-yellow-500/30">
                        AI sẽ giúp bạn tóm tắt bài học thành 3 điểm cốt lõi.
                    </p>
                </div>

                <div className="w-full max-w-sm space-y-4">
                    <button 
                        onClick={handleStartHarvest}
                        className="btn w-full py-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold text-lg shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:scale-105 transition-all flex items-center justify-center gap-2"
                    >
                        <span>📝</span> Ghi vào Sổ Tay (+50 XP)
                    </button>
                    
                    <button 
                        onClick={handleSkipHarvest}
                        className="btn btn-secondary w-full border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm font-bold"
                    >
                        Bỏ qua (Chỉ hoàn thành)
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen p-4 md:p-8 pb-24">
            {error && <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded mb-4 text-center">{error}</div>}
            
            {phase === 'START' && renderStart()}
            
            {(phase === 'GEN_FLASHCARDS' || phase === 'GEN_EXAM' || phase === 'EXTENDING_PATH') && (
                <div className="text-center py-12">
                    <div className="flex justify-center mb-4"><LoadingSpinner size={8} /></div>
                    <p className="text-gray-300 animate-pulse font-medium">
                        {phase === 'EXTENDING_PATH' ? 'Hệ thống đang nghiên cứu lộ trình nâng cao...' : 
                         phase === 'GEN_FLASHCARDS' ? 'Hệ thống đang tải flashcard của bạn...' :
                         'Hệ thống đang tải bài kiểm tra của bạn...'}
                    </p>
                </div>
            )}

            {phase === 'STUDY_FLASHCARDS' && renderFlashcardPhase()}
            {phase === 'HARVEST' && renderHarvest()}
            {phase === 'TAKE_EXAM' && renderExamPhase()}
            {phase === 'RESULT' && renderResult()}

            <ChallengerModal 
                isOpen={isChallengerModalOpen} 
                onClose={() => setIsChallengerModalOpen(false)} 
                nodeId={node.id}
                nodeTitle={node.title}
            />
            
            <NodeNoteModal 
                isOpen={isNoteModalOpen}
                onClose={onNoteModalClose} // Special handler
                pathId={pathId}
                nodeId={nodeId}
                nodeTitle={node.title}
                autoAction={triggerHarvest ? 'harvest' : undefined}
                initialContext={`${node.title}: ${node.description}`}
            />
        </div>
    );
};

export default LearningNodeStudyPage;
