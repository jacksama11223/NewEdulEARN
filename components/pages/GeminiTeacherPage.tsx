
import React, { useState, useContext, useCallback, useMemo, useEffect } from 'react';
import { AuthContext, DataContext, GlobalStateContext, PageContext, PetContext } from '../../contexts/AppProviders';
import { callGeminiApi } from '../../services/geminiService';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../common/Modal'; // Import Modal
import OnboardingTour, { TourStep } from '../common/OnboardingTour'; // Added Import
import type { GeminiChatMessage, Course } from '../../types';

// --- TEACHING PERSONAS ---
type TeachingStyleId = 'guardian' | 'commander' | 'jester' | 'oracle';

interface TeachingPersona {
    id: TeachingStyleId;
    name: string;
    title: string;
    icon: string;
    desc: string;
    color: string;
    systemPrompt: string;
}

const TEACHING_STYLES: TeachingPersona[] = [
    {
        id: 'guardian', name: 'Socratic (Người Hộ Vệ)', title: 'The Guardian', icon: '🛡️',
        desc: 'Hướng dẫn bằng câu hỏi, khuyến khích tư duy phản biện.',
        color: 'emerald',
        systemPrompt: "Bạn là một Trợ giảng Socratic (The Guardian). Đừng bao giờ đưa ra câu trả lời trực tiếp cho sinh viên ngay lập tức. Hãy đặt câu hỏi gợi mở, hướng dẫn họ tự tìm ra câu trả lời. Phong cách: Kiên nhẫn, sâu sắc, khuyến khích."
    },
    {
        id: 'commander', name: 'Nghiêm khắc (Chỉ Huy)', title: 'The Commander', icon: '⚔️',
        desc: 'Ngắn gọn, súc tích, tập trung vào kết quả và hiệu quả.',
        color: 'red',
        systemPrompt: "Bạn là một Trợ giảng Nghiêm khắc (The Commander). Hãy trả lời cực kỳ ngắn gọn, súc tích, đi thẳng vào vấn đề. Bỏ qua các lời chào hỏi xã giao. Tập trung vào facts, số liệu và quy trình chuẩn."
    },
    {
        id: 'jester', name: 'Hài hước (Chú Hề)', title: 'The Jester', icon: '🤡',
        desc: 'Vui vẻ, sử dụng phép ẩn dụ thú vị, tạo không khí thoải mái.',
        color: 'orange',
        systemPrompt: "Bạn là một Trợ giảng Vui tính (The Jester). Hãy giải thích các khái niệm phức tạp bằng các phép ẩn dụ hài hước, đơn giản (ELI5). Sử dụng nhiều emoji, giọng điệu phấn khích để làm bài học bớt nhàm chán."
    },
    {
        id: 'oracle', name: 'Học thuật (Nhà Tiên Tri)', title: 'The Oracle', icon: '🔮',
        desc: 'Chi tiết, bài bản, sử dụng thuật ngữ chính xác.',
        color: 'purple',
        systemPrompt: "Bạn là một Trợ giảng Học thuật (The Oracle). Hãy đưa ra các giải thích chi tiết, bài bản, sử dụng chính xác các thuật ngữ chuyên ngành. Cấu trúc bài giảng rõ ràng, logic, có trích dẫn nếu cần."
    }
];

interface GeminiChatUIProps {
    title: string;
    subtitle: string;
    onSend: (prompt: string, apiKey: string, systemPrompt: string | null, useThinking: boolean) => Promise<void>;
    chatHistory: GeminiChatMessage[];
    systemPrompt: string | null;
    activePersona?: TeachingPersona | null; // Display active persona
    onConfigurePersona: () => void; // Trigger modal
    onDeploy?: (content: string) => void; // Handler for deployment
    onIssueChallenge?: (content: string) => void; // Handler for boss challenge
}

const GeminiChatUI: React.FC<GeminiChatUIProps> = ({ title, subtitle, onSend, chatHistory, systemPrompt, activePersona, onConfigurePersona, onDeploy, onIssueChallenge }) => {
    const { user } = useContext(AuthContext)!;
    const { db } = useContext(DataContext)!;
    const { setPage: setGlobalPage } = useContext(GlobalStateContext)!;
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [useThinking, setUseThinking] = useState(false);
    const chatEndRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    const handleSend = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || isLoading) return;
        const apiKey = user ? db.USERS[user.id]?.apiKey : null;
        if (!apiKey) {
            setError("API Key chưa được cấu hình.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            await onSend(prompt, apiKey, systemPrompt, useThinking);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Lỗi không xác định.");
        } finally {
            setIsLoading(false);
            setPrompt('');
        }
    }, [prompt, isLoading, user, db.USERS, onSend, systemPrompt, useThinking]);

    const openApiKeyModal = useCallback(() => {
        setGlobalPage('api_key', { isApiKeyModalOpen: true });
        setError(null);
    }, [setGlobalPage]);

    return (
        <div className="card h-[calc(100vh-150px)] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gradient flex items-center gap-2">
                        {title}
                        {activePersona && (
                            <span className={`text-xs px-2 py-1 rounded bg-${activePersona.color}-900/50 text-${activePersona.color}-300 border border-${activePersona.color}-500/30 flex items-center gap-1`}>
                                {activePersona.icon} {activePersona.title}
                            </span>
                        )}
                    </h1>
                    <p className="text-sm text-gray-400">{subtitle}</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        id="btn-configure-persona"
                        onClick={onConfigurePersona}
                        className="btn btn-xs btn-secondary border-blue-500 text-blue-300 hover:bg-blue-900/30 flex items-center gap-1"
                        title="Cấu hình Persona"
                    >
                        🎭 Persona
                    </button>
                    <div className="h-6 w-px bg-gray-700"></div>
                    <span className="text-xs font-bold text-blue-200">Thinking Mode</span>
                    <button 
                        onClick={() => setUseThinking(!useThinking)}
                        className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${useThinking ? 'bg-blue-500' : 'bg-gray-700'}`}
                    >
                        <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all duration-300 ${useThinking ? 'left-6' : 'left-1'}`}></div>
                    </button>
                </div>
            </div>
            
            <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                {chatHistory.length === 0 && (
                    <div className="text-center text-gray-500 mt-20">
                        <div className="text-6xl mb-4 opacity-50">{activePersona ? activePersona.icon : '🤖'}</div>
                        <p>Xin chào, tôi là trợ lý ảo của bạn.</p>
                        <p className="text-xs text-gray-600 mt-2">
                            {activePersona 
                                ? `Đang hoạt động với phong cách: ${activePersona.name}` 
                                : 'Chưa cấu hình phong cách.'}
                        </p>
                    </div>
                )}
                {chatHistory.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex flex-col max-w-3xl ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`p-4 rounded-xl shadow-md ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-800 text-gray-200 rounded-tl-none border border-gray-700'}`}>
                                <div className="prose prose-invert max-w-none prose-sm" dangerouslySetInnerHTML={{ __html: msg.parts[0].text ? msg.parts[0].text.replace(/\n/g, '<br />') : '' }} />
                            </div>
                            
                            {/* ACTION BAR FOR MODEL MESSAGES */}
                            {msg.role === 'model' && (
                                <div className="mt-2 flex gap-2">
                                    {onDeploy && (
                                        <button 
                                            onClick={() => msg.parts[0].text && onDeploy(msg.parts[0].text)}
                                            className="btn-xs flex items-center gap-1 bg-green-900/30 text-green-300 border border-green-500/30 hover:bg-green-900/50 rounded-full px-3 py-1 transition-all"
                                        >
                                            🚀 Deploy to Course
                                        </button>
                                    )}
                                    {onIssueChallenge && activePersona?.id === 'commander' && (
                                        <button 
                                            onClick={() => msg.parts[0].text && onIssueChallenge(msg.parts[0].text)}
                                            className="btn-xs flex items-center gap-1 bg-red-900/30 text-red-300 border border-red-500/30 hover:bg-red-900/50 rounded-full px-3 py-1 transition-all animate-pulse"
                                        >
                                            ⚔️ Issue Challenge
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => navigator.clipboard.writeText(msg.parts[0].text || '')}
                                        className="btn-xs flex items-center gap-1 bg-gray-700/50 text-gray-400 hover:text-white rounded-full px-3 py-1 transition-all"
                                    >
                                        📋 Copy
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && <div className="flex justify-start"><div className="p-3 rounded-lg bg-gray-700"><LoadingSpinner size={5} /></div></div>}
                <div ref={chatEndRef} />
            </div>
            
            <form onSubmit={handleSend} className="p-4 border-t border-gray-700 flex space-x-3 bg-black/20">
                <input 
                    id="input-chat-prompt"
                    type="text" 
                    className="form-input flex-1" 
                    placeholder="Nhập yêu cầu soạn bài..." 
                    value={prompt} 
                    onChange={(e) => setPrompt(e.target.value)} 
                    disabled={isLoading} 
                />
                <button type="submit" className="btn btn-primary" disabled={isLoading || !prompt.trim()}>Gửi</button>
            </form>
            
            {error && (
                <div className="p-2 bg-red-900 text-red-200 text-center text-sm flex justify-center gap-2 items-center">
                    {error}
                    {error.includes("API Key") && <button onClick={openApiKeyModal} className="underline font-bold">Cấu hình ngay</button>}
                </div>
            )}
        </div>
    );
};

const GeminiTeacherPage: React.FC = () => {
    const { user } = useContext(AuthContext)!;
    const { db, updateCourseSettings, addLessonToCourse, createBossChallenge } = useContext(DataContext)!;
    const { navigate } = useContext(PageContext)!;
    const { triggerReaction, say } = useContext(PetContext)!; // NEW: Pet Context
    
    const [chatHistory, setChatHistory] = useState<GeminiChatMessage[]>([]);
    
    // --- PERSONA STATE ---
    const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [selectedPersonaId, setSelectedPersonaId] = useState<TeachingStyleId>('oracle');
    const [activePersona, setActivePersona] = useState<TeachingPersona | null>(null);

    // --- DEPLOY STATE ---
    const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
    const [deployContent, setDeployContent] = useState('');
    const [deployTitle, setDeployTitle] = useState('');
    const [targetCourseId, setTargetCourseId] = useState('');

    // --- CHALLENGE STATE ---
    const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
    const [challengeTitle, setChallengeTitle] = useState('');
    const [challengeContent, setChallengeContent] = useState('');
    const [challengeReward, setChallengeReward] = useState(200);

    // ONBOARDING TOUR STATE
    const [isTourOpen, setIsTourOpen] = useState(false);

    // Get teacher's courses
    const myCourses = useMemo(() => {
        if (!user) return [];
        return db.COURSES.filter(c => c.teacher === user.name);
    }, [db.COURSES, user]);

    // Initial check: if no persona set, open modal
    useEffect(() => {
        if (!activePersona) {
            // Try to find a default from the first course
            if (myCourses.length > 0) {
                const firstCourse = myCourses[0];
                const savedPersonaId = firstCourse.defaultPersona;
                if (savedPersonaId) {
                    const p = TEACHING_STYLES.find(s => s.id === savedPersonaId);
                    if (p) {
                        setActivePersona(p);
                        setSelectedCourseId(firstCourse.id);
                        setSelectedPersonaId(p.id);
                        // Also set default target for deployment too
                        setTargetCourseId(firstCourse.id);
                        return;
                    }
                }
                // If no default found, open setup
                setIsSetupModalOpen(true);
            } else {
                // No courses, maybe default to Oracle
                setActivePersona(TEACHING_STYLES.find(s => s.id === 'oracle') || null);
            }
        }
    }, [myCourses, activePersona]);

    // --- ONBOARDING EFFECT ---
    useEffect(() => {
        const hasSeenTour = localStorage.getItem('hasSeenGeminiTeacherTour');
        if (!hasSeenTour) {
            // Delay slightly
            setTimeout(() => setIsTourOpen(true), 1500);
        }
    }, []);

    const handleTourComplete = () => {
        setIsTourOpen(false);
        localStorage.setItem('hasSeenGeminiTeacherTour', 'true');
    };

    const tourSteps: TourStep[] = [
        {
            targetId: 'btn-configure-persona',
            title: 'Trợ giảng ảo (The AI TA)',
            content: 'Trước tiên, hãy chọn phong cách cho trợ lý của bạn (Nghiêm khắc, Hài hước, hay Socratic).',
            position: 'left'
        },
        {
            targetId: 'input-chat-prompt',
            title: 'Ra lệnh',
            content: 'Sau đó ra lệnh soạn giáo án tại đây. Gemini 3 Pro sẽ suy nghĩ và tạo ra nội dung chất lượng cao.',
            position: 'top'
        }
    ];

    const handleSavePersona = () => {
        const persona = TEACHING_STYLES.find(p => p.id === selectedPersonaId);
        if (!persona) return;

        setActivePersona(persona);
        
        // Update course setting if a course is selected
        if (selectedCourseId) {
            updateCourseSettings(selectedCourseId, { defaultPersona: selectedPersonaId });
            // Set as default target for deployment too
            setTargetCourseId(selectedCourseId);
            // Optionally clear chat history when persona changes to refresh context
            setChatHistory([]); 
        }
        
        setIsSetupModalOpen(false);
    };

    const handleLessonPlan = useCallback(async (prompt: string, apiKey: string, systemPrompt: string | null, useThinking: boolean) => {
        const userMsg: GeminiChatMessage = { role: 'user', parts: [{ text: prompt }] };
        setChatHistory(prev => [...prev, userMsg]);
        
        const responseText = await callGeminiApi(apiKey, prompt, systemPrompt, { useThinking });
        const modelMsg: GeminiChatMessage = { role: 'model', parts: [{ text: responseText }] };
        setChatHistory(prev => [...prev, modelMsg]);
    }, []);

    // --- DEPLOY LOGIC ---
    const handleDeployClick = (content: string) => {
        setDeployContent(content);
        
        // Try to extract title from markdown (e.g., # Title)
        const titleMatch = content.match(/^#\s+(.+)$/m) || content.match(/^##\s+(.+)$/m);
        const autoTitle = titleMatch ? titleMatch[1].trim() : `AI Lesson ${new Date().toLocaleTimeString()}`;
        setDeployTitle(autoTitle);

        // Ensure a course is selected
        if (!targetCourseId && myCourses.length > 0) {
            setTargetCourseId(myCourses[0].id);
        }

        setIsDeployModalOpen(true);
    };

    const confirmDeploy = () => {
        if (!targetCourseId || !deployTitle.trim() || !deployContent.trim()) {
            alert("Vui lòng điền đầy đủ thông tin.");
            return;
        }

        addLessonToCourse(targetCourseId, deployTitle, deployContent);
        
        const courseName = myCourses.find(c => c.id === targetCourseId)?.name;
        alert(`✅ Đã thêm bài học "${deployTitle}" vào khóa học "${courseName}"!`);
        
        setIsDeployModalOpen(false);
    };

    // --- CHALLENGE LOGIC ---
    const handleIssueChallenge = (content: string) => {
        setChallengeContent(content);
        
        // Try to extract title
        const titleMatch = content.match(/^#\s+(.+)$/m) || content.match(/^##\s+(.+)$/m);
        const autoTitle = titleMatch ? titleMatch[1].trim() : `Boss Raid ${new Date().toLocaleTimeString()}`;
        setChallengeTitle(autoTitle);

        if (!targetCourseId && myCourses.length > 0) {
            setTargetCourseId(myCourses[0].id);
        }
        
        setIsChallengeModalOpen(true);
    };

    const confirmChallenge = () => {
        if (!targetCourseId || !challengeTitle.trim()) {
            alert("Vui lòng nhập thông tin thử thách.");
            return;
        }
        createBossChallenge(targetCourseId, challengeTitle, challengeContent, challengeReward);
        
        // FLOW: Boss Raid Alert
        triggerReaction('hover_ninja');
        say("Cảm nhận được sát khí... Một con Boss Rank S vừa xuất hiện ở Assignment Hub. Chuẩn bị vũ khí đi!", 8000);

        alert("⚔️ Thách đấu đã được gửi đến Assignment Hub của học sinh!");
        setIsChallengeModalOpen(false);
    };

    // Combine system prompts
    const baseSystemPrompt = "Bạn là một trợ lý giáo dục chuyên nghiệp (AI Teaching Assistant). Nhiệm vụ của bạn là giúp giáo viên soạn giáo án, tạo bài kiểm tra, và đưa ra các ý tưởng giảng dạy sáng tạo. Hãy trình bày rõ ràng, có cấu trúc (Markdown).";
    const effectiveSystemPrompt = `${baseSystemPrompt}\n\n${activePersona?.systemPrompt || ''}`;

    return (
        <div className="space-y-4">
            <button onClick={() => navigate('dashboard')} className="text-sm text-blue-400 hover:underline">&larr; Quay lại Dashboard</button>
            
            <GeminiChatUI 
                title="Trợ giảng AI (Teacher Assistant)" 
                subtitle="Soạn giáo án, tạo đề thi, và ý tưởng giảng dạy."
                onSend={handleLessonPlan}
                chatHistory={chatHistory}
                systemPrompt={effectiveSystemPrompt}
                activePersona={activePersona}
                onConfigurePersona={() => setIsSetupModalOpen(true)}
                onDeploy={handleDeployClick} 
                onIssueChallenge={handleIssueChallenge} // Pass the challenge handler
            />

            {/* PERSONA SETUP MODAL */}
            <Modal isOpen={isSetupModalOpen} onClose={() => setIsSetupModalOpen(false)} title="🎭 Thiết lập Persona Trợ Giảng" size="lg">
                <div className="space-y-6 p-2">
                    <p className="text-gray-300 text-sm">
                        Chọn phong cách cho trợ lý AI của bạn. Cấu hình này sẽ được lưu cho khóa học đã chọn.
                    </p>

                    {/* Course Selector */}
                    {myCourses.length > 0 && (
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Áp dụng cho Khóa học:</label>
                            <select 
                                className="form-select w-full bg-gray-900 border-gray-700"
                                value={selectedCourseId}
                                onChange={(e) => setSelectedCourseId(e.target.value)}
                            >
                                <option value="">-- Chọn khóa học --</option>
                                {myCourses.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Style Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {TEACHING_STYLES.map(style => (
                            <button
                                key={style.id}
                                onClick={() => setSelectedPersonaId(style.id)}
                                className={`p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden group
                                    ${selectedPersonaId === style.id 
                                        ? `bg-${style.color}-900/40 border-${style.color}-500 shadow-lg scale-[1.02]` 
                                        : 'bg-gray-800 border-transparent hover:bg-gray-700 hover:border-gray-600'}
                                `}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-3xl">{style.icon}</span>
                                    <div>
                                        <p className={`font-bold ${selectedPersonaId === style.id ? 'text-white' : 'text-gray-300'}`}>{style.name}</p>
                                        <p className="text-xs text-gray-500 uppercase">{style.title}</p>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400 leading-relaxed">{style.desc}</p>
                                {selectedPersonaId === style.id && (
                                    <div className={`absolute top-2 right-2 w-3 h-3 rounded-full bg-${style.color}-500 shadow-[0_0_10px_currentColor]`}></div>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-700 gap-3">
                        <button onClick={() => setIsSetupModalOpen(false)} className="btn btn-secondary">Hủy</button>
                        <button 
                            onClick={handleSavePersona} 
                            className="btn btn-primary"
                            disabled={myCourses.length > 0 && !selectedCourseId}
                        >
                            Lưu Cấu Hình
                        </button>
                    </div>
                </div>
            </Modal>

            {/* DEPLOY LESSON MODAL */}
            <Modal isOpen={isDeployModalOpen} onClose={() => setIsDeployModalOpen(false)} title="🚀 Triển khai Bài học (Instant Deploy)" size="lg">
                <div className="space-y-6">
                    <div className="bg-green-900/20 border border-green-500/50 p-4 rounded-lg flex items-center gap-3">
                        <div className="text-2xl">✨</div>
                        <div>
                            <p className="text-green-300 font-bold text-sm">Chuyển đổi hội thoại thành bài học</p>
                            <p className="text-gray-400 text-xs">Nội dung này sẽ được thêm trực tiếp vào giáo trình khóa học.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-300 mb-1">Khóa học đích</label>
                            <select 
                                className="form-select w-full"
                                value={targetCourseId}
                                onChange={(e) => setTargetCourseId(e.target.value)}
                            >
                                <option value="">-- Chọn khóa học --</option>
                                {myCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-300 mb-1">Tiêu đề bài học</label>
                            <input 
                                type="text" 
                                className="form-input w-full"
                                value={deployTitle}
                                onChange={(e) => setDeployTitle(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-300 mb-1">Nội dung (Preview)</label>
                        <textarea 
                            className="form-textarea w-full h-48 font-mono text-xs"
                            value={deployContent}
                            onChange={(e) => setDeployContent(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setIsDeployModalOpen(false)} className="btn btn-secondary">Hủy</button>
                        <button 
                            onClick={confirmDeploy} 
                            disabled={!targetCourseId}
                            className="btn btn-primary bg-gradient-to-r from-green-600 to-teal-600 border-none shadow-lg"
                        >
                            🚀 Deploy Now
                        </button>
                    </div>
                </div>
            </Modal>

            {/* BOSS CHALLENGE MODAL */}
            <Modal isOpen={isChallengeModalOpen} onClose={() => setIsChallengeModalOpen(false)} title="⚔️ Issue Commander's Challenge" size="lg">
                <div className="space-y-6">
                    <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-lg flex items-center gap-3 animate-pulse">
                        <div className="text-3xl">👹</div>
                        <div>
                            <p className="text-red-300 font-bold text-sm">CẢNH BÁO BOSS RAID</p>
                            <p className="text-gray-400 text-xs">Bạn đang tạo một nhiệm vụ cấp S. Học sinh hoàn thành sẽ nhận thưởng x2 XP.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-300 mb-1">Chiến trường (Khóa học)</label>
                            <select 
                                className="form-select w-full"
                                value={targetCourseId}
                                onChange={(e) => setTargetCourseId(e.target.value)}
                            >
                                <option value="">-- Chọn khóa học --</option>
                                {myCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-300 mb-1">Tên Nhiệm vụ (Boss Name)</label>
                            <input 
                                type="text" 
                                className="form-input w-full text-red-200 font-bold"
                                value={challengeTitle}
                                onChange={(e) => setChallengeTitle(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-300 mb-1">Phần thưởng XP</label>
                        <input 
                            type="range" min="100" max="1000" step="50"
                            className="w-full accent-red-500"
                            value={challengeReward}
                            onChange={(e) => setChallengeReward(Number(e.target.value))}
                        />
                        <p className="text-right text-yellow-400 font-bold">{challengeReward} XP</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-300 mb-1">Mô tả Nhiệm vụ</label>
                        <textarea 
                            className="form-textarea w-full h-32 font-mono text-xs bg-black/40 border-red-900/50"
                            value={challengeContent}
                            onChange={(e) => setChallengeContent(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setIsChallengeModalOpen(false)} className="btn btn-secondary">Rút lui</button>
                        <button 
                            onClick={confirmChallenge} 
                            disabled={!targetCourseId}
                            className="btn btn-primary bg-gradient-to-r from-red-600 to-orange-600 border-none shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                        >
                            ⚔️ PHÁT LỆNH TẤN CÔNG
                        </button>
                    </div>
                </div>
            </Modal>

            {/* --- ONBOARDING TOUR --- */}
            <OnboardingTour 
                steps={tourSteps} 
                isOpen={isTourOpen} 
                onComplete={handleTourComplete}
                onSkip={handleTourComplete}
            />
        </div>
    );
};

export default GeminiTeacherPage;
