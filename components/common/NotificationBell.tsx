
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { DataContext, AuthContext, PageContext } from '../../contexts/AppProviders';

const NotificationBell: React.FC = () => {
  const { user } = useContext(AuthContext)!;
  const { db, dismissAnnouncement, markNotificationRead } = useContext(DataContext)!;
  const { navigate } = useContext(PageContext)!;
  
  const [isOpen, setIsOpen] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const notifications = useMemo(() => {
      const global = (db.ANNOUNCEMENTS || []).map(a => ({ ...a, type: 'global', read: false } as any));
      const personal = user ? (db.NOTIFICATIONS[user.id] || []) : [];
      
      // Combine and sort by timestamp desc
      return [...personal, ...global].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [db.ANNOUNCEMENTS, db.NOTIFICATIONS, user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (n: any) => {
      if (n.type === 'intervention' && n.metadata) {
          markNotificationRead(user!.id, n.id);
          navigate('assignment_viewer', { 
              assignmentId: n.metadata.assignmentId, 
              remediation: {
                  questionId: n.metadata.questionId,
                  note: n.metadata.teacherNote
              }
          });
          setIsOpen(false);
      } else if (n.type === 'global') {
          dismissAnnouncement(n.id);
      } else if (n.type === 'grade_update' && n.metadata) {
          markNotificationRead(user!.id, n.id);
          navigate('assignment_viewer', { assignmentId: n.metadata.assignmentId });
          setIsOpen(false);
      }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className="text-gray-400 hover:text-white relative p-2 rounded-full hover:bg-white/10 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-3 w-3 flex items-center justify-center">
             <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping"></span>
             <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
          </span>
        )}
      </button>

      {/* CENTERED MODAL OVERLAY */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in" onClick={() => setIsOpen(false)}>
            <div 
                className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[80vh] animate-pop-in"
                onClick={e => e.stopPropagation()} // Prevent click through to close
            >
                {/* Header */}
                <div className="p-4 border-b border-gray-700 bg-gray-800/80 flex justify-between items-center backdrop-blur-md">
                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                        🔔 Thông báo
                        {unreadCount > 0 && <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">{unreadCount} mới</span>}
                    </h3>
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 text-xl font-bold">
                        ✕
                    </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-0 bg-gray-900">
                    {notifications.length === 0 ? (
                        <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                            <span className="text-5xl mb-4 opacity-50">🔕</span>
                            <p className="text-sm">Không có thông báo mới.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-800">
                            {notifications.map(n => (
                                <div 
                                    key={n.id} 
                                    onClick={() => handleNotificationClick(n)}
                                    className={`p-5 hover:bg-gray-800/50 cursor-pointer transition-colors relative group ${!n.read ? 'bg-blue-900/10' : ''}`}
                                >
                                    {!n.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_10px_#3b82f6]"></div>}
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1">
                                            <p className={`text-sm leading-relaxed ${!n.read ? 'text-white font-bold' : 'text-gray-400'}`}>
                                                {n.type === 'intervention' && <span className="mr-2 text-lg">👨‍🏫</span>}
                                                {n.type === 'grade_update' && <span className="mr-2 text-lg">📝</span>}
                                                {n.type === 'global' && <span className="mr-2 text-lg">📢</span>}
                                                {n.text}
                                            </p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-xs text-gray-600 font-mono">{new Date(n.timestamp).toLocaleString()}</span>
                                                {!n.read && <span className="text-[10px] text-blue-400 font-bold bg-blue-900/30 px-1.5 py-0.5 rounded border border-blue-500/30">NEW</span>}
                                            </div>
                                        </div>
                                        {/* Action Icon Hint */}
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500">
                                            ➔
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-gray-700 bg-gray-800/50 text-center backdrop-blur-md">
                    <button onClick={() => setIsOpen(false)} className="text-xs text-gray-500 hover:text-white underline">Đóng</button>
                </div>
            </div>
        </div>
      )}
    </>
  );
};

export default NotificationBell;
