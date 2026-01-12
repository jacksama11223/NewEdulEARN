
import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import { AuthContext, DataContext, GlobalStateContext, PageContext, PetContext } from '../../contexts/AppProviders';
import LessonContent from '../lesson/LessonContent';
import LessonDiscussion from '../lesson/LessonDiscussion';
import VideoNotesSidebar from '../lesson/VideoNotesSidebar';
import QuickTestModal from '../modals/QuickTestModal';
import HarvestModal from '../modals/HarvestModal';
import OnboardingTour, { TourStep } from '../common/OnboardingTour';
import { generateQuickLessonQuiz } from '../../services/geminiService';
import LoadingSpinner from '../common/LoadingSpinner';
import type { QuizQuestion } from '../../types';

interface LessonPageProps {
    lessonId: string;
}

const LessonPage: React.FC<LessonPageProps> = ({ lessonId }) => {
    const { db, editLessonContent, addDiscussionPost, addVideoNote, deleteVideoNote, markLessonComplete, createPersonalNote, awardXP } = useContext(DataContext)!;
    const { user } = useContext(AuthContext)!;
    const { navigate } = useContext(PageContext)!;
    const { serviceStatus, setPage: setGlobalPage } = useContext(GlobalStateContext)!;
    const { triggerReaction, say } = useContext(PetContext)!;

    const lesson = useMemo(() => db.LESSONS[lessonId], [db.LESSONS, lessonId]);
    const course = useMemo(() => lesson ? db.COURSES.find(c => c.id === lesson.courseId) : null, [db.COURSES, lesson]);
    const discussion = useMemo(() => db.DISCUSSION[lessonId] || [], [db.DISCUSSION, lessonId]);
    const videoNotes = useMemo(() => 
        (db.VIDEO_NOTES && db.VIDEO_NOTES[lessonId] ? db.VIDEO_NOTES[lessonId].filter(n => n.userId === user?.id) : []), 
    [db.VIDEO_NOTES, lessonId, user?.id]);

    // State for Player
    const [currentTime, setCurrentTime] = useState(0);
    // Using HTMLIFrameElement for raw iframe control
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // --- QUICK NOTE STATE ---
    const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
    const [quickNoteContent, setQuickNoteContent] = useState('');
    const [quickNoteTitle, setQuickNoteTitle] = useState('');

    // --- QUICK TEST STATE ---
    const [isQuickTestOpen, setIsQuickTestOpen] = useState(false);
    const [isGeneratingTest, setIsGeneratingTest] = useState(false);
    const [quickTestQuestions, setQuickTestQuestions] = useState<QuizQuestion[]>([]);

    // --- HARVEST RITUAL STATE ---
    const [isHarvestModalOpen, setIsHarvestModalOpen] = useState(false);

    // --- CONFUSION DETECTION STATE ---
    const [showRescueBubble, setShowRescueBubble] = useState(false);
    
    // --- ONBOARDING TOUR STATE ---
    const [isTourOpen, setIsTourOpen] = useState(false);

    // Note: With raw iframe, precise 'onProgress' for confusion detection is limited without heavy API boilerplate.
    // We retain the UI logic but it won't auto-trigger based on seek/rewind in this 'Safe Mode' implementation.

    const isContentServiceOk = serviceStatus.content_delivery === 'OPERATIONAL';
    const isForumServiceOk = serviceStatus.forum_service === 'OPERATIONAL';
    const isCourseServiceOk = serviceStatus.course_management === 'OPERATIONAL';

    const isCompleted = useMemo(() => user ? db.LESSON_PROGRESS?.[user.id]?.includes(lessonId) : false, [db.LESSON_PROGRESS, user, lessonId]);

    // --- EFFECT: Keyboard Shortcut for Quick Note ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            if (e.key.toLowerCase() === 'n') {
                e.preventDefault();
                toggleQuickNote();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lesson]);

    // --- EFFECT: Check Onboarding ---
    useEffect(() => {
        if (lesson?.type === 'video') {
            const hasSeenVideoTour = localStorage.getItem('hasSeenVideoTour');
            if (!hasSeenVideoTour) {
                // Short delay to ensure rendering
                setTimeout(() => setIsTourOpen(true), 1500);
            }
        }
    }, [lesson]);

    const handleTourComplete = () => {
        setIsTourOpen(false);
        localStorage.setItem('hasSeenVideoTour', 'true');
    };

    const videoTourSteps: TourStep[] = [
        {
            targetId: 'video-player-container',
            title: 'Trình phát Video',
            content: 'Đây là bài giảng. Bạn có thể tua nhanh nếu muốn.',
            position: 'bottom'
        },
        {
            targetId: 'video-notes-input',
            title: 'Ghi chú thông minh',
            content: 'Đừng chỉ xem! Hãy ghi chú tại đây, hệ thống sẽ lưu lại timestamp chính xác.',
            position: 'left'
        },
        {
            targetId: 'btn-quick-test',
            title: 'Kiểm tra nhanh',
            content: 'Học xong nhớ kiểm tra kiến thức để kiếm vật phẩm nhé.',
            position: 'bottom'
        }
    ];

    const toggleQuickNote = () => {
        setIsQuickNoteOpen(prev => {
            const newState = !prev;
            if (newState && lesson) {
                setQuickNoteTitle(`Ghi chú: ${lesson.title}`);
            }
            return newState;
        });
    };

    const handleSaveQuickNote = () => {
        if (!user || !quickNoteContent.trim()) return;
        
        createPersonalNote(
            user.id, 
            quickNoteTitle || `Ghi chú bài học ${lessonId}`, 
            quickNoteContent, 
            { lessonId: lessonId }
        );
        
        alert("Đã lưu vào Sổ tay!");
        setQuickNoteContent('');
        setIsQuickNoteOpen(false);
    };

    const handleAcceptHelp = () => {
        if (!lesson) return;
        setShowRescueBubble(false);
        const timestamp = new Date(currentTime * 1000).toISOString().substr(11, 8);
        
        // Use Persona Binding from Course, fallback to Guardian
        const autoPersona = course?.defaultPersona || 'guardian';

        navigate('gemini_student', { 
            initialPrompt: `Tôi đang xem bài học "${lesson.title}" và cảm thấy khó hiểu ở đoạn thời gian ${timestamp}. Hãy giải thích chi tiết nội dung này cho tôi dễ hiểu hơn.`,
            autoPersona: autoPersona, 
            autoThinking: true 
        });
    };

    // --- QUICK TEST HANDLER ---
    const handleQuickTest = async () => {
        if (!lesson || !user) return;
        
        const apiKey = db.USERS[user.id]?.apiKey;
        if (!apiKey) {
            setGlobalPage('api_key', { isApiKeyModalOpen: true });
            return;
        }

        setIsGeneratingTest(true);
        setIsPlaying(false);

        try {
            const context = lesson.type === 'text' ? lesson.content : `Video lesson titled: ${lesson.title}. Generate general knowledge questions about this topic.`;
            const questions = await generateQuickLessonQuiz(apiKey, lesson.title, context);
            if (questions.length > 0) {
                setQuickTestQuestions(questions);
                setIsQuickTestOpen(true);
            } else {
                alert("AI không tạo được câu hỏi. Vui lòng thử lại.");
            }
        } catch (e: any) {
            alert("Lỗi tạo Quiz: " + e.message);
        } finally {
            setIsGeneratingTest(false);
        }
    };

    // --- HANDLERS ---
    const handleSeekTo = useCallback((seconds: number) => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
            // Send YouTube IFrame API command to seek
            iframeRef.current.contentWindow.postMessage(JSON.stringify({
                event: 'command',
                func: 'seekTo',
                args: [seconds, true]
            }), '*');
            setCurrentTime(seconds); // Optimistically update UI
        }
    }, []);

    const handleInputFocus = useCallback(() => {
        // Optional: pause video on typing note
    }, []);

    const handleAddNote = useCallback((text: string) => {
        if (!user) return;
        addVideoNote(lessonId, user.id, Math.floor(currentTime), text);
    }, [user, currentTime, lessonId, addVideoNote]);

    const handleSaveContent = useCallback((newContent: string) => {
        if (!isCourseServiceOk) {
            alert("Dịch vụ đang bảo trì.");
            return;
        }
        editLessonContent(lessonId, newContent);
        alert("Đã lưu nội dung!");
    }, [isCourseServiceOk, lessonId, editLessonContent]);

    const handlePostDiscussion = useCallback((text: string) => {
         if (!user) return;
         addDiscussionPost(lessonId, user, text);
    }, [user, lessonId, addDiscussionPost]);

    const handleMarkCompleteClick = () => {
        if (!user || !lesson) return;
        if (isCompleted) {
            alert("Bạn đã hoàn thành bài học này rồi.");
            return;
        }
        // Open Harvest Modal
        setIsHarvestModalOpen(true);
    };

    const handleHarvest = (content: string) => {
        if (!user || !lesson) return;
        
        // Check if first lesson (progress empty)
        const currentProgress = db.LESSON_PROGRESS[user.id] || [];
        const isFirstLesson = currentProgress.length === 0;

        // 1. Create Note
        createPersonalNote(
            user.id, 
            `Key Takeaway: ${lesson.title}`, 
            content, 
            { lessonId: lesson.id, tags: ['#KeyTakeaways'] }
        );

        // 2. Mark Complete
        markLessonComplete(user.id, lesson.id);
        
        // 3. Award XP
        awardXP(50);

        setIsHarvestModalOpen(false);
        
        // FLOW: Economy Intro
        if (isFirstLesson) {
            triggerReaction('hover_coin');
            say("Woah! Cậu vừa kiếm được XP đầu tiên! Tích đủ kim cương thì ghé Cửa Hàng mua áo mới cho tớ nhé!", 8000);
        } else {
            triggerReaction('success');
        }
        
        alert("🎉 Đã thu hoạch thành công! +50 XP");
    };

    const handleSkipHarvest = () => {
        if (!user || !lesson) return;
        markLessonComplete(user.id, lesson.id);
        setIsHarvestModalOpen(false);
        alert("Đã hoàn thành bài học!");
    };

    if (!lesson) {
        return (
            <div className="text-red-500 card p-6">
                Lỗi: Không tìm thấy thông tin bài học.
                <button onClick={() => navigate('dashboard')} className="text-sm text-blue-400 hover:underline mt-4 block">
                    &larr; Quay lại Dashboard
                </button>
            </div>
        );
    }

    const isVideo = lesson.type === 'video';

    return (
        <div className="max-w-7xl mx-auto space-y-6 relative">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <button 
                        onClick={() => navigate('course_detail', { courseId: lesson.courseId })} 
                        className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-blue-300 hover:bg-blue-500/20 hover:text-white hover:border-blue-400 hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-300 backdrop-blur-md w-fit mb-3"
                    >
                        <span>&larr;</span> <span className="font-medium">Quay lại Lộ trình</span>
                    </button>
                    <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 drop-shadow-md">{lesson.title}</h1>
                </div>
                <div className="flex gap-3">
                    <button 
                        id="btn-quick-test"
                        onClick={handleQuickTest}
                        disabled={isGeneratingTest}
                        className="btn px-4 py-3 bg-yellow-900/50 border border-yellow-500/50 text-yellow-200 hover:bg-yellow-600 hover:text-white shadow-lg flex items-center gap-2 animate-pulse hover:animate-none"
                    >
                        {isGeneratingTest ? <LoadingSpinner size={4} /> : '⚡ Test Nhanh'}
                    </button>
                    <button 
                        onClick={toggleQuickNote}
                        className="btn px-4 py-3 bg-indigo-900/50 border border-indigo-500/50 text-indigo-200 hover:bg-indigo-500 hover:text-white shadow-lg flex items-center gap-2"
                        title="Phím tắt: N"
                    >
                        <span>📓</span> Sổ tay
                    </button>
                    <button 
                        onClick={handleMarkCompleteClick}
                        disabled={isCompleted}
                        className={`btn px-6 py-3 text-lg shadow-lg ${isCompleted ? 'btn-secondary border-green-500 text-green-400' : 'btn-primary'}`}
                    >
                        {isCompleted ? '✅ Đã hoàn thành' : '⭕ Đánh dấu Hoàn thành'}
                    </button>
                </div>
            </div>

            <div className={`grid grid-cols-1 gap-8 ${isVideo ? 'lg:grid-cols-3' : ''}`}>
                {/* --- Main Content Area --- */}
                <div className={`${isVideo ? 'lg:col-span-2' : 'w-full'} space-y-6`}>
                     <div id="video-player-container" className="card p-0 overflow-hidden bg-black border border-gray-700 shadow-2xl relative">
                        {isVideo ? (
                            <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                                {/* RAW IFRAME IMPLEMENTATION TO FIX ERROR 153 */}
                                <iframe
                                    ref={iframeRef}
                                    src={`${lesson.content}${lesson.content.includes('?') ? '&' : '?'}enablejsapi=1`}
                                    title="YouTube video player"
                                    className="absolute top-0 left-0 w-full h-full"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    referrerPolicy="strict-origin-when-cross-origin"
                                    allowFullScreen
                                ></iframe>
                            </div>
                        ) : (
                            <LessonContent 
                                content={lesson.content}
                                type={lesson.type}
                                isTeacher={user?.role === 'TEACHER'}
                                isServiceOk={isCourseServiceOk}
                                onSave={handleSaveContent}
                            />
                        )}
                    </div>

                    <LessonDiscussion 
                        posts={discussion}
                        user={user ? { id: user.id, name: user.name, role: user.role, isLocked: false, apiKey: null } : null}
                        isServiceOk={isForumServiceOk}
                        onPost={handlePostDiscussion}
                    />
                </div>

                {/* --- Sidebar (Video Only) --- */}
                {isVideo && (
                    <div className="lg:col-span-1">
                        <VideoNotesSidebar 
                            notes={videoNotes}
                            currentTime={currentTime}
                            onSeek={handleSeekTo}
                            onAddNote={handleAddNote}
                            onDeleteNote={(noteId) => deleteVideoNote(lessonId, noteId)}
                            onInputFocus={handleInputFocus}
                        />
                    </div>
                )}
            </div>

            {/* --- QUICK NOTE SIDE PANEL --- */}
            {isQuickNoteOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
                    onClick={toggleQuickNote}
                ></div>
            )}
            
            <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-gray-900 border-l border-gray-700 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isQuickNoteOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <span>📓</span> Sổ Tay Nhanh
                        </h2>
                        <button onClick={toggleQuickNote} className="text-gray-400 hover:text-white text-xl">&times;</button>
                    </div>
                    
                    <div className="flex-1 p-4 flex flex-col gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tiêu đề</label>
                            <input 
                                type="text" 
                                className="form-input w-full" 
                                value={quickNoteTitle}
                                onChange={e => setQuickNoteTitle(e.target.value)}
                            />
                        </div>
                        <div className="flex-1 flex flex-col">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nội dung</label>
                            <textarea 
                                className="form-textarea w-full flex-1 resize-none" 
                                placeholder="Ghi lại ý tưởng..."
                                value={quickNoteContent}
                                onChange={e => setQuickNoteContent(e.target.value)}
                                autoFocus
                            ></textarea>
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-700 bg-gray-800 flex justify-end gap-3">
                        <button onClick={toggleQuickNote} className="btn btn-secondary text-sm">Hủy</button>
                        <button onClick={handleSaveQuickNote} className="btn btn-primary text-sm shadow-lg">Lưu Ghi chú</button>
                    </div>
                </div>
            </div>

            {/* --- PET RESCUE BUBBLE --- */}
            {showRescueBubble && (
                <div className="fixed bottom-36 right-8 z-[70] animate-pop-in">
                    <div className="relative bg-white text-gray-900 p-4 rounded-2xl rounded-br-none shadow-[0_0_30px_rgba(37,99,235,0.5)] border-2 border-blue-500 max-w-xs">
                        <div className="absolute -bottom-2 -right-0 w-4 h-4 bg-white border-r-2 border-b-2 border-blue-500 transform rotate-45 translate-y-1/2"></div>
                        
                        <div className="flex items-start gap-3">
                            <div className="text-3xl">🤔</div>
                            <div>
                                <p className="font-bold text-sm mb-1 text-blue-600">Bạn có vẻ đang bối rối?</p>
                                <p className="text-xs text-gray-600 leading-snug">
                                    Đoạn này khó hiểu phải không? Để tôi nhờ Gemini giải thích chi tiết nhé?
                                </p>
                            </div>
                        </div>
                        
                        <div className="mt-3 flex gap-2">
                            <button 
                                onClick={() => setShowRescueBubble(false)}
                                className="flex-1 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Không cần
                            </button>
                            <button 
                                onClick={handleAcceptHelp}
                                className="flex-1 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-all flex items-center justify-center gap-1"
                            >
                                <span>🧠</span> Giải thích ngay
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- QUICK TEST MODAL --- */}
            <QuickTestModal 
                isOpen={isQuickTestOpen}
                onClose={() => setIsQuickTestOpen(false)}
                questions={quickTestQuestions}
            />

            {/* --- HARVEST MODAL --- */}
            <HarvestModal 
                isOpen={isHarvestModalOpen}
                onClose={() => setIsHarvestModalOpen(false)}
                lessonTitle={lesson.title}
                lessonContent={lesson.type === 'text' ? lesson.content : lesson.title} // Simplified context for video
                onHarvest={handleHarvest}
                onSkip={handleSkipHarvest}
            />

            {/* --- ONBOARDING TOUR --- */}
            <OnboardingTour 
                steps={videoTourSteps} 
                isOpen={isTourOpen} 
                onComplete={handleTourComplete}
                onSkip={handleTourComplete}
            />
        </div>
    );
};

export default LessonPage;
