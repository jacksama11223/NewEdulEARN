
import React, { useState, useEffect, useContext } from 'react';
import Modal from '../common/Modal';
import { DataContext } from '../../contexts/AppProviders';
import type { FlashcardDeck } from '../../types';

interface FlashcardModalProps {
    isOpen: boolean;
    onClose: () => void;
    deck: FlashcardDeck | null;
}

const FlashcardModal: React.FC<FlashcardModalProps> = ({ isOpen, onClose, deck: initialDeck }) => {
    const { db, updateFlashcardInDeck } = useContext(DataContext)!;
    
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    
    // HOTFIX EDIT STATE
    const [isEditing, setIsEditing] = useState(false);
    const [editFront, setEditFront] = useState('');
    const [editBack, setEditBack] = useState('');

    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(0);
            setIsFlipped(false);
            setIsEditing(false);
        }
    }, [isOpen]);

    // Use live data from DB if available to reflect changes immediately
    const deck = initialDeck && db.FLASHCARD_DECKS[initialDeck.id] ? db.FLASHCARD_DECKS[initialDeck.id] : initialDeck;

    // --- SKIN LOGIC ---
    const equippedSkinId = db.GAMIFICATION.equippedSkin || 'skin_default';
    const activeSkin = db.SHOP_ITEMS.find(i => i.id === equippedSkinId);
    const skinClass = activeSkin?.cssClass || 'bg-gray-800 border-gray-600';

    if (!deck || !isOpen) return null;

    const currentCard = deck.cards[currentIndex];

    const handleNext = () => {
        if (currentIndex < deck.cards.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setIsFlipped(false);
            setIsEditing(false);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setIsFlipped(false);
            setIsEditing(false);
        }
    };

    const handleFlip = () => {
        if (!isEditing) setIsFlipped(!isFlipped);
    };

    // --- HOTFIX HANDLERS ---
    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditFront(currentCard.front);
        setEditBack(currentCard.back);
        setIsEditing(true);
    };

    const handleSaveEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (deck) {
            updateFlashcardInDeck(deck.id, { ...currentCard, front: editFront, back: editBack });
            setIsEditing(false);
        }
    };

    const handleCancelEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Flashcards: ${deck.title}`} size="lg">
            <div className="flex flex-col items-center space-y-6 py-4 relative">
                
                {/* EDIT BUTTON (Only visible when not editing) */}
                {!isEditing && (
                    <button 
                        onClick={handleEditClick}
                        className="absolute top-0 right-0 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors z-20"
                        title="✏️ Sửa nóng (Hotfix)"
                    >
                        ✏️
                    </button>
                )}

                {/* Progress Bar */}
                <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${((currentIndex + 1) / deck.cards.length) * 100}%` }}
                    ></div>
                </div>
                <p className="text-gray-400 text-sm">Thẻ {currentIndex + 1} / {deck.cards.length}</p>

                {/* Card Area */}
                <div 
                    className="relative w-full max-w-md h-72 cursor-pointer perspective-1000"
                    onClick={handleFlip}
                    style={{ perspective: '1000px' }}
                >
                    {isEditing ? (
                        /* EDIT MODE UI */
                        <div className="w-full h-full bg-gray-800 border-2 border-yellow-500/50 rounded-xl p-6 flex flex-col gap-4 shadow-2xl animate-fade-in cursor-default" onClick={e => e.stopPropagation()}>
                            <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-widest text-center">🔧 Hotfix Mode</h3>
                            
                            <div className="flex-1 flex flex-col gap-1">
                                <label className="text-[10px] text-gray-400 uppercase font-bold">Mặt trước</label>
                                <textarea 
                                    className="w-full bg-black/30 border border-gray-600 rounded p-2 text-white text-sm resize-none focus:border-yellow-500 outline-none flex-1"
                                    value={editFront}
                                    onChange={e => setEditFront(e.target.value)}
                                />
                            </div>
                            
                            <div className="flex-1 flex flex-col gap-1">
                                <label className="text-[10px] text-gray-400 uppercase font-bold">Mặt sau</label>
                                <textarea 
                                    className="w-full bg-black/30 border border-gray-600 rounded p-2 text-white text-sm resize-none focus:border-yellow-500 outline-none flex-1"
                                    value={editBack}
                                    onChange={e => setEditBack(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-2 justify-end pt-2">
                                <button onClick={handleCancelEdit} className="btn btn-xs btn-secondary">Hủy</button>
                                <button onClick={handleSaveEdit} className="btn btn-xs btn-primary bg-yellow-600 hover:bg-yellow-500 text-black font-bold">💾 Lưu Sửa</button>
                            </div>
                        </div>
                    ) : (
                        /* VIEW MODE UI (3D Flip) */
                        <div 
                            className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
                            style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                        >
                            {/* Front - Using Skin Class */}
                            <div 
                                className={`absolute w-full h-full backface-hidden rounded-xl flex items-center justify-center p-8 text-center shadow-xl border ${skinClass}`} 
                                style={{ backfaceVisibility: 'hidden' }}
                            >
                                <h3 className="text-2xl font-bold">{currentCard.front}</h3>
                                <p className="absolute bottom-4 opacity-50 text-xs uppercase tracking-widest">Nhấn để lật</p>
                            </div>

                            {/* Back - Using Skin Class (dimmed) + Inverted Text if needed or generic 'text-white' to ensure visibility */}
                            <div 
                                className={`absolute w-full h-full backface-hidden rounded-xl flex items-center justify-center p-8 text-center shadow-xl border ${skinClass}`}
                                style={{ 
                                    backfaceVisibility: 'hidden', 
                                    transform: 'rotateY(180deg)',
                                    filter: 'brightness(0.85)' // Slightly darker to distinguish back
                                }}
                            >
                                <p className="text-xl font-medium">{currentCard.back}</p>
                                <div className="absolute top-2 right-2 text-[10px] opacity-50 uppercase border border-current px-1 rounded">Answer</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="flex space-x-4 mt-4">
                    <button 
                        onClick={handlePrev} 
                        disabled={currentIndex === 0 || isEditing}
                        className="btn btn-secondary disabled:opacity-50"
                    >
                        &larr; Trước
                    </button>
                    <button 
                        onClick={handleNext} 
                        disabled={currentIndex === deck.cards.length - 1 || isEditing}
                        className="btn btn-primary disabled:opacity-50"
                    >
                        Tiếp theo &rarr;
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default FlashcardModal;
