
import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { AuthContext, DataContext, GlobalStateContext, PageContext, DataProvider, AuthProvider, GlobalStateProvider, PageProvider, MusicProvider, MusicContext, PetProvider, PetContext } from './contexts/AppProviders';
import GlobalStyles from './components/common/GlobalStyles';
import SkinEffectOverlay from './components/common/SkinEffectOverlay'; 
import GlobalSoundManager from './components/common/GlobalSoundManager'; // NEW IMPORT
import NotificationBell from './components/common/NotificationBell';
import GeminiAPIKeyModal from './components/modals/GeminiAPIKeyModal';
import OnboardingTour, { TourStep } from './components/common/OnboardingTour';
import LockoutScreen from './components/auth/LockoutScreen';
import AuthPage from './components/auth/AuthPage';
import StudyBuddy from './components/common/StudyBuddy';
import SpaceJunkScavenger from './components/common/SpaceJunkScavenger'; 

import StudentDashboardPage, { MusicWidget, FocusTimerWidget } from './components/pages/StudentDashboardPage';
import TeacherDashboardPage from './components/pages/TeacherDashboardPage';
import AdminDashboardPage from './components/pages/AdminDashboardPage';
import CourseDetailPage from './components/pages/CourseDetailPage';
import LessonPage from './components/pages/LessonPage';
import AssignmentHubPage from './components/pages/AssignmentHubPage';
import ChatPage from './components/pages/ChatPage';
import ApiKeyPage from './components/pages/ApiKeyPage';
import AssignmentViewerPage from './components/pages/AssignmentViewerPage';
import GroupChatPage from './components/pages/GroupChatPage';
import GeminiStudentPage from './components/pages/GeminiStudentPage';
import AssignmentCreatorPage from './components/pages/AssignmentCreatorPage';
import GradebookPage from './components/pages/GradebookPage';
import GeminiTeacherPage from './components/pages/GeminiTeacherPage';
import AdminResiliencePage from './components/pages/AdminResiliencePage';
import DeploymentPage from './components/pages/DeploymentPage';
import SecurityPage from './components/pages/SecurityPage';
import LearningPathCreatorPage from './components/pages/LearningPathCreatorPage';
import LearningPathDetailPage from './components/pages/LearningPathDetailPage';
import LearningNodeStudyPage from './components/pages/LearningNodeStudyPage';
import NotebookPage from './components/pages/NotebookPage';
import TaskArchivePage from './components/pages/TaskArchivePage';
import AdminCreateCoursePage from './components/pages/AdminCreateCoursePage';

// --- DRAGGABLE FLOATING WIDGET ---
const FloatingWidget: React.FC<{ children: React.ReactNode; initialPos: { x: number; y: number } }> = ({ children, initialPos }) => {
    const [pos, setPos] = useState(initialPos);
    const [isDragging, setIsDragging] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    
    // Access context for summary view
    const { pomodoro } = useContext(GlobalStateContext)!;
    const { currentTrack, isPlaying } = useContext(MusicContext)!;
    const { triggerReaction } = useContext(PetContext)!; // Hover interaction

    const ref = useRef<HTMLDivElement>(null);
    const offset = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        // Only drag if clicking the header/container, not buttons/inputs inside
        if (ref.current && (e.target as HTMLElement).closest('.drag-handle')) {
            setIsDragging(true);
            offset.current = {
                x: e.clientX - ref.current.getBoundingClientRect().left,
                y: e.clientY - ref.current.getBoundingClientRect().top
            };
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPos({
                    x: e.clientX - offset.current.x,
                    y: e.clientY - offset.current.y
                });
            }
        };
        const handleMouseUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <div 
            ref={ref}
            onMouseDown={handleMouseDown}
            onMouseEnter={() => triggerReaction('hover_mechanic')}
            style={{ 
                position: 'fixed', 
                left: pos.x, 
                top: pos.y, 
                zIndex: 9999, 
            }}
            // Fix lag: Disable transition during drag, enable it otherwise for smooth minimize/maximize
            className={`${isDragging ? 'transition-none' : 'transition-all duration-300'} hover:shadow-2xl animate-fade-in select-none`}
        >
            {!isMinimized ? (
                /* FULL EXPANDED VIEW */
                <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/20 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col w-[340px]">
                    {/* Drag Handle / Header */}
                    <div className="drag-handle h-9 bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-b border-white/10 flex items-center justify-between px-3 cursor-grab active:cursor-grabbing">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500/80 animate-pulse"></span>
                            <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Mission Control</span>
                        </div>
                        <button 
                            onClick={() => setIsMinimized(true)}
                            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                            title="Thu gọn (Chạy ngầm)"
                        >
                            ─
                        </button>
                    </div>
                    
                    {/* Content Container */}
                    <div className="p-2 space-y-2 max-h-[70vh] overflow-y-auto custom-scrollbar bg-black/40">
                        {children}
                    </div>
                </div>
            ) : (
                /* MINIMIZED NAVBAR VIEW */
                <div className="drag-handle flex items-center gap-3 bg-slate-900/95 backdrop-blur-xl border border-blue-500/40 rounded-full pl-4 pr-2 py-2 shadow-[0_0_30px_rgba(59,130,246,0.3)] cursor-grab active:cursor-grabbing hover:scale-105 transition-transform min-w-[180px]">
                    {/* Pomodoro Status */}
                    <div className="flex items-center gap-2 border-r border-white/10 pr-3">
                        <span className={`text-sm ${pomodoro.isActive ? 'text-red-400 animate-pulse' : 'text-gray-400'}`}>⏱️</span>
                        <span className="text-xs font-mono font-bold text-white">{formatTime(pomodoro.seconds)}</span>
                    </div>

                    {/* Music Status */}
                    <div className="flex items-center gap-2 max-w-[140px] overflow-hidden flex-1">
                        <span className={`text-xs ${isPlaying ? 'animate-spin-slow' : ''}`}>🎵</span>
                        <div className="flex flex-col overflow-hidden">
                             <p className="text-[10px] text-blue-200 truncate font-bold leading-tight">
                                {currentTrack ? currentTrack.name : 'No Music'}
                             </p>
                             {currentTrack && <p className="text-[8px] text-gray-500 leading-tight">Playing</p>}
                        </div>
                    </div>

                    {/* Maximize Button */}
                    <button 
                        onClick={() => setIsMinimized(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-all shadow-inner ml-1"
                        title="Mở rộng"
                    >
                        ⤢
                    </button>
                </div>
            )}
        </div>
    );
};

const Navigation: React.FC = () => {
  const { user } = useContext(AuthContext)!;
  const { page, setPage, deepWorkMode } = useContext(GlobalStateContext)!;
  const { unreadCounts, resetUnreadCount } = useContext(DataContext)!; // NEW: Get Unread Counts
  const { navigate } = useContext(PageContext)!;
  const { triggerReaction } = useContext(PetContext)!;

  const handleNavClick = (itemId: string) => {
      navigate(itemId);
      if (itemId === 'chat') resetUnreadCount('chat');
      if (itemId === 'group_chat') resetUnreadCount('group');
      // For assignment hub or dashboard, we might clear alerts if needed, 
      // but usually specific actions clear them (like clicking the bell).
  };

  const menuItems = useMemo(() => {
    const common = [
      { id: 'dashboard', label: 'Trạm Vũ Trụ', icon: '🚀', action: 'hover_btn' },
      { id: 'chat', label: 'Liên Lạc', icon: '📡', action: 'hover_chat', badge: unreadCounts.chat },
    ];
    
    if (user?.role === 'STUDENT') {
      return [
        ...common,
        { id: 'notebook', label: 'Sổ Tay', icon: '📓', action: 'hover_write' },
        { id: 'assignment_hub', label: 'Cây Tri Thức', icon: '🌳', action: 'hover_smart' },
        { id: 'group_chat', label: 'Phi Đội', icon: '🛸', action: 'hover_btn', badge: unreadCounts.group },
        { id: 'gemini_student', label: 'Nhà Tiên Tri', icon: '🔮', action: 'hover_magic' },
      ];
    } else if (user?.role === 'TEACHER') {
      return [
        ...common,
        { id: 'notebook', label: 'Sổ Tay', icon: '📓', action: 'hover_write' },
        { id: 'assignment_hub', label: 'Quản lý Bài tập', icon: '📋', action: 'hover_smart' },
        { id: 'group_chat', label: 'Quản lý Phi Đội', icon: '👁️', action: 'hover_detective', badge: unreadCounts.group }, 
        { id: 'gemini_teacher', label: 'Trợ giảng AI', icon: '🤖', action: 'hover_magic' },
      ];
    } else if (user?.role === 'ADMIN') {
      return [
        ...common,
        { id: 'admin_create_course', label: 'Khởi tạo Khóa học', icon: '🎓', action: 'hover_write' }, 
        { id: 'admin_resilience', label: 'Resilience', icon: '🔧', action: 'hover_mechanic' },
        { id: 'deployment', label: 'Deployment', icon: '🚀', action: 'hover_btn' },
        { id: 'group_chat', label: 'Giám sát Phi Đội', icon: '🛸', action: 'hover_detective', badge: unreadCounts.group },
        { id: 'security', label: 'Security', icon: '🛡️', action: 'hover_scared' },
      ];
    }
    return common;
  }, [user, unreadCounts]);

  // Hide navigation in Deep Work Mode
  if (deepWorkMode) return null;

  return (
    <nav id="main-sidebar" className="fixed bottom-0 w-full md:top-0 md:left-0 md:w-28 md:h-screen bg-black/60 backdrop-blur-xl border-t md:border-t-0 md:border-r border-white/10 z-50 flex md:flex-col justify-around md:justify-start py-2 md:py-8 transition-all duration-300">
      <div className="hidden md:flex flex-col items-center mb-8" onMouseEnter={() => triggerReaction('hover_cool')}>
         <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(59,130,246,0.5)]">
            🌌
         </div>
      </div>
      
      {menuItems.map(item => (
        <button
          key={item.id}
          id={`nav-${item.id}`}
          onClick={() => handleNavClick(item.id)}
          onMouseEnter={() => triggerReaction(item.action)}
          className={`flex flex-col items-center justify-center w-full md:h-20 p-2 gap-1 transition-all duration-300 relative group
            ${page === item.id 
              ? 'text-blue-400' 
              : 'text-gray-400 hover:text-white'
            }`}
        >
          {page === item.id && (
             <div className="absolute top-0 left-0 w-full h-0.5 md:w-0.5 md:h-full bg-blue-500 shadow-[0_0_10px_#3B82F6]"></div>
          )}
          
          <div className="relative">
              <span className={`text-2xl transition-transform duration-300 ${page === item.id ? 'scale-110 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 'group-hover:scale-110'}`}>
                {item.icon}
              </span>
              {/* BADGE */}
              {item.badge && item.badge > 0 && (
                  <span className="absolute -top-2 -right-3 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg border border-black animate-bounce">
                      {item.badge > 99 ? '99+' : item.badge}
                  </span>
              )}
          </div>

          <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 hidden md:block text-center">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

const Header: React.FC = () => {
  const { user, logout } = useContext(AuthContext)!;
  const { page, setPage, deepWorkMode } = useContext(GlobalStateContext)!;
  const { triggerReaction } = useContext(PetContext)!;
  const { unreadCounts, resetUnreadCount } = useContext(DataContext)!;

  // Header can remain visible or simplify in deep work mode. Let's simplify.
  if (deepWorkMode) return null;

  return (
    <header className="fixed top-0 left-0 md:left-28 right-0 h-20 bg-transparent z-40 flex items-center justify-between px-6 md:px-10 pointer-events-none">
       {/* Background Blur for Header */}
       <div className="absolute inset-0 bg-gradient-to-b from-black/80 to-transparent pointer-events-none"></div>

       <div className="relative pointer-events-auto flex items-center gap-3">
          {/* Mobile Logo */}
          <div className="md:hidden w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg shadow-lg">
             🌌
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide drop-shadow-md hidden sm:block" onMouseEnter={() => triggerReaction('hover_cool')}>
             EDULEARN <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">(By Quang)</span>
          </h1>
       </div>

       <div className="relative pointer-events-auto flex items-center gap-4 md:gap-6">
        <button 
          id="header-settings"
          onClick={() => setPage('api_key', { isApiKeyModalOpen: true })}
          onMouseEnter={() => triggerReaction('hover_mechanic')}
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all hover:scale-105"
          title="Cài đặt API Key"
        >
          🔑
        </button>
        <div id="header-notif" className="pointer-events-auto relative" onMouseEnter={() => triggerReaction('hover_smart')} onClick={() => resetUnreadCount('alert')}>
            <NotificationBell />
            {unreadCounts.alert > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping pointer-events-none"></span>
            )}
        </div>
        <button 
            onClick={logout} 
            onMouseEnter={() => triggerReaction('sad')}
            className="btn btn-danger text-[10px] md:text-xs px-4 md:px-6 py-2 rounded-full shadow-lg"
        >
          THOÁT
        </button>
      </div>
    </header>
  );
};

const PageRouter: React.FC = () => {
    const { user } = useContext(AuthContext)!;
    const { page, params } = useContext(PageContext)!;

    const PageComponent = useMemo(() => {
      if (!user) return StudentDashboardPage;
      switch (page) {
        case 'dashboard': return user.role === 'STUDENT' ? StudentDashboardPage : user.role === 'TEACHER' ? TeacherDashboardPage : AdminDashboardPage;
        case 'course_detail': return () => <CourseDetailPage courseId={params?.courseId} />;
        case 'lesson': return () => <LessonPage lessonId={params?.lessonId} />;
        case 'assignment_hub': return AssignmentHubPage;
        case 'chat': return ChatPage;
        case 'notebook': return NotebookPage;
        case 'api_key': return ApiKeyPage;
        case 'assignment_viewer': return () => <AssignmentViewerPage assignmentId={params?.assignmentId} />;
        case 'group_chat': return GroupChatPage;
        case 'gemini_student': return GeminiStudentPage;
        case 'assignment_creator': return () => <AssignmentCreatorPage type={params?.type} />;
        case 'gradebook': return () => <GradebookPage assignmentId={params?.assignmentId} />;
        case 'gemini_teacher': return GeminiTeacherPage;
        case 'admin_resilience': return AdminResiliencePage;
        case 'deployment': return DeploymentPage;
        case 'security': return SecurityPage;
        case 'learning_path_creator': return LearningPathCreatorPage;
        case 'learning_path_detail': return () => <LearningPathDetailPage pathId={params?.pathId} />;
        case 'learning_node_study': return () => <LearningNodeStudyPage pathId={params?.pathId} nodeId={params?.nodeId} isLastNode={params?.isLastNode} />;
        case 'task_archive': return TaskArchivePage;
        case 'admin_create_course': return AdminCreateCoursePage;
        default: return StudentDashboardPage;
      }
    }, [page, user, params]);
  
    return <PageComponent />;
};

const AppLayout: React.FC = () => {
  const { user } = useContext(AuthContext)!;
  const { page: globalPage, pageParams: globalPageParams, deepWorkMode, setDeepWorkMode } = useContext(GlobalStateContext)!;
  const { completeOnboarding, db } = useContext(DataContext)!;
  const { triggerReaction, say } = useContext(PetContext)!; // NEW: Use 'say' for dialogue
  const { navigate, page } = useContext(PageContext)!;

  const isApiKeyModalOpen = useMemo(() => globalPage === 'api_key' && globalPageParams?.isApiKeyModalOpen, [globalPage, globalPageParams]);

  const [isTourOpen, setIsTourOpen] = useState(false);

  // Shop Upsell Logic
  const prevPointsRef = useRef(db.GAMIFICATION.points);
  const prevDiamondsRef = useRef(db.GAMIFICATION.diamonds);

  useEffect(() => {
      const currentPoints = db.GAMIFICATION.points;
      const currentDiamonds = db.GAMIFICATION.diamonds;

      const crossedPoints = prevPointsRef.current < 1000 && currentPoints >= 1000;
      const crossedDiamonds = prevDiamondsRef.current < 1000 && currentDiamonds >= 1000;

      if (crossedPoints || crossedDiamonds) {
          triggerReaction('hover_cool');
          say("Cậu giàu to rồi! Tớ thấy trong Shop có bộ Skin 'Hỏa Long' ngầu lắm, mua cho tớ đi?", 8000);
      }

      prevPointsRef.current = currentPoints;
      prevDiamondsRef.current = currentDiamonds;
  }, [db.GAMIFICATION.points, db.GAMIFICATION.diamonds, triggerReaction, say]);

  // Define Tour Steps based on Role
  const tourSteps: TourStep[] = useMemo(() => {
      if (user?.role === 'TEACHER') {
          return [
              {
                  targetId: 'nav-assignment_hub',
                  title: 'Trung Tâm Nhiệm Vụ',
                  content: 'Quản lý bài tập, chấm điểm và theo dõi tiến độ của học sinh tại đây.',
                  position: 'right'
              },
              {
                  targetId: 'nav-gemini_teacher',
                  title: 'Trợ Giảng AI',
                  content: 'Sử dụng AI để soạn giáo án, tạo đề thi và gợi ý phương pháp giảng dạy.',
                  position: 'right'
              },
              {
                  targetId: 'header-settings',
                  title: 'Cấu Hình',
                  content: 'Thiết lập API Key để kích hoạt các tính năng thông minh của hệ thống.',
                  position: 'bottom'
              }
          ];
      }
      
      // Default / Student
      return [
          { 
              targetId: 'treasure-chest', 
              title: 'Kho Báu & Gamification', 
              content: 'Nơi lưu giữ thành tích, XP và vật phẩm của bạn. Học càng chăm, quà càng to!', 
              position: 'left' 
          },
          { 
              targetId: 'course-list', 
              title: 'Các Hành Tinh (Khóa học)', 
              content: 'Danh sách các môn học. Mỗi khóa học là một hành trình khám phá mới.', 
              position: 'right' 
          },
          { 
              targetId: 'btn-portal-ai', 
              title: 'Nhà Tiên Tri AI', 
              content: 'Gặp khó khăn? Hãy hỏi Gemini để được giải thích chi tiết theo cách bạn muốn.', 
              position: 'bottom' 
          },
      ];
  }, [user?.role]);

  useEffect(() => {
      if (user && !user.hasSeenOnboarding) {
          // 1. WELCOME FLOW
          triggerReaction('welcome');
          
          if (user.role === 'TEACHER') {
               say(`Xin chào Giáo sư ${user.name}! Tôi là trợ lý ảo của ngài. Hãy để tôi giới thiệu các công cụ quản lý lớp học.`, 8000);
          } else {
               say(`Chào mừng ${user.name}! Tớ là người dẫn đường của cậu. Đầu tiên, hãy ghé thăm Trạm Vũ Trụ để xem các khóa học nhé!`, 8000);
          }

          // Delay slightly to ensure rendering then start Tour
          const timer = setTimeout(() => setIsTourOpen(true), 1500);
          return () => clearTimeout(timer);
      }
  }, [user]);

  const handleTourComplete = () => {
      if (user) {
          completeOnboarding(user.id);
          setIsTourOpen(false);
          
          if (user.role === 'TEACHER') {
              say("Hệ thống đã sẵn sàng. Chúc ngài một ngày làm việc hiệu quả!", 5000);
          } else {
              say("Tuyệt vời! Bạn đã sẵn sàng để khám phá vũ trụ tri thức. Chúc may mắn!", 5000);
          }
      }
  };

  return (
    <div className="min-h-screen relative text-gray-100 overflow-hidden font-sans">
       {/* LAYER -2: DYNAMIC GRADIENT BACKGROUND (Restored) */}
       <div className="sky-bg"></div>

       {/* LAYER -1: DYNAMIC PARTICLE SKIN OVERLAY */}
       <SkinEffectOverlay />

       {/* SOUND MANAGER (INVISIBLE) */}
       <GlobalSoundManager />

       {/* DEEP WORK OVERLAY - DARKNESS */}
       <div className={`fixed inset-0 bg-black/95 z-[90] transition-opacity duration-1000 pointer-events-none ${deepWorkMode ? 'opacity-100' : 'opacity-0'}`}></div>

       {/* EXIT BUTTON FOR DEEP WORK */}
       {deepWorkMode && (
           <button 
                onClick={() => setDeepWorkMode(false)}
                className="fixed top-6 right-6 z-[100] btn bg-red-900/80 border border-red-500 text-white hover:bg-red-600 px-6 py-3 shadow-[0_0_30px_rgba(239,68,68,0.8)] animate-pulse font-bold text-lg rounded-full backdrop-blur-md transition-transform hover:scale-105"
                style={{ pointerEvents: 'auto' }}
           >
               ⏹ THOÁT CHẾ ĐỘ TẬP TRUNG
           </button>
       )}

       <Navigation />
       <Header />
       
       {/* Adjusted main padding: 
           Desktop: pl-36 (for sidebar), pt-28 (for header)
           Mobile: pl-4, pt-24 (smaller header), pb-24 (for bottom nav)
           Deep Work: No sidebar/header padding
       */}
       <main className={`transition-all duration-500 min-h-screen relative z-30 
            ${deepWorkMode ? 'p-0 flex items-center justify-center z-[95]' : 'md:pl-36 md:pr-8 px-4 pt-24 md:pt-28 pb-24 md:pb-12'}`
       }>
          <div className={`w-full mx-auto animate-fade-in-up ${deepWorkMode ? 'max-w-5xl' : 'max-w-7xl'}`}>
             <PageRouter />
          </div>
       </main>
       
       {/* Picture-in-Picture Floating Widget (Combined with Toggle) */}
       {user?.role === 'STUDENT' && page !== 'dashboard' && page !== 'task_archive' && (
          <FloatingWidget initialPos={{ x: window.innerWidth - 360, y: window.innerHeight - 500 }}>
             <div className="flex flex-col gap-2">
                 <div className="bg-red-900/20 rounded-xl overflow-hidden border border-red-500/20">
                    <FocusTimerWidget />
                 </div>
                 <div className="rounded-xl overflow-hidden">
                    <MusicWidget />
                 </div>
             </div>
          </FloatingWidget>
       )}

       <GeminiAPIKeyModal isOpen={isApiKeyModalOpen} onClose={() => navigate('dashboard')} />
       
       {/* Onboarding Tour */}
       <OnboardingTour 
            steps={tourSteps} 
            isOpen={isTourOpen} 
            onComplete={handleTourComplete}
            onSkip={handleTourComplete}
       />

       {/* GLOBAL PET COMPONENT */}
       {!deepWorkMode && user && <StudyBuddy />}

       {/* SPACE JUNK SCAVENGER */}
       {!deepWorkMode && user && <SpaceJunkScavenger />}
    </div>
  );
};

const AppRoot: React.FC = () => {
  const { user, isLocked } = useContext(AuthContext)!;
  if (isLocked) return <LockoutScreen />;
  if (!user) return <AuthPage />;
  return <AppLayout />;
}

const App: React.FC = () => {
  return (
    <DataProvider>
      <GlobalStateProvider>
        <PageProvider>
          <AuthProvider>
            <PetProvider>
              <MusicProvider>
                <GlobalStyles />
                <AppRoot />
              </MusicProvider>
            </PetProvider>
          </AuthProvider>
        </PageProvider>
      </GlobalStateProvider>
    </DataProvider>
  );
}

export default App;
