
import React, { useContext, useState, useMemo, useEffect, useRef } from 'react';
import { DataContext, GlobalStateContext } from '../../contexts/AppProviders';
import Modal from '../common/Modal';
import type { ShopItem } from '../../types';

// --- SUB-COMPONENT: REWARD MODAL ---
const RewardModal: React.FC<{ isOpen: boolean; onClose: () => void; rewards: { diamonds: number; streak: number } }> = ({ isOpen, onClose, rewards }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="relative bg-gradient-to-b from-yellow-900/90 to-black border-2 border-yellow-500 rounded-3xl p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(234,179,8,0.6)] transform animate-pop-in" onClick={e => e.stopPropagation()}>
                {/* Rays of Light Effect */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-500/20 rounded-full blur-3xl animate-pulse z-0"></div>
                
                <div className="relative z-10">
                    <div className="text-6xl mb-4 animate-bounce">🎁</div>
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500 uppercase tracking-wide mb-2">
                        Thu Hoạch Thành Công!
                    </h2>
                    <p className="text-gray-300 text-sm mb-6">Phần thưởng điểm danh hàng ngày của bạn</p>
                    
                    <div className="flex justify-center gap-4 mb-8">
                        <div className="bg-black/40 p-4 rounded-2xl border border-blue-500/50 min-w-[100px]">
                            <div className="text-3xl mb-1">💎</div>
                            <div className="text-2xl font-bold text-blue-400">+{rewards.diamonds}</div>
                            <div className="text-[10px] text-gray-500 uppercase">Kim Cương</div>
                        </div>
                        <div className="bg-black/40 p-4 rounded-2xl border border-orange-500/50 min-w-[100px]">
                            <div className="text-3xl mb-1">🔥</div>
                            <div className="text-2xl font-bold text-orange-400">+{rewards.streak}</div>
                            <div className="text-[10px] text-gray-500 uppercase">Chuỗi Ngày</div>
                        </div>
                    </div>

                    <button 
                        onClick={onClose}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-bold shadow-lg hover:scale-105 transition-transform"
                    >
                        Tuyệt vời!
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: SHOP MODAL ---
const ShopModal: React.FC<{ isOpen: boolean; onClose: () => void; targetItemId?: string }> = ({ isOpen, onClose, targetItemId }) => {
    const { db, buyShopItem, equipShopItem, equipPet, recycleSpaceJunk } = useContext(DataContext)!;
    const { points, diamonds, inventory, equippedSkin, equippedPet, junkInventory } = db.GAMIFICATION;
    const [filter, setFilter] = useState<'all' | 'skin' | 'effect' | 'pet' | 'junk'>('all');

    // Auto-scroll logic when targetItemId is present
    useEffect(() => {
        if (isOpen && targetItemId) {
            // Find item type to set filter correctly
            const item = db.SHOP_ITEMS.find(i => i.id === targetItemId);
            if (item) {
                // Ensure the correct tab is open
                const type = item.type || 'skin'; 
                setFilter(type as any); // Might need cleaner type mapping
                
                // Wait for render then scroll
                setTimeout(() => {
                    const el = document.getElementById(`shop-item-${targetItemId}`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        // Trigger visual highlight
                        el.classList.add('ring-4', 'ring-yellow-400', 'ring-offset-2', 'ring-offset-black', 'scale-105');
                        setTimeout(() => {
                            el.classList.remove('ring-4', 'ring-yellow-400', 'ring-offset-2', 'ring-offset-black', 'scale-105');
                        }, 2000);
                    }
                }, 300);
            }
        }
    }, [isOpen, targetItemId, db.SHOP_ITEMS]);

    const handleBuy = (itemId: string) => {
        try {
            buyShopItem(itemId);
            alert("🎉 Mua thành công! Hãy vào Kho đồ để trang bị.");
        } catch (e: any) {
            alert(`⚠️ ${e.message}`);
        }
    };

    const handleEquip = (item: ShopItem) => {
        try {
            if (item.type === 'skin') {
                equipShopItem(item.id);
            } else if (item.type === 'pet') {
                equipPet(item.id);
            } else {
                // Effects or others logic if needed
                alert("Đã trang bị (Giả lập)");
            }
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleRecycle = (junkId: string, xpValue: number) => {
        recycleSpaceJunk(junkId);
        alert(`♻️ Đã tái chế rác thành công!\n+${xpValue} XP`);
    }

    const filteredItems = useMemo(() => {
        if (filter === 'junk') return []; // Handled separately
        return db.SHOP_ITEMS.filter(item => {
            const type = item.type || 'skin'; 
            if (filter === 'all') return true;
            return type === filter;
        });
    }, [db.SHOP_ITEMS, filter]);

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Cửa Hàng & Kho Đồ" size="xl">
            <div className="space-y-6">
                {/* Currency Display */}
                <div className="flex justify-between items-center bg-gray-900 p-4 rounded-xl border border-gray-700 shadow-inner">
                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Kinh Nghiệm</p>
                            <p className="text-2xl font-black text-yellow-400 drop-shadow-md">{points.toLocaleString()} XP</p>
                        </div>
                        <div className="h-8 w-px bg-gray-700"></div>
                        <div className="text-center">
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Đá Quý</p>
                            <p className="text-2xl font-black text-blue-400 drop-shadow-md">💎 {diamonds}</p>
                        </div>
                    </div>
                    <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-500 italic">"Tri thức là sức mạnh, và sức mạnh mua được Skin xịn."</p>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex space-x-2 border-b border-gray-700 pb-2 overflow-x-auto">
                    {(['all', 'skin', 'effect', 'pet', 'junk'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${
                                filter === f 
                                ? 'bg-blue-600 text-white shadow-lg' 
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                        >
                            {f === 'all' ? 'Tất cả' : f === 'skin' ? 'Giao diện' : f === 'effect' ? 'Hiệu ứng' : f === 'pet' ? 'Thú cưng' : '🗑️ Tái Chế Rác'}
                        </button>
                    ))}
                </div>

                {/* Items Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2 p-2">
                    {filter === 'junk' ? (
                        /* JUNK RECYCLE VIEW */
                        (junkInventory && junkInventory.length > 0) ? (
                            junkInventory.map(junk => (
                                <div key={junk.id} className="card p-4 border-gray-700 bg-gray-800/50 flex flex-col justify-between items-center text-center">
                                    <div className="text-5xl mb-2 filter drop-shadow-xl animate-float">{junk.icon}</div>
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-300">{junk.name}</h3>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{junk.rarity}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleRecycle(junk.id, junk.xpValue)}
                                        className="btn w-full text-xs py-2 mt-3 rounded-lg bg-green-900/30 border border-green-500/50 text-green-300 hover:bg-green-500 hover:text-white transition-colors"
                                    >
                                        ♻️ Tái chế (+{junk.xpValue} XP)
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full text-center py-10 text-gray-500">
                                <p className="text-4xl mb-4">🧹</p>
                                <p>Kho rác trống trơn.</p>
                                <p className="text-xs mt-2">Hãy cuộn xuống cuối các trang để tìm rác vũ trụ trôi nổi!</p>
                            </div>
                        )
                    ) : (
                        /* SHOP ITEMS VIEW */
                        filteredItems.map(item => {
                            const isOwned = inventory.includes(item.id);
                            const isEquipped = item.type === 'pet' ? equippedPet === item.id : equippedSkin === item.id;
                            const canAfford = item.currency === 'diamond' ? diamonds >= item.cost : points >= item.cost;

                            return (
                                <div 
                                    key={item.id} 
                                    id={`shop-item-${item.id}`}
                                    className={`card p-4 relative group flex flex-col justify-between transition-all duration-300 ${isEquipped ? 'border-green-500 bg-green-900/10' : 'border-gray-700 bg-gray-800/50'}`}
                                >
                                    {isEquipped && <span className="absolute top-2 right-2 text-[10px] font-bold bg-green-600 text-white px-2 py-0.5 rounded-full shadow-lg z-10">ACTIVE</span>}
                                    
                                    <div className="text-center mb-3 group-hover:-translate-y-2 transition-transform duration-300">
                                        <div className="text-5xl mb-2 filter drop-shadow-xl">{item.icon}</div>
                                        <h3 className="text-sm font-bold text-white">{item.name}</h3>
                                        <p className="text-[10px] text-gray-400 h-8 line-clamp-2 mt-1">{item.description}</p>
                                    </div>
                                    
                                    {isOwned ? (
                                        <button 
                                            onClick={() => handleEquip(item)}
                                            disabled={isEquipped}
                                            className={`btn w-full text-xs py-2 rounded-lg ${isEquipped ? 'bg-gray-700 text-gray-400 cursor-default' : 'btn-primary'}`}
                                        >
                                            {isEquipped ? 'Đang sử dụng' : 'Trang bị ngay'}
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleBuy(item.id)}
                                            className={`btn w-full text-xs py-2 rounded-lg flex justify-center items-center gap-2 transition-all ${
                                                canAfford 
                                                ? 'bg-gray-700 hover:bg-white/10 border border-gray-600 hover:border-white text-white' 
                                                : 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
                                            }`}
                                            disabled={!canAfford}
                                        >
                                            <span>{item.currency === 'diamond' ? '💎' : 'XP'}</span>
                                            <span>{item.cost}</span>
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                    
                    {filter !== 'junk' && filteredItems.length === 0 && <p className="col-span-full text-center text-gray-500 py-8">Không tìm thấy vật phẩm nào.</p>}
                </div>
            </div>
        </Modal>
    );
};

// --- MAIN WIDGET ---
const TreasureChestWidget: React.FC = () => {
    const { db, checkDailyDiamondReward } = useContext(DataContext)!;
    const { shopIntent, setShopIntent } = useContext(GlobalStateContext)!; // NEW: Global intent listener
    
    const { points, diamonds, lastStudyDate, junkInventory } = db.GAMIFICATION;
    const [isShopOpen, setIsShopOpen] = useState(false);
    
    // Daily Harvest State
    const [showRewardModal, setShowRewardModal] = useState(false);
    const [rewardData, setRewardData] = useState({ diamonds: 0, streak: 0 });

    // Level Calculation
    const level = Math.floor(points / 1000) + 1;
    const currentLevelXp = points % 1000;
    const progressPercent = (currentLevelXp / 1000) * 100;

    // --- EFFECT: LISTEN TO SHOP INTENT ---
    useEffect(() => {
        if (shopIntent.isOpen) {
            setIsShopOpen(true);
            // We don't clear intent immediately to allow Modal to read the target ID
        }
    }, [shopIntent]);

    const handleCloseShop = () => {
        setIsShopOpen(false);
        setShopIntent({ isOpen: false }); // Reset intent
    };

    // Check if reward is available today
    const canClaimReward = useMemo(() => {
        const today = new Date().toDateString();
        return lastStudyDate !== today;
    }, [lastStudyDate]);

    const handleDailyHarvest = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent opening other things if nested
        if (!canClaimReward) return;

        const claimed = checkDailyDiamondReward();
        if (claimed) {
            setRewardData({ diamonds: 5, streak: 1 });
            setShowRewardModal(true);
        }
    };

    return (
        <>
            <div id="treasure-chest" className="card p-6 md:p-8 border-yellow-400/30 bg-gradient-to-b from-yellow-900/20 to-black/40 relative overflow-hidden group hover:border-yellow-400/50 transition-colors duration-500">
                {/* Atmospheric Glow */}
                <div className="absolute -right-12 -top-12 w-48 h-48 bg-yellow-500/20 rounded-full blur-[80px] group-hover:bg-yellow-500/30 transition-all duration-700 animate-pulse"></div>
                
                {/* Header & Balance */}
                <div className="flex justify-between items-start mb-6 relative z-10">
                    <div>
                        <h3 className="text-lg font-bold text-yellow-100 flex items-center gap-2">
                            <span className="text-2xl animate-bounce-subtle">🏆</span> KHO BÁU
                        </h3>
                        <p className="text-xs text-yellow-500/80 uppercase tracking-widest mt-1">Cấp độ {level}</p>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center justify-end gap-1 text-blue-300 font-black text-xl drop-shadow-md">
                            <span>💎</span> <span>{diamonds}</span>
                        </div>
                        <p className="text-[9px] text-blue-400/60 font-mono">GEM BALANCE</p>
                    </div>
                </div>
                
                {/* DAILY HARVEST BOX (Userflow 1) */}
                {canClaimReward ? (
                    <div className="mb-6 relative z-20">
                        <button 
                            onClick={handleDailyHarvest}
                            className="w-full relative overflow-hidden rounded-xl bg-gradient-to-r from-yellow-600/80 to-orange-600/80 p-1 shadow-[0_0_20px_rgba(234,179,8,0.4)] transition-all hover:scale-[1.02] group/gift"
                        >
                            <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                            <div className="bg-black/60 rounded-lg p-3 flex items-center justify-between backdrop-blur-sm">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl animate-bounce">🎁</span>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-yellow-100">Quà Hàng Ngày</p>
                                        <p className="text-[10px] text-yellow-200/70">Nhấn để thu hoạch ngay!</p>
                                    </div>
                                </div>
                                <span className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-1 rounded animate-pulse">READY</span>
                            </div>
                        </button>
                    </div>
                ) : (
                    <div className="mb-6 p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between opacity-60 relative z-10">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl grayscale">⏳</span>
                            <div>
                                <p className="text-xs font-bold text-gray-400">Đã nhận quà hôm nay</p>
                                <p className="text-xs text-gray-600">Quay lại vào ngày mai nhé!</p>
                            </div>
                        </div>
                        <span className="text-green-500 text-lg">✓</span>
                    </div>
                )}

                {/* Level Progress Circle & Stats */}
                <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div className="flex-1">
                        <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-1 uppercase">
                            <span>Tiến độ Level {level}</span>
                            <span>{currentLevelXp} / 1000 XP</span>
                        </div>
                        <div className="h-3 w-full bg-black/40 rounded-full border border-white/10 overflow-hidden relative">
                            <div 
                                className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 shadow-[0_0_15px_rgba(234,179,8,0.5)] transition-all duration-1000 ease-out"
                                style={{ width: `${progressPercent}%` }}
                            >
                                <div className="absolute inset-0 bg-white/30 animate-shimmer"></div>
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-2 italic">Hoàn thành bài tập để nhận thêm XP!</p>
                    </div>
                </div>
                
                {/* Shop Categories */}
                <div className="grid grid-cols-3 gap-3 relative z-10">
                    <button onClick={() => setIsShopOpen(true)} className="aspect-square rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center hover:bg-indigo-600/20 hover:border-indigo-500/50 hover:scale-105 transition-all cursor-pointer shadow-lg group/btn">
                        <span className="text-2xl mb-2 group-hover/btn:scale-110 transition-transform filter drop-shadow-lg">🚀</span>
                        <span className="text-[9px] font-bold text-gray-400 group-hover/btn:text-indigo-300 uppercase tracking-wide">Hiệu ứng</span>
                    </button>
                    <button onClick={() => setIsShopOpen(true)} className="aspect-square rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center hover:bg-yellow-600/20 hover:border-yellow-500/50 hover:scale-105 transition-all cursor-pointer shadow-lg group/btn">
                        <span className="text-2xl mb-2 group-hover/btn:scale-110 transition-transform filter drop-shadow-lg">🧥</span>
                        <span className="text-[9px] font-bold text-gray-400 group-hover/btn:text-yellow-300 uppercase tracking-wide">Giao diện</span>
                    </button>
                    <button onClick={() => setIsShopOpen(true)} className="aspect-square rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center hover:bg-pink-600/20 hover:border-pink-500/50 hover:scale-105 transition-all cursor-pointer shadow-lg group/btn">
                        <span className="text-2xl mb-2 group-hover/btn:scale-110 transition-transform filter drop-shadow-lg">🐉</span>
                        <span className="text-[9px] font-bold text-gray-400 group-hover/btn:text-pink-300 uppercase tracking-wide">Thú cưng</span>
                    </button>
                </div>

                {/* Footer Action */}
                <button 
                    onClick={() => setIsShopOpen(true)}
                    className="w-full mt-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-bold text-gray-300 transition-colors flex items-center justify-center gap-2"
                >
                    <span>🛒</span> Mở Cửa Hàng
                    {junkInventory && junkInventory.length > 0 && <span className="bg-red-500 text-white text-[9px] px-1.5 rounded-full animate-pulse">{junkInventory.length}</span>}
                </button>
            </div>
            
            <ShopModal 
                isOpen={isShopOpen} 
                onClose={handleCloseShop} 
                targetItemId={shopIntent.targetItemId} // PASS TARGET ID
            />
            <RewardModal isOpen={showRewardModal} onClose={() => setShowRewardModal(false)} rewards={rewardData} />
        </>
    );
};

export default TreasureChestWidget;
