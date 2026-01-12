
import React from 'react';
import Modal from '../common/Modal';

interface PhoenixRebirthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRitual: () => void;
}

const PhoenixRebirthModal: React.FC<PhoenixRebirthModalProps> = ({ isOpen, onClose, onRitual }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="CẢNH BÁO MẤT CHUỖI" size="lg">
            <div className="text-center py-8 space-y-6">
                <div className="relative inline-block">
                    <div className="text-8xl animate-pulse grayscale">🔥</div>
                    <div className="absolute top-0 right-0 text-6xl">💔</div>
                </div>
                
                <h2 className="text-4xl font-black text-red-500 uppercase tracking-widest drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">
                    CHUỖI CỦA BẠN ĐÃ GÃY!
                </h2>
                
                <p className="text-gray-300 text-lg max-w-md mx-auto">
                    Ngọn lửa tri thức đã tắt vì bạn quên học ngày hôm qua. <br/>
                    Bạn có muốn chấp nhận số phận, hay thực hiện nghi lễ hồi sinh?
                </p>

                <div className="flex flex-col gap-4 max-w-sm mx-auto pt-4">
                    <button 
                        onClick={onRitual}
                        className="btn w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-black text-xl uppercase shadow-[0_0_30px_rgba(249,115,22,0.6)] animate-pulse hover:scale-[1.02] transition-transform border border-yellow-500/50"
                    >
                        🕊️ Thực hiện Nghi lễ Hồi sinh
                    </button>
                    <p className="text-xs text-orange-400 italic">Yêu cầu: Hoàn thành Speed Run với 100% điểm số.</p>

                    <div className="border-t border-white/10 my-2"></div>

                    <button 
                        onClick={onClose}
                        className="text-gray-500 hover:text-white text-sm underline decoration-dotted"
                    >
                        Chấp nhận mất chuỗi (Reset về 0)
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default PhoenixRebirthModal;
