
import React, { useState, useContext, useMemo, useCallback, useRef, useEffect } from 'react';
import { AuthContext, DataContext, GlobalStateContext } from '../../contexts/AppProviders';
import { useFeatureFlag } from '../../hooks/useAppHooks';
import { evaluateExplanation } from '../../services/geminiService';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../common/Modal';
import LegacyArchiveModal from '../modals/LegacyArchiveModal';
import type { StudyGroup, User, PersonalNote } from '../../types';

// --- MOCK DATA HELPERS ---
const getSquadronStats = (groupId: string) => {
    // Deterministic random stats based on ID
    const hash = groupId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return {
        level: (hash % 10) + 1,
        shield: 50 + (hash % 50),
        thruster: 40 + (hash % 60),
        energy: (hash % 100), // 0-100%
        shipClass: ['Interceptor', 'Frigate', 'Destroyer', 'Cruiser'][hash % 4],
        // Mock activity stats for teacher
        activityScore: hash % 100, // 0-100
        progressScore: (hash * 7) % 100 // 0-100
    };
};

const GroupChatPage: React.FC = () => {
    const { user } = useContext(AuthContext)!;
    const { db, joinGroup, sendGroupMessage, createGroup, sendChatMessage, addNoteComment, resolveSOS, unlockSharedNote, generateArchive } = useContext(DataContext)!;
    const { serviceStatus, setPage: setGlobalPage } = useContext(GlobalStateContext)!;
    
    const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
    const [viewMode, setViewMode] = useState<'chat' | 'intel'>('chat');
    
    // Chat State
    const [message, setMessage] = useState('');
    const [isSOS, setIsSOS] = useState(false); 
    const [isWhisper, setIsWhisper] = useState(false); // Teacher mode
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Modal States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    
    // Legacy Archive State
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [archiveContent, setArchiveContent] = useState<string | null>(null);
    const [isArchiving, setIsArchiving] = useState(false);

    // SOS Rescue State
    const [rescueTarget, setRescueTarget] = useState<{ id: string, text: string } | null>(null);
    const [rescueInput, setRescueInput] = useState('');
    const [isEvaluatingRescue, setIsEvaluatingRescue] = useState(false);
    const [rescueError, setRescueError] = useState<string | null>(null);

    // Note Reader & Commenting State
    const [selectedNote, setSelectedNote] = useState<PersonalNote | null>(null);
    const [commentText, setCommentText] = useState('');
    const [highlightedText, setHighlightedText] = useState('');
    const [selectionRect, setSelectionRect] = useState<{ top: number, left: number } | null>(null);
    const noteContentRef = useRef<HTMLDivElement>(null);

    // Feature Flag is ignored as per "Always On" requirement, but we keep the hook for consistency if needed later
    // const isGroupChatEnabled = useFeatureFlag('v5_groups'); 
    
    const isGroupServiceOk = serviceStatus.group_service === 'OPERATIONAL';
    const isTeacher = user?.role === 'TEACHER';

    const groups = useMemo(() => {
        if (isTeacher) return db.STUDY_GROUPS; // Teacher sees all
        // For Students: Could filter joined groups separately if needed, but the current UI shows all available to join
        return db.STUDY_GROUPS;
    }, [db.STUDY_GROUPS, isTeacher]);

    const contacts = useMemo(() => (Object.values(db.USERS) as User[]).filter(u => u.id !== user?.id), [db.USERS, user?.id]);

    const { chatHistory, userInGroup, sharedNotes } = useMemo(() => {
        if (!selectedGroup || !user) return { chatHistory: [], userInGroup: false, sharedNotes: [] };
        const history = db.GROUP_CHAT_MESSAGES[selectedGroup.id] || [];
        const inGroup = isTeacher || selectedGroup.members.includes(user.id); // Teacher effectively "in" all groups for viewing
        const notes = (Object.values(db.PERSONAL_NOTES || {}) as PersonalNote[]).filter(n => n.sharedWithSquadronId === selectedGroup.id);
        return { chatHistory: history, userInGroup: inGroup, sharedNotes: notes };
    }, [selectedGroup, user, db.GROUP_CHAT_MESSAGES, db.PERSONAL_NOTES, isTeacher]);

    // Calculate simulated energy
    const squadronEnergy = useMemo(() => {
        if (!selectedGroup) return 0;
        const base = getSquadronStats(selectedGroup.id).energy;
        const activeBonus = Math.min(chatHistory.length * 2, 50);
        return Math.min(base + activeBonus, 100);
    }, [selectedGroup, chatHistory]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory, viewMode]);

    const handleSend = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !selectedGroup || !userInGroup || !isGroupServiceOk || !user) return;
        
        // Pass metadata object instead of baking into string
        sendGroupMessage(selectedGroup.id, user, message, { isSOS, isWhisper });
        setMessage('');
        setIsSOS(false);
        setIsWhisper(false);
    }, [message, selectedGroup, userInGroup, user, sendGroupMessage, isGroupServiceOk, isSOS, isWhisper]);

    const handleJoin = useCallback(() => {
        if (!selectedGroup || userInGroup || !isGroupServiceOk || !user) return;
        joinGroup(selectedGroup.id, user.id);
    }, [selectedGroup, userInGroup, user, joinGroup, isGroupServiceOk]);

    const handleCreateGroup = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName.trim() || !user) return;
        createGroup(newGroupName, user.id);
        setNewGroupName('');
        setIsCreateModalOpen(false);
        alert("Đã tạo phi thuyền mới!");
    };

    const handleShareToContact = (contactId: string) => {
        if (!selectedGroup || !user) return;
        const link = `starlink://squadron/${selectedGroup.id}`;
        const inviteMessage = `🚀 MỜI GIA NHẬP: Tôi mời bạn tham gia phi thuyền "${selectedGroup.name}".\nTruy cập tọa độ: ${link}`;
        
        sendChatMessage(user.id, contactId, inviteMessage);
        alert(`Đã gửi tín hiệu mời đến ${db.USERS[contactId].name}!`);
        setIsShareModalOpen(false);
    };

    const handleArchiveSquadron = async () => {
        if (!selectedGroup) return;
        const apiKey = user?.apiKey;
        if (!apiKey) {
            setGlobalPage('api_key', { isApiKeyModalOpen: true });
            return;
        }

        setIsArchiveModalOpen(true);
        setIsArchiving(true);
        setArchiveContent(null);

        try {
            const content = await generateArchive(apiKey, 'squadron', selectedGroup.id, selectedGroup.name);
            setArchiveContent(content);
        } catch (e: any) {
            alert(e.message);
            setIsArchiveModalOpen(false);
        } finally {
            setIsArchiving(false);
        }
    };

    // --- SOS RESCUE LOGIC ---
    const handleOpenRescue = (msgId: string, msgText: string) => {
        setRescueTarget({ id: msgId, text: msgText });
        setRescueInput('');
        setRescueError(null);
    };

    const handleSubmitRescue = async () => {
        if (!rescueTarget || !selectedGroup || !user) return;
        
        const apiKey = db.USERS[user.id]?.apiKey;
        if (!apiKey) {
            setGlobalPage('api_key', { isApiKeyModalOpen: true });
            return;
        }

        setIsEvaluatingRescue(true);
        setRescueError(null);

        try {
            const result = await evaluateExplanation(apiKey, rescueTarget.text, rescueInput);
            
            if (result.isHelpful) {
                resolveSOS(selectedGroup.id, rescueTarget.id, user.id);
                setRescueTarget(null);
                alert(`🎉 GIẢI CỨU THÀNH CÔNG!\nBạn nhận được Karma Points (Danh dự).\nLý do: ${result.reason}`);
            } else {
                setRescueError(`AI đánh giá chưa đạt: ${result.reason}. Hãy thử giải thích rõ hơn.`);
            }
        } catch (e: any) {
            setRescueError("Lỗi kết nối AI: " + e.message);
        } finally {
            setIsEvaluatingRescue(false);
        }
    };

    // --- DATA HEIST LOGIC ---
    const handleUnlockIntel = (e: React.MouseEvent, note: PersonalNote) => {
        e.stopPropagation();
        if (!user) return;
        
        try {
            unlockSharedNote(note.id, user.id);
            // Visual feedback handled by state update
        } catch (err: any) {
            alert(`⚠️ Lỗi: ${err.message}`);
        }
    };

    // --- NOTE INTERACTION LOGIC ---
    
    // 1. Capture Selection
    const handleTextSelect = () => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0 && noteContentRef.current && noteContentRef.current.contains(selection.anchorNode)) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            setHighlightedText(selection.toString());
            setSelectionRect({ 
                top: rect.top - 50, // Move it up a bit more
                left: rect.left + (rect.width / 2) // Center horizontally relative to selection
            });
        } else {
            setSelectionRect(null);
            setHighlightedText('');
        }
    };

    // 2. Submit Comment
    const handleSubmitComment = () => {
        if (!selectedNote || !user || !commentText.trim()) return;
        
        addNoteComment(selectedNote.id, user.id, commentText, highlightedText || undefined);
        
        setCommentText('');
        setHighlightedText('');
        setSelectionRect(null);
        
        // Remove text selection visually
        window.getSelection()?.removeAllRanges();
    };

    // REMOVED BLOCKING CHECK FOR FEATURE FLAG
    /*
    if (!isGroupChatEnabled) {
        return <div className="card p-8 text-center"><h2 className="text-xl font-bold text-yellow-400">Khu vực Hạm đội đang bảo trì.</h2></div>;
    }
    */

    if (!isGroupServiceOk) {
        return <div className="card p-8 text-center border border-yellow-700"><h2 className="text-xl font-bold text-yellow-400">Mất tín hiệu Hạm đội.</h2></div>;
    }
    
    // Get fresh comments for the selected note
    const activeNoteComments = selectedNote ? db.PERSONAL_NOTES[selectedNote.id]?.comments || [] : [];

    return (
        <div className="flex h-[calc(100vh-120px)] gap-6 relative">
            
            {/* LEFT PANEL: HANGAR BAY (List) */}
            <div className="w-1/3 min-w-[280px] flex flex-col gap-4">
                <div className="p-5 bg-black/30 backdrop-blur-xl border border-white/10 rounded-3xl shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
                    <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-2 relative z-10">
                        <span className="text-2xl">{isTeacher ? '👁️' : '🚀'}</span> {isTeacher ? 'Trạm Quan Sát' : 'Hangar Bay'}
                    </h2>
                    <p className="text-xs text-blue-300/70 mt-1 font-mono">
                        {isTeacher ? 'Giám sát hoạt động các Phi đội' : 'Chọn phi thuyền để tham chiến'}
                    </p>
                </div>

                {/* CREATE BUTTON (Student Only) */}
                {!isTeacher && (
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg border border-white/10 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] group"
                    >
                        <span className="text-xl group-hover:rotate-90 transition-transform">+</span> Triệu hồi Phi thuyền
                    </button>
                )}

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                    {groups.map(g => {
                        const stats = getSquadronStats(g.id);
                        const isSelected = selectedGroup?.id === g.id;
                        
                        // Teacher: Check for "High Chat / Low Progress" anomaly
                        const isAttentionNeeded = isTeacher && stats.activityScore > 70 && stats.progressScore < 30;

                        return (
                            <button 
                                key={g.id} 
                                onClick={() => setSelectedGroup(g)} 
                                className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-300 relative group overflow-hidden
                                ${isSelected 
                                    ? 'bg-blue-900/40 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)] scale-[1.02]' 
                                    : isAttentionNeeded 
                                        ? 'bg-red-900/20 border-red-500/50 animate-pulse-slow' 
                                        : 'bg-gray-800/40 border-white/5 hover:bg-white/5 hover:border-white/20'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2 relative z-10">
                                    <div>
                                        <p className={`font-bold text-lg flex items-center gap-2 ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                            {isAttentionNeeded && <span className="text-xl" title="Cần chú ý: Chat nhiều, học ít!">⚠️</span>}
                                            {g.name}
                                        </p>
                                        <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Class: {stats.shipClass}</p>
                                    </div>
                                    <span className="bg-black/50 text-xs font-bold px-2 py-1 rounded text-blue-300 border border-blue-500/30">
                                        LV.{stats.level}
                                    </span>
                                </div>
                                
                                {isTeacher ? (
                                    <div className="flex gap-2 mt-2 text-[10px] font-mono">
                                        <span className={`${stats.activityScore > 70 ? 'text-red-400' : 'text-green-400'}`}>Chat: {stats.activityScore}%</span>
                                        <span className="text-gray-600">|</span>
                                        <span className={`${stats.progressScore < 30 ? 'text-red-400' : 'text-green-400'}`}>Prog: {stats.progressScore}%</span>
                                    </div>
                                ) : (
                                    <div className="flex gap-1 mt-2 relative z-10 opacity-70">
                                        <div className="h-1 flex-1 bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{width: `${stats.shield}%`}}></div></div>
                                        <div className="h-1 flex-1 bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-orange-500" style={{width: `${stats.thruster}%`}}></div></div>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* RIGHT PANEL: COCKPIT */}
            <div className="w-2/3 flex flex-col bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none z-0"></div>

                {!selectedGroup ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 relative z-10">
                        <div className="w-40 h-40 border border-blue-500/20 rounded-full flex items-center justify-center animate-spin-slow">
                            <div className="w-32 h-32 border border-blue-500/40 rounded-full border-dashed animate-reverse-spin"></div>
                        </div>
                        <p className="mt-6 font-mono text-blue-300/60 tracking-widest text-sm">
                            {isTeacher ? 'MONITORING SYSTEM ONLINE...' : 'SYSTEM STANDBY...'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* COCKPIT HEADER */}
                        <div className="p-5 border-b border-white/10 bg-white/5 relative z-10 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-wide drop-shadow-md flex items-center gap-3">
                                    {selectedGroup.name}
                                    {squadronEnergy >= 100 && <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded font-bold animate-pulse">⚡ HYPERDRIVE</span>}
                                </h2>
                                <div className="flex items-center gap-4 mt-2 text-xs font-mono text-blue-300">
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> ONLINE: {selectedGroup.members.length}</span>
                                    <span>INTEL: {sharedNotes.length} DOCS</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                {userInGroup && (
                                    <>
                                        <button 
                                            onClick={handleArchiveSquadron}
                                            className="btn btn-sm bg-red-900/30 border border-red-500/50 text-red-200 hover:bg-red-700 hover:text-white flex items-center gap-2"
                                            title="Lưu trữ toàn bộ hoạt động nhóm"
                                        >
                                            <span>📜</span> Archive
                                        </button>
                                        <div className="flex bg-black/30 rounded-lg p-1 border border-white/10">
                                            <button onClick={() => setViewMode('chat')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'chat' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                                                COMMS
                                            </button>
                                            <button onClick={() => setViewMode('intel')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'intel' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                                                INTEL ({sharedNotes.length})
                                            </button>
                                        </div>
                                        {!isTeacher && (
                                            <button onClick={() => setIsShareModalOpen(true)} className="btn btn-sm bg-blue-500/20 text-blue-300 border border-blue-500/50 hover:bg-blue-500 hover:text-white flex items-center gap-2">
                                                <span>🔗</span> <span className="hidden sm:inline">Invite</span>
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* VIEW MODE: CHAT */}
                        {userInGroup && viewMode === 'chat' && (
                            <>
                                <div ref={chatContainerRef} className="flex-1 p-6 space-y-4 overflow-y-auto custom-scrollbar relative z-10">
                                    {chatHistory.map(msg => {
                                        const isMe = msg.user.id === user?.id;
                                        const isSystem = msg.user.id === 'system';
                                        
                                        // SOS Logic
                                        const isMsgSOS = msg.isSOS;
                                        const isPending = msg.sosStatus === 'PENDING';
                                        const isResolved = msg.sosStatus === 'RESOLVED';
                                        
                                        // Whisper Logic (Teacher)
                                        const isWhisperMsg = msg.isWhisper;

                                        if (isSystem) {
                                            return <div key={msg.id} className="flex justify-center my-2"><span className="px-3 py-1 bg-blue-900/30 border border-blue-500/30 rounded-full text-[10px] text-blue-300 font-mono tracking-wider uppercase">{msg.text}</span></div>;
                                        }

                                        return (
                                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                                                {!isMe && <div className="mr-3 flex flex-col items-center"><div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-600 flex items-center justify-center text-xs font-bold text-gray-400">{msg.user.name.charAt(0)}</div></div>}
                                                <div className={`max-w-[75%] relative ${isMsgSOS && isPending ? 'animate-shake' : ''} ${isWhisperMsg ? 'animate-pulse' : ''}`}>
                                                    <div className={`py-3 px-4 rounded-xl border backdrop-blur-md text-sm shadow-lg 
                                                        ${isMsgSOS 
                                                            ? 'bg-red-900/80 border-red-500 text-red-100 shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
                                                            : isWhisperMsg
                                                                ? 'bg-yellow-900/60 border-yellow-500 text-yellow-200 shadow-[0_0_20px_rgba(234,179,8,0.4)]'
                                                                : isMe 
                                                                    ? 'bg-blue-600/80 border-blue-400/50 text-white rounded-tr-none' 
                                                                    : 'bg-gray-800/80 border-gray-600/50 text-gray-200 rounded-tl-none'
                                                        }`}
                                                    >
                                                        
                                                        {isMsgSOS && (
                                                            <div className="flex justify-between items-center mb-2 pb-2 border-b border-white/20">
                                                                <div className="text-[10px] font-black text-white flex items-center gap-1">
                                                                    <span className={`w-2 h-2 rounded-full ${isResolved ? 'bg-green-400' : 'bg-red-400 animate-ping'}`}></span> 
                                                                    {isResolved ? 'ĐÃ GIẢI CỨU' : 'TÍN HIỆU CẤP CỨU'}
                                                                </div>
                                                                {isResolved && <span className="text-[9px] text-green-300 uppercase">Bởi {msg.rescuerName}</span>}
                                                            </div>
                                                        )}

                                                        {isWhisperMsg && (
                                                            <div className="flex items-center gap-2 mb-2 pb-1 border-b border-yellow-500/30 text-yellow-400 text-[10px] font-bold uppercase tracking-widest">
                                                                <span className="text-lg">👁️</span> The Teacher's Eye
                                                            </div>
                                                        )}

                                                        <p className="leading-relaxed">{msg.text}</p>
                                                        
                                                        {isMsgSOS && isPending && !isMe && (
                                                            <button 
                                                                onClick={() => handleOpenRescue(msg.id, msg.text)}
                                                                className="mt-3 w-full py-2 bg-white text-red-600 font-bold rounded-lg text-xs hover:bg-gray-100 flex items-center justify-center gap-2 animate-pulse"
                                                            >
                                                                🚑 GIẢI CỨU (Nhận Karma)
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className={`text-[9px] mt-1 opacity-50 font-mono ${isMe ? 'text-right text-blue-200' : 'text-left text-gray-400'}`}>{msg.user.role !== 'STUDENT' ? `★ ${msg.user.role} • ` : ''}{new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="p-4 bg-black/40 border-t border-white/10 relative z-20">
                                    <form onSubmit={handleSend} className="flex gap-3 items-end">
                                        
                                        {!isTeacher && (
                                            <button type="button" onClick={() => setIsSOS(!isSOS)} className={`h-12 px-4 rounded-xl border-2 font-bold transition-all flex items-center gap-2 ${isSOS ? 'bg-red-600 border-red-400 text-white shadow-[0_0_15px_rgba(220,38,38,0.6)] animate-pulse' : 'bg-gray-800 border-gray-600 text-gray-400 hover:text-red-400 hover:border-red-500'}`} title="Bật Tín hiệu Cấp cứu">🚨</button>
                                        )}
                                        
                                        {isTeacher && (
                                            <button 
                                                type="button" 
                                                onClick={() => setIsWhisper(!isWhisper)} 
                                                className={`h-12 px-4 rounded-xl border-2 font-bold transition-all flex items-center gap-2 ${isWhisper ? 'bg-yellow-600/80 border-yellow-400 text-white shadow-[0_0_15px_rgba(234,179,8,0.6)] animate-pulse' : 'bg-gray-800 border-gray-600 text-gray-400 hover:text-yellow-400 hover:border-yellow-500'}`} 
                                                title="Lời thì thầm (The Eye of Sauron)"
                                            >
                                                👁️
                                            </button>
                                        )}

                                        <div className="flex-1 relative">
                                            <input 
                                                type="text" 
                                                className={`w-full bg-gray-900/80 border-2 text-white rounded-xl px-4 py-3 focus:outline-none focus:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all placeholder-gray-500 
                                                    ${isSOS ? 'border-red-500 focus:ring-red-500 placeholder-red-300/50' : 
                                                      isWhisper ? 'border-yellow-500 focus:ring-yellow-500 placeholder-yellow-300/50 text-yellow-200' :
                                                      'border-gray-600 focus:border-blue-500'}`} 
                                                placeholder={isSOS ? "Mô tả vấn đề khẩn cấp..." : isWhisper ? "Nhập lời nhắc nhở..." : "Nhập tín hiệu..."} 
                                                value={message} 
                                                onChange={(e) => setMessage(e.target.value)} 
                                            />
                                        </div>
                                        <button 
                                            type="submit" 
                                            className={`h-12 w-16 flex items-center justify-center rounded-xl font-bold transition-all shadow-lg 
                                                ${isSOS ? 'bg-red-600 hover:bg-red-500 text-white' : 
                                                  isWhisper ? 'bg-yellow-600 hover:bg-yellow-500 text-black border border-yellow-400' : 
                                                  'bg-blue-600 hover:bg-blue-500 text-white'}`} 
                                            disabled={!message.trim()}
                                        >
                                            SEND
                                        </button>
                                    </form>
                                </div>
                            </>
                        )}

                        {/* VIEW MODE: INTEL (Data Heist) */}
                        {userInGroup && viewMode === 'intel' && (
                            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-min">
                                {sharedNotes.length === 0 ? (
                                    <div className="col-span-2 text-center text-gray-500 mt-20">
                                        <p className="text-4xl mb-2">📁</p>
                                        <p>Kho dữ liệu trống.</p>
                                        <p className="text-xs text-gray-600 mt-1">Chia sẻ ghi chú từ Sổ Tay để đồng đội cùng xem.</p>
                                    </div>
                                ) : sharedNotes.map(note => {
                                    const isOwner = note.userId === user?.id;
                                    // Teacher can always see content
                                    const isUnlocked = isOwner || isTeacher || note.unlockedBy?.includes(user!.id);

                                    return (
                                        <div 
                                            key={note.id} 
                                            onClick={() => isUnlocked && setSelectedNote(note)}
                                            className={`rounded-xl p-4 transition-all group relative overflow-hidden flex flex-col h-full
                                                ${isUnlocked 
                                                    ? 'bg-green-900/10 border border-green-500/30 cursor-pointer hover:bg-green-900/30 hover:border-green-400 hover:shadow-[0_0_15px_rgba(34,197,94,0.2)]' 
                                                    : 'bg-black/40 border border-gray-700 cursor-default'
                                                }`}
                                        >
                                            {/* Locked Overlay */}
                                            {!isUnlocked && (
                                                <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-20 flex flex-col items-center justify-center p-4 text-center">
                                                    <div className="text-3xl mb-2">🔒</div>
                                                    <p className="text-gray-300 font-bold text-sm mb-1">TÀI LIỆU MẬT</p>
                                                    <p className="text-gray-500 text-xs mb-3">Cần giải mã để xem</p>
                                                    <button 
                                                        onClick={(e) => handleUnlockIntel(e, note)}
                                                        className="btn btn-sm bg-yellow-600/20 text-yellow-400 border border-yellow-500 hover:bg-yellow-500 hover:text-black font-bold animate-pulse"
                                                    >
                                                        🔓 Giải mã (-5 XP)
                                                    </button>
                                                </div>
                                            )}

                                            <div className="flex justify-between items-start mb-2 relative z-10">
                                                <h3 className={`font-bold truncate pr-2 ${isUnlocked ? 'text-green-100' : 'text-gray-500 blur-[2px]'}`}>
                                                    {isUnlocked ? note.title : '••••••••••••'}
                                                </h3>
                                                <div className="opacity-50 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-xl">📄</span>
                                                </div>
                                            </div>
                                            
                                            <p className={`text-xs mt-auto font-mono mb-2 ${isUnlocked ? 'text-green-300/60' : 'text-gray-600'}`}>
                                                Author: {db.USERS[note.userId]?.name || note.userId}
                                            </p>
                                            
                                            <div className="h-px bg-white/10 w-full mb-2"></div>
                                            
                                            <p className={`text-xs leading-relaxed line-clamp-3 ${isUnlocked ? 'text-gray-400' : 'text-gray-600 blur-[3px]'}`}>
                                                {isUnlocked ? note.content : 'This is classified content. Unlock to view details.'}
                                            </p>
                                            
                                            {isUnlocked && (
                                                <div className="flex justify-end mt-2">
                                                    <span className="text-[10px] text-green-400 flex items-center gap-1">
                                                        <span>💬</span> {(note.comments || []).length}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* PREVIEW CARD IF NOT JOINED */}
                        {!userInGroup && (
                            <div className="p-6 bg-black/40 border-t border-white/10 text-center z-20 backdrop-blur-md">
                                <p className="text-gray-400 mb-4 font-mono text-sm">BẠN CHƯA CÓ QUYỀN TRUY CẬP TÀU NÀY.</p>
                                <button onClick={handleJoin} className="btn btn-primary px-8 py-3 text-lg shadow-[0_0_20px_rgba(37,99,235,0.5)] animate-pulse">🚀 Yêu cầu Lên Tàu (Join)</button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* UPGRADED SHARED NOTE READER MODAL */}
            {selectedNote && (
                <Modal isOpen={!!selectedNote} onClose={() => { setSelectedNote(null); setSelectionRect(null); }} title={`Dữ liệu chia sẻ: ${selectedNote.title}`} size="xl">
                    <div className="flex flex-col h-[70vh]">
                        {/* Header Info */}
                        <div className="flex items-center justify-between text-xs text-gray-500 border-b border-gray-700 pb-2 mb-2">
                            <span>Author: {db.USERS[selectedNote.userId]?.name}</span>
                            <span>{new Date(selectedNote.updatedAt).toLocaleString()}</span>
                        </div>

                        {/* Content Area - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-900 rounded-lg relative custom-scrollbar" onMouseUp={handleTextSelect}>
                            <div 
                                ref={noteContentRef}
                                className="whitespace-pre-wrap text-gray-300 leading-relaxed font-mono text-sm selection:bg-green-500 selection:text-black"
                            >
                                {selectedNote.content}
                            </div>

                            {/* Floating Comment Button (Tooltip) */}
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
                                    {/* Arrow */}
                                    <div className="w-3 h-3 bg-black border-b border-r border-green-500 transform rotate-45 -mt-1.5"></div>
                                </div>
                            )}
                        </div>

                        {/* Comments Section */}
                        <div className="mt-4 border-t border-gray-700 pt-4 max-h-[200px] overflow-y-auto">
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Thảo luận ({activeNoteComments.length})</h4>
                            <div className="space-y-3">
                                {activeNoteComments.map(cmt => (
                                    <div key={cmt.id} className="bg-white/5 p-3 rounded-lg text-sm border border-white/5">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-blue-300 text-xs">{cmt.userName}</span>
                                            <span className="text-[10px] text-gray-600">{new Date(cmt.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                        {cmt.highlightedText && (
                                            <div className="mb-2 pl-2 border-l-2 border-green-500 text-xs text-gray-500 italic truncate">
                                                "{cmt.highlightedText}"
                                            </div>
                                        )}
                                        <p className="text-gray-300">{cmt.content}</p>
                                    </div>
                                ))}
                                {activeNoteComments.length === 0 && <p className="text-gray-600 text-xs italic">Chưa có bình luận nào. Hãy bôi đen văn bản để bắt đầu!</p>}
                            </div>
                        </div>

                        <div className="flex justify-end pt-2 mt-2 border-t border-gray-700">
                            <button onClick={() => { setSelectedNote(null); setSelectionRect(null); }} className="btn btn-secondary">Đóng</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* RESCUE MODAL */}
            <Modal isOpen={!!rescueTarget} onClose={() => setRescueTarget(null)} title="🚑 Trạm Cấp Cứu Liên Quân">
                <div className="space-y-4">
                    <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
                        <p className="text-xs text-red-300 uppercase font-bold mb-1">Vấn đề cần giải cứu:</p>
                        <p className="text-white italic">"{rescueTarget?.text}"</p>
                    </div>
                    
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">Lời giải thích của bạn:</label>
                        <textarea 
                            className="form-textarea w-full h-32 bg-gray-900 border-gray-700" 
                            placeholder="Giải thích chi tiết để giúp đồng đội..."
                            value={rescueInput}
                            onChange={(e) => setRescueInput(e.target.value)}
                        />
                    </div>

                    {rescueError && <p className="text-red-400 text-sm bg-red-900/20 p-2 rounded">{rescueError}</p>}

                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setRescueTarget(null)} className="btn btn-secondary text-sm">Hủy</button>
                        <button 
                            onClick={handleSubmitRescue} 
                            disabled={!rescueInput.trim() || isEvaluatingRescue}
                            className="btn btn-primary text-sm flex items-center gap-2"
                        >
                            {isEvaluatingRescue ? <LoadingSpinner size={4} /> : '🚀 Gửi Giải Pháp (AI Check)'}
                        </button>
                    </div>
                </div>
            </Modal>

            <LegacyArchiveModal 
                isOpen={isArchiveModalOpen}
                onClose={() => setIsArchiveModalOpen(false)}
                content={archiveContent}
                title={selectedGroup?.name || "Squadron"}
                isGenerating={isArchiving}
            />

            {/* Other Modals (Create/Share) - Kept simplified for brevity */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Triệu hồi Phi thuyền Mới">
                <form onSubmit={handleCreateGroup} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Tên Phi thuyền</label>
                        <input type="text" className="form-input w-full" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} autoFocus />
                    </div>
                    <div className="flex justify-end pt-2"><button type="submit" className="btn btn-primary" disabled={!newGroupName.trim()}>🚀 Khởi tạo</button></div>
                </form>
            </Modal>
            <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="Chia sẻ Tọa độ">
                <div className="space-y-2 max-h-80 overflow-y-auto">
                    {contacts.map(c => (
                        <button key={c.id} onClick={() => handleShareToContact(c.id)} className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 flex justify-between items-center text-left">
                            <span className="text-gray-200 text-sm font-bold">{c.name}</span>
                            <span className="text-blue-400 text-xs">Gửi 📡</span>
                        </button>
                    ))}
                </div>
            </Modal>
        </div>
    );
};
export default GroupChatPage;
