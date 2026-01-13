
import React, { useState, useContext, useMemo } from 'react';
import { AuthContext, DataContext, PageContext, GlobalStateContext } from '../../contexts/AppProviders';
import { generateCourseSyllabus, callGeminiApiWithSchema } from '../../services/geminiService';
import { GeneratedModule, GeneratedModuleItem, User } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';

const AdminCreateCoursePage: React.FC = () => {
    const { user } = useContext(AuthContext)!;
    const { db, adminCreateCourse } = useContext(DataContext)!;
    const { navigate } = useContext(PageContext)!;
    const { setPage: setGlobalPage } = useContext(GlobalStateContext)!;

    const [courseName, setCourseName] = useState('');
    
    // Get list of teachers from DB
    const teachers = useMemo(() => {
        return (Object.values(db.USERS) as User[]).filter(u => u.role === 'TEACHER');
    }, [db.USERS]);

    const [teacherName, setTeacherName] = useState(teachers.length > 0 ? teachers[0].name : '');
    const [topic, setTopic] = useState('');
    const [audience, setAudience] = useState('');
    const [defaultPersona, setDefaultPersona] = useState('guardian');
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedStructure, setGeneratedStructure] = useState<GeneratedModule[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Track which module is currently regenerating
    const [regeneratingModuleIndex, setRegeneratingModuleIndex] = useState<number | null>(null);

    // --- MANUAL START ACTION ---
    const handleManualStart = () => {
        setGeneratedStructure([
            {
                title: "Module 1: Tổng quan",
                items: [
                    {
                        title: "Bài học giới thiệu",
                        type: "lesson_text",
                        contentOrDescription: "Chào mừng đến với khóa học..."
                    }
                ]
            }
        ]);
        if (!courseName) setCourseName("Khóa học Mới (Thủ công)");
    };

    // --- AI ACTIONS ---

    const handleGenerateSyllabus = async () => {
        const apiKey = user ? db.USERS[user.id]?.apiKey : null;
        if (!apiKey) {
            setGlobalPage('api_key', { isApiKeyModalOpen: true });
            return;
        }
        if (!topic || !audience) {
            alert("Vui lòng nhập chủ đề và đối tượng học.");
            return;
        }

        setIsGenerating(true);
        setError(null);
        try {
            const modules = await generateCourseSyllabus(apiKey, topic, audience);
            setGeneratedStructure(modules);
            if (!courseName) setCourseName(topic); // Auto-fill name if empty
        } catch (e: any) {
            setError(e.message || "Lỗi tạo giáo trình.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRegenerateModule = async (index: number) => {
        if (!generatedStructure) return;
        const apiKey = user ? db.USERS[user.id]?.apiKey : null;
        if (!apiKey) return;

        const moduleToFix = generatedStructure[index];
        setRegeneratingModuleIndex(index);

        try {
            const prompt = `
                Act as an expert curriculum designer.
                Regenerate the syllabus module titled "${moduleToFix.title}".
                
                Course Topic: "${topic}"
                Target Audience: "${audience}"
                
                Requirements:
                1. Create a better, more engaging title for this module.
                2. Provide 3-5 distinct learning items (mix of lessons and assignments).
                3. Content should be detailed and educational.
                
                Return JSON format: { "title": string, "items": [{ "title": string, "type": "lesson_video"|"lesson_text"|"assignment_quiz"|"assignment_file", "contentOrDescription": string }] }
            `;

            // Use Flash for speed on partial updates
            const newModule = await callGeminiApiWithSchema(apiKey, prompt);
            
            if (newModule && newModule.items) {
                const newStructure = [...generatedStructure];
                newStructure[index] = newModule;
                setGeneratedStructure(newStructure);
            }
        } catch (e: any) {
            alert("Lỗi tái tạo module: " + e.message);
        } finally {
            setRegeneratingModuleIndex(null);
        }
    };

    // --- MANUAL EDITING ACTIONS ---

    const updateModuleField = (index: number, field: keyof GeneratedModule, value: any) => {
        if (!generatedStructure) return;
        const newStructure = [...generatedStructure];
        (newStructure[index] as any)[field] = value;
        setGeneratedStructure(newStructure);
    };

    const updateItemField = (modIndex: number, itemIndex: number, field: keyof GeneratedModuleItem, value: any) => {
        if (!generatedStructure) return;
        const newStructure = [...generatedStructure];
        (newStructure[modIndex].items[itemIndex] as any)[field] = value;
        setGeneratedStructure(newStructure);
    };

    const moveModule = (index: number, direction: -1 | 1) => {
        if (!generatedStructure) return;
        if (index + direction < 0 || index + direction >= generatedStructure.length) return;
        
        const newStructure = [...generatedStructure];
        const temp = newStructure[index];
        newStructure[index] = newStructure[index + direction];
        newStructure[index + direction] = temp;
        setGeneratedStructure(newStructure);
    };

    const deleteModule = (index: number) => {
        if (!generatedStructure) return;
        if (window.confirm("Xóa module này?")) {
            const newStructure = generatedStructure.filter((_, i) => i !== index);
            setGeneratedStructure(newStructure);
        }
    };

    const addModule = () => {
        if (!generatedStructure) return;
        setGeneratedStructure([...generatedStructure, { title: 'New Module', items: [] }]);
    };

    const addItem = (modIndex: number) => {
        if (!generatedStructure) return;
        const newStructure = [...generatedStructure];
        newStructure[modIndex].items.push({
            title: 'New Lesson',
            type: 'lesson_text',
            contentOrDescription: 'Content goes here...'
        });
        setGeneratedStructure(newStructure);
    };

    const deleteItem = (modIndex: number, itemIndex: number) => {
        if (!generatedStructure) return;
        const newStructure = [...generatedStructure];
        newStructure[modIndex].items = newStructure[modIndex].items.filter((_, i) => i !== itemIndex);
        setGeneratedStructure(newStructure);
    };

    const moveItem = (modIndex: number, itemIndex: number, direction: -1 | 1) => {
        if (!generatedStructure) return;
        const items = generatedStructure[modIndex].items;
        if (itemIndex + direction < 0 || itemIndex + direction >= items.length) return;

        const newStructure = [...generatedStructure];
        const temp = newStructure[modIndex].items[itemIndex];
        newStructure[modIndex].items[itemIndex] = newStructure[modIndex].items[itemIndex + direction];
        newStructure[modIndex].items[itemIndex + direction] = temp;
        setGeneratedStructure(newStructure);
    };

    // --- SAVE ---

    const handleSaveCourse = () => {
        if (!generatedStructure || !courseName || !teacherName) return;
        
        try {
            // Pass API Key for Auto-Seeding Flashcards
            const apiKey = user ? db.USERS[user.id]?.apiKey : undefined;
            
            adminCreateCourse(courseName, teacherName, generatedStructure, defaultPersona, apiKey);
            
            alert("✅ Khóa học đã được tạo thành công!\n\n🌱 Hệ thống đang tự động tạo Flashcards ôn tập cho từng bài học trong nền.");
            navigate('dashboard');
        } catch (e) {
            console.error(e);
            alert("Lỗi khi lưu khóa học vào cơ sở dữ liệu.");
        }
    };

    if (user?.role !== 'ADMIN') {
        return <div className="p-8 text-center text-red-500">Truy cập bị từ chối. Chỉ dành cho Admin.</div>;
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20">
            <button onClick={() => navigate('dashboard')} className="text-sm text-blue-400 hover:underline">&larr; Quay lại Dashboard</button>
            
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gradient">Khởi tạo Khóa học (AI Builder)</h1>
                {generatedStructure && (
                    <button onClick={handleSaveCourse} className="btn btn-success shadow-lg animate-pulse">
                        💾 Lưu Khóa Học
                    </button>
                )}
            </div>

            {/* CONFIG CARD */}
            <div className="card p-6 space-y-6 border-blue-500/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Tên Khóa học</label>
                        <input type="text" className="form-input w-full" value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="VD: Nhập môn ReactJS" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Giảng viên phụ trách</label>
                        <select 
                            className="form-select w-full" 
                            value={teacherName} 
                            onChange={e => setTeacherName(e.target.value)}
                        >
                            <option value="">-- Chọn giảng viên --</option>
                            {teachers.map(t => (
                                <option key={t.id} value={t.name}>
                                    {t.name} ({t.id})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="border-t border-gray-700 pt-6">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span>🧠</span> Cấu hình Nội dung
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Chủ đề (Topic) - Dành cho AI</label>
                            <input type="text" className="form-input w-full" value={topic} onChange={e => setTopic(e.target.value)} placeholder="VD: Advanced Machine Learning" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Đối tượng (Audience)</label>
                            <input type="text" className="form-input w-full" value={audience} onChange={e => setAudience(e.target.value)} placeholder="VD: Sinh viên năm 3, đã biết Python" />
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap justify-between items-center gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Persona Mặc định</label>
                            <select className="form-select w-48 py-1" value={defaultPersona} onChange={e => setDefaultPersona(e.target.value)}>
                                <option value="guardian">Guardian</option>
                                <option value="oracle">Oracle</option>
                                <option value="commander">Commander</option>
                                <option value="jester">Jester</option>
                            </select>
                        </div>
                        
                        <div className="flex gap-3">
                            <button 
                                onClick={handleManualStart} 
                                className="btn btn-secondary flex items-center gap-2 border-green-500/50 text-green-300 hover:bg-green-900/20"
                            >
                                🔧 Soạn Thủ Công (Offline)
                            </button>
                            <button 
                                onClick={handleGenerateSyllabus} 
                                disabled={isGenerating}
                                className="btn btn-primary flex items-center gap-2"
                            >
                                {isGenerating ? <LoadingSpinner size={4} /> : '✨ Tạo Đề cương (AI)'}
                            </button>
                        </div>
                    </div>
                    {error && <p className="text-red-400 mt-2">{error}</p>}
                </div>
            </div>

            {/* BUILDER AREA */}
            {generatedStructure && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-gray-400 text-sm uppercase tracking-widest font-bold">Cấu trúc Khóa học</span>
                        <div className="flex-1 h-px bg-gray-700"></div>
                    </div>

                    {generatedStructure.map((mod, modIdx) => (
                        <div key={modIdx} className="card p-0 border-l-4 border-l-blue-500 overflow-hidden group">
                            {/* MODULE HEADER */}
                            <div className="p-4 bg-gray-800/50 border-b border-gray-700 flex flex-wrap gap-4 justify-between items-center">
                                <div className="flex-1 min-w-[200px]">
                                    <label className="text-[10px] text-blue-400 font-bold uppercase block mb-1">Module {modIdx + 1}</label>
                                    <input 
                                        type="text" 
                                        className="bg-transparent text-lg font-bold text-white w-full focus:outline-none focus:border-b focus:border-blue-500 transition-colors"
                                        value={mod.title}
                                        onChange={(e) => updateModuleField(modIdx, 'title', e.target.value)}
                                    />
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handleRegenerateModule(modIdx)}
                                        disabled={regeneratingModuleIndex === modIdx}
                                        className="btn btn-sm bg-purple-900/30 text-purple-300 border border-purple-500/50 hover:bg-purple-500 hover:text-white flex items-center gap-1"
                                        title="Viết lại Module này bằng AI"
                                    >
                                        {regeneratingModuleIndex === modIdx ? <LoadingSpinner size={3} /> : '✨ Regenerate'}
                                    </button>
                                    
                                    <div className="h-6 w-px bg-gray-600 mx-1"></div>

                                    <button onClick={() => moveModule(modIdx, -1)} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white" disabled={modIdx === 0}>⬆️</button>
                                    <button onClick={() => moveModule(modIdx, 1)} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white" disabled={modIdx === generatedStructure.length - 1}>⬇️</button>
                                    <button onClick={() => deleteModule(modIdx)} className="p-1.5 hover:bg-red-900/50 rounded text-gray-400 hover:text-red-400">🗑️</button>
                                </div>
                            </div>

                            {/* ITEMS LIST */}
                            <div className="p-4 space-y-2 bg-black/20">
                                {mod.items.map((item, itemIdx) => (
                                    <div key={itemIdx} className="flex flex-col md:flex-row gap-3 p-3 bg-white/5 border border-white/5 rounded-lg hover:border-white/10 transition-colors items-start md:items-center">
                                        
                                        {/* Drag Handle (Visual) */}
                                        <div className="flex flex-col gap-1 text-gray-600 cursor-grab px-1">
                                            <span className="block w-4 h-0.5 bg-current"></span>
                                            <span className="block w-4 h-0.5 bg-current"></span>
                                            <span className="block w-4 h-0.5 bg-current"></span>
                                        </div>

                                        <select 
                                            className="bg-black/30 border border-gray-600 text-xs rounded px-2 py-1 text-gray-300 focus:border-blue-500 outline-none"
                                            value={item.type}
                                            onChange={(e) => updateItemField(modIdx, itemIdx, 'type', e.target.value)}
                                        >
                                            <option value="lesson_text">📄 Bài đọc</option>
                                            <option value="lesson_video">🎥 Video</option>
                                            <option value="assignment_quiz">⚡ Quiz</option>
                                            <option value="assignment_file">📂 Nộp File</option>
                                        </select>

                                        <input 
                                            type="text" 
                                            className="flex-1 bg-transparent text-sm font-medium text-white focus:outline-none focus:bg-white/5 px-2 rounded"
                                            value={item.title}
                                            onChange={(e) => updateItemField(modIdx, itemIdx, 'title', e.target.value)}
                                            placeholder="Tên bài học..."
                                        />

                                        <input 
                                            type="text" 
                                            className="flex-[2] bg-transparent text-xs text-gray-400 focus:outline-none focus:bg-white/5 px-2 rounded truncate focus:w-full focus:absolute focus:left-0 focus:z-10 focus:bg-gray-800"
                                            value={item.contentOrDescription}
                                            onChange={(e) => updateItemField(modIdx, itemIdx, 'contentOrDescription', e.target.value)}
                                            placeholder="Nội dung / Mô tả..."
                                        />

                                        <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => moveItem(modIdx, itemIdx, -1)} className="p-1 hover:text-white" disabled={itemIdx === 0}>↑</button>
                                            <button onClick={() => moveItem(modIdx, itemIdx, 1)} className="p-1 hover:text-white" disabled={itemIdx === mod.items.length - 1}>↓</button>
                                            <button onClick={() => deleteItem(modIdx, itemIdx)} className="p-1 text-red-400 hover:text-red-300">×</button>
                                        </div>
                                    </div>
                                ))}
                                
                                <button 
                                    onClick={() => addItem(modIdx)}
                                    className="w-full py-2 border border-dashed border-gray-600 rounded-lg text-xs text-gray-500 hover:text-white hover:border-gray-400 transition-colors flex items-center justify-center gap-1"
                                >
                                    <span>+</span> Thêm bài học
                                </button>
                            </div>
                        </div>
                    ))}

                    <button 
                        onClick={addModule}
                        className="w-full py-4 border-2 border-dashed border-blue-500/30 rounded-xl text-blue-400 font-bold hover:bg-blue-900/10 hover:border-blue-500 transition-all"
                    >
                        + Thêm Module Mới
                    </button>
                </div>
            )}
        </div>
    );
};

export default AdminCreateCoursePage;
