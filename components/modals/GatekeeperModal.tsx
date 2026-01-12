
import React, { useState, useContext } from 'react';
import Modal from '../common/Modal';
import { AuthContext, DataContext, GlobalStateContext } from '../../contexts/AppProviders';
import { generateGatekeeperTest } from '../../services/geminiService';
import LoadingSpinner from '../common/LoadingSpinner';
import type { ExamQuestion } from '../../types';

interface GatekeeperModalProps {
    isOpen: boolean;
    onClose: () => void;
    pathId: string;
    pathTitle: string;
    pathTopic: string;
    nodesTitle: string[];
}

type Phase = 'INTRO' | 'GENERATING' | 'TEST' | 'RESULT';

const GatekeeperModal: React.FC<GatekeeperModalProps> = ({ isOpen, onClose, pathId, pathTitle, pathTopic, nodesTitle }) => {
    const { user } = useContext(AuthContext)!;
    const { db, skipLearningPath } = useContext(DataContext)!;
    const { setPage: setGlobalPage } = useContext(GlobalStateContext)!;

    const [phase, setPhase] = useState<Phase>('INTRO');
    const [questions, setQuestions] = useState<ExamQuestion[]>([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [score, setScore] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        const apiKey = user ? db.USERS[user.id]?.apiKey : null;
        if (!apiKey) {
            setGlobalPage('api_key', { isApiKeyModalOpen: true });
            return;
        }

        setPhase('GENERATING');
        setError(null);
        try {
            // Using Gemini 3 Pro (Thinking Mode) via service
            const qs = await generateGatekeeperTest(apiKey, pathTopic, nodesTitle);
            setQuestions(qs);
            setPhase('TEST');
        } catch (e: any) {
            setError(e.message || "Lỗi tạo bài kiểm tra.");
            setPhase('INTRO');
        }
    };

    const handleSubmit = () => {
        let correct = 0;
        questions.forEach(q => {
            const userAns = (answers[q.id] || '').trim().toLowerCase();
            const correctAns = q.correctAnswer.trim().toLowerCase();
            if (userAns === correctAns) correct++;
        });

        const finalScore = (correct / questions.length) * 100;
        setScore(finalScore);
        
        if (finalScore >= 80 && user) {
            skipLearningPath(user.id, pathId);
        }
        setPhase('RESULT');
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="⚡ Thi Vượt Cấp (Gatekeeper Test)" size="lg">
            {phase === 'INTRO' && (
                <div className="text-center space-y-6 py-6">
                    <div className="text-6xl animate-pulse">⛩️</div>
                    <h2 className="text-2xl font-bold text-red-400">Cảnh Báo: Độ Khó Cao!</h2>
                    <p className="text-gray-300">
                        Bạn có tự tin mình đã nắm vững toàn bộ kiến thức của <strong>{pathTitle}</strong> không?
                    </p>
                    <p className="text-sm text-gray-400">
                        Hệ thống sẽ sử dụng AI (Thinking Mode) để tạo ra một bài kiểm tra tổng hợp cực khó.
                        <br/>
                        Nếu đạt <strong>trên 80%</strong>, bạn sẽ mở khóa toàn bộ lộ trình và nhận trọn vẹn XP.
                    </p>
                    {error && <p className="text-red-500 bg-red-900/20 p-2 rounded">{error}</p>}
                    <div className="flex justify-center gap-4">
                        <button onClick={onClose} className="btn btn-secondary">Tôi chưa sẵn sàng</button>
                        <button onClick={handleGenerate} className="btn btn-primary bg-red-600 hover:bg-red-500 shadow-lg border-none animate-pulse">
                            ⚔️ Chấp nhận Thử thách
                        </button>
                    </div>
                </div>
            )}

            {phase === 'GENERATING' && (
                <div className="flex flex-col items-center justify-center py-12">
                    <LoadingSpinner size={10} />
                    <p className="mt-4 text-lg font-bold text-blue-300 animate-pulse">AI đang suy nghĩ (Thinking Mode)...</p>
                    <p className="text-sm text-gray-500">Đang tổng hợp kiến thức từ {nodesTitle.length} bài học...</p>
                </div>
            )}

            {phase === 'TEST' && questions.length > 0 && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center text-sm text-gray-400">
                        <span>Câu hỏi {currentQIndex + 1} / {questions.length}</span>
                        <span className="font-mono text-yellow-400">Gatekeeper Protocol</span>
                    </div>
                    
                    <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-red-500 h-full transition-all duration-300" style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}></div>
                    </div>

                    <div className="p-6 bg-red-900/10 border border-red-500/30 rounded-xl">
                        <h3 className="text-xl font-bold text-white mb-4">{questions[currentQIndex].question}</h3>
                        
                        {questions[currentQIndex].type === 'mcq' ? (
                            <div className="space-y-3">
                                {questions[currentQIndex].options?.map((opt, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => setAnswers({...answers, [questions[currentQIndex].id]: String(idx)})}
                                        className={`w-full text-left p-4 rounded-lg border transition-all ${
                                            answers[questions[currentQIndex].id] === String(idx) 
                                            ? 'bg-red-600 border-red-400 text-white' 
                                            : 'bg-gray-800 border-gray-600 hover:bg-gray-700 text-gray-300'
                                        }`}
                                    >
                                        <span className="font-bold mr-2">{String.fromCharCode(65+idx)}.</span> {opt}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <input 
                                type="text" 
                                className="form-input w-full text-lg" 
                                placeholder="Nhập câu trả lời..."
                                value={answers[questions[currentQIndex].id] || ''}
                                onChange={e => setAnswers({...answers, [questions[currentQIndex].id]: e.target.value})}
                            />
                        )}
                    </div>

                    <div className="flex justify-between pt-4">
                        <button 
                            onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentQIndex === 0}
                            className="btn btn-secondary"
                        >
                            &larr; Trước
                        </button>
                        {currentQIndex < questions.length - 1 ? (
                            <button 
                                onClick={() => setCurrentQIndex(prev => prev + 1)}
                                className="btn btn-primary"
                            >
                                Tiếp theo &rarr;
                            </button>
                        ) : (
                            <button onClick={handleSubmit} className="btn btn-success font-bold text-lg shadow-lg">
                                NỘP BÀI 🏁
                            </button>
                        )}
                    </div>
                </div>
            )}

            {phase === 'RESULT' && (
                <div className="text-center py-8 space-y-6">
                    <div className="text-6xl">{score >= 80 ? '👑' : '💀'}</div>
                    <h2 className={`text-4xl font-black uppercase ${score >= 80 ? 'text-yellow-400' : 'text-gray-500'}`}>
                        {score >= 80 ? 'VƯỢT CẤP THÀNH CÔNG!' : 'THẤT BẠI'}
                    </h2>
                    
                    <div className="text-2xl font-mono">
                        Điểm số: <span className={score >= 80 ? 'text-green-400' : 'text-red-400'}>{score.toFixed(0)}%</span>
                    </div>

                    {score >= 80 ? (
                        <div className="p-4 bg-green-900/30 border border-green-500/50 rounded-xl animate-fade-in-up">
                            <p className="text-green-300 mb-2 font-bold">Phần thưởng:</p>
                            <ul className="text-sm text-gray-300 space-y-1">
                                <li>🔓 Mở khóa toàn bộ lộ trình</li>
                                <li>✅ Đánh dấu hoàn thành tất cả Level</li>
                                <li>💎 Nhận trọn vẹn XP</li>
                            </ul>
                        </div>
                    ) : (
                        <p className="text-gray-400">
                            Bạn chưa đủ trình độ để vượt cấp (Cần {'>'}80%).<br/>
                            Hãy kiên nhẫn học từng bước nhé!
                        </p>
                    )}

                    <button onClick={onClose} className="btn btn-primary w-full mt-6">
                        {score >= 80 ? 'Tuyệt vời!' : 'Quay lại học tập'}
                    </button>
                </div>
            )}
        </Modal>
    );
};

export default GatekeeperModal;
