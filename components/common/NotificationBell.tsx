
import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { DataContext, AuthContext, PageContext } from '../../contexts/AppProviders';
import { Notification, Announcement } from '../../types';

const NotificationBell: React.FC = () => {
  const { user } = useContext(AuthContext)!;
  const { db, dismissAnnouncement, markNotificationRead } = useContext(DataContext)!;
  const { navigate } = useContext(PageContext)!;
  
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
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
      }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="text-gray-400 hover:text-white relative p-1">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-3 w-3 flex items-center justify-center">
             <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping"></span>
             <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-4 w-80 card p-0 overflow-hidden z-[100] shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-gray-900 border border-gray-700">
          <div className="p-3 border-b border-gray-700 bg-gray-800/50">
            <h3 className="font-semibold text-gray-200">Thông báo</h3>
          </div>
          {notifications.length === 0 ? (
            <p className="text-gray-400 text-sm p-4">Không có thông báo mới.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
              {notifications.map(n => (
                <div 
                    key={n.id} 
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3 border-b border-gray-700 last:border-b-0 hover:bg-gray-800 cursor-pointer transition-colors ${!n.read ? 'bg-blue-900/20' : ''}`}
                >
                  <div className="flex justify-between items-start">
                      <p className={`text-sm ${!n.read ? 'text-white font-semibold' : 'text-gray-400'}`}>{n.text}</p>
                      {n.type === 'intervention' && <span className="text-xs bg-red-500 text-white px-1 rounded ml-2">⚠️</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{new Date(n.timestamp).toLocaleString()}</p>
                  {n.type === 'intervention' && (
                      <p className="text-xs text-blue-400 mt-1">Nhấn để xem lời giải &rarr;</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
