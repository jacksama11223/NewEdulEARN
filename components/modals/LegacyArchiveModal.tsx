
import React from 'react';
import Modal from '../common/Modal';

interface LegacyArchiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    content: string | null;
    title: string;
    isGenerating: boolean;
}

const LegacyArchiveModal: React.FC<LegacyArchiveModalProps> = ({ isOpen, onClose, content, title, isGenerating }) => {
    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`🏛️ Lưu Trữ Di Sản: ${title}`} size="xl">
            <div className="flex flex-col h-[70vh]">
                {isGenerating ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-yellow-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                            <div className="text-8xl animate-bounce-subtle">📜</div>
                        </div>
                        <h2 className="text-2xl font-bold text-yellow-200">AI đang viết Kỷ Yếu...</h2>
                        <p className="text-gray-400 max-w-md">
                            Gemini đang tổng hợp lại toàn bộ hành trình, chiến tích và những khoảnh khắc đáng nhớ của {title}.
                        </p>
                        <p className="text-xs text-blue-400 font-mono animate-pulse">Thinking Mode: Analyzing History...</p>
                    </div>
                ) : content ? (
                    <>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-[#1a150e] border-8 border-double border-[#8b6c42] rounded-lg shadow-2xl relative">
                            {/* Old paper texture effect overlay */}
                            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/aged-paper.png")' }}></div>
                            
                            <div className="prose prose-invert prose-lg max-w-none font-serif text-[#dcd0b3] leading-relaxed">
                                {/* Simulated Title Page */}
                                <div className="text-center mb-12 border-b-2 border-[#8b6c42] pb-8">
                                    <h1 className="text-4xl font-black text-yellow-500 uppercase tracking-widest mb-2">{title}</h1>
                                    <p className="text-xl italic text-yellow-200/60">Legacy Archive • {new Date().getFullYear()}</p>
                                </div>
                                
                                {/* Content */}
                                <div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br />') }} />
                                
                                {/* Signature */}
                                <div className="mt-16 text-right">
                                    <p className="font-cursive text-2xl text-yellow-500">AI Historian</p>
                                    <p className="text-xs text-[#8b6c42]">Veritas Aeterna</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex justify-end gap-4">
                            <button onClick={onClose} className="btn btn-secondary">Đóng</button>
                            <button 
                                onClick={() => alert("Đã tải xuống PDF (Giả lập)!")}
                                className="btn btn-primary bg-yellow-700 hover:bg-yellow-600 text-white border-yellow-500 shadow-lg flex items-center gap-2"
                            >
                                <span>📥</span> Tải Kỷ Yếu (PDF)
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="text-center text-red-400 p-8">
                        Không thể tạo nội dung lưu trữ. Vui lòng thử lại.
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default LegacyArchiveModal;
