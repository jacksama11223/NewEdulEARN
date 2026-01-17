
import React, { useState, useContext, useMemo, useCallback } from 'react';
import { AuthContext, DataContext, GlobalStateContext, PageContext, PetContext } from '../../contexts/AppProviders';
import { callGeminiApiWithSchema } from '../../services/geminiService';
import LoadingSpinner from '../common/LoadingSpinner';
import FlashcardModal from '../modals/FlashcardModal'; // Import Flashcard Modal
import type { Assignment, LearningPath, QuizQuestion, LearningNode, FlashcardDeck } from '../../types';

// --- HELPER: RANK LOGIC ---
const getQuestRank = (asg: Assignment) => {
    // If explicitly set (e.g. from Commander Challenge), use it
    if (asg.rank) return asg.rank;
    
    if (asg.type === 'quiz') {
        return Math.random() > 0.5 ? 'S' : 'A';
    }
    return 'B';
};

const getRankColor = (rank: string, isBoss: boolean = false) => {
    if (isBoss) return 'border-red-600 shadow-[0_0_25px_rgba(220,38,38,0.6)] bg-gradient-to-br from-red-900/40 to-black';
    switch (rank) {
        case 'S': return 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)] bg-yellow-900/20';
        case 'A': return 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)] bg-purple-900/20';
        case 'B': return 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)] bg-blue-900/20';
        default: return 'border-gray-600 bg-gray-800/50';
    }
};

const getRankBadge = (rank: string, isBoss: boolean = false) => {
    if (isBoss) return { label: '👹 BOSS RAID', color: 'text-white bg-red-600 border-red-500 animate-pulse' };
    switch (rank) {
        case 'S': return { label: 'LEGENDARY', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400' };
        case 'A': return { label: 'EPIC', color: 'text-purple-400 bg-purple-400/10 border-purple-400' };
        case 'B': return { label: 'RARE', color: 'text-blue-400 bg-blue-400/10 border-blue-400' };
        default: return { label: 'COMMON', color: 'text-gray-400 bg-gray-400/10 border-gray-400' };
    }
};

// ... WeeklyChest & DailyQuestWidget & AiCommander components remain same ...
const WeeklyChest: React.FC<{ activeDays: number }> = ({ activeDays }) => {
    return (
        <div className="card p-4 bg-gradient-to-r from-gray-900 to-slate-900 border border-gray-700 relative overflow-hidden">
            <div className="flex justify-between items-center mb-2 relative z-10">
                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Tiến độ Tuần</h3>
                <span className="text-xs text-yellow-400 font-mono">{activeDays}/7 Ngày</span>
            </div>
            <div className="flex justify-between items-center relative z-10">
                {[1, 2, 3, 4, 5, 6, 7].map(day => (
                    <div key={day} className="flex flex-col items-center gap-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                            day <= activeDays 
                            ? 'bg-green-500 border-green-400 text-white shadow-[0_0_10px_rgba(34,197,94,0.6)]' 
                            : 'bg-gray-800 border-gray-600 text-gray-600'
                        }`}>
                            {day <= activeDays ? '✓' : day}
                        </div>
                    </div>
                ))}
                <div className="ml-2 animate-bounce-subtle cursor-pointer group">
                    <div className={`text-4xl filter drop-shadow-lg transition-transform group-hover:scale-110 ${activeDays >= 7 ? 'grayscale-0' : 'grayscale opacity-50'}`}>
                        🎁
                    </div>
                </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl -z-0"></div>
        </div>
    );
};

const DailyQuestWidget = () => {
    const { db } = useContext(DataContext)!;
    const { navigate } = useContext(PageContext)!;
    const { user } = useContext(AuthContext)!;

    const staticQuests = [
        { id: 'q1', title: 'Đăng nhập trước 9h', reward: '10 XP', done: true, action: null },
    ];

    const repairQuests = useMemo(() => {
        const quests: any[] = [];
        const now = Date.now();

        if (user) {
            Object.values(db.LEARNING_PATHS || {}).forEach((path: LearningPath) => {
                if (path.creatorId !== user.id) return;

                path.nodes.forEach((node: LearningNode) => {
                    if (node.isCompleted && node.flashcards) {
                        const dueCards = node.flashcards.filter(card => card.nextReview && card.nextReview < now);
                        if (dueCards.length > 0) {
                            quests.push({
                                id: `repair_${node.id}`,
                                title: `Sửa chữa "${node.title}"`,
                                sub: `${dueCards.length} kiến thức đang bị rỉ sét!`,
                                reward: `${dueCards.length * 5} XP`,
                                done: false,
                                isRepair: true,
                                pathId: path.id,
                                nodeId: node.id
                            });
                        }
                    }
                });
            });
        }
        return quests.slice(0, 2);
    }, [db.LEARNING_PATHS, user]);

    const allQuests = [...staticQuests, ...repairQuests];

    const handleQuestClick = (q: any) => {
        if (q.isRepair) {
            navigate('learning_node_study', { pathId: q.pathId, nodeId: q.nodeId, mode: 'repair' });
        }
    };

    return (
        <div className="card p-4 bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/30">
            <h3 className="text-xs font-bold text-indigo-300 uppercase mb-3 flex items-center gap-2">
                <span>📅</span> Nhiệm vụ & Ôn tập
            </h3>
            <div className="space-y-2">
                {allQuests.map(q => (
                    <div 
                        key={q.id} 
                        onClick={() => !q.done && handleQuestClick(q)}
                        className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                            q.done ? 'bg-black/20 border-white/5 cursor-default' : 
                            q.isRepair ? 'bg-orange-900/20 border-orange-500/50 cursor-pointer hover:bg-orange-900/40 animate-pulse-slow' :
                            'bg-black/20 border-white/5 cursor-default'
                        }`}
                    >
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${q.done ? 'bg-green-500 border-green-500' : q.isRepair ? 'bg-orange-500 border-orange-400 text-black font-bold text-[10px]' : 'border-gray-500'}`}>
                                {q.done ? <span className="text-[10px] text-white">✓</span> : q.isRepair ? '!' : ''}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <span className={`text-sm truncate ${q.done ? 'text-gray-500 line-through' : q.isRepair ? 'text-orange-200 font-bold' : 'text-gray-200'}`}>
                                    {q.title}
                                </span>
                                {q.sub && <span className="text-[10px] text-orange-400/80 italic truncate">{q.sub}</span>}
                            </div>
                        </div>
                        <span className={`text-xs font-bold flex-shrink-0 ${q.isRepair ? 'text-orange-400' : 'text-yellow-400'}`}>{q.reward}</span>
                    </div>
                ))}
                {allQuests.length === 0 && <p className="text-gray-500 text-xs italic text-center">Tất cả nhiệm vụ đã hoàn thành.</p>}
            </div>
        </div>
    );
};

const AiCommander: React.FC<{ recommendedTask: any, onClick: () => void }> = ({ recommendedTask, onClick }) => {
    if (!recommendedTask) return (
        <div className="card p-6 flex items-center gap-4 border-blue-500/30 bg-blue-900/10">
            <div className="text-4xl">😴</div>
            <div>
                <h3 className="font-bold text-blue-200">Không có nhiệm vụ!</h3>
                <p className="text-sm text-gray-400">Bạn đã hoàn thành xuất sắc mọi thứ.</p>
            </div>
        </div>
    );

    return (
        <div className="card p-0 border-indigo-500/50 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 z-0"></div>
            <div className="p-6 relative z-10 flex flex-col md:flex-row items-center gap-6">
                <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 p-[2px] animate-spin-slow">
                        <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                            <span className="text-4xl animate-pulse">🤖</span>
                        </div>
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-900">COMMANDER</div>
                </div>
                
                <div className="flex-1 text-center md:text-left">
                    <h3 className="text-indigo-300 text-xs font-bold tracking-[0.2em] uppercase mb-1">Nhiệm vụ Ưu tiên</h3>
                    <p className="text-xl font-bold text-white mb-2">"{recommendedTask.title}"</p>
                    <p className="text-sm text-gray-300">Phát hiện nhiệm vụ Rank <span className="text-yellow-400 font-bold">{getQuestRank(recommendedTask)}</span> chưa hoàn thành. Hãy xử lý ngay để nhận thưởng!</p>
                </div>

                <button onClick={onClick} className="btn btn-primary bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)] whitespace-nowrap animate-pulse">
                    ⚔️ Chấp nhận
                </button>
            </div>
        </div>
    );
};

const AssignmentHubPage: React.FC = () => {
    const { user } = useContext(AuthContext)!;
    const { db, addTask, deleteFlashcardDeck, renameFlashcardDeck } = useContext(DataContext)!; 
    const { navigate, params } = useContext(PageContext)!; 
    const { serviceStatus } = useContext(GlobalStateContext)!;
    const { triggerReaction } = useContext(PetContext)!;
    
    // UPDATED: Added 'decks' to tab state
    const [tab, setTab] = useState<'quests' | 'paths' | 'decks' | 'manage' | 'create'>('quests'); 
    const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null); // For Deck Modal
    
    const isStudentServiceOk = serviceStatus.assessment_taking === 'OPERATIONAL';
    const isTeacherGradingOk = serviceStatus.grading_service === 'OPERATIONAL';

    const filterCourseId = params?.filterCourseId;
    const filteredCourseName = filterCourseId ? db.COURSES.find(c => c.id === filterCourseId)?.name : null;

    React.useEffect(() => {
        if (user?.role === 'TEACHER' && tab === 'quests') setTab('manage');
        if (user?.role === 'STUDENT' && (tab === 'manage' || tab === 'create')) setTab('quests');
    }, [user?.role]);

    const { allAssignments, studentTodo, studentDone, learningPaths, allDecks } = useMemo(() => {
        const assignments = Object.values(db.ASSIGNMENTS) as Assignment[];
        const allPaths = Object.values(db.LEARNING_PATHS || {}) as LearningPath[];
        const paths = user ? allPaths.filter(p => p.creatorId === user.id) : [];
        const decks = Object.values(db.FLASHCARD_DECKS) as FlashcardDeck[]; // Get All Decks

        let todo: any[] = [];
        let done: any[] = [];
        if (user?.role === 'STUDENT') {
            assignments.forEach(asg => {
                if (filterCourseId && asg.courseId !== filterCourseId) return;

                let sub: any;
                let isDone = false;
                if (asg.type === 'file') {
                    sub = db.FILE_SUBMISSIONS[asg.id]?.find(s => s.studentId === user.id);
                    // UPDATED LOGIC: Anything that is NOT 'Chưa nộp' is considered done (Submitted or Graded)
                    isDone = sub && sub.status !== 'Chưa nộp';
                } else if (asg.type === 'quiz' && asg.quizId) {
                    sub = db.QUIZ_SUBMISSIONS[asg.quizId]?.[user.id];
                    isDone = !!sub;
                }
                const item = { ...asg, sub, rank: getQuestRank(asg) };
                if (isDone) done.push(item);
                else todo.push(item);
            });
        }
        
        todo.sort((a, b) => a.rank.localeCompare(b.rank));

        return { allAssignments: assignments, studentTodo: todo, studentDone: done, learningPaths: paths, allDecks: decks };
    }, [db.ASSIGNMENTS, db.FILE_SUBMISSIONS, db.QUIZ_SUBMISSIONS, db.LEARNING_PATHS, db.FLASHCARD_DECKS, user, filterCourseId]);

    const handleOpenPath = (pathId: string) => {
        navigate('learning_path_detail', { pathId });
    };

    const handleAddToTasks = useCallback((asg: any) => {
        if (user) {
            addTask(user.id, `Hoàn thành: ${asg.title}`);
            alert("Đã ghim vào danh sách Task của bạn!");
        }
    }, [user, addTask]);

    const handleAskStrategy = useCallback((asg: any) => {
        navigate('gemini_student', {
            initialPrompt: `Tôi chuẩn bị làm nhiệm vụ: "${asg.title}". Độ khó: ${asg.rank}. Hãy vạch cho tôi một kế hoạch hành động từng bước (Step-by-step) để hoàn thành nó một cách xuất sắc nhất.`,
            autoPersona: 'commander',
            autoThinking: true
        });
    }, [navigate]);

    const handleClearFilter = () => {
        navigate('assignment_hub', {}); 
    };

    // --- DECK MANAGEMENT ---
    const handleDeleteDeck = (e: React.MouseEvent, deckId: string) => {
        e.stopPropagation();
        if (confirm("Bạn chắc chắn muốn xóa bộ thẻ này? Hành động không thể hoàn tác.")) {
            deleteFlashcardDeck(deckId);
        }
    };

    const handleRenameDeck = (e: React.MouseEvent, deck: FlashcardDeck) => {
        e.stopPropagation();
        const newName = prompt("Nhập tên mới cho bộ thẻ:", deck.title);
        if (newName && newName.trim()) {
            renameFlashcardDeck(deck.id, newName);
        }
    };

    const renderQuestCard = useCallback((asg: any, isDone: boolean) => {
        // ... (Keep existing implementation of renderQuestCard)
        const isBoss = !!asg.isBoss;
        const rankColor = getRankColor(asg.rank, isBoss);
        const badge = getRankBadge(asg.rank, isBoss);
        const xpReward = asg.rewardXP || (asg.rank === 'S' ? 500 : asg.rank === 'A' ? 300 : 100);
        const isNew = asg.createdAt && (new Date().getTime() - new Date(asg.createdAt).getTime()) < 24 * 60 * 60 * 1000;
        const isTeacher = user?.role === 'TEACHER';
        const quizData = asg.quizId ? db.QUIZZES[asg.quizId] : null;
        const hasContent = quizData && quizData.questions && quizData.questions.length > 0;
        const isActionDisabled = isTeacher ? !isTeacherGradingOk : !isStudentServiceOk;

        return (
            <div 
                key={asg.id} 
                className={`card p-0 flex flex-col border-2 transition-all duration-300 group hover:-translate-y-2 hover:shadow-2xl ${rankColor} ${isDone ? 'opacity-60 grayscale' : ''} ${isBoss ? 'scale-[1.02]' : ''}`}
                onMouseEnter={() => triggerReaction(isBoss ? 'hover_scared' : 'hover_game')}
            >
                <div className="p-4 border-b border-white/5 flex justify-between items-start">
                    <div className="flex gap-2 items-center">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${badge.color}`}>
                            {badge.label}
                        </span>
                        {isNew && !isDone && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-600 text-white animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.5)]">NEW</span>
                        )}
                        {isTeacher && asg.type === 'quiz' && (
                            hasContent 
                            ? <span className="text-[10px] bg-green-900/50 text-green-300 px-2 py-0.5 rounded border border-green-500/30">✅ Ready</span>
                            : <span className="text-[10px] bg-red-900/50 text-red-300 px-2 py-0.5 rounded border border-red-500/30 animate-pulse">⚠️ Empty</span>
                        )}
                    </div>
                    <span className="text-xs font-bold text-blue-300 bg-blue-900/30 px-2 py-1 rounded">
                        {db.COURSES.find(c => c.id === asg.courseId)?.name || asg.courseId}
                    </span>
                </div>
                <div className="p-6 flex-1 relative overflow-hidden">
                    {isBoss && <div className="absolute -right-4 -bottom-4 text-8xl opacity-20 rotate-12 pointer-events-none animate-pulse">👹</div>}
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-200 transition-colors line-clamp-2">{asg.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span>{asg.type === 'quiz' ? '⚡ Trắc nghiệm' : '📄 Nộp File'}</span>
                        <span>•</span>
                        <span className="text-yellow-400 font-bold">+{xpReward} XP</span>
                    </div>
                    {asg.description && <p className="text-xs text-gray-400 mt-2 line-clamp-2 italic">{asg.description}</p>}
                    {isBoss && <p className="text-xs text-red-400 font-bold mt-2 animate-pulse bg-red-900/20 px-2 py-1 rounded inline-block border border-red-500/30">⚠️ MỤC TIÊU NGUY HIỂM</p>}
                </div>
                <div className={`p-4 bg-black/20 flex relative z-10 gap-2 ${isTeacher ? 'flex-row' : 'justify-between items-center'}`}>
                    {!isTeacher && !isDone && (
                        <div className="flex gap-2 w-full">
                            <button onClick={() => handleAskStrategy(asg)} className="btn btn-sm bg-purple-900/50 border border-purple-500/30 text-purple-200 hover:bg-purple-700/50 text-xs px-2 flex-1">🧠 Xin Chiến Thuật</button>
                            <button onClick={() => handleAddToTasks(asg)} className="btn btn-sm btn-secondary text-xs px-2">📌 Ghim</button>
                        </div>
                    )}
                    {isTeacher ? (
                        <>
                            {asg.type === 'quiz' && !hasContent ? (
                                <button onClick={(e) => { e.stopPropagation(); navigate('assignment_viewer', { assignmentId: asg.id }); }} className="btn btn-sm btn-primary text-xs px-4 py-2 w-full animate-pulse shadow-lg bg-indigo-600 hover:bg-indigo-500">✨ Tạo Câu Hỏi (AI)</button>
                            ) : (
                                <>
                                    <button onClick={(e) => { e.stopPropagation(); navigate('gradebook', { assignmentId: asg.id }); }} className="btn btn-sm btn-primary text-xs px-4 py-2 flex-1 shadow-lg" disabled={isActionDisabled}>📝 Chấm điểm</button>
                                    <button onClick={(e) => { e.stopPropagation(); navigate('assignment_creator', { mode: 'edit', assignmentId: asg.id }); }} className="btn btn-sm btn-secondary text-xs px-3 py-2 border-white/20">✏️</button>
                                </>
                            )}
                        </>
                    ) : (
                        <button onClick={(e) => { e.stopPropagation(); navigate('assignment_viewer', { assignmentId: asg.id }); }} className={`btn btn-sm text-xs px-4 py-2 rounded-lg shadow-lg flex-1 w-full ${isDone ? 'btn-secondary' : 'btn-primary'}`} disabled={isActionDisabled} title={isActionDisabled ? "Dịch vụ liên quan đang bảo trì" : ""}>{isDone ? 'Xem lại' : (isBoss ? '🔥 RAID NGAY' : '⚔️ Chiến ngay')}</button>
                    )}
                </div>
            </div>
        );
    }, [db.COURSES, db.QUIZZES, user?.role, navigate, isStudentServiceOk, isTeacherGradingOk, handleAddToTasks, handleAskStrategy]);

    const NavButton = ({ id, label, icon, count }: { id: string, label: string, icon: string, count?: number }) => (
        <button 
            onClick={() => setTab(id as any)} 
            className={`relative px-6 py-3 rounded-full font-bold text-sm transition-all duration-300 flex items-center gap-2 ${
                tab === id 
                ? 'text-white shadow-[0_0_20px_rgba(56,189,248,0.5)] bg-gradient-to-r from-blue-600 to-purple-600 scale-105 ring-2 ring-white/20' 
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
        >
            <span>{icon}</span> {label} 
            {count !== undefined && <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${tab === id ? 'bg-white/20 text-white' : 'bg-gray-800 text-gray-500'}`}>{count}</span>}
        </button>
    );

    return (
        <div className="space-y-8 pb-20 relative">
            <h1 
                className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-purple-300 filter drop-shadow-lg uppercase tracking-tight"
                onMouseEnter={() => triggerReaction('hover_magic')}
            >
                {user?.role === 'TEACHER' ? 'Trung Tâm Quản Lý' : 'Hội Quán Nhiệm Vụ'}
            </h1>

            {filterCourseId && (
                <div className="bg-yellow-900/30 border border-yellow-500/50 p-4 rounded-xl flex justify-between items-center animate-pop-in">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl animate-pulse">🔋</span>
                        <div>
                            <p className="text-yellow-300 font-bold uppercase tracking-wider">Nạp Năng Lượng Khẩn Cấp</p>
                            <p className="text-gray-300 text-sm">Đang lọc bài tập môn: <span className="font-bold text-white">{filteredCourseName || filterCourseId}</span></p>
                        </div>
                    </div>
                    <button onClick={handleClearFilter} className="text-xs text-yellow-400 hover:text-white underline">
                        Xóa lọc (Xem tất cả)
                    </button>
                </div>
            )}

            {user?.role === 'STUDENT' && !filterCourseId && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up">
                    <div className="lg:col-span-2">
                        <AiCommander 
                            recommendedTask={studentTodo[0]} 
                            onClick={() => studentTodo[0] && navigate('assignment_viewer', { assignmentId: studentTodo[0].id })} 
                        />
                    </div>
                    <div className="lg:col-span-1">
                        <DailyQuestWidget />
                    </div>
                    <div className="lg:col-span-1">
                        <WeeklyChest activeDays={4} />
                    </div>
                </div>
            )}

            <div className="flex flex-wrap gap-3 p-2 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 w-fit shadow-2xl sticky top-24 z-30 mx-auto">
                {user?.role === 'TEACHER' ? (
                    <>
                        <NavButton id="manage" label="Quản lý Bài tập" icon="📋" count={allAssignments.length} />
                        <NavButton id="create" label="Tạo mới" icon="✨" />
                    </>
                ) : (
                    <NavButton id="quests" label="Bảng Nhiệm vụ" icon="📜" count={studentTodo.length} />
                )}
                <NavButton id="paths" label="Bản đồ Lộ trình" icon="🗺️" count={learningPaths.length} />
                <NavButton id="decks" label="Kho Thẻ (Inbox)" icon="🃏" count={allDecks.length} /> {/* NEW TAB */}
            </div>

            <div className="animate-fade-in-up">
                
                {user?.role === 'STUDENT' && tab === 'quests' && (
                    <div className="space-y-12">
                        {studentTodo.length > 0 && (
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                                    <span className="text-yellow-400">⚠️</span> Nhiệm vụ Cần làm
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {studentTodo.map(asg => renderQuestCard(asg, false))}
                                </div>
                            </div>
                        )}
                        {studentDone.length > 0 && (
                            <div className="opacity-80">
                                <h2 className="text-2xl font-bold text-gray-400 mb-6 flex items-center gap-2">
                                    <span>✅</span> Lịch sử Hoàn thành
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {studentDone.map(asg => renderQuestCard(asg, true))}
                                </div>
                            </div>
                        )}
                        {studentTodo.length === 0 && studentDone.length === 0 && (
                            <div className="text-center p-12 border-2 border-dashed border-gray-700 rounded-3xl">
                                <div className="text-6xl mb-4">zzz</div>
                                <p className="text-gray-500">Chưa có nhiệm vụ nào được giao.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* NEW DECKS TAB */}
                {tab === 'decks' && (
                    <div className="space-y-8">
                        <div className="flex justify-between items-center bg-white/5 p-6 rounded-3xl border border-white/10">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Kho Thẻ Ghi Nhớ</h2>
                                <p className="text-gray-400 text-sm">Tất cả các bộ Flashcard bạn đã tạo hoặc được giao.</p>
                            </div>
                            <button onClick={() => navigate('notebook')} className="btn btn-secondary bg-purple-900/30 text-purple-300 border-purple-500/30 hover:bg-purple-900/50">
                                + Tạo từ Sổ Tay
                            </button>
                        </div>

                        {allDecks.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {allDecks.map(deck => (
                                    <div 
                                        key={deck.id} 
                                        onClick={() => setSelectedDeck(deck)}
                                        className="card p-6 cursor-pointer hover:-translate-y-2 hover:shadow-2xl transition-all border-purple-500/30 group bg-gray-900/50 relative"
                                    >
                                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={(e) => handleRenameDeck(e, deck)}
                                                className="p-1.5 bg-gray-700 hover:bg-blue-600 rounded-full text-white shadow"
                                                title="Đổi tên"
                                            >
                                                ✎
                                            </button>
                                            <button 
                                                onClick={(e) => handleDeleteDeck(e, deck.id)}
                                                className="p-1.5 bg-gray-700 hover:bg-red-600 rounded-full text-white shadow"
                                                title="Xóa bộ thẻ"
                                            >
                                                🗑️
                                            </button>
                                        </div>

                                        <div className="flex justify-between items-start mb-4">
                                            <div className="text-4xl group-hover:scale-110 transition-transform">🗂️</div>
                                            <span className="text-xs bg-purple-900 text-purple-200 px-2 py-1 rounded font-bold">
                                                {deck.cards.length} Thẻ
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">{deck.title}</h3>
                                        <p className="text-xs text-gray-400 font-mono">ID: {deck.id}</p>
                                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
                                            <span className="text-xs text-purple-400 font-bold group-hover:underline">Ôn tập ngay &rarr;</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 text-gray-500">
                                <p>Chưa có bộ thẻ nào.</p>
                            </div>
                        )}
                    </div>
                )}

                {user?.role === 'TEACHER' && tab === 'manage' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {allAssignments.length > 0 ? allAssignments.map(asg => renderQuestCard({...asg, rank: asg.rank || 'B'}, false)) : <p className="text-gray-400 italic col-span-full text-center">Chưa có bài tập nào.</p>}
                    </div>
                )}

                {user?.role === 'TEACHER' && tab === 'create' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <button onClick={() => navigate('assignment_creator', { type: 'file' })} className="card p-8 text-center hover:bg-white/5 hover:scale-105 transition-all group border-blue-500/30">
                            <div className="text-6xl mb-4 group-hover:rotate-12 transition-transform">📄</div>
                            <h2 className="text-2xl font-bold text-white">Nộp File</h2>
                            <p className="text-gray-400 mt-2">Sinh viên nộp tài liệu văn bản.</p>
                        </button>
                        <button onClick={() => navigate('assignment_creator', { type: 'quiz' })} className="card p-8 text-center hover:bg-white/5 hover:scale-105 transition-all group border-purple-500/30">
                            <div className="text-6xl mb-4 group-hover:rotate-12 transition-transform">⚡</div>
                            <h2 className="text-2xl font-bold text-white">Quiz AI</h2>
                            <p className="text-gray-400 mt-2">Trắc nghiệm chấm điểm tự động.</p>
                        </button>
                        <button onClick={() => navigate('learning_path_creator')} className="card p-8 text-center hover:bg-white/5 hover:scale-105 transition-all group border-green-500/30 bg-green-900/10">
                            <div className="text-6xl mb-4 group-hover:rotate-12 transition-transform">🌳</div>
                            <h2 className="text-2xl font-bold text-green-400">Lộ trình Cây</h2>
                            <p className="text-gray-400 mt-2">Tạo bản đồ học tập gamification.</p>
                        </button>
                    </div>
                )}

                {tab === 'paths' && (
                    <div className="space-y-8">
                        <div className="flex justify-between items-center bg-white/5 p-6 rounded-3xl border border-white/10">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Bản đồ Lộ trình</h2>
                                <p className="text-gray-400 text-sm">Các hành trình học tập dài hạn được thiết kế riêng.</p>
                            </div>
                            {user?.role === 'STUDENT' && (
                                <button onClick={() => navigate('learning_path_creator')} className="btn btn-primary bg-emerald-600 hover:bg-emerald-500 border-none shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-pulse">
                                    ✨ Khởi tạo Lộ trình Mới
                                </button>
                            )}
                            {user?.role === 'TEACHER' && (
                                <button onClick={() => navigate('learning_path_creator')} className="btn btn-primary bg-emerald-600 hover:bg-emerald-500 border-none shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                                    📝 Soạn Giáo Án (Lộ trình)
                                </button>
                            )}
                        </div>
                        
                        {learningPaths.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {learningPaths.map(path => {
                                    const completedNodes = path.nodes.filter(n => n.isCompleted).length;
                                    const totalNodes = path.nodes.length;
                                    const progress = (completedNodes / totalNodes) * 100;

                                    return (
                                        <div 
                                            key={path.id} 
                                            className="card p-0 flex flex-col justify-between group overflow-hidden border-emerald-500/30 bg-emerald-900/10 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:-translate-y-2 transition-all"
                                            onMouseEnter={() => triggerReaction('hover_detective')}
                                        >
                                            <div className="h-32 bg-gradient-to-br from-emerald-800 to-teal-900 relative p-6 flex flex-col justify-end">
                                                <div className="absolute top-4 right-4 text-4xl opacity-20 group-hover:opacity-40 transition-opacity rotate-12">🗺️</div>
                                                <h2 className="text-xl font-black text-white uppercase tracking-wide drop-shadow-md">{path.title}</h2>
                                                <span className="text-xs font-bold text-emerald-200 bg-black/20 px-2 py-1 rounded w-fit mt-1">{path.topic}</span>
                                            </div>
                                            
                                            <div className="p-6 flex-1 space-y-4">
                                                <div className="flex justify-between text-sm text-gray-300">
                                                    <span>Tiến độ thám hiểm</span>
                                                    <span className="font-bold text-emerald-400">{Math.round(progress)}%</span>
                                                </div>
                                                <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden border border-gray-700">
                                                    <div className="bg-gradient-to-r from-emerald-400 to-green-500 h-full rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)] transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                                                </div>
                                                <p className="text-xs text-gray-500">Created by: {db.USERS[path.creatorId]?.name || path.creatorId}</p>
                                            </div>
                                            
                                            <div className="p-4 bg-black/20 border-t border-white/5">
                                                <button onClick={() => handleOpenPath(path.id)} className="btn w-full bg-emerald-600/80 hover:bg-emerald-500 text-white font-bold shadow-lg border-none">
                                                    {progress === 0 ? '🚀 Khởi hành' : '▶️ Tiếp tục'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <p className="text-gray-500 text-lg">Chưa có lộ trình nào được thiết lập.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <FlashcardModal 
                isOpen={!!selectedDeck} 
                onClose={() => setSelectedDeck(null)} 
                deck={selectedDeck} 
            />
        </div>
    );
};
export default AssignmentHubPage;
