
import React, { useContext, useMemo, useState, useEffect } from 'react';
import { DataContext, PageContext, AuthContext } from '../../contexts/AppProviders';
import DuolingoTree from '../common/DuolingoTree';
import GatekeeperModal from '../modals/GatekeeperModal'; 
import SpeedRunModal from '../modals/SpeedRunModal'; 
import TreasureNodeModal from '../modals/TreasureNodeModal'; 
import Modal from '../common/Modal'; // Import standard Modal
import OnboardingTour, { TourStep } from '../common/OnboardingTour';
import type { LearningNode, ShopItem, LearningPath, User } from '../../types';

interface LearningPathDetailPageProps {
    pathId?: string; // Optional because we might use aggregateCourseId instead
}

// Helper: Calculate node status for class
const getClassNodeStatus = (itemId: string, itemType: string, students: User[], db: any): { rate: number, completed: number, total: number } => {
    let completedCount = 0;
    
    students.forEach(s => {
        let isDone = false;
        if (itemType === 'lesson') {
            if (db.LESSON_PROGRESS[s.id]?.includes(itemId)) isDone = true;
        } else {
            const asg = db.ASSIGNMENTS[itemId];
            if (asg) {
                if (asg.type === 'file') {
                    const sub = db.FILE_SUBMISSIONS[asg.id]?.find((sub: any) => sub.studentId === s.id);
                    if (sub && sub.status === 'Đã nộp') isDone = true;
                } else if (asg.quizId) {
                    const sub = db.QUIZ_SUBMISSIONS[asg.quizId]?.[s.id];
                    if (sub) isDone = true;
                }
            }
        }
        if (isDone) completedCount++;
    });

    const total = students.length || 1;
    return {
        rate: (completedCount / total) * 100,
        completed: completedCount,
        total: total
    };
};

const LearningPathDetailPage: React.FC<LearningPathDetailPageProps> = ({ pathId }) => {
    const { db, equipShopItem, extendLearningPath } = useContext(DataContext)!;
    const { user } = useContext(AuthContext)!;
    const { navigate, params } = useContext(PageContext)!;
    
    // Modal States
    const [isGatekeeperOpen, setIsGatekeeperOpen] = useState(false); 
    const [isSpeedRunOpen, setIsSpeedRunOpen] = useState(false); 
    const [isTreasureOpen, setIsTreasureOpen] = useState(false);
    
    // Manual Node Add State
    const [isAddNodeModalOpen, setIsAddNodeModalOpen] = useState(false);
    const [newNodeTitle, setNewNodeTitle] = useState('');
    const [newNodeDesc, setNewNodeDesc] = useState('');
    const [newNodeType, setNewNodeType] = useState<'theory' | 'practice' | 'challenge'>('theory');
    
    // Theme Adaptation State
    const [isSkinPromptOpen, setIsSkinPromptOpen] = useState(false);
    const [suggestedSkin, setSuggestedSkin] = useState<ShopItem | null>(null);

    const [selectedSecretNode, setSelectedSecretNode] = useState<LearningNode | null>(null);

    // --- AGGREGATE VIEW STATE ---
    const aggregateCourseId = params?.aggregateCourseId;
    const [selectedAggregateNode, setSelectedAggregateNode] = useState<{ node: LearningNode, stats: any } | null>(null);

    // --- ONBOARDING TOUR STATE ---
    const [isTourOpen, setIsTourOpen] = useState(false);

    // --- DETERMINE PATH DATA ---
    const path: LearningPath | null = useMemo(() => {
        if (aggregateCourseId) {
            const course = db.COURSES.find(c => c.id === aggregateCourseId);
            const structure = db.COURSE_STRUCTURE[aggregateCourseId];
            if (!course || !structure) return null;

            const students = (Object.values(db.USERS) as User[]).filter(u => u.role === 'STUDENT');
            const virtualNodes: LearningNode[] = [];

            structure.modules.forEach(mod => {
                mod.items.forEach((item, idx) => {
                    const stats = getClassNodeStatus(item.id, item.type, students, db);
                    
                    let nodeType: 'theory' | 'practice' | 'challenge' = 'theory';
                    let titlePrefix = "";
                    
                    if (stats.rate < 50) {
                        nodeType = 'challenge';
                        titlePrefix = "⚠️ ";
                    } else if (stats.rate < 80) {
                        nodeType = 'theory'; 
                    } else {
                        nodeType = 'practice';
                    }

                    let realTitle = item.id;
                    if (item.type === 'lesson') realTitle = db.LESSONS[item.id]?.title || item.id;
                    else realTitle = db.ASSIGNMENTS[item.id]?.title || item.id;

                    virtualNodes.push({
                        id: item.id,
                        title: `${titlePrefix}${realTitle.substring(0, 15)}...`,
                        description: `Class Completion: ${stats.rate.toFixed(0)}%`,
                        type: nodeType,
                        isLocked: false,
                        isCompleted: stats.rate >= 80,
                        flashcardsMastered: 0
                    });
                });
            });

            return {
                id: `agg_${aggregateCourseId}`,
                creatorId: 'system',
                title: `Cây Kỹ Năng: ${course.name}`,
                topic: 'Class Progress',
                createdAt: new Date().toISOString(),
                nodes: virtualNodes
            };
        }
        return pathId ? db.LEARNING_PATHS?.[pathId] || null : null;
    }, [pathId, aggregateCourseId, db]);

    // --- ONBOARDING EFFECT ---
    useEffect(() => {
        if (path && !aggregateCourseId) {
            const anyCompleted = path.nodes.some(n => n.isCompleted);
            const hasSeenTour = localStorage.getItem('hasSeenGatekeeperTour');
            
            if (!hasSeenTour && !anyCompleted) {
                setTimeout(() => setIsTourOpen(true), 1500);
            }
        }
    }, [path, aggregateCourseId]);

    const handleTourComplete = () => {
        setIsTourOpen(false);
        localStorage.setItem('hasSeenGatekeeperTour', 'true');
    };

    const tourSteps: TourStep[] = [
        {
            targetId: 'btn-gatekeeper',
            title: 'Vượt Cấp (Gatekeeper)',
            content: 'Thấy mấy bài đầu quá dễ? Hãy làm bài test này để nhảy cóc và nhận trọn bộ XP.',
            position: 'bottom'
        }
    ];

    useEffect(() => {
        if (path && path.suggestedSkinId && user && !aggregateCourseId) {
            const currentSkinId = db.GAMIFICATION.equippedSkin;
            const userInventory = db.GAMIFICATION.inventory;
            
            if (path.suggestedSkinId !== currentSkinId && userInventory.includes(path.suggestedSkinId)) {
                const skinItem = db.SHOP_ITEMS.find(i => i.id === path.suggestedSkinId);
                if (skinItem) {
                    setSuggestedSkin(skinItem);
                    const timer = setTimeout(() => setIsSkinPromptOpen(true), 1000);
                    return () => clearTimeout(timer);
                }
            }
        }
    }, [path, db.GAMIFICATION, user, db.SHOP_ITEMS, aggregateCourseId]);

    const handleEquipSuggestedSkin = () => {
        if (suggestedSkin) {
            equipShopItem(suggestedSkin.id);
            setIsSkinPromptOpen(false);
        }
    };

    const handleNodeClick = (node: LearningNode, isLast: boolean) => {
        if (aggregateCourseId) {
            const students = (Object.values(db.USERS) as User[]).filter(u => u.role === 'STUDENT');
            let type = 'lesson';
            if (db.ASSIGNMENTS[node.id]) type = 'assignment';
            const stats = getClassNodeStatus(node.id, type, students, db);
            setSelectedAggregateNode({ node, stats });
            return;
        }

        if (node.type === 'secret') {
            setSelectedSecretNode(node);
            setIsTreasureOpen(true);
        } else {
            navigate('learning_node_study', { pathId: path!.id, nodeId: node.id, isLastNode: isLast });
        }
    };

    // --- MANUAL NODE ADD HANDLER ---
    const handleAddManualNode = () => {
        if (!path || !newNodeTitle.trim()) return;
        
        const newNode: LearningNode = {
            id: `manual_node_${Date.now()}`,
            title: newNodeTitle,
            description: newNodeDesc || "Thêm thủ công",
            type: newNodeType,
            isLocked: true, // New nodes are locked by default
            isCompleted: false,
            flashcardsMastered: 0
        };

        // Use extendLearningPath to add the node
        extendLearningPath(path.id, [newNode]);
        setIsAddNodeModalOpen(false);
        setNewNodeTitle('');
        setNewNodeDesc('');
        alert("Đã thêm bài học mới vào cuối lộ trình!");
    };

    if (!path) {
        return <div className="p-8 text-center text-red-500">Lộ trình không tồn tại. <button onClick={() => navigate('assignment_hub')} className="underline">Quay lại</button></div>;
    }

    const allCompleted = path.nodes.every(n => n.isCompleted);
    const anyCompleted = path.nodes.some(n => n.isCompleted);
    const completedNodeTitles = path.nodes.filter(n => n.isCompleted).map(n => n.title);
    
    // Check if user is creator
    const isCreator = user?.id === path.creatorId;

    return (
        <div className="max-w-4xl mx-auto space-y-6 relative">
             <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                 <button 
                    onClick={() => navigate(aggregateCourseId ? 'dashboard' : 'assignment_hub')} 
                    className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-blue-300 hover:bg-blue-500/20 hover:text-white hover:border-blue-400 hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-300 backdrop-blur-md w-fit"
                >
                    <span>&larr;</span> <span className="font-medium">Quay lại</span>
                </button>

                {!aggregateCourseId && (
                    <div className="flex gap-2">
                        {isCreator && (
                            <button 
                                onClick={() => setIsAddNodeModalOpen(true)}
                                className="group flex items-center gap-2 px-5 py-2 rounded-full bg-indigo-900/30 border border-indigo-500/50 text-indigo-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all duration-300"
                            >
                                <span className="text-xl">➕</span> <span className="font-bold">Thêm Bài Thủ Công</span>
                            </button>
                        )}

                        {anyCompleted && (
                            <button 
                                onClick={() => setIsSpeedRunOpen(true)}
                                className="group flex items-center gap-2 px-5 py-2 rounded-full bg-orange-900/30 border border-orange-500/50 text-orange-200 hover:bg-orange-600 hover:text-white hover:border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all duration-300"
                                title="Kiểm tra phản xạ nhanh 60s"
                            >
                                <span className="text-xl group-hover:rotate-12 transition-transform">⏱️</span> <span className="font-bold">Speed Run</span>
                            </button>
                        )}

                        {!allCompleted && (
                            <button 
                                id="btn-gatekeeper"
                                onClick={() => setIsGatekeeperOpen(true)}
                                className="group flex items-center gap-2 px-5 py-2 rounded-full bg-red-900/30 border border-red-500/50 text-red-200 hover:bg-red-600 hover:text-white hover:border-red-400 shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all duration-300 animate-pulse hover:animate-none"
                                title="Dành cho người có trình độ cao muốn bỏ qua các bài cơ bản"
                            >
                                <span className="text-xl">⚡</span> <span className="font-bold">Thi Vượt Cấp</span>
                            </button>
                        )}
                    </div>
                )}
             </div>
            
            <div className="text-center mb-12">
                <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-blue-200 drop-shadow-lg mb-3">{path.title}</h1>
                <p className="text-blue-200/80 text-lg">Chủ đề: <span className="font-bold text-white">{path.topic}</span></p>
                {aggregateCourseId && (
                    <div className="flex justify-center gap-4 mt-4 text-xs font-bold uppercase tracking-widest">
                        <span className="text-green-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Tốt ({'>'}80%)</span>
                        <span className="text-blue-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Đang học</span>
                        <span className="text-red-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Kẹt ({'<'}50%)</span>
                    </div>
                )}
                {!aggregateCourseId && allCompleted && <p className="text-green-400 font-bold mt-2 text-sm bg-green-900/30 inline-block px-3 py-1 rounded-full border border-green-500/50">🎉 ĐÃ HOÀN THÀNH TOÀN BỘ</p>}
            </div>

            <div className="card p-12 min-h-[600px] bg-black/20 border border-white/10 relative backdrop-blur-xl shadow-2xl rounded-[3rem]">
                <DuolingoTree nodes={path.nodes} onNodeClick={handleNodeClick} allowInteraction={!!aggregateCourseId} />
            </div>

            {/* MODAL: ADD MANUAL NODE */}
            <Modal isOpen={isAddNodeModalOpen} onClose={() => setIsAddNodeModalOpen(false)} title="Thêm Bài Học Thủ Công" size="md">
                <div className="space-y-4 p-2">
                    <div>
                        <label className="block text-sm font-bold text-gray-300 mb-1">Tiêu đề bài học</label>
                        <input 
                            type="text" 
                            className="form-input w-full" 
                            value={newNodeTitle}
                            onChange={(e) => setNewNodeTitle(e.target.value)}
                            placeholder="VD: Từ vựng Bài 1"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-300 mb-1">Mô tả ngắn</label>
                        <input 
                            type="text" 
                            className="form-input w-full" 
                            value={newNodeDesc}
                            onChange={(e) => setNewNodeDesc(e.target.value)}
                            placeholder="VD: Học 10 từ mới về gia đình"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-300 mb-1">Loại bài học</label>
                        <select 
                            className="form-select w-full bg-gray-900" 
                            value={newNodeType} 
                            onChange={(e) => setNewNodeType(e.target.value as any)}
                        >
                            <option value="theory">📖 Lý thuyết (Màu xanh)</option>
                            <option value="practice">✏️ Thực hành (Màu lục)</option>
                            <option value="challenge">👹 Thử thách (Màu đỏ)</option>
                        </select>
                    </div>
                    <div className="flex justify-end pt-4 gap-2">
                        <button onClick={() => setIsAddNodeModalOpen(false)} className="btn btn-secondary">Hủy</button>
                        <button onClick={handleAddManualNode} className="btn btn-primary" disabled={!newNodeTitle.trim()}>Lưu & Thêm</button>
                    </div>
                </div>
            </Modal>

            <GatekeeperModal 
                isOpen={isGatekeeperOpen}
                onClose={() => setIsGatekeeperOpen(false)}
                pathId={pathId || ''}
                pathTitle={path.title}
                pathTopic={path.topic}
                nodesTitle={path.nodes.map(n => n.title)}
            />

            <SpeedRunModal 
                isOpen={isSpeedRunOpen}
                onClose={() => setIsSpeedRunOpen(false)}
                pathTopic={path.topic}
                completedNodes={completedNodeTitles}
            />

            {selectedSecretNode && (
                <TreasureNodeModal 
                    isOpen={isTreasureOpen}
                    onClose={() => setIsTreasureOpen(false)}
                    pathId={pathId || ''}
                    nodeId={selectedSecretNode.id}
                    pathTitle={path.title}
                />
            )}

            {selectedAggregateNode && (
                <Modal isOpen={!!selectedAggregateNode} onClose={() => setSelectedAggregateNode(null)} title="📊 Thống kê Lớp học" size="sm">
                    <div className="text-center space-y-4 p-4">
                        <div className="text-6xl mb-2">
                            {selectedAggregateNode.stats.rate < 50 ? '⚠️' : selectedAggregateNode.stats.rate > 80 ? '🎉' : '📘'}
                        </div>
                        <h3 className="text-xl font-bold text-white">{selectedAggregateNode.node.title.replace("⚠️ ", "")}</h3>
                        
                        <div className="grid grid-cols-2 gap-4 my-4">
                            <div className="bg-gray-800 p-3 rounded-xl border border-gray-700">
                                <p className="text-xs text-gray-400 uppercase">Hoàn thành</p>
                                <p className="text-2xl font-black text-green-400">{selectedAggregateNode.stats.completed}/{selectedAggregateNode.stats.total}</p>
                            </div>
                            <div className="bg-gray-800 p-3 rounded-xl border border-gray-700">
                                <p className="text-xs text-gray-400 uppercase">Tỷ lệ</p>
                                <p className={`text-2xl font-black ${selectedAggregateNode.stats.rate < 50 ? 'text-red-500' : 'text-blue-400'}`}>
                                    {selectedAggregateNode.stats.rate.toFixed(0)}%
                                </p>
                            </div>
                        </div>

                        {selectedAggregateNode.stats.rate < 50 && (
                            <div className="bg-red-900/30 border-l-4 border-red-500 p-3 rounded text-left">
                                <p className="text-red-300 font-bold text-sm">Cảnh báo:</p>
                                <p className="text-gray-300 text-xs">Hơn một nửa lớp chưa hoàn thành bài này. Cần giảng lại hoặc kiểm tra khó khăn.</p>
                            </div>
                        )}

                        <button onClick={() => setSelectedAggregateNode(null)} className="btn btn-secondary w-full">Đóng</button>
                    </div>
                </Modal>
            )}

            {suggestedSkin && (
                <Modal isOpen={isSkinPromptOpen} onClose={() => setIsSkinPromptOpen(false)} title="🎨 Gợi ý Trang bị" size="sm">
                    <div className="text-center space-y-4 py-2">
                        <div className="relative inline-block">
                            <div className="text-6xl animate-bounce-subtle filter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                                {suggestedSkin.icon}
                            </div>
                            <div className="absolute -top-2 -right-2 text-2xl animate-pulse">✨</div>
                        </div>
                        
                        <div>
                            <h3 className="text-lg font-bold text-white mb-1">Tăng cảm hứng học tập?</h3>
                            <p className="text-sm text-gray-400">
                                Lộ trình này rất hợp với giao diện <span className="text-pink-300 font-bold">{suggestedSkin.name}</span> mà bạn đang sở hữu.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <button 
                                onClick={() => setIsSkinPromptOpen(false)}
                                className="btn btn-secondary text-xs"
                            >
                                Để sau
                            </button>
                            <button 
                                onClick={handleEquipSuggestedSkin}
                                className="btn btn-primary bg-gradient-to-r from-pink-500 to-purple-500 border-none text-white text-xs font-bold shadow-lg animate-pulse"
                            >
                                Trang bị Ngay
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            <OnboardingTour 
                steps={tourSteps} 
                isOpen={isTourOpen} 
                onComplete={handleTourComplete}
                onSkip={handleTourComplete}
            />
        </div>
    );
};

export default LearningPathDetailPage;
