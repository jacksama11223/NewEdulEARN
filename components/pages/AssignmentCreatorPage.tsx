
import React, { useState, useContext, useCallback, useEffect } from 'react';
import { AuthContext, DataContext, GlobalStateContext, PageContext } from '../../contexts/AppProviders';
import LoadingSpinner from '../common/LoadingSpinner';
import { generateQuizFromPrompt } from '../../services/geminiService';
import type { QuizQuestion } from '../../types';

interface QuizCreatorProps {
    questions: QuizQuestion[];
    setQuestions: React.Dispatch<React.SetStateAction<QuizQuestion[]>>;
}

const QuizCreator: React.FC<QuizCreatorProps> = ({ questions, setQuestions }) => {
    const { user } = useContext(AuthContext)!;
    const { db } = useContext(DataContext)!;
    const { serviceStatus, setPage: setGlobalPage } = useContext(GlobalStateContext)!;
    const [geminiLoading, setGeminiLoading] = useState(false);
    const [geminiError, setGeminiError] = useState<string | null>(null);
    const [geminiPrompt, setGeminiPrompt] = useState("Tạo 5 câu hỏi trắc nghiệm (4 lựa chọn, ID dạng q1, q2...) về chủ đề 'Lịch sử AI'");

    const isAiAssistantOk = serviceStatus.ai_assistant_service === 'OPERATIONAL';

    const handleAddQuestion = useCallback(() => {
        setQuestions(prev => [
            ...prev, { id: `q_manual_${Date.now()}`, text: '', options: ['', '', '', ''], correctAnswer: 0 }
        ]);
    }, [setQuestions]);

    const handleQuestionChange = useCallback((index: number, field: keyof QuizQuestion, value: string | number) => {
        setQuestions(prev => {
            const newQuestions = [...prev];
            if (field === 'correctAnswer') {
                const numValue = parseInt(String(value), 10);
                (newQuestions[index] as any)[field] = (isNaN(numValue) || numValue < 0 || numValue > 3) ? 0 : numValue;
            } else {
                (newQuestions[index] as any)[field] = value;
            }
            return newQuestions;
        });
    }, [setQuestions]);

    const handleOptionChange = useCallback((qIndex: number, oIndex: number, value: string) => {
        setQuestions(prev => {
            const newQuestions = JSON.parse(JSON.stringify(prev));
            newQuestions[qIndex].options[oIndex] = value;
            return newQuestions;
        });
    }, [setQuestions]);

    const handleRemoveQuestion = useCallback((index: number) => {
        setQuestions(prev => prev.filter((_, i) => i !== index));
    }, [setQuestions]);

    const handleGenerateWithGemini = useCallback(async () => {
        if (!isAiAssistantOk) {
            setGeminiError("Dịch vụ AI Assistant (Gemini) đang bảo trì.");
            return;
        }
        const apiKey = user ? db.USERS[user.id]?.apiKey : null;
        if (!apiKey) {
            setGeminiError("API Key chưa được cấu hình.");
            return;
        }
        setGeminiLoading(true);
        setGeminiError(null);
        try {
            // Use specialized function with strict responseSchema
            const questions = await generateQuizFromPrompt(apiKey, geminiPrompt);
            
            if (questions && questions.length > 0) {
                setQuestions(questions);
            } else {
                setGeminiError("Gemini không trả về câu hỏi nào hợp lệ.");
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Lỗi không xác định.";
            setGeminiError(`❌ Lỗi: ${errorMessage}`);
        } finally {
            setGeminiLoading(false);
        }
    }, [isAiAssistantOk, user, db.USERS, geminiPrompt, setQuestions]);

    const openApiKeyModal = useCallback(() => {
        setGlobalPage('api_key', { isApiKeyModalOpen: true });
        setGeminiError(null);
    }, [setGlobalPage]);

    return (
        <div className="space-y-6 p-4 border border-gray-700 rounded-lg bg-gray-900/30">
            <h3 className="text-xl font-semibold text-gray-200">Soạn câu hỏi Quiz</h3>
            <div className="space-y-3 p-4 bg-gray-800 rounded-lg border border-gray-700">
                <h4 className="text-lg font-medium text-gradient">Tạo nhanh với Gemini</h4>
                {geminiError && (
                    <div className="p-2 text-sm bg-red-900 text-red-300 rounded flex justify-between items-center">
                        <span>{geminiError}</span>
                        {geminiError.includes("API Key") && (
                            <button type="button" onClick={openApiKeyModal} className="btn btn-secondary text-xs py-1 px-2 border-red-300 text-red-300">
                                Cấu hình
                            </button>
                        )}
                    </div>
                )}
                <label htmlFor="geminiPrompt" className="text-sm font-medium text-gray-300 block mb-1">Yêu cầu:</label>
                <textarea id="geminiPrompt" className="form-textarea" rows={3} value={geminiPrompt} onChange={(e) => setGeminiPrompt(e.target.value)} disabled={!isAiAssistantOk} />
                <button type="button" onClick={handleGenerateWithGemini} className="btn btn-secondary" disabled={geminiLoading || !isAiAssistantOk}>
                    {geminiLoading ? <LoadingSpinner size={5} /> : '✨ Tạo Quiz bằng Gemini'}
                </button>
                {!isAiAssistantOk && <p className="text-xs text-yellow-500 mt-1">Dịch vụ AI Assistant đang bảo trì.</p>}
            </div>
            <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-300">Hoặc soạn thủ công:</h4>
                {questions.map((q, qIndex) => (
                    <div key={q.id || qIndex} className="p-4 bg-gray-700 rounded-lg space-y-3 border border-gray-600">
                        <div className="flex justify-between items-center">
                            <label htmlFor={`qtext_${qIndex}`} className="text-sm font-medium text-gray-300">Câu hỏi {qIndex + 1}</label>
                            <button type="button" onClick={() => handleRemoveQuestion(qIndex)} className="text-red-500 hover:text-red-400 text-sm font-semibold">✕ Xóa</button>
                        </div>
                        <textarea id={`qtext_${qIndex}`} className="form-textarea" rows={2} placeholder="Nội dung câu hỏi" value={q.text} onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)} required />
                        {q.options.map((opt, oIndex) => (
                            <div key={oIndex} className="flex items-center space-x-3">
                                <input type="radio" id={`q${qIndex}_opt${oIndex}_correct`} name={`correct_q${qIndex}`} className="form-radio" checked={q.correctAnswer === oIndex} onChange={() => handleQuestionChange(qIndex, 'correctAnswer', oIndex)} />
                                <label htmlFor={`q${qIndex}_opt${oIndex}_correct`} className="sr-only">Đáp án đúng cho câu {qIndex + 1}, lựa chọn {oIndex + 1}</label>
                                <input type="text" id={`q${qIndex}_opt${oIndex}`} className="form-input" placeholder={`Lựa chọn ${oIndex + 1}`} value={opt} onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)} required />
                            </div>
                        ))}
                    </div>
                ))}
                <button type="button" onClick={handleAddQuestion} className="btn btn-secondary">+ Thêm câu hỏi (Thủ công)</button>
            </div>
        </div>
    );
};

interface AssignmentCreatorPageProps {
    type?: 'file' | 'quiz'; // Made optional as we might derive from params in Edit Mode
}
const AssignmentCreatorPage: React.FC<AssignmentCreatorPageProps> = ({ type: propsType }) => {
    const { db, createFileAssignment, createQuizAssignment, updateQuizQuestions } = useContext(DataContext)!;
    const { navigate, params } = useContext(PageContext)!;
    const { serviceStatus } = useContext(GlobalStateContext)!;
    
    // Edit Mode State
    const [isEditMode, setIsEditMode] = useState(false);
    const [editAssignmentId, setEditAssignmentId] = useState<string | null>(null);
    const [editQuizId, setEditQuizId] = useState<string | null>(null);

    // Form State
    const [title, setTitle] = useState('');
    const [courseId, setCourseId] = useState(db.COURSES[0]?.id || '');
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    
    // Determine effective type (props or derived from edit)
    const [effectiveType, setEffectiveType] = useState<'file' | 'quiz'>(propsType || 'quiz');

    const isCourseServiceOk = serviceStatus.course_management === 'OPERATIONAL';

    // --- EFFECT: LOAD DATA FOR EDITING ---
    useEffect(() => {
        if (params && params.mode === 'edit' && params.assignmentId) {
            const asg = db.ASSIGNMENTS[params.assignmentId];
            if (asg) {
                setIsEditMode(true);
                setEditAssignmentId(asg.id);
                setTitle(asg.title);
                setCourseId(asg.courseId);
                setEffectiveType(asg.type);

                if (asg.type === 'quiz' && asg.quizId) {
                    const qz = db.QUIZZES[asg.quizId];
                    if (qz) {
                        setEditQuizId(qz.id);
                        setQuestions(qz.questions);
                    }
                }
            }
        }
    }, [params, db.ASSIGNMENTS, db.QUIZZES]);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!isCourseServiceOk) {
            alert("Dịch vụ Quản lý Khóa học đang bảo trì, không thể lưu.");
            return;
        }
        if (!title || !courseId) {
            alert("Vui lòng nhập đủ thông tin.");
            return;
        }

        if (isEditMode) {
            // Update Logic
            if (effectiveType === 'quiz' && editQuizId) {
                if (questions.length === 0) {
                    alert("Vui lòng tạo ít nhất 1 câu hỏi.");
                    return;
                }
                updateQuizQuestions(editQuizId, questions);
                alert("Cập nhật câu hỏi Quiz thành công!");
                navigate('assignment_viewer', { assignmentId: editAssignmentId });
            } else {
                alert("Tính năng sửa tên/file đang phát triển. Chỉ hỗ trợ sửa câu hỏi Quiz.");
                navigate('assignment_hub');
            }
        } else {
            // Create Logic
            if (effectiveType === 'file') {
                createFileAssignment(title, courseId);
                alert("Tạo bài tập nộp file thành công!");
            } else {
                if (questions.length === 0) {
                    alert("Vui lòng tạo ít nhất 1 câu hỏi.");
                    return;
                }
                createQuizAssignment(title, courseId, questions);
                alert("Tạo bài tập Quiz thành công!");
            }
            navigate('assignment_hub');
        }
    }, [title, courseId, questions, effectiveType, isEditMode, editQuizId, editAssignmentId, createFileAssignment, createQuizAssignment, updateQuizQuestions, navigate, isCourseServiceOk]);

    if (!isCourseServiceOk) {
        return (
            <div className="space-y-6">
                <button onClick={() => navigate('assignment_hub')} className="text-sm text-blue-400 hover:underline">&larr; Quay lại</button>
                <div className="card p-8 text-center border border-yellow-700">
                    <h2 className="text-2xl font-bold text-yellow-400 mb-4">Dịch vụ đang Bảo trì</h2>
                    <p className="text-gray-400">Không thể truy cập trang này.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <button onClick={() => navigate('assignment_hub')} className="text-sm text-blue-400 hover:underline">&larr; Quay lại</button>
            <h1 className="text-3xl font-bold text-gradient">
                {isEditMode ? 'Chỉnh sửa Bài tập' : `Tạo Bài tập mới: ${effectiveType === 'file' ? 'Nộp File' : 'Quiz'}`}
            </h1>
            
            {isEditMode && (
                <div className="bg-blue-900/20 border border-blue-500/50 p-4 rounded-lg text-blue-200 text-sm">
                    ℹ️ Bạn đang chỉnh sửa bài tập <strong>"{title}"</strong>.
                </div>
            )}

            <form onSubmit={handleSubmit} className="card p-6 space-y-6">
                <div>
                    <label htmlFor="assignmentTitle" className="block text-sm font-medium text-gray-300 mb-2">Tiêu đề Bài tập</label>
                    <input id="assignmentTitle" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="form-input" required disabled={isEditMode} title={isEditMode ? "Không thể sửa tiêu đề lúc này" : ""} />
                </div>
                <div>
                    <label htmlFor="assignmentCourse" className="block text-sm font-medium text-gray-300 mb-2">Chọn Khóa học</label>
                    <select id="assignmentCourse" value={courseId} onChange={(e) => setCourseId(e.target.value)} className="form-select" required disabled={isEditMode}>
                        {db.COURSES.map(course => <option key={course.id} value={course.id}>{course.name} ({course.id})</option>)}
                    </select>
                </div>
                
                {effectiveType === 'quiz' && <QuizCreator questions={questions} setQuestions={setQuestions} />}
                
                <div className="flex justify-end pt-4">
                    <button type="submit" className="btn btn-primary shadow-lg hover:shadow-blue-500/50">
                        {isEditMode ? '💾 Lưu Thay Đổi' : '🚀 Giao Nhiệm Vụ'}
                    </button>
                </div>
            </form>
        </div>
    );
};
export default AssignmentCreatorPage;
