
import React, { useState, useContext } from 'react';
import Modal from '../common/Modal';
import { AuthContext, DataContext, GlobalStateContext } from '../../contexts/AppProviders';
import { callGeminiApi } from '../../services/geminiService';
import LoadingSpinner from '../common/LoadingSpinner';

interface HarvestModalProps {
    isOpen: boolean;
    onClose: () => void;
    lessonTitle: string;
    lessonContent: string;
    onHarvest: (content: string) => void;
    onSkip: () => void;
}

const HarvestModal: React.FC<HarvestModalProps> = ({ isOpen, onClose, lessonTitle, lessonContent, onHarvest, onSkip }) => {
    const { user } = useContext(AuthContext)!;
    const { db } = useContext(DataContext)!;
    const { setPage: setGlobalPage } = useContext(GlobalStateContext)!;

    const [takeaway, setTakeaway] = useState('');
    const [isAiSuggesting, setIsAiSuggesting] = useState(false);

    const handleAiSuggest = async () => {
        const apiKey = user ? db.USERS[user.id]?.apiKey : null;
        if (!apiKey) {
            setGlobalPage('api_key', { isApiKeyModalOpen: true });
            return;
        }

        setIsAiSuggesting(true);
        try {
            const prompt = `Based on the following lesson content, synthesize exactly ONE profound key takeaway (1-2 sentences) that captures the essence of the lesson. The language should be Vietnamese.
            
            Lesson Content:
            "${lessonContent.substring(0, 5000)}"`;

            const suggestion = await callGeminiApi(apiKey, prompt, null, { useThinking: true });
            setTakeaway(suggestion.trim());
        } catch (e: any) {
            alert("Lỗi AI: " + e.message);
        } finally {
            setIsAiSuggesting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="🌾 Nghi thức Thu hoạch (Harvest Ritual)" size="md">
            <div className="space-y-6 p-2 text-center">
                <div className="relative inline-block">
                    <div className="text-6xl animate-bounce-subtle filter drop-shadow-lg">🌾</div>
                    <div className="absolute top-0 right-0 text-3xl animate-pulse">✨</div>
                </div>

                <div>
                    <h3 className="text-xl font-bold text-yellow-300 uppercase tracking-widest mb-2">Kiến thức là Vàng</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                        Để biến kiến thức thành tài sản của riêng bạn, hãy viết ra <strong>1 điều tâm đắc nhất</strong> (Key Takeaway) từ bài học:
                        <br/> <span className="text-white font-bold">"{lessonTitle}"</span>
                    </p>
                </div>

                <div className="relative">
                    <textarea 
                        className="w-full h-32 bg-black/40 border border-yellow-500/30 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 resize-none font-medium"
                        placeholder="Điều mình học được là..."
                        value={takeaway}
                        onChange={(e) => setTakeaway(e.target.value)}
                    />
                    
                    {/* AI Button */}
                    <button 
                        onClick={handleAiSuggest}
                        disabled={isAiSuggesting}
                        className="absolute bottom-3 right-3 text-xs bg-purple-600/80 hover:bg-purple-500 text-white px-3 py-1 rounded-lg flex items-center gap-1 transition-all"
                        title="Dùng Gemini suy nghĩ giúp"
                    >
                        {isAiSuggesting ? <LoadingSpinner size={3} /> : '✨ Gợi ý cho tôi'}
                    </button>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={onSkip}
                        className="flex-1 py-3 rounded-xl border border-gray-600 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm font-bold"
                    >
                        Bỏ qua (Chỉ hoàn thành)
                    </button>
                    <button 
                        onClick={() => { if(takeaway.trim()) onHarvest(takeaway); }}
                        disabled={!takeaway.trim()}
                        className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold shadow-[0_0_20px_rgba(234,179,8,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
                    >
                        Thu hoạch & Hoàn thành (+50 XP)
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default HarvestModal;
