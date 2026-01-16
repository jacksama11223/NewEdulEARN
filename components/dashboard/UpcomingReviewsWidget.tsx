
import React, { useContext, useEffect, useState } from 'react';
import { DataContext, AuthContext } from '../../contexts/AppProviders';

const UpcomingReviewsWidget: React.FC = () => {
    const { user } = useContext(AuthContext)!;
    const { fetchUpcomingFlashcards } = useContext(DataContext)!;

    const [upcomingCards, setUpcomingCards] = useState<any[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user) {
            loadCards(1);
        }
    }, [user]);

    const loadCards = async (page: number) => {
        if (!user) return;
        setIsLoading(true);
        try {
            // Fetch 10 items at a time
            const data = await fetchUpcomingFlashcards(user.id, page, 10);
            if (data && Array.isArray(data.cards)) {
                setUpcomingCards(data.cards);
                setTotalPages(data.totalPages || 1);
                setCurrentPage(data.page || 1);
            } else {
                setUpcomingCards([]);
            }
        } catch (e) {
            console.error("Failed to load upcoming reviews", e);
            setUpcomingCards([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrev = () => {
        if (currentPage > 1) loadCards(currentPage - 1);
    };

    const handleNext = () => {
        if (currentPage < totalPages) loadCards(currentPage + 1);
    };

    const formatDate = (timestamp: number) => {
        if (!timestamp) return <span className="text-gray-500">-</span>;
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        const diffHrs = diffMs / (1000 * 60 * 60);

        if (diffMs < 0) return <span className="text-red-400 font-bold">Quá hạn</span>;
        if (diffHrs < 24) return <span className="text-yellow-400 font-bold">{Math.ceil(diffHrs)} giờ nữa</span>;
        return <span className="text-blue-300">{date.toLocaleDateString()}</span>;
    };

    return (
        <div className="card p-4 bg-gray-900/50 border-gray-700 min-h-[300px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    📅 Lịch Ôn Tập
                </h3>
                <span className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-400">Page {currentPage}/{totalPages || 1}</span>
            </div>

            <div className="flex-1 space-y-2">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center text-gray-500 text-xs">
                        Đang tải dữ liệu...
                    </div>
                ) : upcomingCards.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500 text-xs">
                        Không có thẻ nào trong hàng đợi.
                    </div>
                ) : (
                    upcomingCards.map((card, idx) => (
                        <div key={`${card.id || 'card'}_${idx}`} className="flex justify-between items-center p-2 bg-black/20 rounded border border-white/5 hover:bg-white/5 transition-colors">
                            <div className="flex-1 min-w-0 pr-2">
                                <p className="text-xs font-bold text-white truncate">{card.front || 'Thẻ không tên'}</p>
                                <p className="text-[10px] text-gray-500 truncate">{card.deckTitle || 'Deck'}</p>
                            </div>
                            <div className="text-[10px] text-right">
                                {formatDate(card.nextReview)}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="flex justify-between mt-4 pt-2 border-t border-white/10">
                <button 
                    onClick={handlePrev} 
                    disabled={currentPage === 1 || isLoading}
                    className="text-xs px-3 py-1 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300"
                >
                    &larr; Trước
                </button>
                <button 
                    onClick={handleNext} 
                    disabled={currentPage === totalPages || isLoading}
                    className="text-xs px-3 py-1 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300"
                >
                    Sau &rarr;
                </button>
            </div>
        </div>
    );
};

export default UpcomingReviewsWidget;
