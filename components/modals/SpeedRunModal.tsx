
import React, { useState, useEffect, useContext, useRef } from 'react';
import Modal from '../common/Modal';
import { AuthContext, DataContext, GlobalStateContext } from '../../contexts/AppProviders';
import { generateSpeedRunQuestions } from '../../services/geminiService';
import LoadingSpinner from '../common/LoadingSpinner';
import type { ExamQuestion } from '../../types';

interface SpeedRunModalProps {
    isOpen: boolean;
    onClose: () => void;
    pathTopic: string;
    completedNodes: string[];
    mode?: 'normal' | 'ritual'; // Added mode
}

type GameState = 'INTRO' | 'GENERATING' | 'PLAYING' | 'RESULT';

const SpeedRunModal: React.FC<SpeedRunModalProps> = ({ isOpen, onClose, pathTopic, completedNodes, mode = 'normal' }) => {
    const { user } = useContext(AuthContext)!;
    const { db, recordSpeedRunResult, restoreStreak } = useContext(DataContext)!;
    const { setPage: setGlobalPage } = useContext(GlobalStateContext)!;

    const [gameState, setGameState] = useState<GameState>('INTRO');
    const [questions, setQuestions] = useState<ExamQuestion[]>([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60); // 60 seconds
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number>>({}); // qId -> selected option index
    const [error, setError] = useState<string | null>(null);
    const [isRitualSuccess, setIsRitualSuccess] = useState(false);

    const timerRef = useRef<number | null>(null);
    const isRitual = mode === 'ritual';

    // --- GAME LOOP ---
    useEffect(() => {
        if (gameState === 'PLAYING') {
            timerRef.current = window.setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        endGame();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [gameState]);

    const handleStart = async () => {
        const apiKey = user ? db.USERS[user.id]?.apiKey : null;
        if (!apiKey) {
            setGlobalPage('api_key', { isApiKeyModalOpen: true });
            return;
        }

        setGameState('GENERATING');
        setError(null);
        try {
            // Use Thinking Mode to balance topics
            const qs = await generateSpeedRunQuestions(apiKey, pathTopic || 'General Knowledge', completedNodes.length > 0 ? completedNodes : ['General']);
            setQuestions(qs);
            setGameState('PLAYING');
            setTimeLeft(isRitual ? 90 : 60); // More time for ritual to be fair but intense
            setScore(0);
            setStreak(0);
            setAnswers({});
            setCurrentQIndex(0);
            setIsRitualSuccess(false);
        } catch (e: any) {
            setError(e.message || "Lỗi tạo Speed Run.");
            setGameState('INTRO');
        }
    };

    const handleAnswer = (optionIndex: number) => {
        if (gameState !== 'PLAYING') return;

        const currentQ = questions[currentQIndex];
        const isCorrect = String(optionIndex) === currentQ.correctAnswer;

        setAnswers(prev => ({...prev, [currentQ.id]: optionIndex}));

        if (isCorrect) {
            // Score Logic: Base 100 + Time Bonus + Streak Bonus
            const timeBonus = Math.floor(timeLeft / 10); // small bonus for fast answer
            const streakBonus = streak * 10;
            setScore(prev => prev + 100 + timeBonus + streakBonus);
            setStreak(prev => prev + 1);
        } else {
            setStreak(0); // Reset streak
            // Ritual Fail Condition: Instant fail if wrong answer? Or just fail at end if < 100%?
            // Let's keep it simple: fail at end check.
        }

        // Move to next question or end
        if (currentQIndex < questions.length - 1) {
            setCurrentQIndex(prev => prev + 1);
        } else {
            endGame();
        }
    };

    const endGame = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setGameState('RESULT');
        
        // Ritual Check
        if (isRitual) {
            // Must have answered all questions correctly
            const correctCount = Object.keys(answers).filter(id => {
                const q = questions.find(q => q.id === id);
                return q && String(answers[id]) === q.correctAnswer;
            }).length;
            
            if (correctCount === questions.length) {
                setIsRitualSuccess(true);
                restoreStreak(); // Restore!
            } else {
                setIsRitualSuccess(false);
            }
        } else {
            if (user) recordSpeedRunResult(user.id, score);
        }
    };

    const formatTime = (s: number) => `00:${s.toString().padStart(2, '0')}`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isRitual ? "🔥 Nghi Lễ Hồi Sinh Phượng Hoàng" : "⏱️ Speed Run (Time Attack)"} size="lg">
            {gameState === 'INTRO' && (
                <div className="text-center py-8 space-y-6">
                    <div className={`text-7xl ${isRitual ? 'animate-pulse' : 'animate-bounce-subtle'}`}>{isRitual ? '🦅' : '🏎️'}</div>
                    <h2 className={`text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r uppercase ${isRitual ? 'from-orange-500 to-red-600' : 'from-red-500 to-orange-500'}`}>
                        {isRitual ? 'Thử thách Hồi sinh' : 'Sẵn sàng đua tốc độ?'}
                    </h2>
                    <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 max-w-sm mx-auto">
                        <ul className="text-left space-y-3 text-gray-300 text-sm">
                            <li>🎯 <strong>10 Câu hỏi</strong> ngẫu nhiên.</li>
                            <li>⏳ <strong>{isRitual ? '90' : '60'} Giây</strong> để trả lời.</li>
                            {isRitual ? (
                                <li className="text-red-400 font-bold">🔥 Yêu cầu: Trả lời đúng 100% để hồi sinh chuỗi!</li>
                            ) : (
                                <li>🔥 <strong>Combo Streak</strong> nhân đôi điểm số.</li>
                            )}
                        </ul>
                    </div>
                    {error && <p className="text-red-400">{error}</p>}
                    <button 
                        onClick={handleStart}
                        className={`btn w-full py-4 text-white font-black text-xl uppercase tracking-widest shadow-[0_0_30px_rgba(220,38,38,0.5)] animate-pulse ${isRitual ? 'bg-orange-600 hover:bg-orange-500' : 'bg-red-600 hover:bg-red-500'}`}
                    >
                        {isRitual ? 'BẮT ĐẦU NGHI LỄ' : 'START ENGINE'}
                    </button>
                </div>
            )}

            {gameState === 'GENERATING' && (
                <div className="flex flex-col items-center justify-center py-20">
                    <LoadingSpinner size={12} />
                    <p className="mt-6 text-xl font-bold text-red-400 animate-pulse">{isRitual ? 'Phượng hoàng đang trỗi dậy...' : 'AI đang chuẩn bị đường đua...'}</p>
                    <p className="text-sm text-gray-500">Thinking Mode: Balancing Difficulty</p>
                </div>
            )}

            {gameState === 'PLAYING' && questions.length > 0 && (
                <div className="space-y-6 relative">
                    {/* HUD */}
                    <div className="flex justify-between items-end border-b border-gray-700 pb-4">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">SCORE</p>
                            <p className="text-3xl font-mono font-black text-yellow-400">{score.toLocaleString()}</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className={`text-4xl font-mono font-black ${timeLeft <= 10 ? 'text-red-500 animate-ping' : 'text-white'}`}>
                                {formatTime(timeLeft)}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 uppercase font-bold">COMBO</p>
                            <p className={`text-3xl font-black ${streak > 2 ? 'text-orange-500 animate-bounce' : 'text-gray-400'}`}>
                                x{streak}
                            </p>
                        </div>
                    </div>

                    {/* Question Card */}
                    <div className={`bg-gray-800 p-6 rounded-2xl border-2 shadow-2xl relative overflow-hidden ${isRitual ? 'border-orange-500/50' : 'border-blue-500/30'}`}>
                        {/* Progress Bar Top */}
                        <div className={`absolute top-0 left-0 h-1 transition-all duration-300 ${isRitual ? 'bg-orange-500' : 'bg-blue-500'}`} style={{ width: `${((currentQIndex) / questions.length) * 100}%` }}></div>
                        
                        <span className={`text-xs font-bold uppercase tracking-widest mb-2 block ${isRitual ? 'text-orange-400' : 'text-blue-400'}`}>
                            Question {currentQIndex + 1} / {questions.length}
                        </span>
                        <h3 className="text-xl font-bold text-white mb-6 leading-relaxed">
                            {questions[currentQIndex].question}
                        </h3>

                        <div className="grid grid-cols-1 gap-3">
                            {questions[currentQIndex].options?.map((opt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswer(idx)}
                                    className={`p-4 rounded-xl bg-gray-700/50 text-left transition-all duration-150 font-semibold text-gray-200 border border-gray-600 ${isRitual ? 'hover:bg-orange-600 hover:border-orange-400' : 'hover:bg-blue-600 hover:border-blue-400'} hover:scale-[1.02]`}
                                >
                                    <span className="opacity-50 mr-3">{String.fromCharCode(65+idx)}.</span> {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {gameState === 'RESULT' && (
                <div className="text-center py-8 space-y-6 animate-pop-in">
                    {isRitual ? (
                        <>
                            <div className="text-8xl">{isRitualSuccess ? '🦅' : '🪦'}</div>
                            <h2 className={`text-4xl font-black uppercase ${isRitualSuccess ? 'text-yellow-400 drop-shadow-glow' : 'text-gray-500'}`}>
                                {isRitualSuccess ? 'HỒI SINH THÀNH CÔNG!' : 'NGHI LỄ THẤT BẠI'}
                            </h2>
                            <p className="text-gray-300 text-lg">
                                {isRitualSuccess ? 'Ngọn lửa tri thức đã bùng cháy trở lại. Chuỗi ngày của bạn đã được nối!' : 'Bạn chưa đạt 100% điểm số. Phượng hoàng không thể trỗi dậy từ tro tàn.'}
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="text-6xl">{score > 1000 ? '🚀' : '🏁'}</div>
                            <div>
                                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">FINAL SCORE</h2>
                                <p className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-lg">
                                    {score.toLocaleString()}
                                </p>
                            </div>
                        </>
                    )}
                    
                    {!isRitual && (
                        <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-xl">
                            <p className="text-green-300 font-bold mb-1">Rank Updated!</p>
                            <p className="text-xs text-gray-400">Điểm số đã được cập nhật vào bảng xếp hạng Speedster.</p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button onClick={onClose} className="btn btn-secondary flex-1">Thoát</button>
                        {(!isRitual || !isRitualSuccess) && <button onClick={handleStart} className="btn btn-primary flex-1">Thử lại</button>}
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default SpeedRunModal;
