
import React, { useState, useContext, useEffect, useRef } from 'react';
import Modal from '../common/Modal';
import { AuthContext, DataContext, GlobalStateContext } from '../../contexts/AppProviders';
import { enhanceNoteWithGemini } from '../../services/geminiService';
import LoadingSpinner from '../common/LoadingSpinner';

interface NodeNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    pathId: string;
    nodeId: string;
    nodeTitle: string;
    // New Props for Harvest Flow
    autoAction?: 'harvest';
    initialContext?: string; 
}

const NodeNoteModal: React.FC<NodeNoteModalProps> = ({ isOpen, onClose, pathId, nodeId, nodeTitle, autoAction, initialContext }) => {
    const { user } = useContext(AuthContext)!;
    // Added createPersonalNote to destructuring
    const { db, saveNodeNote, createPersonalNote } = useContext(DataContext)!;
    const { setPage: setGlobalPage } = useContext(GlobalStateContext)!;

    const [content, setContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [aiResult, setAiResult] = useState<string | null>(null);
    
    // Use a ref to track if we've already triggered auto-action for this open session
    const hasTriggeredAutoRef = useRef(false);

    // Load existing note or Trigger Auto Harvest
    useEffect(() => {
        if (isOpen && user) {
            const key = `${pathId}_${nodeId}_${user.id}`;
            const existingNote = db.NODE_NOTES?.[key];
            
            if (existingNote && existingNote.content.trim().length > 0) {
                setContent(existingNote.content);
            } else {
                setContent(''); // Reset if new
                
                // AUTO HARVEST LOGIC
                if (autoAction === 'harvest' && initialContext && !hasTriggeredAutoRef.current) {
                    hasTriggeredAutoRef.current = true;
                    handleAiAction('harvest', initialContext);
                }
            }
            setAiResult(null);
        } else {
            hasTriggeredAutoRef.current = false; // Reset on close
        }
    }, [isOpen, user, pathId, nodeId, db.NODE_NOTES, autoAction, initialContext]);

    const handleSave = () => {
        if (!user) return;
        setIsSaving(true);
        // Simulate slight delay
        setTimeout(() => {
            // 1. Save to Node persistence (so it stays in this modal when reopened)
            saveNodeNote(user.id, pathId, nodeId, content);

            // 2. Save to Notebook (PERSONAL_NOTES) so it shows in Sổ Tay page
            // We use the node title as the note title for easy identification
            createPersonalNote(
                user.id,
                `Ghi chú bài: ${nodeTitle}`, 
                content,
                { pathId, lessonId: nodeId } // Link metadata for filtering
            );

            setIsSaving(false);
            onClose();
        }, 500);
    };

    const handleAiAction = async (action: 'summarize' | 'expand' | 'fix' | 'quiz' | 'harvest', contextOverride?: string) => {
        const textToProcess = contextOverride || content;
        if (!textToProcess.trim()) return;
        
        const apiKey = user ? db.USERS[user.id]?.apiKey : null;
        if (!apiKey) {
            setGlobalPage('api_key', { isApiKeyModalOpen: true });
            return;
        }

        setIsAiProcessing(true);
        setAiResult(null);
        try {
            const result = await enhanceNoteWithGemini(apiKey, textToProcess, action);
            
            if (action === 'harvest') {
                // For harvest, we directly insert into content if it's empty
                setContent(prev => prev ? prev + "\n\n" + result : result);
            } else {
                setAiResult(result);
            }
        } catch (e) {
            setAiResult("Lỗi kết nối AI. Vui lòng thử lại.");
        } finally {
            setIsAiProcessing(false);
        }
    };

    const appendAiResult = () => {
        if (aiResult) {
            setContent(prev => prev + "\n\n--- AI Assistant ---\n" + aiResult);
            setAiResult(null);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Sổ tay: ${nodeTitle}`} size="xl">
            <div className="flex flex-col h-[70vh]">
                {/* Special Banner for Harvest Mode */}
                {autoAction === 'harvest' && (
                    <div className="mb-2 px-3 py-2 bg-yellow-900/30 border border-yellow-500/50 rounded flex items-center gap-2 animate-fade-in">
                        <span className="text-xl">🌾</span>
                        <p className="text-xs text-yellow-200">
                            <strong>Thu Hoạch Kiến Thức:</strong> AI đang giúp bạn tóm tắt bài học vừa rồi. Hãy chỉnh sửa và lưu lại để nhận <strong>+50 XP</strong>.
                        </p>
                    </div>
                )}

                {/* Editor Area */}
                <div className="flex-1 bg-gray-900 border border-gray-700 rounded-lg p-2 mb-4 relative">
                    <textarea 
                        className="w-full h-full bg-transparent text-gray-200 p-2 resize-none outline-none font-mono text-sm leading-relaxed"
                        placeholder="Ghi lại kiến thức tại đây..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                    
                    {/* AI Processing Overlay */}
                    {isAiProcessing && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center rounded-lg backdrop-blur-sm z-10">
                            <LoadingSpinner size={8} />
                            <p className="text-blue-300 mt-2 animate-pulse font-bold">
                                {autoAction === 'harvest' ? 'AI đang thu hoạch kiến thức...' : 'AI đang phân tích...'}
                            </p>
                        </div>
                    )}
                </div>

                {/* AI Result Preview Area */}
                {aiResult && (
                    <div className="mb-4 p-3 bg-indigo-900/30 border border-indigo-500/50 rounded-lg animate-fade-in-up">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-indigo-300 text-xs font-bold uppercase tracking-wider">AI Suggestion</span>
                            <button onClick={() => setAiResult(null)} className="text-gray-400 hover:text-white text-xs">✕</button>
                        </div>
                        <div className="text-gray-200 text-sm max-h-32 overflow-y-auto whitespace-pre-wrap mb-2 p-2 bg-black/20 rounded">
                            {aiResult}
                        </div>
                        <button onClick={appendAiResult} className="btn btn-sm btn-primary w-full text-xs">
                            📥 Thêm vào ghi chú
                        </button>
                    </div>
                )}

                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex gap-2">
                        <button onClick={() => handleAiAction('fix')} className="btn btn-sm bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs border border-gray-600" title="Sửa lỗi ngữ pháp/chính tả">
                            ✨ Sửa lỗi
                        </button>
                        <button onClick={() => handleAiAction('summarize')} className="btn btn-sm bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs border border-gray-600" title="Tóm tắt ý chính">
                            📝 Tóm tắt
                        </button>
                        <button onClick={() => handleAiAction('expand')} className="btn btn-sm bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs border border-gray-600" title="Giải thích chi tiết hơn">
                            🔍 Mở rộng
                        </button>
                        <button onClick={() => handleAiAction('quiz')} className="btn btn-sm bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs border border-gray-600" title="Tạo câu hỏi ôn tập">
                            ❓ Tạo Quiz
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={onClose} className="btn btn-secondary text-sm">Đóng</button>
                        <button onClick={handleSave} className="btn btn-primary text-sm min-w-[80px]" disabled={isSaving}>
                            {isSaving ? 'Lưu...' : (autoAction === 'harvest' ? '💾 Lưu & Nhận XP' : 'Lưu Ghi chú')}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default NodeNoteModal;
