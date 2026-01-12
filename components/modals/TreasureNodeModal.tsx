
import React, { useState, useEffect, useContext } from 'react';
import Modal from '../common/Modal';
import { AuthContext, DataContext, GlobalStateContext } from '../../contexts/AppProviders';
import { generateTreasureRiddle } from '../../services/geminiService';
import LoadingSpinner from '../common/LoadingSpinner';
import type { RiddleData } from '../../types';

interface TreasureNodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    pathId: string;
    nodeId: string;
    pathTitle: string;
}

type Phase = 'LOCKED' | 'GENERATING' | 'RIDDLE' | 'SUCCESS' | 'FAIL';

const TreasureNodeModal: React.FC<TreasureNodeModalProps> = ({ isOpen, onClose, pathId, nodeId, pathTitle }) => {
    const { user } = useContext(AuthContext)!;
    const { db, updateNodeProgress, unlockSecretReward } = useContext(DataContext)!;
    const { setPage: setGlobalPage } = useContext(GlobalStateContext)!;

    const [phase, setPhase] = useState<Phase>('LOCKED');
    const [riddle, setRiddle] = useState<RiddleData | null>(null);
    const [userAnswer, setUserAnswer] = useState('');
    const [showHint, setShowHint] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reward, setReward] = useState<{ type: string, value: string | number } | null>(null);

    useEffect(() => {
        if (isOpen) {
            setPhase('LOCKED');
            setRiddle(null);
            setUserAnswer('');
            setShowHint(false);
            setError(null);
        }
    }, [isOpen]);

    const handleOpenChest = async () => {
        const apiKey = user ? db.USERS[user.id]?.apiKey : null;
        if (!apiKey) {
            setGlobalPage('api_key', { isApiKeyModalOpen: true });
            return;
        }

        setPhase('GENERATING');
        try {
            const riddleData = await generateTreasureRiddle(apiKey, pathTitle);
            setRiddle(riddleData);
            setPhase('RIDDLE');
        } catch (e: any) {
            setError(e.message || "Lỗi tạo câu đố.");
            setPhase('LOCKED');
        }
    };

    const checkAnswer = () => {
        if (!riddle) return;
        const normalizedUser = userAnswer.trim().toLowerCase();
        const normalizedCorrect = riddle.answer.trim().toLowerCase();

        if (normalizedUser === normalizedCorrect || normalizedUser.includes(normalizedCorrect)) {
            // Success Logic
            if (user) {
                const randomSkin = db.SHOP_ITEMS.find(i => i.type === 'skin' && i.id !== 'skin_default' && !db.GAMIFICATION.inventory.includes(i.id));
                
                if (randomSkin) {
                    setReward({ type: 'skin', value: randomSkin.id });
                    unlockSecretReward(user.id, 'skin', randomSkin.id);
                } else {
                    setReward({ type: 'diamond', value: 500 });
                    unlockSecretReward(user.id, 'diamond', 500);
                }
                updateNodeProgress(pathId, nodeId, { isCompleted: true });
                setPhase('SUCCESS');
            }
        } else {
            setPhase('FAIL');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="🎁 Rương Báu Bí Mật" size="md">
            
            {phase === 'LOCKED' && (
                <div className="text-center py-8">
                    <div 
                        className="text-8xl mb-6 animate-bounce cursor-pointer hover:scale-110 transition-transform"
                        onClick={handleOpenChest}
                    >
                        🧰
                    </div>
                    <h2 className="text-2xl font-bold text-yellow-400 mb-2">Bạn đã tìm thấy Kho Báu!</h2>
                    <p className="text-gray-400 mb-6">Chiếc rương này bị khóa bởi một câu đố Logic cổ xưa.</p>
                    {error && <p className="text-red-400 mb-4">{error}</p>}
                    <button onClick={handleOpenChest} className="btn btn-primary px-8 py-3 text-lg shadow-[0_0_20px_rgba(234,179,8,0.5)]">
                        🗝️ Mở Khóa (AI Riddle)
                    </button>
                </div>
            )}

            {phase === 'GENERATING' && (
                <div className="flex flex-col items-center justify-center py-12">
                    <LoadingSpinner size={10} />
                    <p className="mt-4 text-purple-300 font-bold animate-pulse">Sphinx đang suy nghĩ câu đố...</p>
                    <p className="text-xs text-gray-500">Gemini 3 Pro Thinking Mode</p>
                </div>
            )}

            {phase === 'RIDDLE' && riddle && (
                <div className="space-y-6">
                    <div className="bg-purple-900/20 border border-purple-500/50 p-6 rounded-xl relative">
                        <div className="absolute -top-3 -left-3 text-4xl">📜</div>
                        <p className="text-lg text-white font-serif leading-relaxed italic text-center">
                            "{riddle.question}"
                        </p>
                    </div>

                    <div className="space-y-2">
                        <input 
                            type="text" 
                            className="form-input w-full text-center text-xl" 
                            placeholder="Nhập câu trả lời..."
                            value={userAnswer}
                            onChange={e => setUserAnswer(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && checkAnswer()}
                        />
                        
                        <div className="flex justify-between items-center">
                            <button 
                                onClick={() => setShowHint(!showHint)}
                                className="text-xs text-gray-500 hover:text-yellow-400 underline"
                            >
                                {showHint ? `Gợi ý: ${riddle.hint}` : "💡 Cần gợi ý?"}
                            </button>
                            <button onClick={checkAnswer} className="btn btn-primary px-6">
                                Giải Mã
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {phase === 'FAIL' && (
                <div className="text-center py-8">
                    <div className="text-6xl mb-4">💥</div>
                    <h2 className="text-xl font-bold text-red-500">Sai rồi!</h2>
                    <p className="text-gray-400 mb-6">Chiếc rương vẫn đóng chặt.</p>
                    <button onClick={() => setPhase('RIDDLE')} className="btn btn-secondary">Thử lại</button>
                </div>
            )}

            {phase === 'SUCCESS' && reward && (
                <div className="text-center py-8 animate-pop-in">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-yellow-500 blur-3xl opacity-50 animate-pulse"></div>
                        <div className="text-8xl relative z-10">💎</div>
                    </div>
                    
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-500 mt-6 mb-2 uppercase">
                        Kho Báu Huyền Thoại!
                    </h2>
                    
                    <div className="bg-white/10 p-4 rounded-xl border border-white/20 inline-block mb-6">
                        <p className="text-gray-300 text-sm uppercase font-bold tracking-wider">Phần thưởng</p>
                        <p className="text-2xl font-bold text-white mt-1">
                            {reward.type === 'skin' ? `Skin Hiếm: ${reward.value}` : `+${reward.value} Kim Cương`}
                        </p>
                    </div>

                    <button onClick={onClose} className="btn btn-primary w-full">Thu thập & Đóng</button>
                </div>
            )}

        </Modal>
    );
};

export default TreasureNodeModal;
