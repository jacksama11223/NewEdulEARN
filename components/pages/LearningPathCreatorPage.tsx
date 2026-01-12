
import React, { useState, useContext, useCallback, useEffect, useMemo } from 'react';
import { AuthContext, DataContext, GlobalStateContext, PageContext } from '../../contexts/AppProviders';
import { generateLearningPathWithGemini, generatePlacementTest, regenerateSingleNode } from '../../services/geminiService';
import LoadingSpinner from '../common/LoadingSpinner';
import DuolingoTree from '../common/DuolingoTree';
import Modal from '../common/Modal';
import type { LearningNode, PlacementTestQuestion, StudyGroup, User } from '../../types';

type Step = 'TOPIC' | 'SURVEY' | 'LEVEL_CHOICE' | 'TEST' | 'GENERATING' | 'PREVIEW';

const LearningPathCreatorPage: React.FC = () => {
    const { user } = useContext(AuthContext)!;
    const { db, createLearningPath, assignLearningPath, sendGroupMessage } = useContext(DataContext)!;
    const { navigate, params } = useContext(PageContext)!; // Added params
    const { serviceStatus, setPage: setGlobalPage } = useContext(GlobalStateContext)!;

    // -- State --
    const [step, setStep] = useState<Step>('TOPIC');
    
    // Step 1: Topic
    const [mode, setMode] = useState<'topic' | 'content'>('topic');
    const [inputText, setInputText] = useState('');
    const [title, setTitle] = useState('');

    // Step 2: Survey
    const [goal, setGoal] = useState('');
    const [timeCommitment, setTimeCommitment] = useState('');
    
    // Step 2b: Commitment Contract
    const [isWagerEnabled, setIsWagerEnabled] = useState(false);
    const [wagerAmount, setWagerAmount] = useState(0);

    // Step 3: Level & Test
    const [level, setLevel] = useState('Beginner');
    const [testQuestions, setTestQuestions] = useState<PlacementTestQuestion[]>([]);
    const [testAnswers, setTestAnswers] = useState<Record<string, number>>({});

    // Step 4: Gen
    const [generatedNodes, setGeneratedNodes] = useState<LearningNode[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Teacher Assign Modal
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

    // Student Challenge Modal
    const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
    const [createdPathInfo, setCreatedPathInfo] = useState<{id: string, title: string} | null>(null);
    const [selectedSquadronId, setSelectedSquadronId] = useState<string>('');

    // --- PREVIEW & PRUNE STATE (New) ---
    const [previewNode, setPreviewNode] = useState<LearningNode | null>(null);
    const [isRegeneratingNode, setIsRegeneratingNode] = useState(false);
    
    const isAiOk = serviceStatus.ai_assistant_service === 'OPERATIONAL';
    const userDiamonds = db.GAMIFICATION.diamonds;
    const isTeacher = user?.role === 'TEACHER';

    // Get User's Squadrons
    const mySquadrons = useMemo(() => {
        if (!user) return [];
        return db.STUDY_GROUPS.filter(g => g.members.includes(user.id));
    }, [db.STUDY_GROUPS, user]);

    // -- EFFECT: Handle Params from Notebook --
    useEffect(() => {
        if (params && params.fromNotebook && params.initialContent) {
            setMode('content');
            setInputText(params.initialContent);
            setTitle(params.initialTitle || 'My Note Path');
            // Optional: Auto-scroll or highlight to show it was imported
        }
    }, [params]);

    // -- Handlers --

    const openApiKeyModal = () => setGlobalPage('api_key', { isApiKeyModalOpen: true });

    const handleStartTest = async () => {
        const apiKey = user ? db.USERS[user.id]?.apiKey : null;
        if (!apiKey) { setError("API Key Required"); openApiKeyModal(); return; }

        setIsLoading(true);
        setError(null);
        try {
            const qs = await generatePlacementTest(apiKey, inputText);
            setTestQuestions(qs);
            setStep('TEST');
        } catch (e) {
            setError("Lỗi tạo bài test.");
        } finally {
            setIsLoading(false);
        }
    };

    const submitTest = () => {
        let correct = 0;
        testQuestions.forEach(q => {
            if (testAnswers[q.id] === q.correctAnswer) correct++;
        });
        const score = (correct / testQuestions.length) * 100;
        
        let detectedLevel = 'Beginner';
        if (score > 80) detectedLevel = 'Advanced';
        else if (score > 40) detectedLevel = 'Intermediate';
        
        setLevel(detectedLevel);
        alert(`Bạn đạt ${score.toFixed(0)}%. Hệ thống đề xuất trình độ: ${detectedLevel}`);
        handleGeneratePath(detectedLevel);
    };

    const handleGeneratePath = async (targetLevel: string) => {
        setStep('GENERATING');
        const apiKey = user ? db.USERS[user.id]?.apiKey : null;
        if (!apiKey) { setError("API Key Required"); return; }

        setIsLoading(true);
        try {
            const context = { level: targetLevel, goal, time: timeCommitment };
            const nodes = await generateLearningPathWithGemini(apiKey, inputText, mode === 'content', context);
            setGeneratedNodes(nodes);
            setStep('PREVIEW');
        } catch (e) {
            setError("Lỗi tạo lộ trình.");
            setStep('TOPIC'); // Reset on error
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = useCallback(() => {
        if (!user || generatedNodes.length === 0) return;
        
        if (isTeacher) {
            // Open Assign Modal
            setIsAssignModalOpen(true);
        } else {
            // Student Save
            try {
                // Now createLearningPath returns the ID
                const newPathId = createLearningPath(
                    user.id, 
                    title, 
                    inputText.substring(0, 50), 
                    generatedNodes, 
                    { level, goal, time: timeCommitment },
                    isWagerEnabled ? wagerAmount : undefined
                );
                
                let message = "Đã lưu lộ trình thành công!";
                if (isWagerEnabled && wagerAmount > 0) {
                    message += `\n🔥 Hợp đồng đã ký! -${wagerAmount} Kim Cương.\nHãy hoàn thành trong 7 ngày để không bị mất tiền cược!`;
                }
                
                // Show standard alert first (or replace with nice toast later)
                // alert(message); 

                // Open Challenge Modal instead of navigating immediately
                setCreatedPathInfo({ id: newPathId, title: title });
                setIsChallengeModalOpen(true);

            } catch (e: any) {
                alert(`Lỗi: ${e.message}`);
            }
        }
    }, [user, generatedNodes, title, inputText, level, goal, timeCommitment, createLearningPath, navigate, isWagerEnabled, wagerAmount, isTeacher]);

    const handleAssignToClass = () => {
        if (selectedGroupIds.length === 0 || !user) return;

        const studentIds = new Set<string>();
        selectedGroupIds.forEach(groupId => {
            const group = db.STUDY_GROUPS.find(g => g.id === groupId);
            if (group) {
                group.members.forEach(m => studentIds.add(m));
            }
        });

        if (studentIds.size === 0) {
            alert("Các nhóm đã chọn không có thành viên nào.");
            return;
        }

        const pathData = {
            title,
            topic: inputText.substring(0, 20) + '...',
            nodes: generatedNodes,
            targetLevel: level,
            goal,
            dailyCommitment: timeCommitment
        };

        assignLearningPath(user.name, Array.from(studentIds), pathData);
        alert(`✅ Đã giao giáo án cho ${studentIds.size} học sinh!`);
        navigate('assignment_hub');
    };

    const handleLaunchChallenge = () => {
        if (!user || !createdPathInfo || !selectedSquadronId) return;
        
        // This is a simulated sharing. In a real app, we'd send a structured object.
        // Here we just send a formatted text that other users can see.
        const msg = `🚀 [CHALLENGE] Tôi vừa khởi tạo chiến dịch: "${createdPathInfo.title}".\nAi dám tham gia cùng tôi không? (ID: ${createdPathInfo.id})`;
        
        sendGroupMessage(selectedSquadronId, user, msg);
        alert("Đã gửi lời thách đấu tới Phi đội!");
        navigate('group_chat'); // Go to chat to see the reaction
    };

    const handleSkipChallenge = () => {
        navigate('assignment_hub');
    };

    // --- PREVIEW & PRUNE HANDLERS ---
    const handlePreviewNodeClick = (node: LearningNode) => {
        setPreviewNode(node);
    };

    const handleDeleteNode = () => {
        if (!previewNode) return;
        if (generatedNodes.length <= 3) {
            alert("Lộ trình cần ít nhất 3 bài học.");
            return;
        }
        if (confirm("Bạn chắc chắn muốn xóa bài học này?")) {
            setGeneratedNodes(prev => prev.filter(n => n.id !== previewNode.id));
            setPreviewNode(null);
        }
    };

    const handleRegenerateNode = async () => {
        if (!previewNode || !user) return;
        const apiKey = db.USERS[user.id]?.apiKey;
        if (!apiKey) {
            setGlobalPage('api_key', { isApiKeyModalOpen: true });
            return;
        }

        setIsRegeneratingNode(true);
        try {
            // Find neighbors for context
            const idx = generatedNodes.findIndex(n => n.id === previewNode.id);
            const prevTitle = idx > 0 ? generatedNodes[idx - 1].title : "START";
            const nextTitle = idx < generatedNodes.length - 1 ? generatedNodes[idx + 1].title : "END";
            
            const context = `Previous node: ${prevTitle}. Next node: ${nextTitle}. Position: ${idx + 1}/${generatedNodes.length}`;
            
            const newNode = await regenerateSingleNode(apiKey, title || inputText, previewNode, context);
            
            setGeneratedNodes(prev => prev.map(n => n.id === previewNode.id ? newNode : n));
            setPreviewNode(newNode); // Update modal content
            alert("✨ Node đã được tái tạo thành công!");
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsRegeneratingNode(false);
        }
    };

    // -- Renders --

    if (!isAiOk) {
        return (
            <div className="card p-8 text-center border border-yellow-700">
                <h2 className="text-xl font-bold text-yellow-400">Dịch vụ AI đang bảo trì</h2>
                <button onClick={() => navigate('assignment_hub')} className="btn btn-secondary mt-4">Quay lại</button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <button onClick={() => navigate('assignment_hub')} className="text-sm text-blue-400 hover:underline">&larr; Quay lại Hub</button>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${
                    step === 'TOPIC' ? '20%' : 
                    step === 'SURVEY' ? '40%' : 
                    step === 'LEVEL_CHOICE' ? '60%' : 
                    step === 'TEST' ? '80%' : '100%'
                }` }}></div>
            </div>

            {/* STEP 1: TOPIC */}
            {step === 'TOPIC' && (
                <div className="card p-8 animate-fade-in-up">
                    <h1 className="text-3xl font-bold text-gradient mb-6">1. Bạn muốn học gì?</h1>
                    
                    {params?.fromNotebook && (
                        <div className="mb-6 p-4 bg-green-900/30 border border-green-500/50 rounded-xl flex items-center gap-3">
                            <span className="text-2xl">📓</span>
                            <div>
                                <p className="text-green-300 font-bold text-sm uppercase">Nhập từ Sổ Tay</p>
                                <p className="text-gray-300 text-sm">Hệ thống đã tự động điền nội dung từ ghi chú của bạn.</p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="flex space-x-4 border-b border-gray-700 pb-2">
                            <button onClick={() => setMode('topic')} className={`pb-2 font-semibold transition-colors ${mode === 'topic' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500'}`}>Chủ đề</button>
                            <button onClick={() => setMode('content')} className={`pb-2 font-semibold transition-colors ${mode === 'content' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500'}`}>Nội dung</button>
                        </div>
                        <div>
                            <label className="block text-gray-400 mb-1">Tên Lộ trình</label>
                            <input type="text" className="form-input w-full" placeholder="VD: Tiếng Anh Du lịch" value={title} onChange={e => setTitle(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-gray-400 mb-1">{mode === 'topic' ? 'Chủ đề chi tiết' : 'Dán nội dung'}</label>
                            <textarea className="form-textarea w-full" rows={4} placeholder={mode === 'topic' ? "VD: Giao tiếp cơ bản, đặt phòng khách sạn..." : "Paste văn bản..."} value={inputText} onChange={e => setInputText(e.target.value)} />
                        </div>
                        <button onClick={() => { if(title && inputText) setStep('SURVEY'); else alert("Nhập đủ thông tin"); }} className="btn btn-primary w-full mt-4">Tiếp theo &rarr;</button>
                    </div>
                </div>
            )}

            {/* STEP 2: SURVEY */}
            {step === 'SURVEY' && (
                <div className="card p-8 animate-fade-in-up">
                    <h1 className="text-3xl font-bold text-gradient mb-6">2. Mục tiêu?</h1>
                    
                    <p className="text-gray-300 mb-4">Mục đích học tập?</p>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        {['💼 Công việc', '✈️ Du lịch', '🧠 Luyện não', '🎓 Trường học', '🚀 Sở thích'].map(g => (
                            <button key={g} onClick={() => setGoal(g)} className={`p-4 rounded-xl border-2 text-left transition-all ${goal === g ? 'border-blue-500 bg-blue-900/30' : 'border-gray-700 hover:border-gray-500'}`}>
                                {g}
                            </button>
                        ))}
                    </div>

                    <p className="text-gray-300 mb-4">Thời gian cam kết mỗi ngày?</p>
                    <div className="grid grid-cols-4 gap-4 mb-8">
                        {['5 phút', '10 phút', '15 phút', '30 phút'].map(t => (
                            <button key={t} onClick={() => setTimeCommitment(t)} className={`p-3 rounded-xl border-2 transition-all ${timeCommitment === t ? 'border-green-500 bg-green-900/30' : 'border-gray-700 hover:border-gray-500'}`}>
                                {t}
                            </button>
                        ))}
                    </div>

                    {/* COMMITMENT CONTRACT SECTION (Students Only) */}
                    {!isTeacher && (
                        <div className="border-t border-gray-700 pt-6 mt-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
                                    <span className="text-2xl animate-pulse">🔥</span> Hợp đồng Cam kết (Wager)
                                </h3>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={isWagerEnabled} onChange={() => setIsWagerEnabled(!isWagerEnabled)} />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                </label>
                            </div>

                            {isWagerEnabled && (
                                <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-xl animate-fade-in">
                                    <p className="text-gray-300 text-sm mb-4">
                                        Thúc đẩy bản thân bằng "Nỗi sợ mất mát". Đặt cược Kim Cương. Nếu hoàn thành trong 7 ngày, bạn sẽ được hoàn trả.
                                    </p>
                                    
                                    <div className="flex items-center gap-4 mb-4">
                                        <span className="text-sm font-bold text-gray-400">Số dư: 💎 {userDiamonds}</span>
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max={userDiamonds} 
                                            step="10" 
                                            value={wagerAmount} 
                                            onChange={(e) => setWagerAmount(parseInt(e.target.value))} 
                                            className="flex-1 accent-red-500"
                                        />
                                        <span className="text-xl font-bold text-red-400 w-20 text-right">{wagerAmount} 💎</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-between mt-8">
                        <button onClick={() => setStep('TOPIC')} className="text-gray-400">Quay lại</button>
                        <button onClick={() => { if(goal && timeCommitment) setStep('LEVEL_CHOICE'); else alert("Vui lòng chọn mục tiêu"); }} className="btn btn-primary">Tiếp theo &rarr;</button>
                    </div>
                </div>
            )}

            {/* STEP 3: LEVEL CHOICE */}
            {step === 'LEVEL_CHOICE' && (
                <div className="card p-8 animate-fade-in-up text-center space-y-8">
                    <h1 className="text-3xl font-bold text-gradient">3. Trình độ hiện tại?</h1>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <button onClick={() => { setLevel('Beginner'); handleGeneratePath('Beginner'); }} className="p-8 rounded-3xl border-2 border-gray-700 hover:border-blue-400 hover:bg-blue-900/10 transition-all group">
                            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🐣</div>
                            <h3 className="text-xl font-bold text-white">Mới bắt đầu</h3>
                            <p className="text-gray-400 mt-2">Học từ con số 0.</p>
                        </button>

                        <button onClick={handleStartTest} className="p-8 rounded-3xl border-2 border-gray-700 hover:border-purple-400 hover:bg-purple-900/10 transition-all group">
                            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🧠</div>
                            <h3 className="text-xl font-bold text-white">Đã biết chút ít?</h3>
                            <p className="text-gray-400 mt-2">Làm bài test phân loại.</p>
                        </button>
                    </div>
                    
                    {isLoading && <div className="mt-4"><LoadingSpinner size={6} /><p className="text-sm text-gray-400 mt-2">Đang tạo bài test...</p></div>}
                    {error && <p className="text-red-400">{error}</p>}
                </div>
            )}

            {/* STEP 4: TEST */}
            {step === 'TEST' && (
                <div className="card p-8 animate-fade-in-up">
                    <h1 className="text-2xl font-bold text-white mb-6">Kiểm tra trình độ</h1>
                    <div className="space-y-8">
                        {testQuestions.map((q, idx) => (
                            <div key={q.id} className="p-4 bg-gray-800 rounded-lg">
                                <p className="font-semibold mb-3">{idx+1}. {q.question}</p>
                                <div className="space-y-2">
                                    {q.options.map((opt, oIdx) => (
                                        <label key={oIdx} className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-700 rounded">
                                            <input 
                                                type="radio" 
                                                name={q.id} 
                                                checked={testAnswers[q.id] === oIdx} 
                                                onChange={() => setTestAnswers({...testAnswers, [q.id]: oIdx})}
                                                className="form-radio"
                                            />
                                            <span>{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <button onClick={submitTest} className="btn btn-primary w-full">Nộp bài & Tạo Lộ trình</button>
                    </div>
                </div>
            )}

            {/* GENERATING */}
            {step === 'GENERATING' && (
                <div className="flex flex-col items-center justify-center h-96">
                    <LoadingSpinner size={12} />
                    <h2 className="text-2xl font-bold text-white mt-8 animate-pulse">AI đang thiết kế lộ trình...</h2>
                    <p className="text-gray-400 mt-2">Dựa trên: {level} • {goal}</p>
                </div>
            )}

            {/* PREVIEW */}
            {step === 'PREVIEW' && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="card p-6 bg-green-900/20 border-green-800 text-center">
                        <h3 className="text-xl font-bold text-green-400 mb-2">Lộ trình đã sẵn sàng!</h3>
                        <p className="text-sm text-gray-300 mb-4">Nhấn vào từng node để Chỉnh sửa (Regenerate) hoặc Xóa bớt.</p>
                        
                        {isTeacher ? (
                            <button onClick={handleSave} className="btn btn-primary w-full bg-indigo-600 hover:bg-indigo-500 shadow-lg">
                                👨‍🏫 Giao cho lớp
                            </button>
                        ) : (
                            <>
                                {isWagerEnabled && wagerAmount > 0 && (
                                    <p className="text-red-400 text-sm mb-4 font-bold bg-black/30 p-2 rounded inline-block border border-red-500/50">
                                        ⚠️ Cảnh báo: Sẽ trừ {wagerAmount} Kim Cương khi lưu.
                                    </p>
                                )}
                                <button onClick={handleSave} className="btn btn-primary w-full bg-green-600 hover:bg-green-500">
                                    {isWagerEnabled && wagerAmount > 0 ? '📝 Ký Hợp Đồng & Bắt đầu' : '💾 Lưu Lộ trình & Bắt đầu học'}
                                </button>
                            </>
                        )}
                    </div>
                    <div className="card p-6 bg-gray-900/50">
                         <DuolingoTree 
                            nodes={generatedNodes} 
                            onNodeClick={handlePreviewNodeClick} 
                            allowInteraction={true} // Enable clicking locked nodes
                        />
                    </div>
                </div>
            )}

            {/* ASSIGN MODAL (TEACHER) */}
            <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Giao Lộ Trình (Giáo Án)">
                <div className="space-y-4 p-2">
                    <p className="text-gray-300 text-sm">Chọn nhóm học sinh để giao lộ trình này:</p>
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar border border-gray-700 rounded-lg p-2">
                        {db.STUDY_GROUPS.map(group => (
                            <label key={group.id} className="flex items-center space-x-3 p-2 hover:bg-white/5 rounded cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="form-checkbox text-indigo-500"
                                    checked={selectedGroupIds.includes(group.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) setSelectedGroupIds([...selectedGroupIds, group.id]);
                                        else setSelectedGroupIds(selectedGroupIds.filter(id => id !== group.id));
                                    }}
                                />
                                <div>
                                    <p className="font-bold text-white text-sm">{group.name}</p>
                                    <p className="text-xs text-gray-500">{group.members.length} thành viên</p>
                                </div>
                            </label>
                        ))}
                    </div>

                    <div className="flex justify-end pt-2 gap-2">
                        <button onClick={() => setIsAssignModalOpen(false)} className="btn btn-secondary text-sm">Hủy</button>
                        <button onClick={handleAssignToClass} disabled={selectedGroupIds.length === 0} className="btn btn-primary text-sm bg-indigo-600 hover:bg-indigo-500">
                            🚀 Giao Nhiệm Vụ
                        </button>
                    </div>
                </div>
            </Modal>

            {/* CHALLENGE MODAL (STUDENT) - NEW! */}
            <Modal isOpen={isChallengeModalOpen} onClose={handleSkipChallenge} title="🚀 Nhiệm vụ đã sẵn sàng!" size="md">
                <div className="space-y-6 text-center py-4">
                    <div className="relative inline-block">
                        <div className="text-6xl animate-bounce-subtle">⚔️</div>
                        <div className="absolute -top-2 -right-2 text-3xl animate-pulse">🔥</div>
                    </div>
                    
                    <div>
                        <h3 className="text-xl font-bold text-white">Bạn có muốn thách đấu Phi đội?</h3>
                        <p className="text-gray-400 text-sm mt-2">
                            Biến lộ trình học cá nhân này thành một chiến dịch chung.<br/>
                            Mời đồng đội tham gia để cùng thi đua và nhận thưởng!
                        </p>
                    </div>

                    {mySquadrons.length > 0 ? (
                        <div className="text-left bg-gray-900/50 p-4 rounded-xl border border-gray-700">
                            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Chọn Phi đội để thách đấu:</label>
                            <select 
                                className="form-select w-full bg-black/40 border-gray-600"
                                value={selectedSquadronId}
                                onChange={(e) => setSelectedSquadronId(e.target.value)}
                            >
                                <option value="">-- Chọn Phi đội --</option>
                                {mySquadrons.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <p className="text-red-400 text-sm italic">Bạn chưa tham gia Phi đội nào. Hãy tham gia trước để thách đấu.</p>
                    )}

                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={handleLaunchChallenge}
                            disabled={!selectedSquadronId}
                            className="btn w-full py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            🚀 Gửi Lời Thách Đấu
                        </button>
                        <button 
                            onClick={handleSkipChallenge}
                            className="text-sm text-gray-500 hover:text-white underline decoration-dotted"
                        >
                            Không, tôi muốn học một mình (Solo Mode)
                        </button>
                    </div>
                </div>
            </Modal>

            {/* PREVIEW & PRUNE NODE MODAL */}
            <Modal isOpen={!!previewNode} onClose={() => setPreviewNode(null)} title="Chỉnh sửa Node" size="sm">
                {previewNode && (
                    <div className="space-y-4">
                        <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                            <p className="text-xs font-bold text-gray-400 uppercase">Tiêu đề</p>
                            <p className="text-white font-bold text-lg">{previewNode.title}</p>
                            <p className="text-xs font-bold text-gray-400 uppercase mt-2">Mô tả</p>
                            <p className="text-gray-300 text-sm">{previewNode.description}</p>
                            <span className={`inline-block mt-2 px-2 py-0.5 text-xs rounded border ${
                                previewNode.type === 'theory' ? 'border-blue-500 text-blue-300' : 
                                previewNode.type === 'practice' ? 'border-green-500 text-green-300' : 'border-red-500 text-red-300'
                            }`}>
                                {previewNode.type.toUpperCase()}
                            </span>
                        </div>

                        <div className="flex gap-2">
                            <button 
                                onClick={handleRegenerateNode}
                                disabled={isRegeneratingNode}
                                className="btn btn-primary flex-1 bg-purple-600 hover:bg-purple-500 flex items-center justify-center gap-2"
                            >
                                {isRegeneratingNode ? <LoadingSpinner size={3} /> : <span>✨ Tái tạo (AI)</span>}
                            </button>
                            <button 
                                onClick={handleDeleteNode}
                                className="btn btn-secondary border-red-500/50 text-red-400 hover:bg-red-900/20"
                            >
                                🗑️ Xóa
                            </button>
                        </div>
                        {isRegeneratingNode && <p className="text-xs text-center text-blue-300 animate-pulse">Gemini 3 Pro đang suy nghĩ...</p>}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default LearningPathCreatorPage;
