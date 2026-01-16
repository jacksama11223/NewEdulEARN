
import React, { useState, useEffect, useContext } from 'react';
import Modal from '../common/Modal';
import { DataContext, AuthContext, PetContext } from '../../contexts/AppProviders';

interface GlobalReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const GlobalReviewModal: React.FC<GlobalReviewModalProps> = ({ isOpen, onClose }) => {
    const { user } = useContext(AuthContext)!;
    const { fetchDueFlashcards, recordCardReview, playSound } = useContext(DataContext)!; 
    const { triggerReaction, say } = useContext(PetContext)!;

    const [reviewQueue, setReviewQueue] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [sessionXp, setSessionXp] = useState(0);

    // Fetch cards when modal opens
    useEffect(() => {
        let isMounted = true;

        if (isOpen && user) {
            setIsLoading(true);
            setReviewQueue([]); 
            setCurrentIndex(0); // Reset index
            setIsFlipped(false);
            setSessionXp(0);
            
            const loadData = async () => {
                try {
                    // Call the function directly from the context
                    const cards = await fetchDueFlashcards(user.id);
                    
                    if (isMounted) {
                        setReviewQueue(cards || []);
                        setIsLoading(false);
                    }
                } catch (error) {
                    console.error("🧠 Brain Gym Error:", error);
                    if (isMounted) {
                        setReviewQueue([]); 
                        setIsLoading(false);
                    }
                }
            };

            loadData();
        }

        return () => {
            isMounted = false;
        };
    }, [isOpen, user, fetchDueFlashcards]);

    const handleFlip = () => setIsFlipped(!isFlipped);

    const getIntervalLabel = (currentBox: number, rating: 'easy' | 'medium' | 'hard') => {
        if (rating === 'hard') return "10m"; 
        
        let nextBox = currentBox;
        let days = 1;

        if (rating === 'medium') {
            nextBox = Math.max(0, currentBox);
             days = (nextBox === 0 ? 1 : Math.pow(2.2, nextBox)) * 1.2;
        } else { // easy
            nextBox = currentBox + 1;
            if (nextBox === 1) days = 1;
            else if (nextBox === 2) days = 3;
            else if (nextBox === 3) days = 7;
            else if (nextBox === 4) days = 16;
            else if (nextBox === 5) days = 35;
            else if (nextBox === 6) days = 80;
            else if (nextBox === 7) days = 180;
            else days = 365;
        }

        if (days < 1) return "<1d";
        if (days >= 365) return "1y";
        if (days >= 30) return `${Math.round(days/30)}mo`;
        return `${Math.round(days)}d`;
    };

    const handleRating = async (rating: 'easy' | 'medium' | 'hard') => {
        const card = reviewQueue[currentIndex];
        
        // Optimistic UI Update & Sound
        if (rating === 'easy') {
            playSound('success'); 
            setSessionXp(prev => prev + 10);
        } else if (rating === 'medium') {
            playSound('tap');
            setSessionXp(prev => prev + 5);
        } else {
            playSound('error'); 
        }

        // Fire and forget backend update
        recordCardReview({
            cardId: card.id,
            rating,
            sourceType: card.sourceType,
            sourceId: card.sourceId,
            nodeId: card.nodeId
        });

        // STABILITY FIX:
        // Instead of removing from array (splice), we just move the pointer.
        // If 'hard', we append a clone to the end to review again this session.
        if (rating === 'hard') {
            setReviewQueue(prev => [...prev, { ...card, _isRetry: true }]);
        }

        // Reset Flip State IMMEDIATELY before showing new content
        setIsFlipped(false);
        
        // Move to next card
        setCurrentIndex(prev => prev + 1);

        // Completion Check happens in render logic below
    };

    if (!isOpen) return null;

    // Check if finished
    const isFinished = !isLoading && currentIndex >= reviewQueue.length;
    const currentCard = reviewQueue[currentIndex];
    const progress = reviewQueue.length > 0 ? ((currentIndex) / reviewQueue.length) * 100 : 0;
    const currentBox = currentCard?.box || 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="🧠 Brain Gym (SRS Review)" size="lg">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-400 animate-pulse">Đang kết nối vỏ não...</p>
                </div>
            ) : isFinished ? (
                <div className="text-center py-10">
                    <div className="text-6xl mb-4 animate-bounce">🎉</div>
                    <h3 className="text-xl font-bold text-white">Bạn đã hoàn thành tất cả!</h3>
                    <p className="text-gray-400 mt-2">Tổng kết: +{sessionXp} XP</p>
                    <p className="text-xs text-gray-500 mt-1">Hẹn gặp lại bạn vào ngày mai.</p>
                    <button onClick={onClose} className="btn btn-primary mt-6">Quay lại Dashboard</button>
                </div>
            ) : (
                <div className="flex flex-col items-center space-y-6 py-2 min-h-[400px]">
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-800 rounded-full h-2 mb-4">
                        <div 
                            className="bg-purple-500 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>

                    <div className="flex justify-between w-full px-2 text-xs text-gray-500 uppercase font-bold">
                        <span>Card {currentIndex + 1}/{reviewQueue.length}</span>
                        <span>Deck: {currentCard.deckTitle}</span>
                    </div>

                    {/* Card Area - Fixed Height to prevent jumping */}
                    <div 
                        className="relative w-full max-w-md h-80 cursor-pointer perspective-1000 group"
                        onClick={handleFlip}
                        style={{ perspective: '1000px' }}
                    >
                        <div 
                            className={`relative w-full h-full transition-transform duration-300 transform-style-3d`}
                            style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                        >
                            {/* Front */}
                            <div 
                                className="absolute w-full h-full backface-hidden bg-gray-800 border-2 border-gray-600 rounded-2xl flex flex-col items-center justify-center p-8 text-center shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:border-purple-500 transition-colors" 
                                style={{ backfaceVisibility: 'hidden' }}
                            >
                                <h3 className="text-3xl font-black text-white select-none animate-fade-in">{currentCard.front}</h3>
                                <p className="absolute bottom-6 text-xs text-gray-500 uppercase tracking-widest font-bold">Chạm để lật</p>
                            </div>

                            {/* Back */}
                            <div 
                                className="absolute w-full h-full backface-hidden bg-gradient-to-br from-purple-900 to-indigo-900 border-2 border-purple-500/50 rounded-2xl flex flex-col items-center justify-center p-8 text-center shadow-[0_0_30px_rgba(168,85,247,0.4)]"
                                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                            >
                                <p className="text-xl font-medium text-white leading-relaxed select-none">{currentCard.back}</p>
                            </div>
                        </div>
                    </div>

                    {/* Controls with Time Interval Preview */}
                    <div className={`grid grid-cols-3 gap-3 w-full max-w-md transition-opacity duration-200 ${isFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                        <button onClick={() => handleRating('hard')} className="btn py-3 bg-red-900/40 border border-red-500/50 text-red-300 hover:bg-red-600 hover:text-white rounded-xl flex flex-col items-center group">
                            <span className="font-bold">Khó</span>
                            <span className="text-[10px] opacity-70 font-mono group-hover:text-white">{getIntervalLabel(currentBox, 'hard')}</span>
                        </button>
                        <button onClick={() => handleRating('medium')} className="btn py-3 bg-blue-900/40 border border-blue-500/50 text-blue-300 hover:bg-blue-600 hover:text-white rounded-xl flex flex-col items-center group">
                            <span className="font-bold">Ổn</span>
                            <span className="text-[10px] opacity-70 font-mono group-hover:text-white">{getIntervalLabel(currentBox, 'medium')}</span>
                        </button>
                        <button onClick={() => handleRating('easy')} className="btn py-3 bg-green-900/40 border border-green-500/50 text-green-300 hover:bg-green-600 hover:text-white rounded-xl flex flex-col items-center group">
                            <span className="font-bold">Dễ</span>
                            <span className="text-[10px] opacity-70 font-mono group-hover:text-white">{getIntervalLabel(currentBox, 'easy')}</span>
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default GlobalReviewModal;
