
import React, { useState, useContext, useCallback } from 'react';
import Modal from '../common/Modal';
import { AuthContext, DataContext, GlobalStateContext } from '../../contexts/AppProviders';
import { callGeminiApiWithSchema } from '../../services/geminiService';
import LoadingSpinner from '../common/LoadingSpinner';
import type { QuizQuestion } from '../../types';

interface ChallengerModalProps {
    isOpen: boolean;
    onClose: () => void;
    nodeId: string;
    nodeTitle: string;
}

const ChallengerModal: React.FC<ChallengerModalProps> = ({ isOpen, onClose, nodeId, nodeTitle }) => {
    const { user } = useContext(AuthContext)!;
    const { db, addCommunityQuestion } = useContext(DataContext)!;
    const { setPage: setGlobalPage } = useContext(GlobalStateContext)!;

    const [questionText, setQuestionText] = useState('');
    const [options, setOptions] = useState(['', '', '', '']);
    const [correctAnswer, setCorrectAnswer] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleGenerateAI = async () => {
        const apiKey = user ? db.USERS[user.id]?.apiKey : null;
        if (!apiKey) {
            setGlobalPage('api_key', { isApiKeyModalOpen: true });
            return;
        }

        setIsGenerating(true);
        setError(null);
        try {
            const prompt = `Create ONE difficult, advanced multiple-choice question about "${nodeTitle}". 
            It should be challenging but fair. 4 options. Return strictly JSON with schema: {questions: [{text, options, correctAnswer}]}`;
            
            const result = await callGeminiApiWithSchema(apiKey, prompt);
            
            if (result.questions && result.questions.length > 0) {
                const q = result.questions[0];
                setQuestionText(q.text);
                setOptions(q.options.map(o => String(o)));
                setCorrectAnswer(q.correctAnswer);
            } else {
                setError("AI không trả về kết quả hợp lệ.");
            }
        } catch (e: any) {
            setError(e.message || "Lỗi kết nối AI.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSubmit = () => {
        if (!questionText.trim() || options.some(o => !o.trim())) {
            alert("Vui lòng điền đầy đủ câu hỏi và đáp án.");
            return;
        }
        if (!user) return;

        const newQuestion: QuizQuestion = {
            id: `cq_${Date.now()}`,
            text: questionText,
            options,
            correctAnswer
        };

        addCommunityQuestion(user.id, nodeId, newQuestion);
        alert("⚔️ Thách đấu đã được gửi đi! Câu hỏi của bạn đã vào Ngân hàng Cộng đồng.");
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="⚔️ Kiến tạo Thử thách" size="lg">
            <div className="space-y-6">
                <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 p-4 rounded-lg border border-purple-500/30">
                    <p className="text-gray-200 text-sm">
                        Bạn đã chinh phục đỉnh cao <strong>{nodeTitle}</strong>. 
                        Bây giờ hãy tạo ra một câu hỏi "hóc búa" để thách thức những người đến sau!
                    </p>
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-bold text-gray-300">Nội dung câu hỏi</label>
                        <button 
                            onClick={handleGenerateAI} 
                            disabled={isGenerating}
                            className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded-full flex items-center gap-1 transition-colors"
                        >
                            {isGenerating ? <LoadingSpinner size={3} /> : '✨ Nhờ AI soạn hộ'}
                        </button>
                    </div>
                    <textarea 
                        className="form-textarea w-full h-24" 
                        placeholder="Nhập câu hỏi khó..."
                        value={questionText}
                        onChange={(e) => setQuestionText(e.target.value)}
                    />
                </div>

                <div className="space-y-3">
                    <label className="block text-sm font-bold text-gray-300">Các lựa chọn (Tick chọn đáp án đúng)</label>
                    {options.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                            <input 
                                type="radio" 
                                name="correctAnswer" 
                                checked={correctAnswer === idx} 
                                onChange={() => setCorrectAnswer(idx)}
                                className="w-5 h-5 text-green-500 focus:ring-green-500 bg-gray-800 border-gray-600 cursor-pointer"
                            />
                            <input 
                                type="text" 
                                className={`form-input flex-1 ${correctAnswer === idx ? 'border-green-500 ring-1 ring-green-500' : ''}`}
                                placeholder={`Lựa chọn ${idx + 1}`}
                                value={opt}
                                onChange={(e) => handleOptionChange(idx, e.target.value)}
                            />
                        </div>
                    ))}
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-700 gap-3">
                    <button onClick={onClose} className="btn btn-secondary">Hủy</button>
                    <button onClick={handleSubmit} className="btn btn-primary bg-gradient-to-r from-yellow-600 to-orange-600 border-none shadow-lg font-bold">
                        Gửi Thách Đấu
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ChallengerModal;
