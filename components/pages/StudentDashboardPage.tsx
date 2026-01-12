
import React, { useState, useContext, useMemo, useEffect, useRef } from 'react';
import { AuthContext, DataContext, GlobalStateContext, PageContext, MusicContext, PetContext } from '../../contexts/AppProviders';
import { callGeminiApiWithSchema, convertContentToFlashcards, callGeminiApi } from '../../services/geminiService'; // Added callGeminiApi
import LoadingSpinner from '../common/LoadingSpinner';
import TreasureChestWidget from '../dashboard/TreasureChestWidget';
import Modal from '../common/Modal'; 
import FlashcardModal from '../modals/FlashcardModal'; 
import PhoenixRebirthModal from '../modals/PhoenixRebirthModal'; // Import New Modal
import SpeedRunModal from '../modals/SpeedRunModal'; // Import for Ritual
import type { User, Task, Assignment, LearningPath, FlashcardDeck, Course, QuizSubmission, FileSubmission, StudyGroup, ShopItem, Quiz } from '../../types';

// --- BREAK ACTIVITY MODAL (NEW) ---
const BreakActivityModal: React.FC<{ isOpen: boolean; onClose: () => void; onAction: (action: 'quiz' | 'flashcard') => void }> = ({ isOpen, onClose, onAction }) => {
    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="☕ Trạm Tiếp Năng Lượng" size="md">
            <div className="text-center space-y-6 p-2">
                <div className="relative inline-block">
                    <div className="text-6xl animate-bounce">🔋</div>
                    <div className="absolute -bottom-2 -right-2 bg-green-500 text-black text-xs font-bold px-2 py-0.5 rounded-full border border-white">FULL</div>
                </div>
                
                <div>
                    <h3 className="text-xl font-bold text-white mb-2">Hoàn thành phiên tập trung!</h3>
                    <p className="text-gray-400 text-sm">Bạn có 5 phút giải lao. Đừng lướt mạng xã hội nhé! <br/>Hãy thử một bài tập nhỏ để duy trì đà hưng phấn?</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => onAction('quiz')}
                        className="group p-4 bg-purple-900/30 border border-purple-500/50 rounded-xl hover:bg-purple-900/50 transition-all text-left relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 text-4xl">⚡</div>
                        <p className="text-2xl mb-1">⚡</p>
                        <p className="font-bold text-purple-200">Quiz Nhanh</p>
                        <p className="text-xs text-purple-400">+50 XP • 2 Phút</p>
                    </button>

                    <button 
                        onClick={() => onAction('flashcard')}
                        className="group p-4 bg-blue-900/30 border border-blue-500/50 rounded-xl hover:bg-blue-900/50 transition-all text-left relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 text-4xl">🧠</div>
                        <p className="text-2xl mb-1">🧠</p>
                        <p className="font-bold text-blue-200">Ôn Flashcard</p>
                        <p className="text-xs text-blue-400">+30 XP • 3 Phút</p>
                    </button>
                </div>

                <button onClick={onClose} className="text-sm text-gray-500 hover:text-white underline decoration-dashed">
                    Không cảm ơn, tôi muốn nghỉ ngơi hoàn toàn.
                </button>
            </div>
        </Modal>
    );
};

// ... existing RequestIntelModal ...
const RequestIntelModal: React.FC<{ isOpen: boolean; onClose: () => void; targetUser: User | null }> = ({ isOpen, onClose, targetUser }) => {
    const { user } = useContext(AuthContext)!;
    const { sendChatMessage } = useContext(DataContext)!;
    const { navigate } = useContext(PageContext)!;
    
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (isOpen && targetUser && user) {
            setMessage(`Chào ${targetUser.name}, tớ thấy cậu đang rank cao môn này! 🏆\nCậu có Note hay tài liệu nào không, chia sẻ cho tớ tham khảo với? 🙏`);
        }
    }, [isOpen, targetUser, user]);

    const handleSend = () => {
        if (!user || !targetUser) return;
        sendChatMessage(user.id, targetUser.id, message);
        alert(`📨 Đã gửi tín hiệu xin tài liệu đến ${targetUser.name}!`);
        onClose();
        // Optional: Navigate to chat to see the sent message
        // navigate('chat', { targetUserId: targetUser.id });
    };

    if (!isOpen || !targetUser) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="📄 Xin Chia Sẻ Tài Liệu (Intel)">
            <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white">
                        {targetUser.name.charAt(0)}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">Gửi tới: {targetUser.name}</p>
                        <p className="text-xs text-gray-400">Học hỏi từ những người giỏi nhất!</p>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tin nhắn</label>
                    <textarea 
                        className="form-textarea w-full h-32"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    ></textarea>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <button onClick={onClose} className="btn btn-secondary text-sm">Hủy</button>
                    <button onClick={handleSend} className="btn btn-primary bg-gradient-to-r from-green-600 to-emerald-600 border-none shadow-lg text-sm">
                        📨 Gửi Yêu Cầu
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// --- NEW: RIVAL HISTORY MODAL ---
const RivalHistoryModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    targetUser: User | null; 
}> = ({ isOpen, onClose, targetUser }) => {
    const { db } = useContext(DataContext)!;

    const history = useMemo(() => {
        if (!targetUser) return [];
        const records: { quizId: string, title: string, score: number, total: number, pct: number, time: string }[] = [];
        
        (Object.values(db.QUIZZES) as Quiz[]).forEach(quiz => {
            const sub = db.QUIZ_SUBMISSIONS[quiz.id]?.[targetUser.id];
            if (sub) {
                records.push({
                    quizId: quiz.id,
                    title: quiz.title || 'Unknown Quiz',
                    score: sub.score,
                    total: sub.total,
                    pct: sub.percentage,
                    time: sub.timestamp
                });
            }
        });
        
        return records.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    }, [db.QUIZZES, db.QUIZ_SUBMISSIONS, targetUser]);

    if (!isOpen || !targetUser) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Lịch sử đấu: ${targetUser.name}`} size="md">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                {history.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p className="text-4xl mb-2">🕵️‍♂️</p>
                        <p>Chưa tìm thấy dữ liệu thi đấu nào.</p>
                        <p className="text-xs">Đối thủ này chưa hoàn thành bài Quiz nào.</p>
                    </div>
                ) : (
                    history.map(record => {
                        const isStrong = record.pct >= 80;
                        const isWeak = record.pct < 50;
                        
                        return (
                            <div key={record.quizId} className={`p-4 rounded-xl border bg-gray-900/50 flex flex-col gap-2 relative overflow-hidden group ${
                                isStrong ? 'border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 
                                isWeak ? 'border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 
                                'border-gray-700'
                            }`}>
                                <div className="flex justify-between items-start z-10 relative">
                                    <h4 className="font-bold text-white text-sm line-clamp-1 pr-4">{record.title}</h4>
                                    <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap">
                                        {new Date(record.time).toLocaleDateString()}
                                    </span>
                                </div>
                                
                                <div className="flex items-end justify-between z-10 relative">
                                    <div>
                                        {isStrong && <span className="text-[10px] font-black text-green-400 bg-green-900/30 px-2 py-0.5 rounded uppercase tracking-wider">Sở trường</span>}
                                        {isWeak && <span className="text-[10px] font-black text-red-400 bg-red-900/30 px-2 py-0.5 rounded uppercase tracking-wider">Điểm yếu</span>}
                                        {!isStrong && !isWeak && <span className="text-[10px] text-gray-500">Bình thường</span>}
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-2xl font-black ${isStrong ? 'text-green-400' : isWeak ? 'text-red-400' : 'text-blue-400'}`}>
                                            {record.score}/{record.total}
                                        </span>
                                    </div>
                                </div>

                                {/* Progress Bar Background */}
                                <div className="absolute bottom-0 left-0 h-1 bg-gray-800 w-full">
                                    <div 
                                        className={`h-full ${isStrong ? 'bg-green-500' : isWeak ? 'bg-red-500' : 'bg-blue-500'}`} 
                                        style={{ width: `${record.pct}%` }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            <div className="mt-4 pt-2 border-t border-white/10 text-center">
                <p className="text-[10px] text-gray-500 italic">"Biết người biết ta, trăm trận trăm thắng."</p>
            </div>
        </Modal>
    );
};

// ... RaidSetupModal, ScratchpadWidget, WeatherWidget, MusicWidget, FocusTimerWidget remain same ...
// (Omitting duplicates for brevity, assume they are present)

// --- NEW: RAID SETUP MODAL ---
const RaidSetupModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    selectedUserIds: string[]; 
}> = ({ isOpen, onClose, selectedUserIds }) => {
    const { user } = useContext(AuthContext)!;
    const { db, createRaidParty } = useContext(DataContext)!;
    const { navigate } = useContext(PageContext)!;

    const [selectedBossId, setSelectedBossId] = useState('');
    const [partyName, setPartyName] = useState('');

    // Find available bosses (Assignments with isBoss = true)
    const availableBosses = useMemo(() => {
        return (Object.values(db.ASSIGNMENTS) as Assignment[]).filter(a => a.isBoss);
    }, [db.ASSIGNMENTS]);

    useEffect(() => {
        if (isOpen) {
            setPartyName(`Raid Party: ${selectedUserIds.length + 1} Heroes`);
            if (availableBosses.length > 0) setSelectedBossId(availableBosses[0].id);
        }
    }, [isOpen, selectedUserIds, availableBosses]);

    const handleLaunch = () => {
        if (!user || !selectedBossId) return;
        const boss = availableBosses.find(b => b.id === selectedBossId);
        if (!boss) return;

        createRaidParty(partyName, user.id, selectedUserIds, boss.title);
        alert(`⚔️ Raid Party thành lập thành công! Mục tiêu: ${boss.title}`);
        navigate('group_chat');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="⚔️ THIẾT LẬP RAID PARTY" size="md">
            <div className="space-y-6">
                <div className="text-center">
                    <div className="text-6xl animate-pulse mb-2">👹</div>
                    <p className="text-red-400 font-bold uppercase tracking-widest">CẢNH BÁO NGUY HIỂM</p>
                    <p className="text-gray-300 text-sm">Bạn đang tập hợp đội hình để thách đấu Boss.</p>
                </div>

                <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-xl">
                    <div className="flex justify-between text-sm text-gray-400 mb-2">
                        <span>Đội hình ({selectedUserIds.length + 1})</span>
                        <span>Sẵn sàng chiến đấu</span>
                    </div>
                    <div className="flex -space-x-2 overflow-hidden">
                        <div className="w-8 h-8 rounded-full border-2 border-black bg-blue-500 flex items-center justify-center text-xs font-bold text-white" title="Bạn (Leader)">You</div>
                        {selectedUserIds.map(uid => (
                            <div key={uid} className="w-8 h-8 rounded-full border-2 border-black bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">
                                {db.USERS[uid]?.name.charAt(0)}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Chọn Boss Mục Tiêu</label>
                        <select 
                            className="form-select w-full bg-gray-900 border-red-500/50 text-white"
                            value={selectedBossId}
                            onChange={(e) => setSelectedBossId(e.target.value)}
                        >
                            {availableBosses.map(boss => (
                                <option key={boss.id} value={boss.id}>👹 {boss.title} (Rank S)</option>
                            ))}
                            {availableBosses.length === 0 && <option value="">Không có Boss nào hiện tại</option>}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tên Party</label>
                        <input 
                            type="text" 
                            className="form-input w-full" 
                            value={partyName}
                            onChange={(e) => setPartyName(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="btn btn-secondary flex-1">Hủy bỏ</button>
                    <button 
                        onClick={handleLaunch} 
                        disabled={!selectedBossId}
                        className="btn btn-primary bg-gradient-to-r from-red-600 to-orange-600 border-none shadow-lg animate-pulse flex-[2]"
                    >
                        🚀 PHÁT ĐỘNG TẤN CÔNG
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// ... existing ScratchpadWidget, WeatherWidget, MusicWidget, FocusTimerWidget ...
const ScratchpadWidget: React.FC = () => {
    const { user } = useContext(AuthContext)!;
    const { db, updateScratchpad, createFlashcardDeck, addFlashcardToDeck, createPersonalNote } = useContext(DataContext)!;
    const { setPage: setGlobalPage } = useContext(GlobalStateContext)!;
    const { triggerReaction } = useContext(PetContext)!;
    const [content, setContent] = useState('');
    const [isConverting, setIsConverting] = useState(false);
    const [showConvertModal, setShowConvertModal] = useState(false);

    useEffect(() => {
        if (user && db.SCRATCHPAD[user.id]) {
            setContent(db.SCRATCHPAD[user.id]);
        }
    }, [user, db.SCRATCHPAD]);

    const handleSave = (val: string) => {
        setContent(val);
        if (user) updateScratchpad(user.id, val);
    };

    const handleConvert = async (type: 'flashcard' | 'notebook') => {
        if (!content.trim() || !user) return;
        
        setShowConvertModal(false);

        if (type === 'notebook') {
            createPersonalNote(user.id, `Ghi chú nhanh ${new Date().toLocaleDateString()}`, content);
            alert("Đã lưu vào Sổ tay!");
            handleSave(''); // Clear scratchpad
            return;
        }

        if (type === 'flashcard') {
            const apiKey = db.USERS[user.id]?.apiKey;
            if (!apiKey) {
                setGlobalPage('api_key', { isApiKeyModalOpen: true });
                return;
            }

            setIsConverting(true);
            try {
                // Use Thinking Mode for better extraction from messy notes
                const cards = await convertContentToFlashcards(apiKey, content, { useThinking: true });
                
                if (cards && cards.length > 0) {
                    // Find or Create "General Review" Deck
                    const generalDeck = (Object.values(db.FLASHCARD_DECKS) as FlashcardDeck[]).find(d => d.title === "Ôn tập chung");
                    if (generalDeck) {
                        addFlashcardToDeck(generalDeck.id, cards);
                        alert(`Đã thêm ${cards.length} thẻ vào bộ "Ôn tập chung"!`);
                    } else {
                        createFlashcardDeck("Ôn tập chung", cards);
                        alert(`Đã tạo bộ thẻ mới "Ôn tập chung" với ${cards.length} thẻ!`);
                    }
                    handleSave(''); // Clear scratchpad
                } else {
                    alert("Không trích xuất được thông tin nào để tạo thẻ.");
                }
            } catch (e: any) {
                alert("Lỗi chuyển đổi: " + e.message);
            } finally {
                setIsConverting(false);
            }
        }
    };

    return (
        <>
            <div 
                className="card p-4 h-full flex flex-col bg-yellow-900/10 border border-yellow-500/20 relative group"
                onMouseEnter={() => triggerReaction('hover_write')}
            >
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-widest flex items-center gap-2">
                        <span>📝</span> Nháp Nhanh
                    </h3>
                    <button 
                        onClick={() => setShowConvertModal(true)}
                        disabled={!content.trim() || isConverting}
                        className="btn btn-xs bg-yellow-600/20 text-yellow-300 border border-yellow-500/50 hover:bg-yellow-500 hover:text-black flex items-center gap-1 transition-all"
                        title="Hóa Thẻ / Lưu Note"
                    >
                        {isConverting ? <LoadingSpinner size={3} /> : '⚡ Convert'}
                    </button>
                </div>
                <textarea 
                    className="flex-1 bg-transparent resize-none outline-none text-sm text-yellow-100 placeholder-yellow-500/30 font-mono custom-scrollbar"
                    placeholder="Ghi lại ý tưởng thoáng qua..."
                    value={content}
                    onChange={(e) => handleSave(e.target.value)}
                    onFocus={() => triggerReaction('hover_input')}
                />
            </div>

            {/* CONVERT MODAL */}
            <Modal isOpen={showConvertModal} onClose={() => setShowConvertModal(false)} title="Xử lý Ghi chú Nháp" size="sm">
                <div className="space-y-4">
                    <p className="text-sm text-gray-400 text-center">Bạn muốn làm gì với nội dung này?</p>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => handleConvert('flashcard')}
                            className="p-4 rounded-xl bg-purple-900/30 border border-purple-500/30 hover:bg-purple-900/50 transition-all flex flex-col items-center gap-2"
                        >
                            <span className="text-2xl">🃏</span>
                            <span className="text-xs font-bold text-purple-300">Tạo Flashcard (AI)</span>
                        </button>
                        <button 
                            onClick={() => handleConvert('notebook')}
                            className="p-4 rounded-xl bg-blue-900/30 border border-blue-500/30 hover:bg-blue-900/50 transition-all flex flex-col items-center gap-2"
                        >
                            <span className="text-2xl">📓</span>
                            <span className="text-xs font-bold text-blue-300">Lưu vào Sổ tay</span>
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

const WeatherWidget: React.FC = () => {
    const { navigate } = useContext(PageContext)!;
    const { triggerReaction } = useContext(PetContext)!;
    
    // Mock Weather State
    // Code < 60: Rain/Bad Weather. Code >= 60: Sunny/Good Weather.
    const [weather, setWeather] = useState({ temp: 28, code: 70, condition: 'Sunny' });
    const [suggestion, setSuggestion] = useState<{ text: string, link: string, icon: string } | null>(null);

    // AI Logic Simulation
    useEffect(() => {
        if (weather.code < 60) {
            // Rain / Storm
            setSuggestion({
                text: "Trời đang mưa, không khí này rất hợp để đọc sách tĩnh lặng. Vào Sổ Tay ôn lại kiến thức nhé?",
                link: 'notebook',
                icon: '📓'
            });
        } else {
            // Sun / Clear
            setSuggestion({
                text: "Trời đẹp, năng lượng cao! Đừng lãng phí, vào làm ngay một bài Boss (Rank S) nào!",
                link: 'assignment_hub',
                icon: '⚔️'
            });
        }
    }, [weather.code]);

    const toggleWeather = () => {
        setWeather(prev => prev.code >= 60 
            ? { temp: 22, code: 45, condition: 'Rainy' } 
            : { temp: 30, code: 80, condition: 'Sunny' }
        );
    };

    const handleAction = () => {
        if (suggestion) {
            navigate(suggestion.link);
        }
    };

    const isRainy = weather.code < 60;

    return (
        <div 
            className={`card p-4 relative overflow-hidden transition-all duration-1000 ${isRainy ? 'bg-slate-900/80 border-blue-500/30' : 'bg-orange-900/20 border-orange-500/30'}`}
            onMouseEnter={() => triggerReaction('surf')}
        >
            {/* Background Effects */}
            {isRainy ? (
                <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: 'linear-gradient(to bottom, transparent, #0ea5e9)', backgroundSize: '20px 20px', animation: 'rain 1s linear infinite' }}></div>
            ) : (
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-yellow-500/20 rounded-full blur-3xl animate-pulse z-0"></div>
            )}

            <div className="relative z-10 flex justify-between items-start mb-3">
                <div className="cursor-pointer" onClick={toggleWeather} title="Click để đổi thời tiết (Demo)">
                    <div className="text-4xl animate-float">{isRainy ? '🌧️' : '🌤️'}</div>
                    <p className={`text-2xl font-black ${isRainy ? 'text-blue-300' : 'text-yellow-400'}`}>{weather.temp}°C</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Hanoi, VN</p>
                    <p className="text-xs text-gray-300">{isRainy ? 'Mưa Rào' : 'Nắng Đẹp'}</p>
                </div>
            </div>

            {/* AI Suggestion Bubble */}
            {suggestion && (
                <div 
                    onClick={handleAction}
                    className={`relative p-3 rounded-xl border cursor-pointer hover:scale-[1.02] transition-transform group
                        ${isRainy ? 'bg-blue-900/40 border-blue-500/40 hover:bg-blue-900/60' : 'bg-orange-900/40 border-orange-500/40 hover:bg-orange-900/60'}
                    `}
                >
                    {/* Gemini Icon Badge */}
                    <div className="absolute -top-3 -left-2 bg-black border border-white/20 rounded-full p-1 shadow-lg">
                        <span className="text-sm">🤖</span>
                    </div>

                    <p className="text-xs text-gray-200 leading-relaxed pl-2">
                        {suggestion.text}
                    </p>
                    
                    <div className="mt-2 flex justify-end items-center gap-1 text-[10px] font-bold uppercase opacity-70 group-hover:opacity-100 transition-opacity">
                        <span>Đi tới {suggestion.icon}</span>
                        <span className="text-lg">→</span>
                    </div>
                </div>
            )}
            
            <style>{`
                @keyframes rain {
                    0% { background-position: 0 0; }
                    100% { background-position: 0 40px; }
                }
            `}</style>
        </div>
    );
};

export const MusicWidget: React.FC = () => {
    const { isPlaying, togglePlay, currentTrack, playTrack } = useContext(MusicContext)!;
    const { triggerReaction } = useContext(PetContext)!;
    
    // Use tempo-aware tracks
    const tracks: { name: string, url: string, tempo: 'slow' | 'medium' | 'fast' }[] = [
        { name: "Lofi Girl Radio", url: "https://stream.zeno.fm/0r0xa792kwzuv", tempo: 'slow' },
        { name: "ChillHop", url: "https://stream.zeno.fm/f3wvbbqmdg8uv", tempo: 'medium' },
        { name: "Rain Sounds", url: "https://stream.zeno.fm/2072702755", tempo: 'slow' },
        { name: "High Energy Synth", url: "https://stream.zeno.fm/f3wvbbqmdg8uv", tempo: 'fast' } // Mocking a fast one
    ];

    return (
        <div 
            className="card p-3 bg-black/40 border border-white/10 backdrop-blur-md"
            onMouseEnter={() => triggerReaction('hover_music')}
        >
            <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    {isPlaying ? <span className="animate-spin text-green-400">💿</span> : '🎵'} Music Player
                </span>
                {currentTrack && (
                    <div className="flex gap-1 h-2 items-end">
                        {[1,2,3,4].map(i => (
                            <div key={i} className={`w-1 bg-green-500 rounded-sm ${isPlaying ? 'animate-music-bar' : 'h-1'}`} style={{animationDelay: `${i*0.1}s`}}></div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="space-y-1">
                {tracks.map(t => (
                    <button 
                        key={t.name}
                        onClick={() => playTrack(t)}
                        className={`w-full text-left px-2 py-1.5 rounded text-xs truncate transition-colors flex justify-between ${currentTrack?.name === t.name ? 'bg-green-900/30 text-green-300 border border-green-500/30' : 'hover:bg-white/5 text-gray-400'}`}
                    >
                        <span>{currentTrack?.name === t.name && isPlaying ? '▶ ' : ''}{t.name}</span>
                        <span className="text-[9px] opacity-60 uppercase">{t.tempo}</span>
                    </button>
                ))}
            </div>
            
            {currentTrack && (
                <div className="mt-2 pt-2 border-t border-white/10 flex justify-center">
                    <button onClick={togglePlay} className="text-xl text-white hover:text-green-400 transition-colors">
                        {isPlaying ? '⏸' : '▶'}
                    </button>
                </div>
            )}
        </div>
    );
};

export const FocusTimerWidget = () => {
    const { pomodoro, setPomodoro, setDeepWorkMode } = useContext(GlobalStateContext)!;
    const { addTask, db, archiveCompletedTasks } = useContext(DataContext)!;
    const { user } = useContext(AuthContext)!;
    const { navigate } = useContext(PageContext)!;
    const { triggerReaction } = useContext(PetContext)!;
    const [newTask, setNewTask] = useState('');
    
    // Break Flow States
    const [showBreakModal, setShowBreakModal] = useState(false);
    const [isFlashcardOpen, setIsFlashcardOpen] = useState(false);
    const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);

    useEffect(() => {
        let interval: any;
        if (pomodoro.isActive && pomodoro.seconds > 0) {
            interval = setInterval(() => {
                setPomodoro((prev: any) => ({ ...prev, seconds: prev.seconds - 1 }));
            }, 1000);
        } else if (pomodoro.seconds === 0 && pomodoro.isActive) {
            setPomodoro((prev: any) => ({ ...prev, isActive: false }));
            
            // Logic for Timer End
            if (pomodoro.mode === 'focus') {
                // Trigger Break Modal instead of Alert
                setShowBreakModal(true);
                // Prepare break timer but don't start
                setPomodoro({ seconds: 5 * 60, isActive: false, mode: 'break' });
                setDeepWorkMode(false);
            } else {
                alert("Hết giờ nghỉ! Quay lại làm việc nào.");
                setPomodoro({ seconds: 25 * 60, isActive: false, mode: 'focus' });
            }
        }
        return () => clearInterval(interval);
    }, [pomodoro, setPomodoro, setDeepWorkMode]);

    const toggleTimer = () => {
        setPomodoro((prev: any) => ({ ...prev, isActive: !prev.isActive }));
        if (!pomodoro.isActive && pomodoro.mode === 'focus') {
            setDeepWorkMode(true);
        } else {
            setDeepWorkMode(false);
        }
    };

    const resetTimer = () => {
        setPomodoro({ seconds: 25 * 60, isActive: false, mode: 'focus' });
        setDeepWorkMode(false);
    };

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTask.trim() && user) {
            addTask(user.id, newTask);
            setNewTask('');
        }
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const handleBreakAction = (action: 'quiz' | 'flashcard') => {
        setShowBreakModal(false);
        if (action === 'quiz') {
            // Find a quiz (mock: the first one available)
            const quizId = Object.keys(db.QUIZZES)[0];
            const asgId = (Object.values(db.ASSIGNMENTS) as Assignment[]).find(a => a.quizId === quizId)?.id;
            if (asgId) {
                navigate('assignment_viewer', { assignmentId: asgId });
            } else {
                alert("Không tìm thấy Quiz nào!");
            }
        } else if (action === 'flashcard') {
            // Find a random deck
            const decks = Object.values(db.FLASHCARD_DECKS);
            if (decks.length > 0) {
                const randomDeck = decks[Math.floor(Math.random() * decks.length)];
                setSelectedDeck(randomDeck);
                setIsFlashcardOpen(true);
            } else {
                alert("Chưa có bộ Flashcard nào.");
            }
        }
    };

    const myTasks = user ? ((Object.values(db.TASKS) as Task[]).filter(t => t.userId === user.id && !t.isArchived) || []) : [];

    return (
        <>
            <div 
                className="card p-3 bg-red-900/10 border border-red-500/20 backdrop-blur-md"
                onMouseEnter={() => triggerReaction('hover_sleepy')}
            >
                <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-red-300 uppercase tracking-wider flex items-center gap-1">
                        ⏱️ Pomodoro
                    </span>
                    <span className={`text-xs font-mono font-bold ${pomodoro.isActive ? 'text-white animate-pulse' : 'text-gray-400'}`}>
                        {formatTime(pomodoro.seconds)}
                    </span>
                </div>
                
                <div className="flex gap-2 mb-3">
                    <button onClick={toggleTimer} className={`flex-1 py-1 rounded text-xs font-bold ${pomodoro.isActive ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-300'}`}>
                        {pomodoro.isActive ? 'Stop' : 'Start'}
                    </button>
                    <button onClick={resetTimer} className="px-2 py-1 rounded text-xs bg-white/5 text-gray-400 hover:text-white">↺</button>
                </div>

                <div className="space-y-2">
                    <form onSubmit={handleAddTask} className="flex gap-1">
                        <input 
                            type="text" 
                            className="flex-1 bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white"
                            placeholder="Task mục tiêu..."
                            value={newTask}
                            onChange={e => setNewTask(e.target.value)}
                            onFocus={() => triggerReaction('hover_write')}
                        />
                        <button type="submit" className="text-xs bg-white/10 px-2 rounded">+</button>
                    </form>
                    <div className="max-h-20 overflow-y-auto custom-scrollbar space-y-1">
                        {myTasks.map(t => (
                            <div key={t.id} className="flex items-center gap-2 text-xs group">
                                <input type="checkbox" checked={t.isCompleted} onChange={() => {}} className="cursor-pointer" /> 
                                <span className={`flex-1 truncate ${t.isCompleted ? 'line-through text-gray-500' : 'text-gray-300'}`}>{t.text}</span>
                            </div>
                        ))}
                    </div>
                    {myTasks.some(t => t.isCompleted) && (
                        <button onClick={() => user && archiveCompletedTasks(user.id)} className="w-full text-[10px] text-gray-500 hover:text-white border-t border-white/5 pt-1 mt-1">
                            Lưu trữ task đã xong
                        </button>
                    )}
                </div>
            </div>

            {/* Break Modal Flow */}
            <BreakActivityModal 
                isOpen={showBreakModal} 
                onClose={() => setShowBreakModal(false)} 
                onAction={handleBreakAction}
            />

            <FlashcardModal 
                isOpen={isFlashcardOpen}
                onClose={() => setIsFlashcardOpen(false)}
                deck={selectedDeck}
            />
        </>
    );
};

const LeaderboardWidget = () => {
    const { db, sendChatMessage } = useContext(DataContext)!;
    const { user } = useContext(AuthContext)!;
    const { setPage: setGlobalPage, setShopIntent } = useContext(GlobalStateContext)!; // NEW: setShopIntent
    const { navigate } = useContext(PageContext)!;
    const { triggerReaction } = useContext(PetContext)!;

    const [selectedRival, setSelectedRival] = useState<User & { points: number, equippedSkinId?: string } | null>(null);
    const [isGeneratingChallenge, setIsGeneratingChallenge] = useState(false);
    
    // NEW: Intel Modal State
    const [isIntelModalOpen, setIsIntelModalOpen] = useState(false);

    // NEW: Raid Mode State
    const [isRaidMode, setIsRaidMode] = useState(false);
    const [raidSelectedUserIds, setRaidSelectedUserIds] = useState<string[]>([]);
    const [isRaidModalOpen, setIsRaidModalOpen] = useState(false);

    // NEW: Rival History Modal State
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    // FIX: Stable Leaderboard Sorting
    const sorted = useMemo(() => {
        const studentUsers = (Object.values(db.USERS) as User[]).filter(u => u.role === 'STUDENT');
        const skins = db.SHOP_ITEMS.filter(i => i.type === 'skin'); // Get skins to mock assignment

        const studentsWithScore = studentUsers.map((u, index) => {
            let points = 0;
            if (u.id === user?.id) {
                points = db.GAMIFICATION.points;
            } else {
                // Deterministic mock score based on ID hash to ensure stability
                const hash = u.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
                points = 1000 + (hash % 500); // Random-ish but stable score
            }
            
            // Mock skin assignment for rivals (deterministic)
            const mockSkinId = skins[index % skins.length]?.id || 'skin_default';
            
            return { ...u, points, equippedSkinId: u.id === user?.id ? db.GAMIFICATION.equippedSkin : mockSkinId };
        });

        return studentsWithScore.sort((a, b) => b.points - a.points).slice(0, 3);
    }, [db.USERS, user?.id, db.GAMIFICATION.points, db.GAMIFICATION.equippedSkin, db.SHOP_ITEMS]);

    // NEW: Check squadron status
    const myGroup = user ? db.STUDY_GROUPS.find(g => g.members.includes(user.id)) : null;
    const rivalGroup = selectedRival ? db.STUDY_GROUPS.find(g => g.members.includes(selectedRival.id)) : null;
    const canRecruit = myGroup && !rivalGroup && selectedRival?.id !== user?.id;

    // Helper to get skin info
    const getRivalSkin = (skinId?: string): ShopItem | undefined => {
        return db.SHOP_ITEMS.find(i => i.id === skinId);
    };

    const handleChallenge = async () => {
        if (!user || !selectedRival) return;
        const apiKey = db.USERS[user.id]?.apiKey;
        if (!apiKey) {
            setGlobalPage('api_key', { isApiKeyModalOpen: true });
            return;
        }

        setIsGeneratingChallenge(true);
        try {
            const prompt = `Create ONE challenging trivia or logic question. Return JSON: {questions: [{text, options, correctAnswer}]}. Topic: General Knowledge or Logic.`;
            const result = await callGeminiApiWithSchema(apiKey, prompt);
            
            if (result.questions && result.questions.length > 0) {
                const question = result.questions[0];
                sendChatMessage(
                    user.id,
                    selectedRival.id,
                    `⚔️ ${user.name} thách đấu bạn! Trả lời đúng trong 1 phút để nhận thưởng.`,
                    {
                        id: `chall_${Date.now()}`,
                        question: question,
                        status: 'PENDING'
                    }
                );
                alert(`Đã gửi lời thách đấu tới ${selectedRival.name}!`);
                setSelectedRival(null);
                navigate('chat');
            }
        } catch (e: any) {
            alert("Lỗi tạo câu hỏi: " + e.message);
        } finally {
            setIsGeneratingChallenge(false);
        }
    };

    const handleRecruit = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user || !selectedRival || !myGroup) return;

        const inviteData = {
            groupId: myGroup.id,
            groupName: myGroup.name,
            status: 'PENDING' as const
        };

        const message = `Chào ${selectedRival.name}, tớ muốn mời cậu gia nhập Phi đội "${myGroup.name}" của tớ. Cùng nhau chiến đấu nhé! 🚀`;

        sendChatMessage(user.id, selectedRival.id, message, undefined, undefined, undefined, undefined, undefined, inviteData);
        alert(`Đã gửi lời mời chiêu mộ đến ${selectedRival.name}!`);
        setSelectedRival(null);
    };

    // --- NEW: SHOP LOOKBOOK HANDLER ---
    const handleBuySameSkin = (e: React.MouseEvent, skinId: string) => {
        e.stopPropagation();
        setShopIntent({ isOpen: true, targetItemId: skinId });
        setSelectedRival(null); // Close popup
    };

    // --- NEW: TRADE HANDLER ---
    const handleTrade = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedRival) return;
        // Navigate to Chat with intent to open Trade Modal
        navigate('chat', { targetUserId: selectedRival.id, openTradeModal: true });
        setSelectedRival(null);
    };

    // --- NEW: RAID MODE HANDLERS ---
    const toggleRaidSelection = (userId: string) => {
        setRaidSelectedUserIds(prev => 
            prev.includes(userId) 
            ? prev.filter(id => id !== userId) 
            : [...prev, userId]
        );
    };

    const handleClickUser = (u: any) => {
        if (isRaidMode) {
            if (u.id !== user?.id) toggleRaidSelection(u.id);
        } else {
            setSelectedRival(selectedRival?.id === u.id ? null : u);
        }
    };

    return (
        <>
            <div 
                className={`card p-4 border-2 transition-all duration-300 relative 
                    ${isRaidMode ? 'bg-red-900/20 border-red-500/50 shadow-[0_0_20px_rgba(220,38,38,0.2)]' : 'bg-gradient-to-b from-blue-900/20 to-transparent border-blue-500/30'}`}
                onMouseEnter={() => triggerReaction('hover_muscle')}
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className={`text-xs font-bold uppercase flex items-center gap-2 ${isRaidMode ? 'text-red-400 animate-pulse' : 'text-blue-300'}`}>
                        {isRaidMode ? '⚔️ THIẾT LẬP ĐỘI HÌNH RAID' : '🏆 Bảng Xếp Hạng'}
                    </h3>
                    
                    <button 
                        onClick={() => { setIsRaidMode(!isRaidMode); setRaidSelectedUserIds([]); setSelectedRival(null); }}
                        className={`text-xs px-2 py-1 rounded transition-colors ${isRaidMode ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-400 hover:text-white'}`}
                        title={isRaidMode ? "Hủy chế độ Raid" : "Lập team Raid Boss"}
                    >
                        {isRaidMode ? '✕ Hủy' : '⚔️ Raid'}
                    </button>
                </div>

                <div className="space-y-3">
                    {sorted.map((u, i) => {
                        const isSelectedForRaid = raidSelectedUserIds.includes(u.id);
                        return (
                            <div 
                                key={u.id} 
                                className={`flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer relative group 
                                    ${isRaidMode 
                                        ? (isSelectedForRaid ? 'bg-red-600/40 border border-red-500' : 'hover:bg-red-900/30') 
                                        : (selectedRival?.id === u.id ? 'bg-blue-600/30 ring-2 ring-blue-500' : 'hover:bg-white/5')}`}
                                onClick={() => handleClickUser(u)}
                            >
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i===0 ? 'bg-yellow-400 text-black' : i===1 ? 'bg-gray-300 text-black' : 'bg-orange-700 text-white'}`}>
                                    {isRaidMode && u.id !== user?.id 
                                        ? (isSelectedForRaid ? '✓' : '+') 
                                        : i+1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-bold truncate ${isRaidMode && isSelectedForRaid ? 'text-red-200' : 'text-white'}`}>{u.name}</p>
                                    <p className="text-[10px] text-gray-400">Level {Math.floor(u.points / 1000) + 1} • {u.points} XP</p>
                                </div>
                                {!isRaidMode && u.id !== user?.id && <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">⚔️</span>}
                            </div>
                        );
                    })}
                </div>
                
                {isRaidMode && raidSelectedUserIds.length > 0 && (
                    <button 
                        onClick={() => setIsRaidModalOpen(true)}
                        className="w-full mt-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold text-xs rounded shadow-lg animate-bounce-subtle"
                    >
                        Mời ({raidSelectedUserIds.length}) người Raid Boss ➔
                    </button>
                )}

                {!isRaidMode && (
                    <>
                        {selectedRival && selectedRival.id !== user?.id && (
                            <div className="absolute inset-x-2 bottom-2 bg-slate-900/95 backdrop-blur-xl border border-red-500/50 rounded-xl p-4 shadow-2xl z-20 animate-pop-in">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center font-bold text-lg text-white">{selectedRival.name.charAt(0)}</div>
                                        <div>
                                            <p className="font-bold text-white text-sm">{selectedRival.name}</p>
                                            <p className="text-[10px] text-red-400 font-bold uppercase">Đối thủ tiềm năng</p>
                                        </div>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); setSelectedRival(null); }} className="text-gray-400 hover:text-white">✕</button>
                                </div>

                                {/* SHOP LOOKBOOK SECTION */}
                                {(() => {
                                    const skin = getRivalSkin(selectedRival.equippedSkinId);
                                    if (skin && skin.id !== 'skin_default') {
                                        return (
                                            <div className="mb-3 p-2 bg-black/40 rounded-lg flex items-center justify-between border border-white/10">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-2xl">{skin.icon}</span>
                                                    <div className="text-left">
                                                        <p className="text-[10px] text-gray-400 uppercase">Skin đang dùng</p>
                                                        <p className="text-xs font-bold text-yellow-400">{skin.name}</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={(e) => handleBuySameSkin(e, skin.id)}
                                                    className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-white flex items-center gap-1 border border-white/20 transition-colors"
                                                >
                                                    🛒 Mua giống vậy
                                                </button>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                <div className="grid grid-cols-2 gap-2">
                                    {/* REQUEST INTEL */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setIsIntelModalOpen(true); }}
                                        className="btn btn-sm bg-green-900/30 text-green-300 border border-green-500/50 hover:bg-green-600 hover:text-white flex items-center justify-center gap-1 text-xs"
                                    >
                                        <span>📄</span> Xin Tài Liệu
                                    </button>
                                    {/* TRADE BUTTON (NEW) */}
                                    <button 
                                        onClick={handleTrade}
                                        className="btn btn-sm bg-yellow-900/30 text-yellow-300 border border-yellow-500/50 hover:bg-yellow-600 hover:text-white flex items-center justify-center gap-1 text-xs"
                                    >
                                        <span>🤝</span> Giao dịch
                                    </button>
                                    
                                    {/* VIEW HISTORY BUTTON (NEW) */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setIsHistoryModalOpen(true); }}
                                        className="btn btn-sm bg-blue-900/30 text-blue-300 border border-blue-500/50 hover:bg-blue-600 hover:text-white flex items-center justify-center gap-1 text-xs col-span-2"
                                    >
                                        <span>📜</span> Xem Lịch sử đấu
                                    </button>

                                    <button onClick={(e) => { e.stopPropagation(); handleChallenge(); }} disabled={isGeneratingChallenge} className="col-span-2 btn btn-primary text-xs py-2 bg-gradient-to-r from-red-600 to-orange-600 border-none shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse">
                                        {isGeneratingChallenge ? <LoadingSpinner size={3} /> : '⚔️ Gửi Thách Đấu'}
                                    </button>
                                    {/* RECRUIT BUTTON (NEW) */}
                                    {canRecruit && (
                                        <button 
                                            onClick={handleRecruit}
                                            className="btn btn-sm col-span-2 bg-purple-900/30 text-purple-300 border border-purple-500/50 hover:bg-purple-600 hover:text-white flex items-center justify-center gap-1 text-xs mt-1"
                                        >
                                            <span>🛸</span> Chiêu mộ vào Phi đội
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                        <button className="w-full mt-4 text-xs text-blue-400 hover:text-white transition-colors">Xem tất cả &rarr;</button>
                    </>
                )}
            </div>

            {/* MODALS */}
            <RequestIntelModal 
                isOpen={isIntelModalOpen}
                onClose={() => setIsIntelModalOpen(false)}
                targetUser={selectedRival}
            />
            
            <RaidSetupModal 
                isOpen={isRaidModalOpen}
                onClose={() => setIsRaidModalOpen(false)}
                selectedUserIds={raidSelectedUserIds}
            />

            {/* RIVAL HISTORY MODAL */}
            <RivalHistoryModal 
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                targetUser={selectedRival}
            />
        </>
    );
};

// ... OrbitalCourseCard and rest of the file remains same ...
interface OrbitalCourseCardProps { 
    course: Course; 
    navigate: any; 
    onContextMenu: (e: React.MouseEvent, courseId: string) => void; 
    isMining: boolean; 
}

const OrbitalCourseCard: React.FC<OrbitalCourseCardProps> = ({ course, navigate, onContextMenu, isMining }) => {
    // ... logic same ...
    const { db } = useContext(DataContext)!;
    const { user } = useContext(AuthContext)!;
    const { triggerReaction } = useContext(PetContext)!; 
    
    const [isHovered, setIsHovered] = useState(false);
    const [isScanned, setIsScanned] = useState(false);
    const timerRef = useRef<number | null>(null);

    const handleMouseEnter = () => {
        setIsHovered(true);
        triggerReaction('hover_smart'); 
        timerRef.current = window.setTimeout(() => {
            setIsScanned(true);
        }, 1500); 
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        setIsScanned(false);
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    const { progress, nextTask, pendingLesson, isDistressed, distressReason, energyLevel } = useMemo(() => {
        const structure = db.COURSE_STRUCTURE[course.id];
        if (!structure || !user) return { progress: 0, nextTask: null, pendingLesson: null, isDistressed: false, distressReason: '', energyLevel: 100 };

        let totalItems = 0;
        let completedItems = 0;
        let firstPendingLesson = null;
        let firstPendingAssignment = null;
        
        let totalScore = 0;
        let scoredCount = 0;
        let lastActivity = 0;

        structure.modules.forEach(mod => {
            mod.items.forEach(item => {
                totalItems++;
                let isDone = false;
                
                if (item.type === 'lesson') {
                    if (db.LESSON_PROGRESS[user.id]?.includes(item.id)) {
                        isDone = true;
                    } else if (!firstPendingLesson) {
                        firstPendingLesson = db.LESSONS[item.id];
                    }
                } else if (item.type === 'assignment') {
                    const asg = db.ASSIGNMENTS[item.id];
                    if (asg) {
                        if (asg.type === 'file') {
                            const sub = db.FILE_SUBMISSIONS[asg.id]?.find(s => s.studentId === user.id);
                            if (sub) {
                                if (sub.timestamp) lastActivity = Math.max(lastActivity, new Date(sub.timestamp).getTime());
                                if (sub.grade !== null) {
                                    totalScore += (sub.grade / 10) * 100;
                                    scoredCount++;
                                }
                                if (sub.status === 'Đã nộp') isDone = true;
                            }
                        } else {
                            const sub = db.QUIZ_SUBMISSIONS[asg.quizId!]?.[user.id];
                            if (sub) {
                                if (sub.timestamp) lastActivity = Math.max(lastActivity, new Date(sub.timestamp).getTime());
                                totalScore += sub.percentage;
                                scoredCount++;
                                isDone = true;
                            }
                        }
                        if (!isDone && !firstPendingAssignment) firstPendingAssignment = asg;
                    }
                }
                if (isDone) completedItems++;
            });
        });

        const pct = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
        
        const daysInactive = lastActivity ? (Date.now() - lastActivity) / (1000 * 3600 * 24) : 999;
        const avgScore = scoredCount > 0 ? totalScore / scoredCount : 100; 
        
        let distress = false;
        let reason = '';

        if (avgScore < 50) {
            distress = true;
            reason = `Điểm trung bình thấp (${avgScore.toFixed(0)}%)`;
        } else if (daysInactive > 7 && pct < 100 && lastActivity > 0) {
            distress = true;
            reason = `Không hoạt động ${daysInactive.toFixed(0)} ngày`;
        }

        const hoursInactive = lastActivity ? (Date.now() - lastActivity) / (1000 * 3600) : 0;
        let energy = 100;
        if (lastActivity > 0) {
            energy = Math.max(0, 100 - (hoursInactive / 24) * 10);
        } else if (pct === 0) {
            energy = 100; 
        } else {
            energy = 50; 
        }

        return { 
            progress: Math.round(pct), 
            nextTask: firstPendingAssignment, 
            pendingLesson: firstPendingLesson,
            isDistressed: distress,
            distressReason: reason,
            energyLevel: Math.round(energy)
        };
    }, [db, course.id, user]);

    const handleClick = () => {
        if (energyLevel < 40) {
            navigate('assignment_hub', { filterCourseId: course.id });
        } else {
            navigate('course_detail', { courseId: course.id });
        }
    };

    const handleRescue = (e: React.MouseEvent) => {
        e.stopPropagation();
        triggerReaction('hover_doctor');
        navigate('gemini_student', {
            initialPrompt: `Báo cáo Chỉ huy! Tôi đang gặp rắc rối tại hành tinh "${course.name}".\nTình trạng: ${distressReason}.\nXin hãy đưa ra một Kế hoạch Cứu viện khẩn cấp (Rescue Plan).`,
            autoPersona: 'commander',
            autoThinking: true
        });
    };

    const getBatteryColor = (level: number) => {
        if (level > 70) return 'text-green-400 shadow-[0_0_10px_#4ade80]';
        if (level > 40) return 'text-yellow-400 shadow-[0_0_10px_#facc15]';
        return 'text-red-500 shadow-[0_0_10px_#ef4444] animate-pulse';
    };

    return (
        <div 
            onClick={handleClick}
            onContextMenu={(e) => onContextMenu(e, course.id)} 
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`card p-6 cursor-pointer transition-all group relative overflow-hidden h-40 flex flex-col justify-between select-none
                ${isDistressed 
                    ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse-slow' 
                    : isScanned 
                        ? 'border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.3)] bg-slate-900' 
                        : 'hover:bg-blue-900/20 hover:border-blue-500/50 hover:scale-[1.02]'
                }
            `}
        >
            {isMining && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center animate-fade-in pointer-events-none">
                    <LoadingSpinner size={8} />
                    <p className="text-yellow-400 font-bold mt-2 text-sm animate-pulse">⛏️ Đang khai thác...</p>
                </div>
            )}

            <div className="absolute top-4 left-4 z-20 flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full border border-white/10">
                <span className={`text-xs ${getBatteryColor(energyLevel)}`}>🔋</span>
                <span className={`text-[10px] font-bold font-mono ${energyLevel < 40 ? 'text-red-400' : 'text-gray-300'}`}>{energyLevel}%</span>
            </div>

            {isDistressed && (
                <>
                    <div className="absolute inset-0 bg-red-900/20 z-0 mix-blend-overlay"></div>
                    <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#7f1d1d_100%)] opacity-50 animate-pulse"></div>
                    <div className="absolute -top-10 -left-10 w-[150%] h-[150%] bg-[url('https://www.transparenttextures.com/patterns/black-smoke.png')] opacity-30 animate-spin-slow pointer-events-none"></div>
                </>
            )}

            <div className={`absolute top-0 right-0 p-4 transition-all duration-500 ${isScanned ? 'opacity-5 scale-150 blur-sm' : 'opacity-10 group-hover:opacity-20'}`}>
                <span className="text-6xl">{isDistressed ? '🌩️' : '🪐'}</span>
            </div>

            <div className={`relative z-10 transition-opacity duration-300 ${isScanned ? 'opacity-20 blur-[1px]' : 'opacity-100'}`}>
                <div className="flex justify-between items-start mt-4"> 
                    <h3 className="text-xl font-bold mb-1 transition-colors text-white group-hover:text-blue-300">
                        {course.name}
                    </h3>
                    {isDistressed && (
                        <button onClick={handleRescue} className="bg-red-600 hover:bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded animate-bounce shadow-lg z-20">🚨 SOS</button>
                    )}
                </div>
                <p className="text-sm text-gray-400">GV: {course.teacher}</p>
                
                {isDistressed ? (
                    <p className="text-xs text-red-400 font-bold mt-2 animate-pulse">⚠️ Tín hiệu yếu: {distressReason}</p>
                ) : energyLevel < 40 && (
                    <p className="text-xs text-yellow-400 font-bold mt-2 animate-pulse">⚡ Pin yếu! Cần nạp năng lượng.</p>
                )}

                <div className="mt-auto w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-1.5 rounded-full transition-all duration-1000 ${isDistressed ? 'bg-red-500' : energyLevel < 40 ? 'bg-yellow-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            {isScanned && !isDistressed && !isMining && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md p-4 flex flex-col justify-center animate-fade-in z-20">
                    <div className="flex justify-between items-center mb-2 border-b border-cyan-500/30 pb-1">
                        <span className="text-[10px] font-mono text-cyan-400 animate-pulse">SCAN COMPLETE</span>
                        <span className="text-xs font-bold text-white">{progress}%</span>
                    </div>
                    <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="text-yellow-400">⚠️</span>
                            <span className="text-gray-300 truncate">{nextTask ? `Task: ${nextTask.title}` : 'Không có bài tập mới'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-green-400">▶</span>
                            <span className="text-gray-300 truncate">{pendingLesson ? `Học tiếp: ${pendingLesson.title}` : 'Đã học hết bài giảng'}</span>
                        </div>
                    </div>
                    <div className="mt-auto text-center">
                        <span className="text-[9px] text-cyan-600 font-mono">CLICK TO LAND</span>
                    </div>
                </div>
            )}
            
            <style>{`
                @keyframes scan-line { 0% { top: 0; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
                .animate-scan-line { position: absolute; animation: scan-line 1.5s linear infinite; }
            `}</style>
        </div>
    );
};

const StudentDashboardPage: React.FC = () => {
    const { user } = useContext(AuthContext)!;
    const { db, createPersonalNote } = useContext(DataContext)!; 
    const { navigate } = useContext(PageContext)!;
    const { setPage: setGlobalPage } = useContext(GlobalStateContext)!;
    const { triggerReaction } = useContext(PetContext)!;

    const myCourses = useMemo(() => db.COURSES, [db.COURSES]);

    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, courseId: string } | null>(null);
    const [miningCourseId, setMiningCourseId] = useState<string | null>(null);
    const [isPhoenixModalOpen, setIsPhoenixModalOpen] = useState(false);
    const [isRitualOpen, setIsRitualOpen] = useState(false);

    useEffect(() => {
        if (!user || !db.GAMIFICATION.lastStudyDate) return;
        
        const lastDate = new Date(db.GAMIFICATION.lastStudyDate);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        if (diffDays > 1) {
            const hasSeen = sessionStorage.getItem('phoenix_seen');
            if (!hasSeen) {
                setIsPhoenixModalOpen(true);
                sessionStorage.setItem('phoenix_seen', 'true');
            }
        }
    }, [user, db.GAMIFICATION.lastStudyDate]);

    const handleContextMenu = (e: React.MouseEvent, courseId: string) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, courseId });
    };

    const closeContextMenu = () => setContextMenu(null);

    const handleMineResource = async () => {
        if (!contextMenu || !user) return;
        const { courseId } = contextMenu;
        const course = db.COURSES.find(c => c.id === courseId);
        if (!course) return;

        closeContextMenu();
        
        const apiKey = db.USERS[user.id]?.apiKey;
        if (!apiKey) {
            setGlobalPage('api_key', { isApiKeyModalOpen: true });
            return;
        }

        const completedLessonIds = db.LESSON_PROGRESS[user.id] || [];
        const structure = db.COURSE_STRUCTURE[courseId];
        
        let aggregatedContent = "";
        let lessonCount = 0;

        if (structure) {
            structure.modules.forEach(mod => {
                mod.items.forEach(item => {
                    if (item.type === 'lesson' && completedLessonIds.includes(item.id)) {
                        const lesson = db.LESSONS[item.id];
                        if (lesson && lesson.type === 'text') {
                            aggregatedContent += `\n\n--- Bài: ${lesson.title} ---\n${lesson.content}`;
                            lessonCount++;
                        }
                    }
                });
            });
        }

        if (!aggregatedContent.trim()) {
            alert("⚠️ Chưa có tài nguyên để khai thác! Hãy học vài bài học trước.");
            return;
        }

        setMiningCourseId(courseId);
        try {
            const prompt = `
                Bạn là một sĩ quan tình báo AI. Hãy phân tích nội dung tổng hợp từ khóa học "${course.name}" dưới đây.
                Nhiệm vụ: Tạo một "Báo cáo Tình báo" (Intelligence Report) tóm tắt ngắn gọn, súc tích các kiến thức cốt lõi (Key Takeaways) mà tôi đã học được.
                Định dạng: Markdown, sử dụng các gạch đầu dòng, bold text cho keywords.
                
                Nội dung cần xử lý:
                ${aggregatedContent.substring(0, 10000)} (Cắt ngắn nếu quá dài)
            `;

            const report = await callGeminiApi(apiKey, prompt, null, { useThinking: true });

            const noteTitle = `📑 Báo cáo Tình báo: ${course.name}`;
            createPersonalNote(user.id, noteTitle, report);

            alert(`✅ Khai thác thành công!\nĐã lưu "${noteTitle}" vào Sổ Tay.`);

        } catch (e: any) {
            alert("❌ Lỗi khai thác: " + e.message);
        } finally {
            setMiningCourseId(null);
        }
    };

    useEffect(() => {
        const handleClick = () => closeContextMenu();
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    const smartShortcut = useMemo(() => {
        if (!user) return { label: 'Cây Tri Thức', icon: '🌳', action: () => navigate('assignment_hub'), pet: 'hover_smart' };

        const paths = Object.values(db.LEARNING_PATHS || {}) as LearningPath[];
        for (const path of paths) {
            const nextNodeIndex = path.nodes.findIndex(n => !n.isLocked && !n.isCompleted);
            if (nextNodeIndex !== -1) {
                const nextNode = path.nodes[nextNodeIndex];
                return {
                    label: `▶️ Tiếp tục: ${nextNode.title}`,
                    icon: '🎓',
                    action: () => navigate('learning_node_study', { pathId: path.id, nodeId: nextNode.id, isLastNode: nextNodeIndex === path.nodes.length - 1 }),
                    highlight: true,
                    pet: 'hover_smart'
                };
            }
        }

        const assignments = Object.values(db.ASSIGNMENTS) as Assignment[];
        const pending = assignments.filter(asg => {
            if (asg.type === 'file') {
                const sub = db.FILE_SUBMISSIONS[asg.id]?.find(s => s.studentId === user.id);
                return !sub || sub.status !== 'Đã nộp';
            } else if (asg.type === 'quiz' && asg.quizId) {
                const sub = db.QUIZ_SUBMISSIONS[asg.quizId]?.[user.id];
                return !sub;
            }
            return false;
        });

        if (pending.length > 0) {
            const target = pending[0];
            return {
                label: `⚔️ Nhiệm vụ: ${target.title.substring(0, 15)}...`,
                icon: '📜',
                action: () => navigate('assignment_viewer', { assignmentId: target.id }),
                highlight: true,
                pet: 'hover_game'
            };
        }

        return {
            label: 'Cây Tri Thức',
            icon: '🌳',
            action: () => navigate('assignment_hub'),
            highlight: false,
            pet: 'hover_smart'
        };
    }, [db, user, navigate]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Chào buổi sáng";
        if (hour < 18) return "Chào buổi chiều";
        return "Chào buổi tối";
    };

    if (!user) return null;

    return (
        <div className="space-y-8 pb-12 relative">
            {contextMenu && (
                <div 
                    className="fixed z-50 bg-slate-900/95 backdrop-blur-xl border border-cyan-500/50 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.3)] p-2 min-w-[200px] animate-pop-in"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()} 
                >
                    <div className="text-[10px] text-cyan-400 font-mono mb-2 px-2 uppercase tracking-widest border-b border-white/10 pb-1">Planet Operations</div>
                    <button 
                        onClick={handleMineResource}
                        className="w-full text-left px-3 py-2 hover:bg-cyan-500/20 text-white rounded-lg flex items-center gap-2 transition-colors group"
                    >
                        <span className="text-xl group-hover:rotate-12 transition-transform">⛏️</span>
                        <div>
                            <p className="font-bold text-sm">Khai thác (Summarize)</p>
                            <p className="text-sm text-gray-400">Tạo báo cáo tổng hợp</p>
                        </div>
                    </button>
                </div>
            )}

            {/* HERO SECTION */}
            <div id="dashboard-hero" className="flex flex-col md:flex-row justify-between items-end gap-6 pb-6 border-b border-white/5">
                <div>
                    <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-300 drop-shadow-lg tracking-tight">
                        {getGreeting()}, <br/> {user.name}
                    </h1>
                    <p className="text-blue-200 mt-2 text-lg font-light">Sẵn sàng chinh phục tri thức hôm nay chưa?</p>
                </div>
                <button 
                    id="btn-portal-ai"
                    onClick={() => navigate('gemini_student')}
                    onMouseEnter={() => triggerReaction('hover_magic')}
                    className="group relative px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold shadow-[0_0_30px_rgba(124,58,237,0.5)] hover:shadow-[0_0_50px_rgba(124,58,237,0.8)] transition-all hover:scale-105 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white/20 group-hover:animate-shimmer"></div>
                    <span className="relative z-10 flex items-center gap-2">
                        <span className="text-2xl">🔮</span> Hỏi Nhà Tiên Tri (AI)
                    </span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT COL: Stats & Gamification */}
                <div 
                    className="space-y-6"
                    onMouseEnter={() => triggerReaction('hover_coin')}
                >
                    <TreasureChestWidget />
                    <LeaderboardWidget />
                </div>

                {/* MIDDLE & RIGHT: Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Courses List (Updated with Orbital Scan) */}
                    <div id="course-list">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <span>🪐</span> Các Hành Tinh (Khóa học)
                            </h2>
                            <button className="text-sm text-blue-400 hover:text-white">Xem tất cả</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {myCourses.map(course => (
                                <OrbitalCourseCard 
                                    key={course.id} 
                                    course={course} 
                                    navigate={navigate}
                                    onContextMenu={handleContextMenu}
                                    isMining={miningCourseId === course.id}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Shortcuts */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {/* SMART SHORTCUT BUTTON */}
                        <button 
                            onClick={smartShortcut.action} 
                            onMouseEnter={() => triggerReaction(smartShortcut.pet)}
                            className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 group relative overflow-hidden
                                ${smartShortcut.highlight 
                                    ? 'bg-blue-900/40 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:scale-105' 
                                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:scale-105'
                                }
                            `}
                        >
                            {smartShortcut.highlight && <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none"></div>}
                            <span className="text-3xl group-hover:scale-110 transition-transform">{smartShortcut.icon}</span>
                            <span className={`text-xs font-bold text-center ${smartShortcut.highlight ? 'text-white' : 'text-gray-300'}`}>
                                {smartShortcut.label}
                            </span>
                        </button>

                        <button 
                            onClick={() => navigate('notebook')} 
                            onMouseEnter={() => triggerReaction('hover_write')}
                            className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-105 transition-all flex flex-col items-center gap-2 group"
                        >
                            <span className="text-3xl group-hover:scale-110 transition-transform">📓</span>
                            <span className="text-xs font-bold text-gray-300">Sổ Tay</span>
                        </button>
                        <button 
                            onClick={() => navigate('group_chat')} 
                            onMouseEnter={() => triggerReaction('hover_chat')}
                            className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-105 transition-all flex flex-col items-center gap-2 group"
                        >
                            <span className="text-3xl group-hover:scale-110 transition-transform">🚀</span>
                            <span className="text-xs font-bold text-gray-300">Phi Đội</span>
                        </button>
                        <button 
                            onClick={() => navigate('task_archive')} 
                            onMouseEnter={() => triggerReaction('hover_btn')}
                            className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-105 transition-all flex flex-col items-center gap-2 group"
                        >
                            <span className="text-3xl group-hover:scale-110 transition-transform">✅</span>
                            <span className="text-xs font-bold text-gray-300">Tasks</span>
                        </button>
                    </div>
                </div>
                
                {/* RIGHT COL: WEATHER & UTILITIES (NEW) */}
                <div className="lg:col-span-1 lg:col-start-3 space-y-6">
                    <WeatherWidget />
                    {/* ADDED SCRATCHPAD WIDGET */}
                    <div className="h-48">
                        <ScratchpadWidget />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FocusTimerWidget />
                        <MusicWidget />
                    </div>
                </div>
            </div>

            {/* PHOENIX REBIRTH MODALS */}
            <PhoenixRebirthModal 
                isOpen={isPhoenixModalOpen}
                onClose={() => setIsPhoenixModalOpen(false)}
                onRitual={() => {
                    setIsPhoenixModalOpen(false);
                    setIsRitualOpen(true);
                }}
            />

            <SpeedRunModal
                isOpen={isRitualOpen}
                onClose={() => setIsRitualOpen(false)}
                pathTopic="General Knowledge" // Mock topic for Ritual
                completedNodes={[]}
                mode="ritual"
            />
        </div>
    );
};

export default StudentDashboardPage;
