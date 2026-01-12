
// ... existing imports ...
import React, { useState, useContext, useMemo, useEffect, useRef } from 'react';
import { AuthContext, DataContext, GlobalStateContext, PageContext } from '../../contexts/AppProviders';
import { ChatMessage, User, FlashcardDeck, PersonalNote } from '../../types';
import Modal from '../common/Modal';
import { detectSchedulingIntent, transcribeAudio, summarizeTeacherNote } from '../../services/geminiService';
import LoadingSpinner from '../common/LoadingSpinner';
import OnboardingTour, { TourStep } from '../common/OnboardingTour'; // Added import

// ... existing renderMarkdown helper ...
const renderMarkdown = (text: string) => {
    if (!text) return <p className="text-gray-500 italic">Nội dung trống...</p>;

    return text.split('\n').map((line, index) => {
        let renderedLine: React.ReactNode = line;
        let className = "text-gray-300 min-h-[1.5em]";

        if (line.startsWith('# ')) {
            className = "text-2xl font-bold text-white mt-4 mb-2 border-b border-gray-700 pb-1";
            renderedLine = line.substring(2);
        } else if (line.startsWith('## ')) {
            className = "text-xl font-bold text-blue-200 mt-3 mb-2";
            renderedLine = line.substring(3);
        } else if (line.startsWith('> ')) {
            className = "border-l-4 border-yellow-500 pl-4 italic text-gray-400 my-2";
            renderedLine = line.substring(2);
        } else if (line.startsWith('- ')) {
            className = "list-disc list-inside text-gray-300 ml-4";
            renderedLine = line.substring(2);
        }

        // Inline parsing for **bold** and [[links]]
        const parseInline = (text: string): React.ReactNode[] => {
            const parts: React.ReactNode[] = [];
            let buffer = "";
            let i = 0;

            while (i < text.length) {
                if (text.startsWith('**', i)) {
                    if (buffer) parts.push(buffer); buffer = "";
                    const end = text.indexOf('**', i + 2);
                    if (end > -1) {
                        const boldContent = text.substring(i + 2, end);
                        parts.push(<strong key={i} className="text-white">{boldContent}</strong>);
                        i = end + 2;
                        continue;
                    }
                }
                if (text.startsWith('[[', i)) {
                    if (buffer) parts.push(buffer); buffer = "";
                    const end = text.indexOf(']]', i + 2);
                    if (end > -1) {
                        const linkContent = text.substring(i + 2, end);
                        parts.push(<span key={i} className="text-blue-400 font-mono bg-blue-900/30 px-1 rounded">[[{linkContent}]]</span>);
                        i = end + 2;
                        continue;
                    }
                }
                buffer += text[i];
                i++;
            }
            if (buffer) parts.push(buffer);
            return parts;
        };

        if (typeof renderedLine === 'string') {
            renderedLine = parseInline(renderedLine);
        }

        return <div key={index} className={className}>{renderedLine}</div>;
    });
};

// ... existing ChallengeCard ...
const ChallengeCard: React.FC<{ 
    challenge: NonNullable<ChatMessage['challenge']>; 
    isMe: boolean; 
    onAccept: () => void 
}> = ({ challenge, isMe, onAccept }) => {
    return (
        <div className={`mt-2 p-3 rounded-lg border-2 ${isMe ? 'bg-blue-900/50 border-blue-400' : 'bg-red-900/50 border-red-500'} flex flex-col gap-2 shadow-lg`}>
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest bg-black/40 px-2 py-1 rounded text-white">
                    ⚔️ {isMe ? 'Lời thách đấu đã gửi' : 'Lời thách đấu'}
                </span>
                <span className="text-xs">⏱️ 1m</span>
            </div>
            
            <p className="font-bold text-white text-sm">
                {isMe ? "Bạn đã thách đối thủ giải câu đố này!" : "Đối thủ thách bạn giải câu đố!"}
            </p>
            
            {!isMe && (
                <button 
                    onClick={onAccept}
                    className="btn btn-sm w-full bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold border-none shadow-lg hover:scale-105 transition-transform"
                >
                    Chấp nhận Thách đấu
                </button>
            )}
            
            {isMe && (
                <div className="text-[10px] text-blue-200 italic text-center">Đang đợi đối thủ trả lời...</div>
            )}
        </div>
    );
};

// ... existing IntelCard ...
const IntelCard: React.FC<{
    intel: NonNullable<ChatMessage['intel']>;
    isMe: boolean;
    onView: () => void;
}> = ({ intel, isMe, onView }) => {
    return (
        <div className={`mt-2 p-0 rounded-lg border overflow-hidden flex flex-col shadow-lg cursor-pointer group transition-transform hover:scale-[1.02]
            ${isMe ? 'bg-blue-900/40 border-blue-400/50' : 'bg-green-900/40 border-green-500/50'}`}
            onClick={onView}
        >
            <div className={`p-2 flex justify-between items-center ${isMe ? 'bg-blue-600/30' : 'bg-green-600/30'}`}>
                <span className="text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-1">
                    <span>💾</span> DATA CHIP
                </span>
                <span className="text-[10px] opacity-70">ID: {intel.noteId.substring(0, 4)}</span>
            </div>
            <div className="p-3">
                <h4 className="font-bold text-white text-sm mb-1 line-clamp-1">{intel.title}</h4>
                <p className="text-xs text-gray-300 font-mono line-clamp-2 opacity-80">{intel.preview}</p>
            </div>
            <div className={`p-2 text-center text-[10px] font-bold uppercase transition-colors ${isMe ? 'text-blue-300 group-hover:bg-blue-600/20' : 'text-green-300 group-hover:bg-green-600/20'}`}>
                CLICK TO REVIEW
            </div>
        </div>
    );
};

// ... existing GradeDisputeCard ...
const GradeDisputeCard: React.FC<{
    dispute: NonNullable<ChatMessage['gradeDispute']>;
}> = ({ dispute }) => {
    return (
        <div className="mt-2 p-0 rounded-lg border border-orange-500/50 overflow-hidden flex flex-col shadow-lg bg-orange-900/20">
            <div className="p-2 flex justify-between items-center bg-orange-600/20">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-200 flex items-center gap-1">
                    <span>📢</span> GRADE DISPUTE
                </span>
                <span className="text-[10px] opacity-70 text-orange-200 font-mono">#{dispute.assignmentId}</span>
            </div>
            <div className="p-3 space-y-2">
                <h4 className="font-bold text-white text-sm">{dispute.assignmentTitle}</h4>
                
                <div className="flex gap-2">
                    <div className="bg-black/30 p-2 rounded flex-1 border border-white/10">
                        <p className="text-[10px] text-gray-400 uppercase">Điểm số</p>
                        <p className="text-lg font-bold text-white">{dispute.score} <span className="text-gray-500 text-xs">/ {dispute.maxScore}</span></p>
                    </div>
                </div>

                {dispute.feedback && (
                    <div className="text-xs text-gray-300 bg-white/5 p-2 rounded italic border-l-2 border-gray-500">
                        "{dispute.feedback}"
                    </div>
                )}
                
                <p className="text-xs text-orange-300 pt-1 border-t border-orange-500/20">
                    Học sinh yêu cầu xem xét lại kết quả này.
                </p>
            </div>
        </div>
    );
};

// ... existing TradeOfferCard ...
const TradeOfferCard: React.FC<{
    trade: NonNullable<ChatMessage['trade']>;
    isMe: boolean;
    msgId: string;
    onAccept: () => void;
}> = ({ trade, isMe, msgId, onAccept }) => {
    const isPending = trade.status === 'PENDING';
    const isAccepted = trade.status === 'ACCEPTED';

    return (
        <div className={`mt-2 p-0 rounded-lg border overflow-hidden flex flex-col shadow-lg 
            ${isMe ? 'bg-purple-900/40 border-purple-400/50' : 'bg-yellow-900/40 border-yellow-500/50'}`}
        >
            <div className={`p-2 flex justify-between items-center ${isMe ? 'bg-purple-600/30' : 'bg-yellow-600/30'}`}>
                <span className="text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-1">
                    <span>🤝</span> BLACK MARKET
                </span>
                <span className="text-[10px] font-mono text-white/70">{trade.status}</span>
            </div>
            <div className="p-4 flex items-center gap-3">
                <div className="text-3xl filter drop-shadow-md">📦</div>
                <div>
                    <h4 className="font-bold text-white text-sm">{trade.deckTitle}</h4>
                    <p className="text-xs text-gray-300 flex items-center gap-1 mt-1">
                        Giá: <span className="text-blue-300 font-bold">{trade.cost}</span> 💎
                    </p>
                </div>
            </div>
            
            {/* ACTION AREA */}
            <div className="p-2 border-t border-white/10 bg-black/20">
                {isMe ? (
                    <p className="text-center text-[10px] text-purple-300 italic">
                        {isPending ? 'Đang đợi đối tác...' : isAccepted ? 'Giao dịch thành công!' : 'Giao dịch bị hủy.'}
                    </p>
                ) : (
                    <>
                        {isPending ? (
                            <button 
                                onClick={onAccept}
                                className="btn btn-sm w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold border-none shadow-lg hover:scale-105 transition-transform"
                            >
                                Mua ngay (-{trade.cost} 💎)
                            </button>
                        ) : (
                            <div className="text-center">
                                <span className={`text-xs font-bold px-2 py-1 rounded ${isAccepted ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {isAccepted ? 'ĐÃ SỞ HỮU' : 'ĐÃ TỪ CHỐI'}
                                </span>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

// ... existing RewardCard ...
const RewardCard: React.FC<{
    reward: NonNullable<ChatMessage['reward']>;
}> = ({ reward }) => {
    return (
        <div className="mt-2 p-0 rounded-xl border border-yellow-400/50 overflow-hidden flex flex-col shadow-[0_0_20px_rgba(234,179,8,0.3)] bg-gradient-to-br from-yellow-900/40 to-black animate-pop-in">
            <div className="p-2 flex justify-between items-center bg-gradient-to-r from-yellow-600/30 to-orange-600/30">
                <span className="text-[10px] font-black uppercase tracking-widest text-yellow-200 flex items-center gap-1">
                    <span className="text-lg">🎁</span> TEACHER'S GIFT
                </span>
                <span className="text-[10px] text-yellow-100 animate-pulse">SPECIAL</span>
            </div>
            <div className="p-4 text-center">
                <div className="text-5xl mb-2 animate-bounce-subtle filter drop-shadow-lg">
                    {reward.type === 'diamond' ? '💎' : '🏅'}
                </div>
                <p className="text-2xl font-black text-white drop-shadow-md">
                    {reward.type === 'diamond' ? `+${reward.value}` : 'Item Received'}
                </p>
                <p className="text-xs text-yellow-300 font-bold uppercase tracking-wider mb-3">
                    {reward.type === 'diamond' ? 'Kim Cương' : `Huy hiệu: ${reward.value}`}
                </p>
                <div className="bg-white/10 p-2 rounded-lg">
                    <p className="text-sm italic text-gray-200">"{reward.message}"</p>
                </div>
            </div>
        </div>
    );
};

// ... existing SquadronInviteCard ...
const SquadronInviteCard: React.FC<{
    invite: NonNullable<ChatMessage['squadronInvite']>;
    isMe: boolean;
    onAccept: () => void;
}> = ({ invite, isMe, onAccept }) => {
    const isPending = invite.status === 'PENDING';
    const isAccepted = invite.status === 'ACCEPTED';

    return (
        <div className={`mt-2 p-0 rounded-xl border-2 overflow-hidden flex flex-col shadow-lg 
            ${isMe ? 'bg-indigo-900/40 border-indigo-400/50' : 'bg-pink-900/40 border-pink-500/50'}`}
        >
            <div className={`p-2 flex justify-between items-center ${isMe ? 'bg-indigo-600/30' : 'bg-pink-600/30'}`}>
                <span className="text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-1">
                    <span className="text-lg">🛸</span> RECRUITMENT
                </span>
                <span className="text-[10px] font-mono text-white/70">{invite.status}</span>
            </div>
            <div className="p-4 text-center">
                <p className="text-sm text-gray-300 mb-1">Lời mời gia nhập:</p>
                <h4 className="text-xl font-black text-white drop-shadow-md mb-2">{invite.groupName}</h4>
                <div className="text-4xl mb-2 animate-float">🛡️</div>
            </div>
            
            {/* ACTION AREA */}
            <div className="p-2 border-t border-white/10 bg-black/20">
                {isMe ? (
                    <p className="text-center text-[10px] text-indigo-300 italic">
                        {isPending ? 'Đang chờ phản hồi...' : isAccepted ? 'Đã gia nhập!' : 'Đã bị từ chối.'}
                    </p>
                ) : (
                    <>
                        {isPending ? (
                            <button 
                                onClick={onAccept}
                                className="btn btn-sm w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold border-none shadow-lg hover:scale-105 transition-transform"
                            >
                                Chấp nhận Gia nhập
                            </button>
                        ) : (
                            <div className="text-center">
                                <span className={`text-xs font-bold px-2 py-1 rounded ${isAccepted ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {isAccepted ? 'ĐÃ GIA NHẬP' : 'ĐÃ TỪ CHỐI'}
                                </span>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

// ... existing SharedNoteViewerModal and TradeModal ...
const SharedNoteViewerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    noteData: NonNullable<ChatMessage['intel']> | null;
    user: User | null;
    addNoteComment: (noteId: string, userId: string, content: string, highlightedText?: string) => void;
    db: any; // Simplified for access to live comments
}> = ({ isOpen, onClose, noteData, user, addNoteComment, db }) => {
    
    const [commentText, setCommentText] = useState('');
    const [highlightedText, setHighlightedText] = useState('');
    const [selectionRect, setSelectionRect] = useState<{ top: number, left: number } | null>(null);
    const noteContentRef = useRef<HTMLDivElement>(null);

    // Get fresh comments if note exists in DB (it should if shared properly)
    const noteId = noteData?.noteId;
    const activeNoteComments = useMemo(() => {
        if (!noteId) return [];
        return db.PERSONAL_NOTES[noteId]?.comments || [];
    }, [noteId, db.PERSONAL_NOTES]);

    const handleTextSelect = () => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0 && noteContentRef.current && noteContentRef.current.contains(selection.anchorNode)) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            setHighlightedText(selection.toString());
            setSelectionRect({ 
                top: rect.top - 50,
                left: rect.left + (rect.width / 2)
            });
        } else {
            setSelectionRect(null);
            setHighlightedText('');
        }
    };

    const handleSubmitComment = () => {
        if (!noteId || !user || !commentText.trim()) return;
        
        addNoteComment(noteId, user.id, commentText, highlightedText || undefined);
        
        setCommentText('');
        setHighlightedText('');
        setSelectionRect(null);
        window.getSelection()?.removeAllRanges();
    };

    if (!isOpen || !noteData) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Intel: ${noteData.title}`} size="lg">
            <div className="flex flex-col h-[70vh]">
                <div 
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg p-6 mb-4 overflow-y-auto custom-scrollbar relative"
                    onMouseUp={handleTextSelect}
                >
                    {/* Holographic Overlay Effect */}
                    <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:20px_20px] z-0"></div>
                    
                    <div ref={noteContentRef} className="relative z-10 space-y-2 whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-300 selection:bg-green-500 selection:text-black">
                        {renderMarkdown(noteData.fullContent)}
                    </div>

                    {/* Floating Comment Button */}
                    {selectionRect && (
                        <div 
                            className="fixed z-50 animate-pop-in flex flex-col items-center"
                            style={{ top: selectionRect.top, left: selectionRect.left }}
                            onMouseUp={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-black border border-green-500 rounded-lg shadow-xl p-2 flex gap-2">
                                <input 
                                    type="text" 
                                    className="bg-gray-900 border border-gray-700 text-white text-xs px-2 py-1 rounded w-48 focus:outline-none focus:border-green-500"
                                    placeholder="Thêm bình luận..."
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                                    autoFocus
                                />
                                <button onClick={handleSubmitComment} className="text-green-400 hover:text-white font-bold px-2">➤</button>
                            </div>
                            <div className="w-3 h-3 bg-black border-b border-r border-green-500 transform rotate-45 -mt-1.5"></div>
                        </div>
                    )}
                </div>

                {/* Comments Section */}
                <div className="mt-2 border-t border-gray-700 pt-2 max-h-[150px] overflow-y-auto">
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Review Log ({activeNoteComments.length})</h4>
                    <div className="space-y-2">
                        {activeNoteComments.map(cmt => (
                            <div key={cmt.id} className="bg-white/5 p-2 rounded-lg text-sm border border-white/5">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-blue-300 text-xs">{cmt.userName}</span>
                                    <span className="text-[9px] text-gray-600">{new Date(cmt.timestamp).toLocaleTimeString()}</span>
                                </div>
                                {cmt.highlightedText && (
                                    <div className="mb-1 pl-2 border-l-2 border-green-500 text-xs text-gray-500 italic truncate">
                                        "{cmt.highlightedText}"
                                    </div>
                                )}
                                <p className="text-gray-300 text-xs">{cmt.content}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                    <button onClick={onClose} className="btn btn-secondary text-sm">Đóng</button>
                </div>
            </div>
        </Modal>
    );
};

const TradeModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSendOffer: (deckId: string, cost: number) => void;
    decks: FlashcardDeck[];
}> = ({ isOpen, onClose, onSendOffer, decks }) => {
    const [selectedDeckId, setSelectedDeckId] = useState<string>('');
    const [cost, setCost] = useState(10);

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Chợ Đen: Tạo Giao Dịch" size="md">
            <div className="space-y-4 p-2">
                <div className="bg-purple-900/20 border border-purple-500/30 p-3 rounded-lg flex items-center gap-3">
                    <div className="text-3xl">⚖️</div>
                    <p className="text-xs text-purple-200">
                        Chọn bộ Flashcard bạn muốn bán. Người mua sẽ trả bằng Kim Cương.
                    </p>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Chọn Hàng Hóa (Deck)</label>
                    <select 
                        className="form-select w-full bg-gray-900 border-gray-700"
                        value={selectedDeckId}
                        onChange={(e) => setSelectedDeckId(e.target.value)}
                    >
                        <option value="">-- Chọn bộ thẻ --</option>
                        {decks.map(d => <option key={d.id} value={d.id}>{d.title} ({d.cards.length} thẻ)</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Giá Bán (Kim Cương)</label>
                    <input 
                        type="number" 
                        min="0" 
                        max="1000" 
                        className="form-input w-full bg-gray-900 border-gray-700 text-blue-300 font-bold"
                        value={cost}
                        onChange={e => setCost(Number(e.target.value))}
                    />
                </div>

                <div className="flex justify-end pt-4 gap-2">
                    <button onClick={onClose} className="btn btn-secondary text-xs">Hủy</button>
                    <button 
                        onClick={() => { if(selectedDeckId) onSendOffer(selectedDeckId, cost); }}
                        disabled={!selectedDeckId} 
                        className="btn btn-primary bg-purple-600 hover:bg-purple-500 shadow-lg text-xs"
                    >
                        Gửi Lời Mời
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// ... existing ChatPage component ...
const ChatPage: React.FC = () => {
    // ... existing setup ...
    const { user } = useContext(AuthContext)!;
    const { db, sendChatMessage, processTrade, addTask, addNoteComment, joinGroup } = useContext(DataContext)!;
    const { setPage: setGlobalPage } = useContext(GlobalStateContext)!;
    const { params, navigate } = useContext(PageContext)!; // Need params for dispute context
    
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [messageText, setMessageText] = useState('');
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // State for viewing shared note
    const [viewingIntel, setViewingIntel] = useState<NonNullable<ChatMessage['intel']> | null>(null);
    
    // Trade State
    const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);

    // Smart Schedule State
    const [isDetectingSchedule, setIsDetectingSchedule] = useState(false);
    const [scheduleSuggestion, setScheduleSuggestion] = useState<{ title: string, isoTime: string } | null>(null);

    // Voice Note State
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessingAudio, setIsProcessingAudio] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // ONBOARDING TOUR STATE
    const [isTourOpen, setIsTourOpen] = useState(false);

    // Get list of contacts (all users except self)
    const contacts = useMemo(() => {
        if (!user) return [];
        return (Object.values(db.USERS) as User[]).filter(u => u.id !== user.id);
    }, [db.USERS, user]);

    // Handle initial params (e.g. from Grade Dispute or Peer Review)
    useEffect(() => {
        if (params && params.targetUserId) {
            setSelectedUserId(params.targetUserId);
            
            // Auto-send Grade Dispute if context exists
            if (params.disputeContext && user) {
                // Check if we already sent this recently to avoid duplicates? (Simplified: just send)
                sendChatMessage(
                    user.id,
                    params.targetUserId,
                    "Em xin phép được thắc mắc về kết quả bài này ạ. Mong thầy/cô xem lại giúp em.",
                    undefined,
                    undefined,
                    undefined,
                    params.disputeContext // Send Grade Card
                );
                // Clear params to prevent resend on re-render (requires a way to modify context, or navigate to self without params)
                navigate('chat', { targetUserId: params.targetUserId }); // Clear disputeContext
            }

            // NEW: Handle Trade Intent
            if (params.openTradeModal) {
                setIsTradeModalOpen(true);
            }
        }
    }, [params, user, sendChatMessage, navigate]);

    // Get messages for selected contact
    const messages = useMemo(() => {
        if (!user || !selectedUserId) return [];
        const key = [user.id, selectedUserId].sort().join('_');
        return db.CHAT_MESSAGES[key] || [];
    }, [db.CHAT_MESSAGES, user, selectedUserId]);

    // Get User's Decks for Trading
    const myDecks = useMemo(() => Object.values(db.FLASHCARD_DECKS) as FlashcardDeck[], [db.FLASHCARD_DECKS]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // --- ONBOARDING EFFECT ---
    useEffect(() => {
        const hasSeenTour = localStorage.getItem('hasSeenChatVoiceTour');
        if (!hasSeenTour) {
            // Delay slightly to ensure render
            setTimeout(() => setIsTourOpen(true), 1500);
        }
    }, []);

    const handleTourComplete = () => {
        setIsTourOpen(false);
        localStorage.setItem('hasSeenChatVoiceTour', 'true');
    };

    const tourSteps: TourStep[] = [
        {
            targetId: 'btn-voice-input',
            title: 'Luyện nói với AI',
            content: 'Lười gõ phím? Hãy nói chuyện trực tiếp với AI. Chúng tôi hỗ trợ nhận dạng giọng nói tiếng Việt.',
            position: 'top'
        }
    ];

    // --- EFFECT: SMART SCHEDULING DETECTION ---
    useEffect(() => {
        const lastMsg = messages[messages.length - 1];
        if (!lastMsg || !user || !selectedUserId) return;

        // Skip if message is old (> 1 min) or system generated
        const timeDiff = Date.now() - new Date(lastMsg.timestamp).getTime();
        if (timeDiff > 60000 || lastMsg.from === 'system') return;

        // Quick Regex check to save API calls
        const timePattern = /\b(\d{1,2})(:|h|g|am|pm|sáng|chiều|tối)/i;
        const datePattern = /(hôm nay|ngày mai|thứ|tuần sau)/i;
        
        if (timePattern.test(lastMsg.text) || datePattern.test(lastMsg.text)) {
            const apiKey = db.USERS[user.id]?.apiKey;
            if (!apiKey) return;

            setIsDetectingSchedule(true);
            detectSchedulingIntent(apiKey, lastMsg.text, new Date().toISOString())
                .then(result => {
                    if (result && result.detected && result.title && result.isoTime) {
                        setScheduleSuggestion({ title: result.title, isoTime: result.isoTime });
                    }
                })
                .finally(() => setIsDetectingSchedule(false));
        }
    }, [messages, user, db.USERS, selectedUserId]);

    const handleAcceptSchedule = () => {
        if (!scheduleSuggestion || !user || !selectedUserId) return;
        
        // 1. Create Task for current user
        const taskText = `📅 Lịch hẹn: ${scheduleSuggestion.title} (${new Date(scheduleSuggestion.isoTime).toLocaleString()})`;
        addTask(user.id, taskText);

        // 2. Notify partner
        sendChatMessage(user.id, selectedUserId, `[System] ✅ Đã tạo lịch hẹn: ${scheduleSuggestion.title} vào lúc ${new Date(scheduleSuggestion.isoTime).toLocaleTimeString()}.`);

        setScheduleSuggestion(null);
        alert("Đã thêm vào danh sách Task của bạn!");
    };

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !selectedUserId || !messageText.trim()) return;
        sendChatMessage(user.id, selectedUserId, messageText);
        setMessageText('');
        // Clear suggestion on new message to avoid staleness
        setScheduleSuggestion(null);
    };

    // --- VOICE NOTE LOGIC ---
    const handleStartRecording = async () => {
        if (!user) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Mic access denied", err);
            alert("Không thể truy cập Microphone.");
        }
    };

    const handleStopRecording = () => {
        if (!mediaRecorderRef.current) return;
        
        mediaRecorderRef.current.onstop = async () => {
            setIsRecording(false);
            setIsProcessingAudio(true);
            
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' }); // Ensure browser supports type or handle conversion
            const reader = new FileReader();
            
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
                const base64Audio = (reader.result as string).split(',')[1];
                const apiKey = db.USERS[user!.id]?.apiKey;
                
                if (!apiKey) {
                    setGlobalPage('api_key', { isApiKeyModalOpen: true });
                    setIsProcessingAudio(false);
                    return;
                }

                try {
                    // 1. Transcribe (Flash)
                    let text = await transcribeAudio(apiKey, base64Audio);
                    
                    // 2. Enhance if Teacher (Pro + Thinking)
                    if (user!.role === 'TEACHER') {
                        const summary = await summarizeTeacherNote(apiKey, text);
                        if (summary) {
                            text += `\n\n--- 📝 AI Summary ---\n${summary}`;
                        }
                    }

                    setMessageText(text);
                } catch (e: any) {
                    alert("Lỗi xử lý âm thanh: " + e.message);
                } finally {
                    setIsProcessingAudio(false);
                }
            };
        };

        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    };

    const handleSendTradeOffer = (deckId: string, cost: number) => {
        if (!user || !selectedUserId) return;
        
        // FIX: Find deck by ID iterating values, because db.FLASHCARD_DECKS keys might not match ID directly
        // Cast to FlashcardDeck[] to ensure type safety
        const deck = (Object.values(db.FLASHCARD_DECKS) as FlashcardDeck[]).find(d => d.id === deckId);
        
        if (!deck) {
            alert("Lỗi: Không tìm thấy bộ thẻ này trong cơ sở dữ liệu.");
            return;
        }

        const tradeData = {
            id: `trade_${Date.now()}`,
            deckId: deck.id,
            deckTitle: deck.title,
            cost: cost,
            status: 'PENDING' as const
        };

        sendChatMessage(user.id, selectedUserId, `🤝 [TRADE OFFER] Tôi muốn bán bộ thẻ "${deck.title}"`, undefined, undefined, tradeData);
        setIsTradeModalOpen(false);
    };

    const handleAcceptTrade = (msgId: string) => {
        if (!user) return;
        try {
            processTrade(msgId, user.id);
            alert("✅ Giao dịch thành công! Bộ thẻ đã được thêm vào kho của bạn.");
        } catch (e: any) {
            alert(`❌ Giao dịch thất bại: ${e.message}`);
        }
    };

    // --- NEW: ACCEPT RECRUITMENT ---
    const handleAcceptRecruitment = (msgId: string, inviteData: any) => {
        if (!user) return;
        try {
            // Check if already in a group?
            // Actually joinGroup helper will update if needed.
            joinGroup(inviteData.groupId, user.id, msgId);
            alert(`🎉 Chúc mừng! Bạn đã gia nhập Phi đội "${inviteData.groupName}".`);
            // Optionally navigate to GroupChat
            navigate('group_chat');
        } catch (e: any) {
            alert(`❌ Lỗi gia nhập: ${e.message}`);
        }
    };

    if (!user) return null;

    return (
        <div className="flex h-[calc(100vh-120px)] gap-6">
            {/* Contacts Sidebar */}
            <div className="w-1/3 min-w-[250px] bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-white/10 bg-white/5">
                    <h2 className="text-lg font-bold text-white">Liên lạc</h2>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                    {contacts.map(contact => (
                        <button
                            key={contact.id}
                            onClick={() => setSelectedUserId(contact.id)}
                            className={`w-full p-3 rounded-xl flex items-center gap-3 transition-colors relative ${selectedUserId === contact.id ? 'bg-blue-600/20 border border-blue-500/50' : 'hover:bg-white/5 border border-transparent'}`}
                        >
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center font-bold text-white">
                                    {contact.name.charAt(0)}
                                </div>
                                {/* Online Status Indicator */}
                                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-black ${contact.isOnline ? 'bg-green-500' : 'bg-gray-500'}`} title={contact.isOnline ? "Online" : "Offline"}></div>
                            </div>
                            <div className="text-left">
                                <p className={`font-bold text-sm ${selectedUserId === contact.id ? 'text-blue-300' : 'text-gray-200'}`}>{contact.name}</p>
                                <p className="text-[10px] text-gray-500 uppercase">{contact.role}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden flex flex-col shadow-2xl relative">
                {!selectedUserId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <div className="text-6xl mb-4 opacity-50">📡</div>
                        <p>Chọn một liên lạc để bắt đầu truyền tin.</p>
                    </div>
                ) : (
                    <>
                        <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${db.USERS[selectedUserId]?.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
                                {db.USERS[selectedUserId]?.name}
                            </h3>
                            <button 
                                onClick={() => setIsTradeModalOpen(true)}
                                className="btn btn-xs bg-purple-600 hover:bg-purple-500 text-white border-none shadow-lg animate-pulse"
                                title="Mở Chợ Đen"
                            >
                                🤝 Giao dịch
                            </button>
                        </div>

                        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar relative">
                            {messages.map(msg => {
                                const isMe = msg.from === user.id;
                                return (
                                    <div key={msg.id} className={`relative z-10 flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] py-3 px-5 rounded-2xl border backdrop-blur-md shadow-lg transition-all hover:scale-[1.01]
                                            ${isMe 
                                                ? 'bg-blue-600/80 border-blue-400/50 text-white rounded-br-none' 
                                                : 'bg-gray-800/80 border-gray-600/50 text-gray-200 rounded-bl-none'
                                            }`}>
                                            <div className="whitespace-pre-wrap leading-relaxed">{renderMarkdown(msg.text)}</div>
                                            
                                            {/* RENDER GRADE DISPUTE CARD */}
                                            {msg.gradeDispute && (
                                                <GradeDisputeCard dispute={msg.gradeDispute} />
                                            )}

                                            {/* RENDER CHALLENGE CARD */}
                                            {msg.challenge && (
                                                <ChallengeCard 
                                                    challenge={msg.challenge} 
                                                    isMe={isMe} 
                                                    onAccept={() => alert(`Chấp nhận thử thách: "${msg.challenge!.question.text}"\n(Tính năng làm bài nhanh đang phát triển)`)}
                                                />
                                            )}

                                            {/* RENDER INTEL CARD */}
                                            {msg.intel && (
                                                <IntelCard 
                                                    intel={msg.intel} 
                                                    isMe={isMe} 
                                                    onView={() => setViewingIntel(msg.intel!)} 
                                                />
                                            )}

                                            {/* RENDER TRADE OFFER CARD */}
                                            {msg.trade && (
                                                <TradeOfferCard
                                                    trade={msg.trade}
                                                    isMe={isMe}
                                                    msgId={msg.id}
                                                    onAccept={() => handleAcceptTrade(msg.id)}
                                                />
                                            )}

                                            {/* RENDER REWARD CARD */}
                                            {msg.reward && (
                                                <RewardCard reward={msg.reward} />
                                            )}

                                            {/* RENDER SQUADRON INVITE CARD */}
                                            {msg.squadronInvite && (
                                                <SquadronInviteCard 
                                                    invite={msg.squadronInvite}
                                                    isMe={isMe}
                                                    onAccept={() => handleAcceptRecruitment(msg.id, msg.squadronInvite)}
                                                />
                                            )}

                                            <p className={`text-[10px] mt-1 text-right opacity-60 ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                                                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* SMART SUGGESTION CHIP */}
                        {(scheduleSuggestion || isDetectingSchedule) && (
                            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20 animate-pop-in">
                                {isDetectingSchedule ? (
                                    <div className="bg-blue-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-blue-500/50 flex items-center gap-2 text-xs text-blue-200 shadow-lg">
                                        <LoadingSpinner size={3} />
                                        <span>AI đang phân tích lịch hẹn...</span>
                                    </div>
                                ) : scheduleSuggestion ? (
                                    <button 
                                        onClick={handleAcceptSchedule}
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-3 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-white/20 flex items-center gap-2 transition-all hover:scale-105"
                                    >
                                        <span className="text-lg">✨</span>
                                        <div className="text-left">
                                            <p className="text-xs font-bold text-blue-200 uppercase">Tạo Lịch Hẹn</p>
                                            <p className="text-sm font-bold">{scheduleSuggestion.title} @ {new Date(scheduleSuggestion.isoTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                        </div>
                                    </button>
                                ) : null}
                            </div>
                        )}

                        <div className="p-4 bg-white/5 border-t border-white/10 flex gap-3 items-center relative">
                            {/* MICROPHONE BUTTON */}
                            <button
                                id="btn-voice-input"
                                type="button"
                                onClick={isRecording ? handleStopRecording : handleStartRecording}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                    isRecording 
                                    ? 'bg-red-600 animate-pulse text-white shadow-[0_0_15px_rgba(220,38,38,0.6)]' 
                                    : 'bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white'
                                }`}
                                title={isRecording ? "Dừng ghi âm (Gửi)" : "Ghi âm giọng nói"}
                                disabled={isProcessingAudio}
                            >
                                {isProcessingAudio ? <LoadingSpinner size={4} /> : isRecording ? '⏹' : '🎤'}
                            </button>

                            <form onSubmit={handleSend} className="flex-1 flex gap-3">
                                <div className="flex-1 relative">
                                    <input 
                                        type="text" 
                                        className="w-full bg-black/30 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors placeholder-gray-500"
                                        placeholder={isRecording ? "Đang ghi âm... (Nói để nhập)" : "Nhập tin nhắn..."}
                                        value={messageText}
                                        onChange={e => setMessageText(e.target.value)}
                                        disabled={isRecording || isProcessingAudio}
                                    />
                                    {isProcessingAudio && (
                                        <span className="absolute right-3 top-3 text-xs text-blue-400 font-bold animate-pulse">
                                            AI Processing...
                                        </span>
                                    )}
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={!messageText.trim() || isRecording || isProcessingAudio}
                                    className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Gửi ➤
                                </button>
                            </form>
                        </div>
                    </>
                )}
            </div>

            {/* Shared Intel Viewer Modal (with Commenting) */}
            <SharedNoteViewerModal 
                isOpen={!!viewingIntel} 
                onClose={() => setViewingIntel(null)} 
                noteData={viewingIntel}
                user={user}
                addNoteComment={addNoteComment}
                db={db}
            />

            {/* Trade Modal */}
            <TradeModal 
                isOpen={isTradeModalOpen}
                onClose={() => setIsTradeModalOpen(false)}
                onSendOffer={handleSendTradeOffer}
                decks={myDecks}
            />

            {/* ONBOARDING TOUR - VOICE COMMAND */}
            <OnboardingTour 
                steps={tourSteps} 
                isOpen={isTourOpen} 
                onComplete={handleTourComplete}
                onSkip={handleTourComplete}
            />
        </div>
    );
};

export default ChatPage;
