
import React, { useContext, useEffect, useState } from 'react';
import { DataContext, AuthContext, PetContext } from '../../contexts/AppProviders';
import GlobalReviewModal from '../modals/GlobalReviewModal';

const SmartReviewWidget: React.FC = () => {
    const { user } = useContext(AuthContext)!;
    const { dueFlashcardsCount, fetchDueFlashcards } = useContext(DataContext)!;
    const { triggerReaction } = useContext(PetContext)!;
    const [isReviewOpen, setIsReviewOpen] = useState(false);

    useEffect(() => {
        if (user) {
            fetchDueFlashcards(user.id);
        }
    }, [user, fetchDueFlashcards]);

    const handleOpenReview = () => {
        if (dueFlashcardsCount > 0) {
            setIsReviewOpen(true);
            triggerReaction('hover_smart');
        } else {
            alert("Bạn đã hoàn thành chỉ tiêu ôn tập hôm nay! Hãy quay lại ngày mai để củng cố trí nhớ dài hạn.");
        }
    };

    return (
        <>
            <div 
                onClick={handleOpenReview}
                className={`card p-4 flex items-center justify-between relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.02]
                    ${dueFlashcardsCount > 0 
                        ? 'bg-gradient-to-r from-purple-900/40 to-blue-900/40 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.3)]' 
                        : 'bg-black/20 border-white/5 opacity-80'}`}
                onMouseEnter={() => triggerReaction('hover_smart')}
            >
                {/* Background Pulse Effect */}
                {dueFlashcardsCount > 0 && (
                    <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
                )}

                <div className="flex items-center gap-3 relative z-10">
                    <div className={`text-4xl filter drop-shadow-lg ${dueFlashcardsCount > 0 ? 'animate-bounce-subtle' : 'grayscale'}`}>
                        🧠
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm uppercase tracking-wider">Brain Gym</h3>
                        <p className="text-xs text-gray-400">
                            {dueFlashcardsCount > 0 
                                ? 'Đến giờ tập thể dục cho não!' 
                                : 'Trí nhớ dài hạn đã được lưu.'}
                        </p>
                    </div>
                </div>

                <div className="relative z-10 text-right">
                    {dueFlashcardsCount > 0 ? (
                        <>
                            <span className="block text-3xl font-black text-purple-300 drop-shadow-md animate-pulse">
                                {dueFlashcardsCount}
                            </span>
                            <span className="text-[10px] font-bold text-purple-400 uppercase bg-purple-900/50 px-2 py-0.5 rounded-full">
                                Cần ôn tập
                            </span>
                        </>
                    ) : (
                        <div className="flex flex-col items-end">
                            <span className="text-2xl text-green-500">✓</span>
                            <span className="text-[9px] text-green-400/70 font-mono">ALL DONE</span>
                        </div>
                    )}
                </div>
            </div>

            <GlobalReviewModal 
                isOpen={isReviewOpen} 
                onClose={() => setIsReviewOpen(false)} 
            />
        </>
    );
};

export default SmartReviewWidget;
