
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, DataContext, GlobalStateContext } from '../../contexts/AppProviders';
import { simplifyContent } from '../../services/geminiService';
import LoadingSpinner from '../common/LoadingSpinner';

interface LessonContentProps {
    content: string;
    type: 'video' | 'text';
    isTeacher: boolean;
    isServiceOk: boolean;
    onSave: (newContent: string) => void;
}

const LessonContent: React.FC<LessonContentProps> = ({ content, type, isTeacher, isServiceOk, onSave }) => {
    const { user } = useContext(AuthContext)!;
    const { db } = useContext(DataContext)!;
    const { setPage: setGlobalPage } = useContext(GlobalStateContext)!;

    const [localContent, setLocalContent] = useState(content);
    const [isEditing, setIsEditing] = useState(false);
    
    // ELI5 Simple Mode States
    const [isSimpleMode, setIsSimpleMode] = useState(false);
    const [simpleContent, setSimpleContent] = useState<string | null>(null);
    const [isSimplifying, setIsSimplifying] = useState(false);

    useEffect(() => {
        setLocalContent(content);
        // Reset simple mode when content changes (e.g. navigation)
        setIsSimpleMode(false);
        setSimpleContent(null);
    }, [content]);

    const handleToggleSimpleMode = async () => {
        if (isSimpleMode) {
            setIsSimpleMode(false);
            return;
        }

        if (simpleContent) {
            setIsSimpleMode(true);
            return;
        }

        const apiKey = user ? db.USERS[user.id]?.apiKey : null;
        if (!apiKey) {
            setGlobalPage('api_key', { isApiKeyModalOpen: true });
            return;
        }

        setIsSimplifying(true);
        try {
            const simplified = await simplifyContent(apiKey, content);
            setSimpleContent(simplified);
            setIsSimpleMode(true);
        } catch (e: any) {
            alert("Lỗi: " + e.message);
        } finally {
            setIsSimplifying(false);
        }
    };

    if (!isServiceOk && type === 'text') {
        return (
            <div className="text-center p-12 m-6">
                <div className="p-4 bg-gray-800 border border-yellow-700 rounded-lg">
                    <h2 className="text-xl font-bold text-yellow-400 mb-2">Dịch vụ Nội dung đang Bảo trì</h2>
                    <p className="text-gray-400 text-sm">Không thể tải nội dung bài học lúc này.</p>
                </div>
            </div>
        );
    }

    if (type === 'video') return null; // Video is handled by the parent player

    return (
        <div className={`p-6 md:p-8 transition-colors duration-500 ${isSimpleMode ? 'bg-orange-50/5 rounded-2xl' : ''}`}>
            {/* Header Toolbar */}
            <div className="flex justify-between items-center mb-6">
                {isTeacher && !isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="btn btn-secondary text-xs"
                        disabled={!isServiceOk}
                    >
                        ✏️ Chỉnh sửa
                    </button>
                )}
                
                {/* ELI5 Toggle */}
                {!isEditing && (
                    <button 
                        onClick={handleToggleSimpleMode}
                        className={`ml-auto btn btn-sm border flex items-center gap-2 transition-all ${
                            isSimpleMode 
                            ? 'bg-orange-500 text-white border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.5)]' 
                            : 'bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700'
                        }`}
                        disabled={isSimplifying}
                    >
                        {isSimplifying ? <LoadingSpinner size={3} /> : <span className="text-lg">🧸</span>}
                        <span className="text-xs font-bold">{isSimpleMode ? 'Chế độ Trẻ Em' : 'Chế độ Đơn giản'}</span>
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="space-y-4">
                    <textarea 
                        className="form-textarea h-96 font-mono text-sm" 
                        value={localContent} 
                        onChange={(e) => setLocalContent(e.target.value)} 
                    />
                    <div className="flex space-x-3">
                        <button 
                            onClick={() => { onSave(localContent); setIsEditing(false); }} 
                            className="btn btn-primary"
                        >
                            Lưu
                        </button>
                        <button 
                            onClick={() => { setIsEditing(false); setLocalContent(content); }} 
                            className="btn btn-secondary"
                        >
                            Hủy
                        </button>
                    </div>
                </div>
            ) : (
                <div className="relative">
                    {isSimplifying && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg animate-fade-in">
                            <LoadingSpinner size={8} />
                            <p className="mt-4 text-orange-300 font-bold animate-pulse">AI đang đọc truyện cho bạn...</p>
                            <p className="text-xs text-gray-500">Gemini 2.5 Flash Thinking Mode</p>
                        </div>
                    )}
                    
                    <div 
                        className={`prose prose-invert max-w-none transition-all duration-500 ${
                            isSimpleMode 
                            ? 'prose-lg font-comic text-orange-100' // Custom styling for kid mode
                            : 'prose-lg'
                        }`} 
                        dangerouslySetInnerHTML={{ __html: (isSimpleMode && simpleContent ? simpleContent : localContent).replace(/\n/g, '<br />') }} 
                    />
                    
                    {isSimpleMode && (
                        <div className="mt-8 pt-4 border-t border-orange-500/30 text-center">
                            <p className="text-xs text-orange-400 italic">✨ Nội dung được đơn giản hóa bởi AI (Gemini 2.5 Flash).</p>
                        </div>
                    )}
                </div>
            )}
            
            {/* Inject simple font style for demo purposes if not globally available */}
            <style>{`
                .font-comic { font-family: 'Comic Sans MS', 'Chalkboard SE', sans-serif; }
            `}</style>
        </div>
    );
};

export default LessonContent;
