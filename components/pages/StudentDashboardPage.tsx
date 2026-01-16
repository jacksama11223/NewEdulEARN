
import React, { useState, useContext, useMemo, useEffect, useRef } from 'react';
import { AuthContext, DataContext, GlobalStateContext, PageContext, MusicContext, PetContext } from '../../contexts/AppProviders';
import { callGeminiApiWithSchema, convertContentToFlashcards, callGeminiApi } from '../../services/geminiService'; 
import LoadingSpinner from '../common/LoadingSpinner';
import TreasureChestWidget from '../dashboard/TreasureChestWidget';
import SmartReviewWidget from '../dashboard/SmartReviewWidget'; 
import UpcomingReviewsWidget from '../dashboard/UpcomingReviewsWidget'; 
import Modal from '../common/Modal'; 
import FlashcardModal from '../modals/FlashcardModal'; 
import PhoenixRebirthModal from '../modals/PhoenixRebirthModal'; 
import SpeedRunModal from '../modals/SpeedRunModal'; 
import type { User, Task, Assignment, LearningPath, FlashcardDeck, Course, QuizSubmission, FileSubmission, StudyGroup, ShopItem, Quiz } from '../../types';

// --- SUB-COMPONENTS EXPORTED FOR GLOBAL USE ---

export const FocusTimerWidget: React.FC = () => {
    const { pomodoro, setPomodoro, deepWorkMode, setDeepWorkMode } = useContext(GlobalStateContext)!;
    const { triggerReaction, say } = useContext(PetContext)!;

    useEffect(() => {
        let interval: any;
        if (pomodoro.isActive && pomodoro.seconds > 0) {
            interval = setInterval(() => {
                setPomodoro(prev => ({ ...prev, seconds: prev.seconds - 1 }));
            }, 1000);
        } else if (pomodoro.seconds === 0 && pomodoro.isActive) {
            setPomodoro(prev => ({ ...prev, isActive: false }));
            triggerReaction('success');
            say(pomodoro.mode === 'focus' ? "Hết giờ tập trung! Nghỉ ngơi chút nào." : "Hết giờ nghỉ! Quay lại làm việc thôi.", 8000);
            if (deepWorkMode) setDeepWorkMode(false);
        }
        return () => clearInterval(interval);
    }, [pomodoro.isActive, pomodoro.seconds, pomodoro.mode, setPomodoro, deepWorkMode, setDeepWorkMode, triggerReaction, say]);

    const toggleTimer = () => {
        if (!pomodoro.isActive && pomodoro.mode === 'focus') {
            setDeepWorkMode(true);
            triggerReaction('hover_mechanic');
            say("Kích hoạt chế độ Siêu Tập Trung! 🚀", 3000);
        }
        setPomodoro(prev => ({ ...prev, isActive: !prev.isActive }));
    };

    const resetTimer = () => {
        setPomodoro({ isActive: false, seconds: 25 * 60, mode: 'focus' });
        setDeepWorkMode(false);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="card p-4 bg-gray-900 border border-red-500/30 flex flex-col items-center justify-center relative overflow-hidden group h-full">
            {pomodoro.isActive && <div className="absolute inset-0 bg-red-900/10 animate-pulse pointer-events-none"></div>}
            
            <div className="text-4xl font-mono font-bold text-white relative z-10" onMouseEnter={() => triggerReaction('hover_input')}>
                {formatTime(pomodoro.seconds)}
            </div>
            
            <div className="flex gap-2 mt-3 relative z-10">
                <button 
                    onClick={toggleTimer}
                    className={`btn btn-sm ${pomodoro.isActive ? 'btn-secondary' : 'btn-primary bg-red-600 hover:bg-red-500 border-none'}`}
                >
                    {pomodoro.isActive ? '⏸ Pause' : '▶ Start'}
                </button>
                <button onClick={resetTimer} className="btn btn-sm btn-secondary">↺</button>
            </div>
            
            <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-widest font-bold">
                {pomodoro.mode === 'focus' ? 'FOCUS MODE' : 'BREAK TIME'}
            </p>
        </div>
    );
};

export const MusicWidget: React.FC = () => {
    const { currentTrack, isPlaying, togglePlay, playTrack } = useContext(MusicContext)!;
    const { triggerReaction } = useContext(PetContext)!;

    const tracks = [
        { name: 'Lofi Chill', url: 'https://assets.mixkit.co/active_storage/sfx/2513/2513-preview.mp3', tempo: 'slow' as const },
        { name: 'Alpha Waves', url: 'https://assets.mixkit.co/active_storage/sfx/2092/2092-preview.mp3', tempo: 'slow' as const }, 
        { name: 'Epic Focus', url: 'https://assets.mixkit.co/active_storage/sfx/112/112-preview.mp3', tempo: 'medium' as const }, 
        { name: 'Cyberpunk', url: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', tempo: 'fast' as const } 
    ];

    return (
        <div className="card p-4 bg-gray-900 border border-blue-500/30 flex flex-col justify-between h-full" onMouseEnter={() => triggerReaction('hover_music')}>
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Soundscapes</span>
                <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}></div>
            </div>
            
            <div className="flex items-end justify-center h-8 gap-1 mb-3 opacity-70">
                {[1,2,3,4,5,6].map(i => (
                    <div 
                        key={i} 
                        className={`w-1 bg-blue-400 rounded-t ${isPlaying ? 'animate-music-bar' : 'h-1'}`}
                        style={{ animationDuration: `${0.5 + Math.random()}s` }} 
                    ></div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
                {tracks.map((t, i) => (
                    <button 
                        key={i} 
                        onClick={() => playTrack(t)}
                        className={`text-[10px] py-1.5 rounded border transition-all ${currentTrack?.name === t.name ? 'bg-blue-600 border-blue-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                    >
                        {t.name}
                    </button>
                ))}
            </div>
        </div>
    );
};

export const ScratchpadWidget: React.FC = () => {
    const { user } = useContext(AuthContext)!;
    const { db, updateScratchpad } = useContext(DataContext)!;
    const [text, setText] = useState('');

    useEffect(() => {
        if (user && db.SCRATCHPAD[user.id]) {
            setText(db.SCRATCHPAD[user.id]);
        }
    }, [user, db.SCRATCHPAD]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value);
        if (user) updateScratchpad(user.id, e.target.value);
    };

    return (
        <div className="card p-0 overflow-hidden h-full flex flex-col bg-[#1e1e1e] border-gray-700 relative group min-h-[160px]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-orange-500 opacity-50"></div>
            <textarea 
                className="w-full h-full bg-transparent p-4 text-xs font-mono text-gray-300 resize-none outline-none placeholder-gray-600 leading-relaxed"
                placeholder="// Scratchpad (Auto-saved)..."
                value={text}
                onChange={handleChange}
                spellCheck={false}
            ></textarea>
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-50 transition-opacity">
                <span className="text-[10px] text-gray-500">SAVED</span>
            </div>
        </div>
    );
};

export const WeatherWidget: React.FC = () => {
    const [weather, setWeather] = useState({ temp: '--', condition: 'Loading...', icon: '⏳' });

    useEffect(() => {
        const fetchWeather = async () => {
            try {
                // Coordinates for Nha Trang: 12.2388° N, 109.1967° E
                const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=12.2388&longitude=109.1967&current=temperature_2m,weather_code&timezone=auto');
                if (!res.ok) throw new Error("Weather fetch failed");
                const data = await res.json();
                
                const code = data.current.weather_code;
                const temp = Math.round(data.current.temperature_2m);
                let condition = 'Unknown';
                let icon = '❓';

                // Map WMO codes to simple conditions
                if (code === 0) { condition = 'Clear'; icon = '☀️'; }
                else if (code >= 1 && code <= 3) { condition = 'Cloudy'; icon = '☁️'; }
                else if (code >= 45 && code <= 48) { condition = 'Foggy'; icon = '🌫️'; }
                else if (code >= 51 && code <= 67) { condition = 'Rainy'; icon = '🌧️'; }
                else if (code >= 80 && code <= 82) { condition = 'Showers'; icon = '🌦️'; }
                else if (code >= 95) { condition = 'Storm'; icon = '⚡'; }
                else { condition = 'Clear'; icon = '☀️'; } // Fallback

                // Adjust icon for night time (simple logic based on hour)
                const hour = new Date().getHours();
                if ((hour >= 18 || hour <= 5) && code === 0) icon = '🌙';

                setWeather({ temp: `${temp}`, condition, icon });
            } catch (e) {
                console.error("Weather Widget Error:", e);
                setWeather({ temp: '--', condition: 'Offline', icon: '📡' });
            }
        };

        fetchWeather();
        // Refresh every 30 mins
        const interval = setInterval(fetchWeather, 30 * 60 * 1000); 
        return () => clearInterval(interval);
    }, []);
    
    return (
        <div className="card p-4 bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-white/10 flex flex-col justify-center items-center h-full relative overflow-hidden group">
            {/* Background Effect */}
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <span className="text-4xl mb-2 filter drop-shadow-md animate-float">{weather.icon}</span>
            <div className="text-center z-10">
                <span className="text-xs text-gray-300 font-bold uppercase tracking-wider">Nha Trang</span>
                <div className="text-3xl font-black text-white mt-1 leading-none">{weather.temp}°</div>
                <p className="text-[10px] text-blue-200 mt-1">{weather.condition}</p>
            </div>
        </div>
    );
};

export const TodoWidget: React.FC = () => {
    const { user } = useContext(AuthContext)!;
    const { db, addTask, toggleTaskCompletion } = useContext(DataContext)!;
    const [newTask, setNewTask] = useState('');

    const tasks = useMemo(() => {
        if (!user) return [];
        return (Object.values(db.TASKS) as Task[])
            .filter(t => t.userId === user.id && !t.isArchived)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [db.TASKS, user]);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newTask.trim()) return;
        addTask(user.id, newTask);
        setNewTask('');
    };

    return (
        <div className="card p-4 bg-gray-900/50 border border-white/10 h-[300px] flex flex-col backdrop-blur-md">
            <h3 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span>📝</span> Nhiệm vụ (Todo)
            </h3>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-60">
                        <span className="text-2xl mb-1">💤</span>
                        <span className="text-xs">Chưa có nhiệm vụ</span>
                    </div>
                ) : (
                    tasks.map(task => (
                        <div 
                            key={task.id} 
                            className={`group flex items-center gap-2 p-2 rounded-lg border transition-all duration-300 ${task.isCompleted ? 'bg-green-900/10 border-green-500/20 opacity-60' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                        >
                            <input 
                                type="checkbox" 
                                checked={task.isCompleted} 
                                onChange={(e) => toggleTaskCompletion(task.id, e.target.checked)}
                                className="w-4 h-4 rounded border-gray-600 text-blue-500 focus:ring-offset-0 focus:ring-0 cursor-pointer bg-black/50"
                            />
                            <span className={`text-xs flex-1 transition-all ${task.isCompleted ? 'line-through text-gray-500' : 'text-gray-200 group-hover:text-white'}`}>
                                {task.text}
                            </span>
                        </div>
                    ))
                )}
            </div>

            <form onSubmit={handleAdd} className="mt-3 pt-3 border-t border-white/10 flex gap-2">
                <input 
                    type="text" 
                    className="flex-1 bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                    placeholder="Thêm nhiệm vụ mới..."
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                />
                <button 
                    type="submit" 
                    disabled={!newTask.trim()}
                    className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    +
                </button>
            </form>
        </div>
    );
};

export const LeaderboardWidget: React.FC = () => {
    const { db } = useContext(DataContext)!;
    
    const topStudents = useMemo(() => {
        return (Object.values(db.USERS) as User[])
            .filter(u => u.role === 'STUDENT')
            .sort((a, b) => {
                const pointsA = (a as any).gamification?.points || 0;
                const pointsB = (b as any).gamification?.points || 0;
                return pointsB - pointsA;
            })
            .slice(0, 3);
    }, [db.USERS]);

    return (
        <div className="card p-4 bg-black/20 border border-white/5">
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                <span>🏆</span> Bảng Xếp Hạng
            </h3>
            <div className="space-y-3">
                {topStudents.map((s, idx) => {
                    const points = (s as any).gamification?.points || 0;
                    return (
                        <div key={s.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-gray-400 text-black' : 'bg-orange-700 text-white'}`}>
                                    {idx + 1}
                                </span>
                                <span className="text-gray-300 truncate max-w-[100px]">{s.name}</span>
                            </div>
                            <span className="font-mono font-bold text-blue-400">{points} XP</span>
                        </div>
                    );
                })}
                {topStudents.length === 0 && <p className="text-xs text-gray-500 text-center">Chưa có dữ liệu.</p>}
            </div>
        </div>
    );
};

// --- SUB-COMPONENTS (Internal) ---

const OrbitalCourseCard: React.FC<{ course: Course, navigate: any, onContextMenu: any, isMining: boolean }> = ({ course, navigate, onContextMenu, isMining }) => (
    <div 
        onContextMenu={(e) => onContextMenu(e, course.id)}
        onClick={() => navigate('course_detail', { courseId: course.id })}
        className={`relative group p-6 rounded-3xl border transition-all duration-500 cursor-pointer overflow-hidden
            ${isMining 
                ? 'bg-gray-900/80 border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.2)]' 
                : 'bg-black/40 border-white/10 hover:border-blue-400/50 hover:bg-blue-900/10'
            }`}
    >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] rounded-full border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-spin-slow pointer-events-none"></div>
        
        {isMining && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20 backdrop-blur-sm">
                <div className="text-center">
                    <LoadingSpinner size={8} />
                    <p className="text-yellow-400 font-bold mt-2 animate-pulse">Mining XP...</p>
                </div>
            </div>
        )}

        <div className="relative z-10 flex justify-between items-start">
            <div>
                <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">{course.name}</h3>
                {/* RESTORED TEACHER NAME */}
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider flex items-center gap-1">
                    👨‍🏫 {course.teacher}
                </p>
            </div>
            <div className="text-2xl group-hover:scale-125 transition-transform duration-300">🪐</div>
        </div>
        
        <div className="mt-6 flex items-center gap-2">
            <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 w-1/3 rounded-full"></div>
            </div>
            <span className="text-[10px] text-gray-400 font-mono">33%</span>
        </div>
    </div>
);

// --- MAIN PAGE ---

const StudentDashboardPage: React.FC = () => {
    const { user } = useContext(AuthContext)!;
    const { db, awardXP } = useContext(DataContext)!;
    const { navigate } = useContext(PageContext)!;
    const { triggerReaction, say } = useContext(PetContext)!;

    const [miningCourseId, setMiningCourseId] = useState<string | null>(null);
    const [isPhoenixModalOpen, setIsPhoenixModalOpen] = useState(false);
    const [isRitualOpen, setIsRitualOpen] = useState(false);

    const myCourses = useMemo(() => db.COURSES || [], [db.COURSES]);
    
    useEffect(() => {
        if (db.GAMIFICATION.streakDays === 0 && db.GAMIFICATION.lastStudyDate) {
            // Logic for broken streak
        }
    }, [db.GAMIFICATION]);

    const handleContextMenu = (e: React.MouseEvent, courseId: string) => {
        e.preventDefault();
        setMiningCourseId(courseId);
        triggerReaction('hover_mechanic');
        say("Đang khai thác tài nguyên từ hành tinh này... Chờ chút nhé!", 3000);
        
        setTimeout(() => {
            awardXP(20);
            setMiningCourseId(null);
            triggerReaction('success');
            say("Thu hoạch thành công! +20 XP", 2000);
        }, 3000);
    };

    const smartShortcut = useMemo(() => {
        const hour = new Date().getHours();
        const assignments = (Object.values(db.ASSIGNMENTS) as Assignment[]).filter(a => a.type === 'quiz'); 
        const hasDueAssignments = assignments.length > 0;

        if (hasDueAssignments) {
            return { label: 'Làm Bài Tập', icon: '📝', action: () => navigate('assignment_hub'), highlight: true, pet: 'hover_smart' };
        } else if (hour >= 22 || hour < 6) {
            return { label: 'Nhạc Lofi (Ngủ)', icon: '🌙', action: () => triggerReaction('sleep'), highlight: false, pet: 'hover_sleepy' };
        } else {
            return { label: 'Học Từ Vựng', icon: '🧠', action: () => alert("Mở Flashcard..."), highlight: false, pet: 'hover_book' };
        }
    }, [db.ASSIGNMENTS, navigate, triggerReaction]);

    if (!user) return null;

    return (
        <div className="space-y-8 pb-20">
            {/* Header Greeting */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 animate-fade-in-up">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 drop-shadow-lg">
                        Chào, {user.name.split(' ').pop()}!
                    </h1>
                    <p className="text-gray-400 mt-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Hệ thống hoạt động bình thường. Sẵn sàng học tập.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right hidden md:block">
                        <p className="text-xs font-bold text-gray-500 uppercase">Chuỗi hiện tại</p>
                        <p className="text-2xl font-black text-orange-500 flex items-center justify-end gap-1">
                            {db.GAMIFICATION.streakDays} <span className="text-lg">🔥</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* UTILITIES ROW (Moved to Top as requested) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-up">
                <div className="h-40">
                    <WeatherWidget />
                </div>
                <div className="h-40">
                    <ScratchpadWidget />
                </div>
                <div className="h-40">
                    <FocusTimerWidget />
                </div>
                <div className="h-40">
                    <MusicWidget />
                </div>
            </div>

            {/* MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT COL: Stats & Gamification */}
                <div 
                    className="space-y-6"
                    onMouseEnter={() => triggerReaction('hover_coin')}
                >
                    <TreasureChestWidget />
                    <SmartReviewWidget />
                    <UpcomingReviewsWidget /> 
                    {/* ADDED TODO WIDGET HERE */}
                    <TodoWidget />
                    <LeaderboardWidget />
                </div>

                {/* MIDDLE & RIGHT: Content (Now spans 2 cols) */}
                <div className="lg:col-span-2 space-y-8">
                    <div id="course-list">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <span>🪐</span> Các Hành Tinh (Khóa học)
                            </h2>
                            <button className="text-sm text-blue-400 hover:text-white">Xem tất cả</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {myCourses.map(course => (
                                <OrbitalCourseCard 
                                    key={course.id} 
                                    course={course} 
                                    navigate={navigate}
                                    onContextMenu={handleContextMenu}
                                    isMining={miningCourseId === course.id}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <button 
                            onClick={smartShortcut.action} 
                            onMouseEnter={() => triggerReaction(smartShortcut.pet)}
                            className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 group relative overflow-hidden
                                ${smartShortcut.highlight 
                                    ? 'bg-blue-900/40 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:scale-105' 
                                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:scale-105'
                                }
                            `}
                        >
                            {smartShortcut.highlight && <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none"></div>}
                            <span className="text-3xl group-hover:scale-110 transition-transform">{smartShortcut.icon}</span>
                            <span className={`text-xs font-bold text-center ${smartShortcut.highlight ? 'text-white' : 'text-gray-300'}`}>
                                {smartShortcut.label}
                            </span>
                        </button>

                        <button 
                            onClick={() => navigate('notebook')} 
                            onMouseEnter={() => triggerReaction('hover_write')}
                            className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-105 transition-all flex flex-col items-center gap-2 group"
                        >
                            <span className="text-3xl group-hover:scale-110 transition-transform">📓</span>
                            <span className="text-xs font-bold text-gray-300">Sổ Tay</span>
                        </button>
                        <button 
                            onClick={() => navigate('group_chat')} 
                            onMouseEnter={() => triggerReaction('hover_chat')}
                            className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-105 transition-all flex flex-col items-center gap-2 group"
                        >
                            <span className="text-3xl group-hover:scale-110 transition-transform">🚀</span>
                            <span className="text-xs font-bold text-gray-300">Phi Đội</span>
                        </button>
                        <button 
                            onClick={() => navigate('task_archive')} 
                            onMouseEnter={() => triggerReaction('hover_btn')}
                            className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-105 transition-all flex flex-col items-center gap-2 group"
                        >
                            <span className="text-3xl group-hover:scale-110 transition-transform">✅</span>
                            <span className="text-xs font-bold text-gray-300">Tasks</span>
                        </button>
                    </div>
                </div>
            </div>

            <PhoenixRebirthModal 
                isOpen={isPhoenixModalOpen}
                onClose={() => setIsPhoenixModalOpen(false)}
                onRitual={() => {
                    setIsPhoenixModalOpen(false);
                    setIsRitualOpen(true);
                }}
            />

            <SpeedRunModal
                isOpen={isRitualOpen}
                onClose={() => setIsRitualOpen(false)}
                pathTopic="General Knowledge" 
                completedNodes={[]}
                mode="ritual"
            />
        </div>
    );
};

export default StudentDashboardPage;
