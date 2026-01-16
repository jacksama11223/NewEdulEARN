
import React, { useState, useEffect, useContext, useCallback } from 'react';
import Modal from '../common/Modal';
import { AuthContext, DataContext } from '../../contexts/AppProviders';
import { generateNodeFlashcards, generateNodeExam, generateAdvancedPath } from '../../services/geminiService';
import type { LearningNode, Flashcard, ExamQuestion } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';
import ChallengerModal from './ChallengerModal';

interface LevelStudyModalProps {
    isOpen: boolean;
    onClose: () => void;
    pathId: string;
    node: LearningNode;
    isLastNode: boolean;
}

type StudyPhase = 'START' | 'GEN_FLASHCARDS' | 'MANUAL_ENTRY_FLASHCARDS' | 'STUDY_FLASHCARDS' | 'GEN_EXAM' | 'MANUAL_ENTRY_EXAM' | 'TAKE_EXAM' | 'RESULT' | 'EXTENDING_PATH';

// Helper for dynamic font size
const getFontSize = (text: string) => {
    if (text.length < 20) return 'text-3xl';
    if (text.length < 50) return 'text-2xl';
    if (text.length < 100) return 'text-xl';
    return 'text-base';
};

// OPTIMIZATION: Lower threshold to 10 to match single AI batch generation
const MASTERY_THRESHOLD = 5; // Reduced to 5 for manual mode friendliness

const LevelStudyModal: React.FC<LevelStudyModalProps> = ({ isOpen, onClose, pathId, node, isLastNode }) => {
    const { user } = useContext(AuthContext)!;
    const { db, updateNodeProgress, unlockNextNode, extendLearningPath } = useContext(DataContext)!;
    
    const [phase, setPhase] = useState<StudyPhase>('START');
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [flashcardQueue, setFlashcardQueue] = useState<Flashcard[]>([]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [masteredCount, setMasteredCount] = useState(node.flashcardsMastered || 0);
    const [isFlipped, setIsFlipped] = useState(false);

    // Manual Entry State
    const [manualInputs, setManualInputs] = useState<{front: string, back: string}[]>([{front: '', back: ''}, {front: '', back: ''}, {front: '', back: ''}]);

    const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
    const [examAnswers, setExamAnswers] = useState<Record<string, string>>({});
    const [examScore, setExamScore] = useState(0);
    
    const [error, setError] = useState<string | null>(null);
    const [isChallengerModalOpen, setIsChallengerModalOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setPhase('START');
            setMasteredCount(node.flashcardsMastered || 0);
            setExamScore(node.examScore || 0);
            setError(null);
            // Reset manual inputs
            setManualInputs([{front: '', back: ''}, {front: '', back: ''}, {front: '', back: ''}]);
        }
    }, [isOpen, node]);

    // --- PHASE 1: FLASHCARDS ---
    
    // Check existing
    const checkExistingCards = () => {
        if (node.flashcards && node.flashcards.length > 0 && node.flashcards.some(c => (c.box || 0) < 1)) {
             setFlashcards(node.flashcards);
             setFlashcardQueue(node.flashcards.filter(c => (c.box || 0) < 1));
             setPhase('STUDY_FLASHCARDS');
             setCurrentCardIndex(0);
             setIsFlipped(false);
             return true;
        }
        return false;
    };

    const startFlashcardsAI = async () => {
        if (checkExistingCards()) return;

        setPhase('GEN_FLASHCARDS');
        const apiKey = user ? db.USERS[user.id]?.apiKey : null;
        if (!apiKey) { setError("Vui lòng cấu hình API Key."); setPhase('START'); return; }

        try {
            const cards = await generateNodeFlashcards(apiKey, node.title, node.description);
            updateNodeProgress(pathId, node.id, { flashcards: cards });
            setFlashcards(cards);
            setFlashcardQueue(cards); 
            setPhase('STUDY_FLASHCARDS');
            setCurrentCardIndex(0);
            setIsFlipped(false);
        } catch (e) {
            setError("Lỗi tạo Flashcards. Vui lòng thử lại hoặc dùng chế độ Thủ công.");
            setPhase('START');
        }
    };

    const startFlashcardsManual = () => {
        if (checkExistingCards()) return;
        setPhase('MANUAL_ENTRY_FLASHCARDS');
    };

    // Manual Entry Logic
    const handleManualInputChange = (index: number, field: 'front' | 'back', value: string) => {
        const newInputs = [...manualInputs];
        newInputs[index][field] = value;
        setManualInputs(newInputs);
    };

    const addManualRow = () => {
        setManualInputs([...manualInputs, {front: '', back: ''}]);
    };

    const saveManualCards = () => {
        const validCards = manualInputs.filter(i => i.front.trim() && i.back.trim());
        if (validCards.length === 0) {
            alert("Vui lòng nhập ít nhất 1 thẻ hoàn chỉnh.");
            return;
        }

        const newCards: Flashcard[] = validCards.map((c, i) => ({
            id: `fc_man_${Date.now()}_${i}`,
            front: c.front,
            back: c.back,
            box: 0,
            nextReview: 0
        }));

        updateNodeProgress(pathId, node.id, { flashcards: newCards });
        setFlashcards(newCards);
        setFlashcardQueue(newCards);
        setPhase('STUDY_FLASHCARDS');
        setCurrentCardIndex(0);
        setIsFlipped(false);
    };

    const handleFlashcardResult = (difficulty: 'easy' | 'medium' | 'hard') => {
        const currentCard = flashcardQueue[currentCardIndex];
        let nextQueue = [...flashcardQueue];
        let newMasteredCount = masteredCount;

        if (difficulty === 'easy') {
            nextQueue.splice(currentCardIndex, 1);
            newMasteredCount++;
            setMasteredCount(newMasteredCount);
            updateNodeProgress(pathId, node.id, { flashcardsMastered: newMasteredCount });
        } else {
            nextQueue.push(nextQueue.splice(currentCardIndex, 1)[0]);
        }

        setFlashcardQueue(nextQueue);
        setIsFlipped(false);
        
        if (newMasteredCount >= MASTERY_THRESHOLD) {
            alert(`Chúc mừng! Bạn đã thuộc ${MASTERY_THRESHOLD} thẻ. Mở khóa bài kiểm tra!`);
            setPhase('START'); // Go back to start to choose exam mode
            updateNodeProgress(pathId, node.id, { isExamUnlocked: true });
        } else if (nextQueue.length === 0) {
             alert("Hết thẻ! Hãy thêm thẻ mới.");
             setPhase('START'); 
        } else {
            setCurrentCardIndex(0);
        }
    };

    // --- PHASE 2: EXAM ---
    const startExamAI = async () => {
        if (node.examQuestions && node.examQuestions.length > 0) {
            setExamQuestions(node.examQuestions);
            setExamAnswers({});
            setPhase('TAKE_EXAM');
            return;
        }

        setPhase('GEN_EXAM');
        const apiKey = user ? db.USERS[user.id]?.apiKey : null;
        if (!apiKey) { setError("Thiếu API Key."); return; }

        try {
            const questions = await generateNodeExam(apiKey, node.title);
            updateNodeProgress(pathId, node.id, { examQuestions: questions });
            setExamQuestions(questions);
            setExamAnswers({});
            setPhase('TAKE_EXAM');
        } catch (e) {
            setError("Lỗi tạo bài kiểm tra.");
            setPhase('START');
        }
    };

    // Note: Manual Exam Creation is complex for a student flow, sticking to AI or just simple quiz
    // But we can allow "Self Report" if they studied offline
    const handleSelfReport = () => {
        if (confirm("Bạn xác nhận đã tự ôn tập và nắm vững kiến thức này?")) {
            setExamScore(100);
            updateNodeProgress(pathId, node.id, { examScore: 100, isCompleted: true });
            unlockNextNode(pathId, node.id);
            setPhase('RESULT');
        }
    };

    const submitExam = () => {
        let score = 0;
        examQuestions.forEach(q => {
            const userAns = (examAnswers[q.id] || "").trim();
            const correct = q.correctAnswer.trim();
            
            let isCorrect = false;
            if (q.type === 'mcq') {
                isCorrect = String(userAns) === String(correct);
            } else {
                const normalize = (s: string) => s.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").replace(/\s{2,}/g," ");
                isCorrect = normalize(userAns) === normalize(correct);
            }

            if (isCorrect) score++;
        });
        
        const percentage = (score / examQuestions.length) * 100;
        setExamScore(percentage);
        setPhase('RESULT');
        
        updateNodeProgress(pathId, node.id, { examScore: percentage });

        if (percentage >= 40) {
             unlockNextNode(pathId, node.id);
        }
    };

    // --- PHASE 3: EXTENSION ---
    const handleExtension = async () => {
        setPhase('EXTENDING_PATH');
        const apiKey = user ? db.USERS[user.id]?.apiKey : null;
        if (!apiKey) return;

        try {
            const path = db.LEARNING_PATHS[pathId];
            const newNodes = await generateAdvancedPath(apiKey, path.title, node.title);
            extendLearningPath(pathId, newNodes);
            alert("Đã tạo lộ trình nâng cao thành công! Hãy tiếp tục học.");
            onClose();
        } catch (e) {
            setError("Lỗi tạo lộ trình nâng cao.");
            setPhase('RESULT');
        }
    };

    // --- RENDERERS ---

    const renderStart = () => (
        <div className="text-center space-y-6 py-8">
            <div className="text-6xl mb-4">🎓</div>
            <h2 className="text-2xl font-bold text-gray-200">Level: {node.title}</h2>
            <p className="text-gray-400 px-8">{node.description}</p>
            
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="card p-4 bg-gray-800 border-gray-700">
                    <p className="text-gray-400 text-sm">Flashcards</p>
                    <p className={`text-2xl font-bold ${masteredCount >= MASTERY_THRESHOLD ? 'text-green-400' : 'text-yellow-400'}`}>
                        {masteredCount} / {MASTERY_THRESHOLD}
                    </p>
                </div>
                <div className="card p-4 bg-gray-800 border-gray-700">
                    <p className="text-gray-400 text-sm">Bài kiểm tra</p>
                    <p className={`text-2xl font-bold ${(node.examScore || 0) >= 40 ? 'text-green-400' : 'text-gray-500'}`}>
                        {node.examScore ? `${node.examScore.toFixed(0)}%` : 'Chưa đạt'}
                    </p>
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-700">
                <div className="flex flex-col gap-2 max-w-xs mx-auto">
                    <p className="text-xs text-gray-400 uppercase font-bold">1. Học Từ Vựng</p>
                    <button onClick={startFlashcardsAI} className="btn btn-primary flex items-center justify-center gap-2">
                        <span>✨</span> Tạo Tự Động (AI)
                    </button>
                    <button onClick={startFlashcardsManual} className="btn btn-secondary flex items-center justify-center gap-2">
                        <span>✍️</span> Nhập Thủ Công
                    </button>
                </div>
                
                <div className="flex flex-col gap-2 max-w-xs mx-auto">
                    <p className="text-xs text-gray-400 uppercase font-bold">2. Kiểm tra</p>
                    <button 
                        onClick={startExamAI} 
                        className={`btn ${masteredCount >= MASTERY_THRESHOLD ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'btn-secondary opacity-50 cursor-not-allowed'}`}
                        disabled={masteredCount < MASTERY_THRESHOLD}
                    >
                        {masteredCount >= MASTERY_THRESHOLD ? '📝 Thi với AI' : `🔒 Cần ${MASTERY_THRESHOLD} từ`}
                    </button>
                    
                    {masteredCount >= MASTERY_THRESHOLD && (
                        <button onClick={handleSelfReport} className="text-xs text-gray-500 hover:text-white underline mt-1">
                            Tôi đã tự học bên ngoài (Self Report)
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    const renderManualEntry = () => (
        <div className="py-4 space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">✍️ Soạn thẻ ghi nhớ</h3>
                <button onClick={() => setPhase('START')} className="text-sm text-gray-400 hover:text-white">Quay lại</button>
            </div>
            
            <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                {manualInputs.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-start bg-gray-800 p-2 rounded-lg">
                        <div className="w-6 text-center text-gray-500 font-bold pt-2">{idx + 1}</div>
                        <div className="flex-1 space-y-2">
                            <input 
                                className="form-input w-full text-sm bg-black/30" 
                                placeholder="Mặt trước (Thuật ngữ)"
                                value={item.front}
                                onChange={e => handleManualInputChange(idx, 'front', e.target.value)}
                            />
                            <input 
                                className="form-input w-full text-sm bg-black/30" 
                                placeholder="Mặt sau (Định nghĩa)"
                                value={item.back}
                                onChange={e => handleManualInputChange(idx, 'back', e.target.value)}
                            />
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="flex gap-2">
                <button onClick={addManualRow} className="btn btn-secondary flex-1 text-sm">+ Thêm dòng</button>
                <button onClick={saveManualCards} className="btn btn-primary flex-[2]">Lưu & Bắt đầu học</button>
            </div>
        </div>
    );

    const renderFlashcardStudy = () => {
        const card = flashcardQueue[currentCardIndex];
        if (!card) return <div>Loading...</div>;

        return (
            <div className="flex flex-col items-center space-y-6 py-4">
                <h3 className="text-lg font-semibold text-gray-300">Học từ vựng ({masteredCount}/{MASTERY_THRESHOLD})</h3>
                <div 
                    className="relative w-full max-w-md h-64 cursor-pointer perspective-1000"
                    onClick={() => setIsFlipped(!isFlipped)}
                    style={{ perspective: '1000px' }}
                >
                    <div 
                        className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
                        style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                    >
                        {/* Front */}
                        <div className="absolute w-full h-full backface-hidden bg-gray-800 border border-gray-600 rounded-xl flex items-center justify-center p-8 text-center shadow-xl overflow-y-auto custom-scrollbar" style={{ backfaceVisibility: 'hidden' }}>
                            <h3 className={`${getFontSize(card.front)} font-bold text-gray-200`}>{card.front}</h3>
                            <p className="absolute bottom-4 text-gray-500 text-xs">Chạm để lật</p>
                        </div>
                        {/* Back */}
                        <div 
                            className="absolute w-full h-full backface-hidden bg-blue-900 border border-blue-700 rounded-xl flex items-center justify-center p-8 text-center shadow-xl overflow-y-auto custom-scrollbar"
                            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                        >
                            <p className={`${getFontSize(card.back)} text-white`}>{card.back}</p>
                        </div>
                    </div>
                </div>
                
                {isFlipped && (
                    <div className="grid grid-cols-3 gap-2 w-full max-w-md">
                        <button onClick={() => handleFlashcardResult('hard')} className="btn bg-red-900/50 text-red-300 border border-red-800 hover:bg-red-900">Khó (Lặp lại)</button>
                        <button onClick={() => handleFlashcardResult('medium')} className="btn bg-yellow-900/50 text-yellow-300 border border-yellow-800 hover:bg-yellow-900">Bình thường</button>
                        <button onClick={() => handleFlashcardResult('easy')} className="btn bg-green-900/50 text-green-300 border border-green-800 hover:bg-green-900">Dễ (Master)</button>
                    </div>
                )}
            </div>
        );
    };

    const renderExam = () => (
        <div className="space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
            <h3 className="text-xl font-bold text-center text-gradient">Bài kiểm tra qua màn</h3>
            {examQuestions.map((q, idx) => (
                <div key={q.id} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                    <p className="font-semibold text-gray-200 mb-3">{idx + 1}. {q.question}</p>
                    {q.type === 'mcq' && q.options && (
                        <div className="space-y-2">
                            {q.options.map((opt, oIdx) => (
                                <label key={oIdx} className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-gray-700">
                                    <input 
                                        type="radio" 
                                        name={q.id} 
                                        className="form-radio"
                                        checked={examAnswers[q.id] === String(oIdx)}
                                        onChange={() => setExamAnswers({...examAnswers, [q.id]: String(oIdx)})}
                                    />
                                    <span className="text-gray-300">{opt}</span>
                                </label>
                            ))}
                        </div>
                    )}
                    {(q.type === 'fill_gap' || q.type === 'short_answer') && (
                        <input 
                            type="text" 
                            className="form-input" 
                            placeholder="Nhập câu trả lời..."
                            value={examAnswers[q.id] || ''}
                            onChange={(e) => setExamAnswers({...examAnswers, [q.id]: e.target.value})}
                        />
                    )}
                </div>
            ))}
            <button onClick={submitExam} className="btn btn-primary w-full">Nộp bài</button>
        </div>
    );

    const renderResult = () => {
        const isPass = examScore >= 40;
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
                            <button onClick={onClose} className="btn btn-primary w-full">Tiếp tục hành trình</button>
                        )}
                    </div>
                ) : (
                    <button onClick={() => setPhase('START')} className="btn btn-secondary w-full">Thử lại</button>
                )}
            </div>
        );
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={`Học tập: ${node.title}`} size="lg">
                {error && <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded mb-4 text-center">{error}</div>}
                
                {phase === 'START' && renderStart()}
                {phase === 'MANUAL_ENTRY_FLASHCARDS' && renderManualEntry()}
                
                {(phase === 'GEN_FLASHCARDS' || phase === 'GEN_EXAM' || phase === 'EXTENDING_PATH') && (
                    <div className="text-center py-12">
                        <div className="flex justify-center mb-4"><LoadingSpinner size={8} /></div>
                        <p className="text-gray-300 animate-pulse font-medium">
                            {phase === 'EXTENDING_PATH' ? 'Hệ thống đang nghiên cứu lộ trình nâng cao...' : 
                             phase === 'GEN_FLASHCARDS' ? 'AI đang soạn thẻ học cho bạn (Tiết kiệm Token)...' :
                             'AI đang soạn đề thi kiểm tra...'}
                        </p>
                    </div>
                )}

                {phase === 'STUDY_FLASHCARDS' && renderFlashcardStudy()}
                {phase === 'TAKE_EXAM' && renderExam()}
                {phase === 'RESULT' && renderResult()}

            </Modal>
            
            <ChallengerModal 
                isOpen={isChallengerModalOpen} 
                onClose={() => setIsChallengerModalOpen(false)} 
                nodeId={node.id}
                nodeTitle={node.title}
            />
        </>
    );
};

export default LevelStudyModal;
