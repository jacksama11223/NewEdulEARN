
// ... existing imports ...
import React, { useState, useContext, useMemo, useCallback } from 'react';
import { DataContext, GlobalStateContext, PageContext, AuthContext } from '../../contexts/AppProviders';
import Modal from '../common/Modal';
import { generateJesterExplanation } from '../../services/geminiService'; // Import new service
import LoadingSpinner from '../common/LoadingSpinner';
import OnboardingTour, { TourStep } from '../common/OnboardingTour'; // Added import
import type { FileSubmission, User, QuizSubmission, Quiz, Assignment } from '../../types';

// ... existing FileViewerModal, QuizResultModal ...

interface FileViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileName?: string | null;
}
const FileViewerModal: React.FC<FileViewerModalProps> = ({ isOpen, onClose, fileName }) => (
    <Modal isOpen={isOpen} onClose={onClose} title={`Xem file (Demo): ${fileName}`} size="xl">
        <div className="bg-gray-900 p-6 rounded-lg max-h-[60vh] overflow-y-auto">
            <p className="text-gray-300 font-mono whitespace-pre-wrap">
                --- Bắt đầu nội dung file .docx (Giả lập) ---<br /><br />
                <span className="font-bold text-lg text-gradient">Tiêu đề: {fileName}</span><br /><br />
                Đây là nội dung giả lập cho file .docx mà sinh viên đã nộp.<br />
                Giáo viên có thể đọc, nhận xét và chấm điểm dựa trên nội dung này.<br /><br />
                --- Kết thúc nội dung file ---
            </p>
        </div>
    </Modal>
);

interface QuizResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentName: string;
    submission: QuizSubmission;
    quiz: Quiz;
}
const QuizResultModal: React.FC<QuizResultModalProps> = ({ isOpen, onClose, studentName, submission, quiz }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Chi tiết bài làm: ${studentName}`} size="xl">
            <div className="p-4 space-y-6">
                <div className="flex justify-between items-center bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <div>
                        <p className="text-gray-400 text-sm uppercase font-bold">Điểm số</p>
                        <p className="text-3xl font-black text-white">{submission.score} / {submission.total}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm uppercase font-bold">Tỷ lệ</p>
                        <p className={`text-3xl font-black ${submission.percentage >= 80 ? 'text-green-400' : submission.percentage >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {submission.percentage.toFixed(1)}%
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-gray-400 text-sm uppercase font-bold">Thời gian nộp</p>
                        <p className="text-white font-mono">{new Date(submission.timestamp).toLocaleString()}</p>
                    </div>
                </div>

                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                    {quiz.questions.map((q, idx) => {
                        const userAns = submission.answers[q.id];
                        const isCorrect = userAns === q.correctAnswer;
                        return (
                            <div key={q.id} className={`p-4 rounded-lg border-l-4 ${isCorrect ? 'bg-green-900/10 border-green-500' : 'bg-red-900/10 border-red-500'}`}>
                                <p className="font-semibold text-gray-200 mb-2">Câu {idx + 1}: {q.text}</p>
                                <div className="space-y-1">
                                    {q.options.map((opt, oIdx) => {
                                        let icon = "⚪";
                                        let style = "text-gray-500";
                                        
                                        if (oIdx === q.correctAnswer) {
                                            icon = "✅"; // Correct answer
                                            style = "text-green-400 font-bold";
                                        }
                                        
                                        if (oIdx === userAns) {
                                            if (isCorrect) {
                                                icon = "✅ (SV Chọn)";
                                            } else {
                                                icon = "❌ (SV Chọn)";
                                                style = "text-red-400 line-through";
                                            }
                                        }

                                        return (
                                            <div key={oIdx} className={`flex items-center gap-2 text-sm ${style}`}>
                                                <span>{icon}</span>
                                                <span>{opt}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-end pt-4 border-t border-gray-700">
                    <button onClick={onClose} className="btn btn-primary">Đóng</button>
                </div>
            </div>
        </Modal>
    );
};

interface InterventionModalProps {
    isOpen: boolean;
    onClose: () => void;
    questionText: string;
    correctAnswerText: string;
    studentCount: number;
    onSend: (text: string) => void;
}
const InterventionModal: React.FC<InterventionModalProps> = ({ isOpen, onClose, questionText, correctAnswerText, studentCount, onSend }) => {
    const { user } = useContext(AuthContext)!;
    const { db } = useContext(DataContext)!;
    const { setPage: setGlobalPage } = useContext(GlobalStateContext)!;
    
    const [explanation, setExplanation] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleSubmit = () => {
        if (!explanation.trim()) return;
        onSend(explanation);
        setExplanation('');
    };

    const handleAutoGenerate = async () => {
        const apiKey = user ? db.USERS[user.id]?.apiKey : null;
        if (!apiKey) {
            setGlobalPage('api_key', { isApiKeyModalOpen: true });
            return;
        }

        setIsGenerating(true);
        try {
            const result = await generateJesterExplanation(apiKey, questionText, correctAnswerText);
            setExplanation(result);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="📢 Phòng Khám Học Tập (Intervention)" size="lg">
            <div className="space-y-4">
                <div className="bg-red-900/20 border-l-4 border-red-500 p-4 rounded">
                    <p className="text-gray-400 text-xs uppercase font-bold">Vấn đề</p>
                    <p className="text-white font-medium mt-1">{studentCount} học sinh đã trả lời sai câu hỏi này:</p>
                    <p className="text-gray-300 italic mt-2">"{questionText}"</p>
                    <p className="text-green-400 text-xs mt-1">Đáp án đúng: {correctAnswerText}</p>
                </div>
                
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-bold text-gray-300">Lời giảng / Gợi ý:</label>
                        <button 
                            onClick={handleAutoGenerate}
                            disabled={isGenerating}
                            className="btn btn-xs bg-gradient-to-r from-orange-600 to-purple-600 text-white border-none shadow-md animate-pulse flex items-center gap-1"
                        >
                            {isGenerating ? <LoadingSpinner size={3} /> : '🤡 Jester Explain (AI)'}
                        </button>
                    </div>
                    <textarea 
                        className="form-textarea w-full h-40" 
                        placeholder={isGenerating ? "Jester đang suy nghĩ trò đùa..." : "Giải thích lại khái niệm, đưa ra ví dụ, hoặc gợi ý..."}
                        value={explanation}
                        onChange={(e) => setExplanation(e.target.value)}
                        disabled={isGenerating}
                    ></textarea>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button onClick={onClose} className="btn btn-secondary">Hủy</button>
                    <button onClick={handleSubmit} className="btn btn-primary bg-blue-600 hover:bg-blue-500 shadow-lg">
                        Gửi Thông Báo ({studentCount})
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// ... existing RewardStudentModal ...
interface RewardStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: User | null;
    onSend: (type: 'diamond' | 'item', value: number | string, message: string) => void;
}

const RewardStudentModal: React.FC<RewardStudentModalProps> = ({ isOpen, onClose, student, onSend }) => {
    const [rewardType, setRewardType] = useState<'diamond' | 'item'>('diamond');
    const [message, setMessage] = useState('Em làm bài rất tốt! Tiếp tục phát huy nhé! 🌟');

    const handleSend = () => {
        if (!student) return;
        const value = rewardType === 'diamond' ? 100 : 'badge_scholar'; // Mock item ID
        onSend(rewardType, value, message);
        onClose();
    };

    if (!isOpen || !student) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`🎁 Tặng thưởng: ${student.name}`} size="md">
            <div className="space-y-6 p-2">
                <div className="text-center">
                    <div className="text-6xl animate-bounce mb-2">🎁</div>
                    <p className="text-gray-300">Gửi quà để động viên tinh thần học tập.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => setRewardType('diamond')}
                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${rewardType === 'diamond' ? 'bg-blue-900/40 border-blue-400 shadow-lg scale-105' : 'bg-gray-800 border-gray-700 opacity-60'}`}
                    >
                        <span className="text-3xl">💎</span>
                        <span className="font-bold text-blue-300">100 Kim Cương</span>
                    </button>
                    <button 
                        onClick={() => setRewardType('item')}
                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${rewardType === 'item' ? 'bg-yellow-900/40 border-yellow-400 shadow-lg scale-105' : 'bg-gray-800 border-gray-700 opacity-60'}`}
                    >
                        <span className="text-3xl">🏅</span>
                        <span className="font-bold text-yellow-300">Huy hiệu Học Bá</span>
                    </button>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Lời khen ngợi</label>
                    <textarea 
                        className="form-textarea w-full"
                        rows={3}
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                    ></textarea>
                </div>

                <div className="flex justify-end pt-2 gap-2">
                    <button onClick={onClose} className="btn btn-secondary">Hủy</button>
                    <button onClick={handleSend} className="btn btn-primary bg-gradient-to-r from-yellow-600 to-orange-600 border-none shadow-[0_0_15px_rgba(234,179,8,0.5)]">
                        Gửi Quà Ngay
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// --- MAIN PAGE ---

interface GradebookPageProps {
    assignmentId: string;
}
const GradebookPage: React.FC<GradebookPageProps> = ({ assignmentId }) => {
    const { user } = useContext(AuthContext)!;
    const { db, gradeFileSubmission, sendIntervention, sendReward } = useContext(DataContext)!;
    const { navigate } = useContext(PageContext)!;
    const { serviceStatus } = useContext(GlobalStateContext)!;

    const isGradingServiceOk = serviceStatus.grading_service === 'OPERATIONAL';
    const isStorageServiceOk = serviceStatus.storage_service === 'OPERATIONAL';

    // -- State --
    const [activeTab, setActiveTab] = useState<'students' | 'questions'>('students');
    const [currentFileSub, setCurrentFileSub] = useState<FileSubmission | null>(null);
    const [gradeInput, setGradeInput] = useState('');
    const [feedbackInput, setFeedbackInput] = useState('');
    const [isFileViewerOpen, setIsFileViewerOpen] = useState(false);
    const [viewingQuizSub, setViewingQuizSub] = useState<{ studentName: string, sub: QuizSubmission } | null>(null);
    
    // Intervention Data State - Now includes correctAnswer
    const [interventionData, setInterventionData] = useState<{ questionId: string, questionText: string, correctAnswerText: string, studentIds: string[] } | null>(null);
    
    // Reward Modal State
    const [rewardTarget, setRewardTarget] = useState<User | null>(null);

    // ONBOARDING TOUR STATE
    const [isTourOpen, setIsTourOpen] = useState(false);

    // -- Data Fetching --
    const assignment = useMemo(() => db.ASSIGNMENTS[assignmentId], [db.ASSIGNMENTS, assignmentId]);
    const course = useMemo(() => assignment ? db.COURSES.find(c => c.id === assignment.courseId) : null, [db.COURSES, assignment]);
    const quiz = useMemo(() => (assignment?.type === 'quiz' && assignment.quizId) ? db.QUIZZES[assignment.quizId] : null, [db.QUIZZES, assignment]);
    
    const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN';

    // Unified Student List Logic
    const studentRows = useMemo(() => {
        if (!assignment || !user) return [];
        
        const students = (Object.values(db.USERS) as User[])
            .filter(u => u.role === 'STUDENT')
            .filter(u => isTeacher ? true : u.id === user.id);
        
        return students.map(student => {
            let submissionStatus: 'Chưa nộp' | 'Đã nộp' | 'Đã chấm' = 'Chưa nộp';
            let submittedAt = null;
            let scoreDisplay: React.ReactNode = '-';
            let detailDisplay: React.ReactNode = '-';
            let rawSubmission: any = null;
            let canReward = false;

            if (assignment.type === 'file') {
                const sub = db.FILE_SUBMISSIONS[assignmentId]?.find(s => s.studentId === student.id);
                if (sub) {
                    rawSubmission = sub;
                    submissionStatus = sub.status;
                    submittedAt = sub.timestamp;
                    scoreDisplay = sub.grade !== null ? <span className="font-bold text-white">{sub.grade}</span> : <span className="text-gray-500">-</span>;
                    detailDisplay = sub.fileName ? <span className="font-mono text-xs text-blue-300 bg-blue-900/20 px-2 py-1 rounded">{sub.fileName}</span> : '-';
                    if (sub.grade && sub.grade >= 9.0) canReward = true;
                }
            } else if (assignment.type === 'quiz' && assignment.quizId) {
                const sub = db.QUIZ_SUBMISSIONS[assignment.quizId]?.[student.id];
                if (sub) {
                    rawSubmission = sub;
                    submissionStatus = 'Đã nộp';
                    submittedAt = sub.timestamp;
                    scoreDisplay = <span className="font-bold text-white">{sub.score} / {sub.total}</span>;
                    detailDisplay = (
                        <span className={`font-bold ${sub.percentage >= 80 ? 'text-green-400' : sub.percentage >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {sub.percentage.toFixed(0)}%
                        </span>
                    );
                    if (sub.percentage >= 90) canReward = true;
                }
            }

            return {
                student,
                submissionStatus,
                submittedAt,
                scoreDisplay,
                detailDisplay,
                rawSubmission,
                canReward
            };
        });
    }, [db.USERS, db.FILE_SUBMISSIONS, db.QUIZ_SUBMISSIONS, assignment, assignmentId, user, isTeacher]);

    // ... existing questionStats logic ...
    const questionStats = useMemo(() => {
        if (!quiz || !assignment.quizId) return [];
        return quiz.questions.map(q => {
            let correctCount = 0;
            let wrongStudentIds: string[] = [];
            const quizSubs = db.QUIZ_SUBMISSIONS[assignment.quizId!] || {};
            Object.entries(quizSubs).forEach(([studentId, sub]) => {
                const submission = sub as QuizSubmission | null;
                if (submission) {
                    if (submission.answers[q.id] === q.correctAnswer) { correctCount++; } 
                    else { wrongStudentIds.push(studentId); }
                }
            });
            const total = correctCount + wrongStudentIds.length;
            const percentage = total > 0 ? (correctCount / total) * 100 : 0;
            return { question: q, correctCount, wrongCount: total - correctCount, wrongStudentIds, percentage, total };
        });
    }, [quiz, db.QUIZ_SUBMISSIONS, assignment]);

    // -- Handlers --
    const handleOpenFileGrading = useCallback((sub: FileSubmission) => {
        setCurrentFileSub(sub);
        setGradeInput(sub.grade != null ? String(sub.grade) : '');
        setFeedbackInput(sub.feedback || '');
        
        // Trigger Tour
        const hasSeen = localStorage.getItem('hasSeenSpeedGradingTour');
        if (!hasSeen) {
            setTimeout(() => setIsTourOpen(true), 500);
        }
    }, []);

    const handleTourComplete = () => {
        setIsTourOpen(false);
        localStorage.setItem('hasSeenSpeedGradingTour', 'true');
    };

    const tourSteps: TourStep[] = [
        {
            targetId: 'btn-view-file',
            title: 'Xem nội dung',
            content: 'Xem bài làm của sinh viên.',
            position: 'bottom'
        },
        {
            targetId: 'input-grade',
            title: 'Chấm điểm',
            content: 'Nhập điểm và nhận xét nhanh tại đây.',
            position: 'left'
        }
    ];

    const handleSaveGrade = useCallback(() => {
        if (!currentFileSub || !isGradingServiceOk) { alert("Dịch vụ chấm điểm đang bảo trì."); return; }
        const gradeNum = parseFloat(gradeInput);
        if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 10) { alert("Điểm không hợp lệ."); return; }
        gradeFileSubmission(assignmentId, currentFileSub.studentId, gradeNum, feedbackInput);
        setCurrentFileSub(null);
        alert("Đã lưu điểm!");
    }, [currentFileSub, gradeInput, feedbackInput, assignmentId, gradeFileSubmission, isGradingServiceOk]);

    const handleInterventionClick = (qStat: any) => {
        // Extract correct answer text from options
        const correctAnswerText = qStat.question.options[qStat.question.correctAnswer];
        setInterventionData({ 
            questionId: qStat.question.id, 
            questionText: qStat.question.text, 
            correctAnswerText: correctAnswerText,
            studentIds: qStat.wrongStudentIds 
        });
    };

    const handleSendIntervention = (text: string) => {
        if (interventionData) {
            sendIntervention(assignmentId, interventionData.questionId, text, interventionData.studentIds);
            alert(`Đã gửi thông báo giảng lại cho ${interventionData.studentIds.length} học sinh!`);
            setInterventionData(null);
        }
    };

    const handleDispute = (submission: any) => {
        if (!course || !assignment) return;
        const teacher = (Object.values(db.USERS) as User[]).find(u => u.role === 'TEACHER' && u.name === course.teacher);
        if (!teacher) { alert("Không tìm thấy giáo viên."); return; }
        const disputeData = {
            assignmentId: assignment.id,
            assignmentTitle: assignment.title,
            score: assignment.type === 'file' ? submission.grade : submission.score,
            maxScore: assignment.type === 'file' ? 10 : submission.total,
            feedback: assignment.type === 'file' ? submission.feedback : "Quiz Result"
        };
        navigate('chat', { targetUserId: teacher.id, disputeContext: disputeData });
    };

    const handleSendReward = (type: 'diamond' | 'item', value: number | string, message: string) => {
        if (!user || !rewardTarget) return;
        sendReward(user.id, rewardTarget.id, type, value, message);
        alert(`🎁 Đã gửi quà tặng đến ${rewardTarget.name}!`);
        setRewardTarget(null);
    };

    if (!assignment) return <div className="text-red-500 card p-6">Lỗi: Không tìm thấy bài tập ID: {assignmentId}.</div>;
    if (!isGradingServiceOk) return <div className="card p-8 text-center border border-yellow-700"><h2 className="text-2xl font-bold text-yellow-400">Dịch vụ Chấm điểm đang Bảo trì</h2></div>;
    
    const isQuiz = assignment.type === 'quiz';

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <button onClick={() => navigate('assignment_hub')} className="text-sm text-blue-400 hover:underline">&larr; Quay lại</button>
                {isTeacher && (
                    <button 
                        onClick={() => navigate('assignment_creator', { mode: 'edit', assignmentId: assignment.id })}
                        className="btn btn-sm btn-secondary flex items-center gap-2 border-blue-500 text-blue-300 hover:bg-blue-900/30"
                    >
                        <span>✏️</span> Sửa Nội Dung
                    </button>
                )}
            </div>

            <div className="card p-6 border-l-4 border-blue-500">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm text-blue-400 uppercase tracking-wider font-bold">{course?.name}</p>
                        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 mt-1">{assignment.title}</h1>
                        <div className="flex gap-2 mt-2">
                            <span className={`text-xs font-bold px-2 py-1 rounded ${isQuiz ? 'bg-purple-900 text-purple-200 border border-purple-500' : 'bg-green-900 text-green-200 border border-green-500'}`}>
                                {isQuiz ? '⚡ TRẮC NGHIỆM (AUTO)' : '📄 NỘP FILE (MANUAL)'}
                            </span>
                            <span className="text-xs font-bold px-2 py-1 rounded bg-gray-800 text-gray-400 border border-gray-600">
                                {studentRows.length} Sinh viên
                            </span>
                        </div>
                    </div>
                    {isQuiz && quiz && (
                        <div className="text-right">
                            <p className="text-xs text-gray-400">Số câu hỏi</p>
                            <p className="text-xl font-bold text-white">{quiz.questions.length}</p>
                        </div>
                    )}
                </div>
            </div>

            {isQuiz && isTeacher && (
                <div className="flex space-x-4 border-b border-gray-700">
                    <button onClick={() => setActiveTab('students')} className={`pb-2 px-4 font-bold text-sm transition-colors border-b-2 ${activeTab === 'students' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-white'}`}>Danh sách Sinh viên</button>
                    <button onClick={() => setActiveTab('questions')} className={`pb-2 px-4 font-bold text-sm transition-colors border-b-2 ${activeTab === 'questions' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-white'}`}>Phân tích Câu hỏi (The Teacher's Hand)</button>
                </div>
            )}

            {/* TAB: STUDENTS */}
            {activeTab === 'students' && (
                <div className="card p-0 overflow-hidden border border-white/10 shadow-xl animate-fade-in-up">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[800px]">
                            <thead className="bg-black/20 text-xs text-gray-400 uppercase font-bold tracking-wider">
                                <tr>
                                    <th className="p-4">Sinh viên</th>
                                    <th className="p-4 text-center">Trạng thái</th>
                                    <th className="p-4 text-center">{isQuiz ? 'Kết quả' : 'Điểm số'}</th>
                                    <th className="p-4 text-center">{isQuiz ? 'Tỷ lệ (%)' : 'Tên File'}</th>
                                    <th className="p-4">Thời gian nộp</th>
                                    <th className="p-4 text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {studentRows.map(({ student, submissionStatus, submittedAt, scoreDisplay, detailDisplay, rawSubmission, canReward }) => (
                                    <tr key={student.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                                                    {student.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-200 text-sm">{student.name}</p>
                                                    <p className="text-xs text-gray-500 font-mono">{student.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase border ${submissionStatus === 'Đã nộp' || submissionStatus === 'Đã chấm' ? 'bg-green-900/20 text-green-400 border-green-500/30' : 'bg-red-900/20 text-red-400 border-red-500/30'}`}>{submissionStatus}</span>
                                        </td>
                                        <td className="p-4 text-center text-sm">{scoreDisplay}</td>
                                        <td className="p-4 text-center text-sm">{detailDisplay}</td>
                                        <td className="p-4 text-sm text-gray-400 font-mono">{submittedAt ? new Date(submittedAt).toLocaleString() : '-'}</td>
                                        <td className="p-4 text-right flex justify-end gap-2">
                                            {isTeacher && canReward && (
                                                <button 
                                                    onClick={() => setRewardTarget(student)}
                                                    className="btn btn-sm bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-none shadow-[0_0_10px_rgba(234,179,8,0.5)] animate-pulse hover:scale-105"
                                                    title="Tặng thưởng nóng"
                                                >
                                                    🎁
                                                </button>
                                            )}
                                            {isTeacher && (
                                                assignment.type === 'file' ? (
                                                    <button onClick={() => rawSubmission && handleOpenFileGrading(rawSubmission as FileSubmission)} disabled={submissionStatus === 'Chưa nộp'} className="btn btn-sm bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed">
                                                        {rawSubmission && (rawSubmission as FileSubmission).grade != null ? '✏️ Sửa điểm' : '📝 Chấm bài'}
                                                    </button>
                                                ) : (
                                                    <button onClick={() => rawSubmission && quiz && setViewingQuizSub({ studentName: student.name, sub: rawSubmission as QuizSubmission })} disabled={submissionStatus === 'Chưa nộp'} className="btn btn-sm bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 disabled:cursor-not-allowed">
                                                        👁️ Xem
                                                    </button>
                                                )
                                            )}
                                            {!isTeacher && submissionStatus === 'Đã nộp' && rawSubmission && (
                                                <button onClick={() => handleDispute(rawSubmission)} className="btn btn-sm bg-orange-900/30 border border-orange-500/50 text-orange-200 hover:bg-orange-600 hover:text-white">📢 Phản hồi</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: QUESTIONS */}
            {activeTab === 'questions' && (
                <div className="grid grid-cols-1 gap-4 animate-slide-up">
                    {questionStats.map((stat, idx) => (
                        <div key={idx} className="card p-4 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-800/50 border border-gray-700">
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-bold text-gray-200">Câu {idx+1}: {stat.question.text}</h3>
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${stat.percentage < 50 ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>Đúng: {stat.percentage.toFixed(0)}%</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden"><div className={`h-full ${stat.percentage < 50 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${stat.percentage}%` }}></div></div>
                                <p className="text-xs text-gray-400 mt-2">{stat.wrongCount} học sinh trả lời sai.</p>
                            </div>
                            {stat.wrongCount > 0 && (
                                <button 
                                    onClick={() => handleInterventionClick(stat)} 
                                    className="btn btn-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg flex-shrink-0 flex items-center gap-2"
                                >
                                    <span>👨‍🏫</span> Giảng lại
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* MODALS */}
            {currentFileSub && assignment.type === 'file' && (
                <Modal isOpen={!!currentFileSub} onClose={() => setCurrentFileSub(null)} title={`Chấm bài: ${currentFileSub.studentName}`}>
                    <div className="space-y-6">
                        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex justify-between items-center">
                            <div><p className="text-gray-400 text-xs uppercase font-bold">File đính kèm</p><p className="text-blue-300 font-mono text-sm mt-1">{currentFileSub.fileName || "(Lỗi file)"}</p></div>
                            <button id="btn-view-file" onClick={() => setIsFileViewerOpen(true)} className="btn btn-secondary text-sm flex items-center gap-2" disabled={!currentFileSub.fileName || !isStorageServiceOk}><span>📄</span> Xem nội dung</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-1"><label className="block text-sm font-bold text-gray-300 mb-2">Điểm số (0-10)</label><input id="input-grade" type="number" step="0.1" min="0" max="10" value={gradeInput} onChange={(e) => setGradeInput(e.target.value)} className="form-input w-full text-center text-2xl font-bold text-yellow-400" placeholder="-" /></div>
                            <div className="md:col-span-2"><label className="block text-sm font-bold text-gray-300 mb-2">Nhận xét</label><textarea rows={4} value={feedbackInput} onChange={(e) => setFeedbackInput(e.target.value)} className="form-textarea w-full" placeholder="Nhập nhận xét chi tiết..." /></div>
                        </div>
                        <div className="flex justify-end pt-4 border-t border-gray-700 gap-3"><button onClick={() => setCurrentFileSub(null)} className="btn btn-secondary">Hủy</button><button onClick={handleSaveGrade} className="btn btn-primary px-6 shadow-lg">💾 Lưu kết quả</button></div>
                    </div>
                </Modal>
            )}
            <FileViewerModal isOpen={isFileViewerOpen} onClose={() => setIsFileViewerOpen(false)} fileName={currentFileSub?.fileName} />
            {viewingQuizSub && quiz && <QuizResultModal isOpen={!!viewingQuizSub} onClose={() => setViewingQuizSub(null)} studentName={viewingQuizSub.studentName} submission={viewingQuizSub.sub} quiz={quiz} />}
            
            {/* UPDATED INTERVENTION MODAL CALL */}
            {interventionData && (
                <InterventionModal 
                    isOpen={!!interventionData} 
                    onClose={() => setInterventionData(null)} 
                    questionText={interventionData.questionText} 
                    correctAnswerText={interventionData.correctAnswerText}
                    studentCount={interventionData.studentIds.length} 
                    onSend={handleSendIntervention} 
                />
            )}
            
            {/* REWARD MODAL */}
            <RewardStudentModal 
                isOpen={!!rewardTarget} 
                onClose={() => setRewardTarget(null)} 
                student={rewardTarget} 
                onSend={handleSendReward} 
            />

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
export default GradebookPage;
