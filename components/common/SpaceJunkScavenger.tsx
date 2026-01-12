
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { DataContext, AuthContext, PageContext, PetContext } from '../../contexts/AppProviders';
import { SpaceJunk } from '../../types';

const JUNK_TYPES = [
    { name: 'Vệ tinh hỏng', icon: '🛰️', rarity: 'common', xpValue: 10 },
    { name: 'Mảnh thiên thạch', icon: '☄️', rarity: 'common', xpValue: 15 },
    { name: 'Đĩa mềm cũ', icon: '💾', rarity: 'rare', xpValue: 30 },
    { name: 'Ốc vít titan', icon: '🔩', rarity: 'common', xpValue: 10 },
    { name: 'Mũ phi hành gia vỡ', icon: '👨‍🚀', rarity: 'legendary', xpValue: 100 },
    { name: 'Pin năng lượng cạn', icon: '🔋', rarity: 'rare', xpValue: 25 },
];

const SpaceJunkScavenger: React.FC = () => {
    const { user } = useContext(AuthContext)!;
    const { collectSpaceJunk } = useContext(DataContext)!;
    const { page } = useContext(PageContext)!;
    const { triggerReaction, say } = useContext(PetContext)!;

    const [activeJunk, setActiveJunk] = useState<SpaceJunk & { x: number, y: number, duration: number } | null>(null);
    const [lastSpawnTime, setLastSpawnTime] = useState(Date.now());

    // Only active on certain pages
    const isScavengablePage = page === 'dashboard' || page === '404';

    const spawnJunk = useCallback(() => {
        const type = JUNK_TYPES[Math.floor(Math.random() * JUNK_TYPES.length)];
        const startY = Math.random() * (window.innerHeight - 200) + 100;
        const duration = 5 + Math.random() * 5; // 5-10s duration

        setActiveJunk({
            id: `junk_${Date.now()}`,
            name: type.name,
            icon: type.icon,
            rarity: type.rarity as any,
            xpValue: type.xpValue,
            x: -100, // Start off-screen left
            y: startY,
            duration
        });

        // Trigger Pet Reaction
        // FLOW: Rác vũ trụ xuất hiện -> Pet Action: Chỉ trỏ (point/hover_point)
        triggerReaction('hover_point');
        say("Nhìn kìa! Có rác vũ trụ bay qua! Bấm vào nó nhanh lên trước khi nó biến mất!", 5000);

    }, [triggerReaction, say]);

    useEffect(() => {
        if (!user || !isScavengablePage) return;

        const handleScroll = () => {
            const scrollHeight = document.documentElement.scrollHeight;
            const scrollTop = document.documentElement.scrollTop;
            const clientHeight = document.documentElement.clientHeight;

            // Trigger when near bottom
            if (scrollTop + clientHeight >= scrollHeight - 200) {
                const now = Date.now();
                // Cooldown: 2 minutes
                if (now - lastSpawnTime > 120000 && !activeJunk) {
                    // Chance to spawn
                    if (Math.random() > 0.3) {
                        spawnJunk();
                        setLastSpawnTime(now);
                    }
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [user, isScavengablePage, activeJunk, lastSpawnTime, spawnJunk]);

    const handleCollect = () => {
        if (activeJunk) {
            collectSpaceJunk({
                id: activeJunk.id,
                name: activeJunk.name,
                icon: activeJunk.icon,
                rarity: activeJunk.rarity,
                xpValue: activeJunk.xpValue
            });
            alert(`🗑️ Đã nhặt được: ${activeJunk.name}!\nGiá trị tái chế: +${activeJunk.xpValue} XP.`);
            setActiveJunk(null);
            
            // Celebration
            triggerReaction('success');
            say("Hay lắm! Tái chế đống này sẽ được khối XP đấy!", 3000);
        }
    };

    if (!activeJunk) return null;

    return (
        <div 
            className="fixed z-50 cursor-pointer animate-float-across hover:scale-125 transition-transform"
            style={{ 
                top: activeJunk.y,
                left: -100, // Starting position defined in CSS keyframes usually, but we use animation
                animationDuration: `${activeJunk.duration}s`,
                '--end-x': `${window.innerWidth + 100}px`
            } as React.CSSProperties}
            onClick={handleCollect}
            title="Nhặt rác vũ trụ"
        >
            <style>{`
                @keyframes float-across {
                    0% { transform: translateX(0) rotate(0deg); }
                    100% { transform: translateX(var(--end-x)) rotate(360deg); }
                }
                .animate-float-across {
                    animation-name: float-across;
                    animation-timing-function: linear;
                    animation-fill-mode: forwards;
                }
            `}</style>
            <div className={`text-5xl filter drop-shadow-lg ${activeJunk.rarity === 'legendary' ? 'animate-pulse' : ''}`}>
                {activeJunk.icon}
            </div>
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/50 text-white text-[10px] px-2 rounded opacity-0 hover:opacity-100 transition-opacity">
                {activeJunk.name}
            </div>
        </div>
    );
};

export default SpaceJunkScavenger;
