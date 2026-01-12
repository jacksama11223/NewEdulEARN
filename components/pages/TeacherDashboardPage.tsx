
import React, { useContext, useMemo } from 'react';
import { AuthContext, DataContext, GlobalStateContext, PageContext } from '../../contexts/AppProviders';
import { useFeatureFlag } from '../../hooks/useAppHooks';

const TeacherDashboardPage: React.FC = () => {
    const { user } = useContext(AuthContext)!;
    const { db } = useContext(DataContext)!;
    const { serviceStatus } = useContext(GlobalStateContext)!;
    const { navigate } = useContext(PageContext)!;

    const isAiAnalyticsEnabled = useFeatureFlag('v3_ai_analytics');

    const isAnalyticsServiceOk = serviceStatus.analytics === 'OPERATIONAL';
    const isGradingServiceOk = serviceStatus.grading_service === 'OPERATIONAL';
    const isAiAssistantServiceOk = serviceStatus.ai_assistant_service === 'OPERATIONAL';

    const courses = useMemo(() => db.COURSES.filter(course => course.teacher === user?.name), [db.COURSES, user?.name]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 0 && hour <= 10) return "Chào buổi sáng";
        if (hour >= 11 && hour <= 12) return "Chào buổi trưa";
        if (hour >= 13 && hour <= 17) return "Chào buổi chiều";
        return "Chào buổi tối";
    };
    
    const greeting = getGreeting();

    if (!user) return null;

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gradient">{greeting}, {user.name}</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <h2 className="text-2xl font-semibold text-gray-200">Các khóa học đang giảng dạy</h2>
                    {courses.length === 0 ? (
                        <p className="text-gray-400 card p-6">Bạn chưa được gán giảng dạy khóa học nào.</p>
                    ) : (
                        courses.map(course => (
                            <div key={course.id} className="card p-6 flex flex-col gap-4 hover:bg-gray-700/50 transition-colors duration-200 border-l-4 border-blue-500">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm text-blue-400 font-mono">{course.id}</p>
                                        <h3 className="text-xl font-bold text-gray-200 mt-1">{course.name}</h3>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button onClick={() => navigate('course_detail', { courseId: course.id })} className="btn btn-secondary text-sm">
                                            Xem chi tiết
                                        </button>
                                        <button 
                                            onClick={() => navigate('learning_path_detail', { aggregateCourseId: course.id })} 
                                            className="btn btn-sm bg-purple-900/40 border border-purple-500/50 text-purple-200 hover:bg-purple-600 hover:text-white flex items-center gap-1 shadow-[0_0_10px_rgba(168,85,247,0.3)] animate-pulse hover:animate-none"
                                            title="Xem tiến độ cả lớp dưới dạng Cây Kỹ Năng"
                                        >
                                            🌳 Class Tree
                                        </button>
                                    </div>
                                </div>
                                
                                {/* User Flow Actions */}
                                <div className="grid grid-cols-2 gap-3 mt-2">
                                    <button 
                                        onClick={() => navigate('assignment_hub')} 
                                        className="btn bg-indigo-900/30 border border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-200 flex items-center justify-center gap-2 text-sm"
                                    >
                                        <span>📝</span> Quản lý & Chấm bài
                                    </button>
                                    <button 
                                        onClick={() => navigate('assignment_creator', { type: 'quiz' })} 
                                        className="btn bg-green-900/30 border border-green-500/30 hover:bg-green-500/20 text-green-200 flex items-center justify-center gap-2 text-sm"
                                    >
                                        <span>⚡</span> Tạo Quiz Mới
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="space-y-6">
                    {isAiAnalyticsEnabled && (
                        <div className="card p-6">
                            <h3 className="text-xl font-semibold text-gray-200 mb-4">Phân tích AI (API v3)</h3>
                            {!isAnalyticsServiceOk ? (
                                <div className="text-center p-4 bg-gray-700 rounded-lg border border-yellow-700">
                                    <p className="text-sm text-yellow-400 font-semibold">Dịch vụ phân tích đang bảo trì.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-gray-400 text-sm">Demo Phân tích AI dự đoán:</p>
                                    <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                                        <li>3 sinh viên có nguy cơ <span className="font-semibold text-red-400">không đạt</span>.</li>
                                        <li>Chủ đề "Microservices" có tỷ lệ hiểu bài <span className="font-semibold text-yellow-400">thấp nhất</span>.</li>
                                        <li>Tỷ lệ hoàn thành bài tập trung bình: <span className="font-semibold text-green-400">85%</span>.</li>
                                    </ul>
                                    <button className="btn btn-secondary w-full mt-2">Xem báo cáo chi tiết</button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="card p-6">
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">Tác vụ nhanh</h3>
                        <div className="space-y-3">
                            <button
                                onClick={() => navigate('assignment_hub')}
                                className="btn btn-secondary w-full"
                                disabled={!isGradingServiceOk}
                                title={!isGradingServiceOk ? "Dịch vụ chấm điểm đang bảo trì" : "Quản lý Bài tập"}
                            >
                                Quản lý Bài tập
                            </button>
                            <button
                                onClick={() => navigate('gemini_teacher')}
                                className="btn btn-secondary w-full"
                                disabled={!isAiAssistantServiceOk}
                                title={!isAiAssistantServiceOk ? "Dịch vụ AI cho giáo viên đang bảo trì" : "Sử dụng Gemini Soạn bài"}
                            >
                                Sử dụng Gemini Soạn bài
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default TeacherDashboardPage;
