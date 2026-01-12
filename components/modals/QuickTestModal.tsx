
import React, { useState, useContext, useEffect } from 'react';
import Modal from '../common/Modal';
import { DataContext } from '../../contexts/AppProviders';
import type { QuizQuestion, SpaceJunk } from '../../types';

interface QuickTestModalProps {
    isOpen: boolean;
    onClose: () => void;
    questions: QuizQuestion[];
}

const JUNK_LOOT_TABLE: Partial<SpaceJunk>[] = [
    { name: 'Mảnh Vỡ Vệ Tinh', icon: '🛰️', rarity: 'common', xpValue: 20 },
    { name: 'Thiên Thạch Nhỏ', icon: '☄️', rarity: 'common', xpValue: 15 },
    { name: 'Bụi Sao Lấp Lánh', icon: '✨', rarity: 'rare', xpValue: 50 },
    { name: 'Lõi Năng Lượng Hỏng', icon: '⚛️', rarity: 'rare', xpValue: 60 },
    { name: 'Hộp Đen Tàu Vũ Trụ', icon: '📦', rarity: 'legendary', xpValue: 150 },
];

const QuickTestModal: React.FC<QuickTestModalProps> = ({ isOpen, onClose, questions }) => {
    const { collectSpaceJunk } = useContext(DataContext)!;
    
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [reward, setReward] = useState<any | null>(null);

    useEffect(() => {
        if (isOpen) {
            setAnswers({});
            setIsSubmitted(false);
            setScore(0);
            setReward(null);
        }
    }, [isOpen]);

    const handleSelect = (qId: string, idx: number) => {
        if (!isSubmitted) {
            setAnswers(prev => ({...prev, [qId]: idx}));
        }
    };

    const handleSubmit = () => {
        let correct = 0;
        questions.forEach(q => {
            if (answers[q.id] === q.correctAnswer) correct++;
        });
        setScore(correct);
        setIsSubmitted(true);

        // REWARD LOGIC
        if (correct > 0) {
            // Determine rarity based on score
            // 3/3 = High chance of Rare/Legendary
            // 1-2 = Common/Rare
            let pool = JUNK_LOOT_TABLE.filter(j => j.rarity === 'common');
            if (correct >= 2) pool = [...pool, ...JUNK_LOOT_TABLE.filter(j => j.rarity === 'rare')];
            if (correct === 3) pool = [...pool, ...JUNK_LOOT_TABLE.filter(j => j.rarity === 'legendary')];

            const loot = pool[Math.floor(Math.random() * pool.length)];
            
            const newJunk: SpaceJunk = {
                id: `junk_reward_${Date.now()}`,
                name: loot.name!,
                icon: loot.icon!,
                rarity: loot.rarity!,
                xpValue: loot.xpValue!
            };

            setReward(newJunk);
            collectSpaceJunk(newJunk);
        }
    };

    const allAnswered = questions.length > 0 && questions.every(q => answers[q.id] !== undefined);

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="⚡ Test Nhanh (Quick Fire)" size="lg">
            {!isSubmitted ? (
                <div className="space-y-6">
                    <p className="text-gray-300 text-sm">Trả lời đúng để nhận vật phẩm rơi (Space Junk)!</p>
                    
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                        {questions.map((q, idx) => (
                            <div key={q.id} className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                                <p className="font-bold text-white mb-3 text-sm"><span className="text-yellow-400">Q{idx+1}:</span> {q.text}</p>
                                <div className="space-y-2">
                                    {q.options.map((opt, oIdx) => (
                                        <button
                                            key={oIdx}
                                            onClick={() => handleSelect(q.id, oIdx)}
                                            className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all ${
                                                answers[q.id] === oIdx 
                                                ? 'bg-blue-600 text-white shadow-lg scale-[1.01]' 
                                                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                                            }`}
                                        >
                                            <span className="opacity-50 mr-2">{String.fromCharCode(65+oIdx)}.</span> {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end pt-2">
                        <button 
                            onClick={handleSubmit} 
                            disabled={!allAnswered}
                            className={`btn w-full md:w-auto px-8 py-3 text-lg font-bold shadow-lg transition-all ${allAnswered ? 'btn-primary animate-pulse' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                        >
                            🚀 KIỂM TRA NGAY
                        </button>
                    </div>
                </div>
            ) : (
                <div className="text-center py-8 space-y-6 animate-pop-in">
                    <div className="relative inline-block">
                        <div className="text-7xl">{score === 3 ? '👑' : score > 0 ? '🎉' : '😅'}</div>
                        <div className="absolute -top-2 -right-2 text-3xl animate-bounce">
                            {score === 3 ? '💯' : ''}
                        </div>
                    </div>

                    <h2 className="text-3xl font-black text-white uppercase">
                        Kết Quả: <span className={score === 3 ? 'text-yellow-400' : 'text-blue-400'}>{score}/{questions.length}</span>
                    </h2>

                    {reward ? (
                        <div className="bg-gradient-to-b from-purple-900/40 to-black p-6 rounded-2xl border border-purple-500/50 max-w-sm mx-auto shadow-[0_0_30px_rgba(168,85,247,0.3)] animate-slide-up">
                            <p className="text-purple-300 text-xs font-bold uppercase tracking-widest mb-2">Vật Phẩm Rơi!</p>
                            <div className="text-6xl mb-2 animate-float">{reward.icon}</div>
                            <h3 className={`text-xl font-bold ${reward.rarity === 'legendary' ? 'text-yellow-400' : reward.rarity === 'rare' ? 'text-purple-400' : 'text-blue-300'}`}>
                                {reward.name}
                            </h3>
                            <span className="text-xs bg-white/10 px-2 py-1 rounded text-gray-400 mt-2 inline-block">
                                +{reward.xpValue} XP khi tái chế
                            </span>
                        </div>
                    ) : (
                        <p className="text-gray-400">Rất tiếc, bạn chưa trả lời đúng câu nào. Hãy thử lại lần sau!</p>
                    )}

                    <button onClick={onClose} className="btn btn-secondary w-full">Đóng</button>
                </div>
            )}
        </Modal>
    );
};

export default QuickTestModal;
