

import React, { useState, useContext, useMemo, useCallback, useEffect, useRef } from 'react';
import { AuthContext, DataContext, GlobalStateContext, PageContext, PetContext } from '../../contexts/AppProviders';
import Modal from '../common/Modal';
import LoadingSpinner from '../common/LoadingSpinner';
import { callGeminiApi } from '../../services/geminiService';
import OnboardingTour, { TourStep } from '../common/OnboardingTour';
import type { Quiz, QuizSubmission, FileSubmission, QuizQuestion } from '../../types';

interface FileViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileName?: string | null;
}
const FileViewerModal: React.FC<FileViewerModalProps> = ({ isOpen, onClose, fileName }) => (
    <Modal isOpen={isOpen} onClose={onClose} title={`Xem file (Demo): ${fileName}`} size="xl">
        <div className="bg-gray-900 p-6 rounded-lg max-h-[60vh] overflow-y-auto">
            <p className="text-gray-300 font-mono whitespace-pre-wrap">
                --- Bắt đầu nội dung file .docx (Giả lập) ---
                <br /><br />
                <span className="font-bold text-lg text-gradient">Tiêu đề: {fileName}</span>
                <br /><br />
                Đây là nội dung giả lập cho file .docx mà sinh viên đã nộp.
                <br />
                Trong một ứng dụng thực tế, đây sẽ là một trình xem file (viewer) tích hợp hoặc một link tải xuống.
                <br /><br />
                --- Kết thúc nội dung file ---
            </p>
        </div>
    </Modal>
);

interface QuizTakerProps {
    quiz: Quiz;
    submission: QuizSubmission | null;
    onSubmit: (answers: Record<string, number>) => void;
    remediation?: { questionId: string, note: string }; // New Prop
}

const QuizTaker: React.FC<QuizTakerProps> = ({ quiz, submission, onSubmit, remediation }) => {
    const [answers, setAnswers] = useState<Record<string, number>>(() => submission?.answers || {});
    const [showResult, setShowResult] = useState(!!submission);
    const [result, setResult] = useState<QuizSubmission | null>(() => submission);
    
    // Use navigate from context for diagnosis flow
    const { navigate } = useContext(PageContext)!;
    const { triggerReaction, say } = useContext(PetContext)!;

    // --- STUCK DETECTION LOGIC ---
    const lastInteractionRef = useRef(Date.now());
    const hasTriggeredStuckRef = useRef(false);

    const handleSelectAnswer = useCallback((questionId: string, optionIndex: number) => {
        if (!submission && !showResult) {
            setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
            // Reset stuck timer on interaction
            lastInteractionRef.current = Date.now();
            hasTriggeredStuckRef.current = false;
        }
    }, [submission, showResult]);

    // Timer Effect for Stuck Detection
    useEffect(() => {
        if (submission || showResult) return; // Don't track if finished

        const checkStuckInterval = setInterval(() => {
            const now = Date.now();
            const timeSinceLastInteraction = now - lastInteractionRef.current;
            const answeredCount = Object.keys(answers).length;
            const totalQuestions = quiz.questions.length;

            // Trigger if: > 60s idle AND quiz not finished AND haven't triggered yet
            if (timeSinceLastInteraction > 60000 && answeredCount < totalQuestions && !hasTriggeredStuckRef.current) {
                hasTriggeredStuckRef.current = true;
                
                triggerReaction('hover_doctor');
                say("Câu này khó nhằn nhỉ? Đừng ngại bấm nút 'Trợ giúp AI', tớ sẽ gợi ý nhỏ cho (không nhắc đáp án đâu!).", 8000);
            }
        }, 5000); // Check every 5 seconds

        return () => clearInterval(checkStuckInterval);
    }, [answers, quiz.questions.length, submission, showResult, triggerReaction, say]);

    const handleSubmit = useCallback(() => {
        if (!quiz?.questions || submission || showResult) return;
        onSubmit(answers);
        // Simulate result calculation after submission
        let score = 0;
        quiz.questions.forEach(q => {
            if (answers[q.id] === q.correctAnswer) score++;
        });
        const resultData: QuizSubmission = {
            score, total: quiz.questions.length,
            percentage: quiz.questions.length > 0 ? (score / quiz.questions.length) * 100 : 0,
            timestamp: new Date().toISOString(), answers
        };
        setResult(resultData);
        setShowResult(true);
    }, [quiz, answers, onSubmit, submission, showResult]);

    const handleDiagnose = useCallback(() => {
        if (!result || !quiz) return;
        
        let diagnosisContext = "Tôi vừa làm bài kiểm tra và bị điểm thấp. Dưới đây là các lỗi sai của tôi, hãy phân tích lỗ hổng kiến thức và giảng lại cho tôi ngắn gọn:\n\n";
        
        quiz.questions.forEach((q, idx) => {
            const userAnsIdx = result.answers[q.id];
            // Only include wrong answers
            if (userAnsIdx !== q.correctAnswer) {
                diagnosisContext += `Câu ${idx + 1}: ${q.text}\n- Tôi chọn: ${q.options[userAnsIdx] || 'Bỏ trống'}\n- Đáp án đúng: ${q.options[q.correctAnswer]}\n\n`;
            }
        });

        diagnosisContext += "Hãy chỉ ra tôi đang hiểu sai ở đâu và giải thích lại.";

        navigate('gemini_student', {
            initialPrompt: diagnosisContext,
            autoPersona: 'commander'
        });
    }, [result, quiz, navigate]);

    const handleAskAiHelp = () => {
        navigate('gemini_student', {
            initialPrompt: `Tôi đang làm bài Quiz và gặp khó khăn. Hãy cho tôi một gợi ý tư duy (Hint) để giải quyết vấn đề này, nhưng TUYỆT ĐỐI KHÔNG đưa ra đáp án trực tiếp.`,
            autoPersona: 'guardian'
        });
    };

    const allAnswered = useMemo(() => quiz.questions.every(q => answers[q.id] !== undefined), [quiz, answers]);

    if (showResult && result) {
        return (
            <div className="card p-6 relative">
                <h2 className="text-2xl font-bold text-gradient mb-4 text-center">Kết quả Quiz</h2>
                <div className="text-center mb-6">
                    <p className="text-5xl font-bold text-gray-200">{result.score} / {result.total}</p>
                    <p className="text-xl font-semibold text-blue-400 mt-1">({result.percentage.toFixed(1)}%)</p>
                    <p className="text-sm text-gray-500 mt-2">Nộp vào: {new Date(result.timestamp).toLocaleString()}</p>
                </div>
                
                {/* --- LEARNING CLINIC FLOW: DIAGNOSE BUTTON --- */}
                {result.percentage < 50 && (
                    <div className="mb-8 p-6 bg-red-900/20 border border-red-500/50 rounded-2xl flex flex-col items-center text-center animate-pulse">
                        <div className="text-4xl mb-2">🚑</div>
                        <h3 className="text-xl font-bold text-red-300 mb-2">Kết quả chưa tốt! Đừng lo lắng.</h3>
                        <p className="text-gray-400 mb-4 max-w-md">Bác sĩ AI (The Commander) đang trực để giúp bạn tìm ra lỗ hổng kiến thức ngay lập tức.</p>
                        <button 
                            onClick={handleDiagnose}
                            className="btn btn-primary bg-gradient-to-r from-red-600 to-rose-600 border-none shadow-[0_0_20px_rgba(225,29,72,0.5)] px-8 py-3 text-lg font-bold hover:scale-105 transition-transform"
                        >
                            Chẩn đoán với Bác sĩ AI
                        </button>
                    </div>
                )}

                <hr className="border-gray-700 my-6" />
                <h3 className="text-lg font-semibold text-gray-300 mb-4">Xem lại bài làm:</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    {quiz.questions.map((q, qIndex) => {
                        const userAnswerIndex = result.answers[q.id];
                        const isCorrect = userAnswerIndex === q.correctAnswer;
                        const isRemediationTarget = remediation && remediation.questionId === q.id;

                        return (
                            <div key={q.id} id={`q-${q.id}`} className={`p-4 rounded-lg border-l-4 relative transition-all duration-500 ${isRemediationTarget ? 'bg-blue-900/40 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)] scale-[1.02]' : 'bg-gray-800 border-gray-600'}`}>
                                <p className="font-semibold text-gray-300 mb-3">{qIndex + 1}. {q.text}</p>
                                <div className="space-y-2">
                                    {q.options.map((opt, oIndex) => {
                                        let optionStyle = "text-gray-400", indicator = "◻️";
                                        if (oIndex === q.correctAnswer) {
                                            optionStyle = "text-green-400 font-semibold"; indicator = "✅";
                                        }
                                        if (oIndex === userAnswerIndex) {
                                            if (!isCorrect) { indicator = "❌"; optionStyle = "text-red-400 line-through"; }
                                        } else if (oIndex !== q.correctAnswer) {
                                            optionStyle = "text-gray-500"; indicator = " ・";
                                        }
                                        return (
                                            <div key={oIndex} className={`flex items-start space-x-2 ${optionStyle}`}>
                                                <span className="w-4">{indicator}</span> <span>{opt}</span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* TEACHER INTERVENTION OVERLAY */}
                                {isRemediationTarget && (
                                    <div className="mt-4 p-4 bg-blue-600/20 border border-blue-500 rounded-lg animate-pop-in relative">
                                        <div className="absolute -top-3 -left-3 bg-blue-600 text-white rounded-full p-1 shadow-lg">
                                            👨‍🏫
                                        </div>
                                        <h4 className="text-blue-300 font-bold text-sm mb-1 uppercase tracking-wider">Lời giảng của thầy</h4>
                                        <p className="text-white italic">"{remediation!.note}"</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
    
    return (
        <div className="card p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-200">Làm bài trắc nghiệm</h2>
                <button 
                    onClick={handleAskAiHelp}
                    className="text-xs bg-purple-900/50 text-purple-300 px-3 py-1.5 rounded-full border border-purple-500/30 hover:bg-purple-800 transition-colors flex items-center gap-1"
                >
                    <span>💡</span> Trợ giúp AI
                </button>
            </div>
            <div className="space-y-8">
                {quiz.questions.map((q, qIndex) => (
                    <div key={q.id} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                        <p className="font-semibold text-gray-300 mb-4">{qIndex + 1}. {q.text}</p>
                        <div className="space-y-3">
                            {q.options.map((opt, oIndex) => (
                                <label key={oIndex} className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg border transition-colors duration-150 ${answers[q.id] === oIndex ? 'bg-blue-900/50 border-blue-500' : 'border-gray-700 hover:bg-gray-700'}`}>
                                    <input type="radio" name={q.id} className="form-radio" checked={answers[q.id] === oIndex} onChange={() => handleSelectAnswer(q.id, oIndex)} />
                                    <span className={`text-gray-300 ${answers[q.id] === oIndex ? 'font-semibold' : ''}`}>{opt}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <button 
                id="btn-submit-assignment"
                type="button" 
                onClick={handleSubmit} 
                className="btn btn-primary w-full sm:w-auto" 
                disabled={!allAnswered}
            >
                Nộp bài
            </button>
            {!allAnswered && <p className="text-sm text-yellow-500 mt-2">Vui lòng trả lời tất cả câu hỏi trước khi nộp.</p>}
        </div>
    );
};


interface AssignmentViewerPageProps {
    assignmentId: string;
}

const AssignmentViewerPage: React.FC<AssignmentViewerPageProps> = ({ assignmentId }) => {
    const { db, submitFileAssignment, submitQuiz, updateQuizQuestions } = useContext(DataContext)!;
    const { user } = useContext(AuthContext)!;
    const { navigate, params } = useContext(PageContext)!;
    const { serviceStatus, setPage: setGlobalPage } = useContext(GlobalStateContext)!;

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isGenerating, setIsGenerating] = useState(false); // State for auto-gen quiz
    
    // ONBOARDING TOUR STATE
    const [isTourOpen, setIsTourOpen] = useState(false);

    const isAssessmentServiceOk = serviceStatus.assessment_taking === 'OPERATIONAL';
    const isStorageServiceOk = serviceStatus.storage_service === 'OPERATIONAL';
    
    // Derived state for data
    const { assignment, course, fileSubmission, quiz, quizSubmission } = useMemo(() => {
        const asg = db.ASSIGNMENTS[assignmentId];
        if (!asg || !user) return { assignment: null, course: null, fileSubmission: null, quiz: null, quizSubmission: null };
        const crs = db.COURSES.find(c => c.id === asg.courseId) || null;
        
        if (asg.type === 'file') {
            const existingSub = db.FILE_SUBMISSIONS[asg.id]?.find(s => s.studentId === user.id);
            const sub: FileSubmission = existingSub || {
                id: 'temp', assignmentId: asg.id, studentId: user.id, studentName: user.name, status: "Chưa nộp",
                grade: null, feedback: null, fileName: null, timestamp: null
            };
            return { assignment: asg, course: crs, fileSubmission: sub, quiz: null, quizSubmission: null };
        } else if (asg.type === 'quiz' && asg.quizId) {
            const qz = db.QUIZZES[asg.quizId] || null;
            const sub = db.QUIZ_SUBMISSIONS[asg.quizId]?.[user.id] || null;
            return { assignment: asg, course: crs, fileSubmission: null, quiz: qz, quizSubmission: sub };
        }
        return { assignment: asg, course: crs, fileSubmission: null, quiz: null, quizSubmission: null };
    }, [assignmentId, user, db]);

    // Auto-scroll to remediation question if present
    useEffect(() => {
        if (params?.remediation && quiz) {
            setTimeout(() => {
                const el = document.getElementById(`q-${params.remediation.questionId}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 500);
        }
    }, [params, quiz]);

    // --- ONBOARDING EFFECT ---
    useEffect(() => {
        const hasSeenTour = localStorage.getItem('hasSeenAssignmentTour');
        if (!hasSeenTour && assignment) {
            // Delay slightly to ensure render
            setTimeout(() => setIsTourOpen(true), 1500);
        }
    }, [assignment]);

    const handleTourComplete = () => {
        setIsTourOpen(false);
        localStorage.setItem('hasSeenAssignmentTour', 'true');
    };

    const tourSteps: TourStep[] = [
        {
            targetId: 'assignment-header',
            title: 'Khu vực Đề bài',
            content: 'Đọc kỹ yêu cầu và thông tin khóa học tại đây.',
            position: 'bottom'
        },
        {
            targetId: 'btn-ai-help',
            title: 'Trợ giúp AI',
            content: 'Bí ý tưởng? Xin một chút gợi ý (Hint) từ AI, đừng lo, không bị trừ điểm đâu.',
            position: 'left'
        },
        {
            targetId: 'btn-submit-assignment',
            title: 'Nộp bài',
            content: 'Hoàn tất thì nộp ở đây nhé.',
            position: 'top'
        }
    ];


    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.name.endsWith('.docx')) {
                setSelectedFile(file);
            } else {
                alert("Chỉ chấp nhận file .docx (demo).");
                e.target.value = "";
                setSelectedFile(null);
            }
        }
    }, []);

    const handleFileSubmit = useCallback(() => {
        if (!selectedFile || !assignment || !user) return;
        if (!isAssessmentServiceOk || !isStorageServiceOk) {
            alert("Dịch vụ đang bảo trì, không thể nộp bài.");
            return;
        }
        submitFileAssignment(assignment.id, user.id, selectedFile.name);
        alert("Nộp bài tập file thành công!");
        navigate('assignment_hub');
    }, [selectedFile, assignment, user, submitFileAssignment, navigate, isAssessmentServiceOk, isStorageServiceOk]);

    const handleQuizSubmit = useCallback((answers: Record<string, number>) => {
        if (!quiz || !assignment || !user) return;
        if (!isAssessmentServiceOk) {
            alert("Dịch vụ đang bảo trì, không thể nộp bài.");
            return;
        }
        submitQuiz(quiz.id, user.id, answers);
    }, [quiz, assignment, user, submitQuiz, isAssessmentServiceOk]);

    // --- AUTO GENERATE QUIZ LOGIC (Teacher Only) ---
    const handleGenerateQuizContent = useCallback(async () => {
        if (!user || !assignment) return;
        const apiKey = db.USERS[user.id]?.apiKey;
        if (!apiKey) {
            setGlobalPage('api_key', { isApiKeyModalOpen: true });
            return;
        }

        setIsGenerating(true);
        try {
            // Updated Prompt to use Gemini 2.5 Flash (Thinking Mode) via generic call
            const prompt = `
                You are an expert exam creator. Create 5 high-quality, distinct multiple choice questions for a quiz titled "${assignment.title}".
                
                Subject Context: ${course?.name || 'General Knowledge'}
                Target Audience: University Students.
                Language: Vietnamese.
                
                Requirements:
                1. Questions must require critical thinking, not just memory.
                2. 4 options per question.
                3. 1 correct answer.
                4. Return STRICT JSON format: { "questions": [{ "text": string, "options": string[], "correctAnswer": number }] }
            `;

            const resultStr = await callGeminiApi(apiKey, prompt, null, { useThinking: true });
            // Cleanup and Parse JSON
            const jsonStr = resultStr.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(jsonStr);
            
            if (result.questions && result.questions.length > 0) {
                // Ensure IDs are unique
                const finalQuestions = result.questions.map((q: any, i: number) => ({
                    ...q,
                    id: `${assignment.quizId || 'temp'}_q_${Date.now()}_${i}`
                }));
                
                if (assignment.quizId) {
                    updateQuizQuestions(assignment.quizId, finalQuestions);
                    alert("✅ Đã tạo nội dung thành công!");
                }
            } else {
                alert("AI không trả về câu hỏi nào. Vui lòng thử lại.");
            }
        } catch (e: any) {
            alert("Lỗi tạo câu hỏi: " + e.message);
        } finally {
            setIsGenerating(false);
        }
    }, [user, assignment, course, db.USERS, updateQuizQuestions, setGlobalPage]);

    const handleManualEdit = () => {
        if (!assignment) return;
        navigate('assignment_creator', { mode: 'edit', assignmentId: assignment.id });
    };
    
    if (!assignment) {
        return <div className="text-red-500 card p-6">Lỗi: Không tìm thấy bài tập ID: {assignmentId}.</div>;
    }
    
    const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN';

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <button onClick={() => navigate('assignment_hub')} className="text-sm text-blue-400 hover:underline">&larr; Quay lại</button>
                {isTeacher && assignment.type === 'quiz' && quiz && quiz.questions.length > 0 && (
                    <button 
                        onClick={handleManualEdit}
                        className="btn btn-sm btn-secondary flex items-center gap-2"
                    >
                        <span>✏️</span> Chỉnh sửa câu hỏi
                    </button>
                )}
            </div>

            <div id="assignment-header" className="card p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm text-blue-400">{course?.name} ({assignment.courseId})</p>
                        <h1 className="text-3xl font-bold text-gradient mt-1">{assignment.title}</h1>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-2 inline-block ${assignment.type === 'quiz' ? 'bg-indigo-700 text-indigo-300' : 'bg-green-700 text-green-300'}`}>
                            {assignment.type === 'quiz' ? 'Trắc nghiệm' : 'Nộp File'}
                        </span>
                    </div>
                    
                    {/* AI Help Button (For Onboarding Tour Target) */}
                    {!isTeacher && (
                        <button 
                            id="btn-ai-help"
                            onClick={() => navigate('gemini_student', { initialPrompt: `Tôi đang làm bài tập: "${assignment.title}". Hãy cho tôi một vài gợi ý hướng dẫn (không giải hộ).`, autoThinking: true })}
                            className="btn btn-sm bg-purple-900/50 border border-purple-500/50 text-purple-200 hover:bg-purple-700 flex items-center gap-2 animate-pulse hover:animate-none"
                        >
                            <span>💡</span> Trợ giúp AI
                        </button>
                    )}
                </div>
            </div>

            {!isAssessmentServiceOk ? (
                <div className="card p-8 text-center border border-yellow-700">
                    <h2 className="text-2xl font-bold text-yellow-400 mb-4">Dịch vụ đang Bảo trì</h2>
                    <p className="text-gray-400">Không thể xem hoặc nộp bài lúc này.</p>
                </div>
            ) : (
                <>
                    {/* FILE SUBMISSION SECTION */}
                    {assignment.type === 'file' && fileSubmission && (
                        <div className="card p-6 space-y-4">
                            <h2 className="text-xl font-semibold text-gray-200">Nộp bài tập</h2>
                            {fileSubmission.status === 'Đã nộp' ? (
                                <div>
                                    <p className="text-green-400 font-semibold">✅ Bạn đã nộp bài: <span className="font-mono bg-gray-700 px-1 rounded">{fileSubmission.fileName}</span></p>
                                    {fileSubmission.grade != null ? (
                                        <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
                                            <p className="text-lg font-semibold text-gray-200">Điểm số: <span className="text-blue-400">{fileSubmission.grade} / 10</span></p>
                                            {fileSubmission.feedback && <p className="text-gray-300 mt-1"><span className="font-medium text-gray-400">Nhận xét:</span> {fileSubmission.feedback}</p>}
                                        </div>
                                    ) : <p className="text-yellow-400 mt-2">🕒 Chờ chấm điểm.</p>}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <label htmlFor="fileUpload" className="block text-sm font-medium text-gray-300 mb-2">Chọn file .docx để nộp:</label>
                                    {!isStorageServiceOk ? (
                                        <div className="p-4 rounded-lg border border-yellow-700 bg-gray-800 text-center">
                                            <p className="text-yellow-400 font-semibold">Dịch vụ Nộp File đang bảo trì.</p>
                                        </div>
                                    ) : <input id="fileUpload" type="file" accept=".docx" onChange={handleFileChange} className="form-input" />}
                                    <button 
                                        id="btn-submit-assignment"
                                        onClick={handleFileSubmit} 
                                        className="btn btn-primary" 
                                        disabled={!selectedFile || !isStorageServiceOk}
                                    >
                                        Nộp bài
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* QUIZ SECTION */}
                    {assignment.type === 'quiz' && (
                        <>
                            {quiz && quiz.questions.length > 0 ? (
                                <QuizTaker 
                                    quiz={quiz} 
                                    submission={quizSubmission} 
                                    onSubmit={handleQuizSubmit} 
                                    remediation={params?.remediation} // Pass param to highlight
                                />
                            ) : (
                                /* EMPTY QUIZ STATE - ROLE BASED VIEW */
                                <div className="card p-12 flex flex-col items-center text-center space-y-6">
                                    <div className="text-6xl animate-pulse">🤖</div>
                                    <h2 className="text-2xl font-bold text-white">Nội dung chưa được khởi tạo</h2>
                                    
                                    {isTeacher ? (
                                        <div className="space-y-4 max-w-lg mx-auto">
                                            <p className="text-yellow-400 bg-yellow-900/20 p-3 rounded border border-yellow-500/30">
                                                👨‍🏫 <strong>Khu vực Giáo viên:</strong> Bài tập này chưa có câu hỏi. 
                                                Bạn có thể sử dụng AI để tạo nhanh hoặc soạn thủ công.
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                                <button 
                                                    onClick={handleGenerateQuizContent} 
                                                    disabled={isGenerating}
                                                    className="btn btn-primary px-4 py-3 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                                                >
                                                    {isGenerating ? (
                                                        <span className="flex items-center gap-2"><LoadingSpinner size={4} /> Đang suy nghĩ...</span>
                                                    ) : '✨ Tạo tự động (AI)'}
                                                </button>
                                                <button 
                                                    onClick={handleManualEdit}
                                                    className="btn btn-secondary border-blue-500 text-blue-300 hover:bg-blue-900/30"
                                                >
                                                    ✏️ Soạn thủ công
                                                </button>
                                            </div>
                                            {isGenerating && <p className="text-xs text-gray-500 animate-pulse">Đang sử dụng Gemini 2.5 Flash (Thinking Mode) để tạo câu hỏi chất lượng cao...</p>}
                                        </div>
                                    ) : (
                                        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                                            <p className="text-gray-400">
                                                Bài tập này đang được giáo viên biên soạn. <br/>
                                                Vui lòng quay lại sau!
                                            </p>
                                            <button onClick={() => navigate('assignment_hub')} className="btn btn-secondary mt-4">
                                                Quay về Hub
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

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
export default AssignmentViewerPage;