
import React, { useContext, useState } from 'react';
import { AuthContext, DataContext } from '../../contexts/AppProviders';
import GlobalStyles from '../common/GlobalStyles';
import { User } from '../../types';

const LockoutScreen: React.FC = () => {
  const { user, logout } = useContext(AuthContext)!;
  const { db, sendChatMessage } = useContext(DataContext)!;
  
  const [isDisputeMode, setIsDisputeMode] = useState(false);
  const [reason, setReason] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !reason.trim()) return;

      // Find an admin
      const admin = (Object.values(db.USERS) as User[]).find(u => u.role === 'ADMIN');
      if (admin) {
          sendChatMessage(
              user.id,
              admin.id,
              `🚨 [KHÁNG NGHỊ KHÓA TÀI KHOẢN]
              
              Người dùng ${user.name} (${user.id}) yêu cầu mở khóa.
              Lý do: "${reason}"
              
              Vui lòng xem xét.`
          );
          setSent(true);
      } else {
          alert("Không tìm thấy Admin để gửi tin nhắn.");
      }
  };

  return (
    <>
      <GlobalStyles />
      <div id="auth-page" className="flex items-center justify-center min-h-screen p-4 bg-gray-900">
        <div className="card p-8 text-center max-w-md w-full bg-black/50 border border-red-500/50 backdrop-blur-xl shadow-[0_0_50px_rgba(239,68,68,0.2)]">
          <div className="text-6xl mb-6 animate-pulse">🔒</div>
          <h1 className="text-3xl font-black text-red-500 mb-2 uppercase tracking-wider">Tài khoản bị khóa</h1>
          
          {!isDisputeMode && !sent && (
              <>
                <p className="text-gray-300 mb-8 leading-relaxed">
                    Hệ thống an ninh đã kích hoạt giao thức khóa đối với tài khoản <strong>{user?.name}</strong>.<br/>
                    Vui lòng liên hệ quản trị viên hoặc gửi yêu cầu giải trình.
                </p>
                <div className="space-y-3">
                    <button 
                        onClick={() => setIsDisputeMode(true)}
                        className="btn w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold shadow-lg"
                    >
                        📢 Gửi Kháng Nghị
                    </button>
                    <button onClick={logout} className="btn w-full btn-secondary border-red-500/30 text-red-300 hover:bg-red-900/20">
                        Đăng xuất
                    </button>
                </div>
              </>
          )}

          {isDisputeMode && !sent && (
              <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in-up">
                  <div className="text-left">
                      <label className="text-xs font-bold text-red-300 uppercase block mb-2">Lý do kháng nghị</label>
                      <textarea 
                        className="form-textarea w-full h-32 bg-gray-900 border-red-500/30 focus:border-red-500"
                        placeholder="Trình bày lý do bạn nên được mở khóa..."
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        autoFocus
                      ></textarea>
                  </div>
                  <div className="flex gap-3">
                      <button type="button" onClick={() => setIsDisputeMode(false)} className="btn btn-secondary flex-1">Hủy</button>
                      <button type="submit" disabled={!reason.trim()} className="btn btn-primary bg-red-600 hover:bg-red-500 flex-1">Gửi Yêu Cầu</button>
                  </div>
              </form>
          )}

          {sent && (
              <div className="animate-pop-in space-y-6">
                  <div className="p-4 bg-green-900/20 border border-green-500/50 rounded-xl">
                      <p className="text-green-400 font-bold text-lg mb-1">✅ Đã gửi thành công</p>
                      <p className="text-sm text-gray-400">Yêu cầu của bạn đã được chuyển đến Admin. Vui lòng chờ phản hồi qua Email hoặc thử đăng nhập lại sau.</p>
                  </div>
                  <button onClick={logout} className="btn btn-primary w-full">Đăng xuất</button>
              </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LockoutScreen;
