import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate, getInitials } from '../../utils/helpers.js';
import { apiRequest } from '../../utils/api.js';

function PhaseChip({ activePhase }) {
  const calc = useCallback(() => {
    if (!activePhase?.scheduledEndAt) return null;
    const diff = new Date(activePhase.scheduledEndAt) - new Date();
    if (diff <= 0) return null;
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return { days, hours, mins };
  }, [activePhase]);

  const [rem, setRem] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setRem(calc()), 60000);
    return () => clearInterval(t);
  }, [calc]);

  if (!activePhase) return null;

  return (
    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700 whitespace-nowrap">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="truncate max-w-32">{activePhase.label}</span>
      {rem && (
        <span className="text-emerald-500 font-black">
          · {rem.days > 0 ? `${rem.days}d ` : ''}{rem.hours}h {rem.mins}m left
        </span>
      )}
    </div>
  );
}

export default function Topbar({ user, activePage, navItems, onLogout, showDD, setShowDD, showNotif, setShowNotif, onMenuToggle }) {
  const navigate = useNavigate();
  const initials = getInitials(user.name);
  const pageLabel = navItems.find(n => n.id === activePage)?.label || 'Dashboard';

  const [activePhase, setActivePhase] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(() => {
    apiRequest('/notifications').then(data => {
      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.read).length);
    }).catch(err => {
      console.error('Notification feed synchronization failure:', err);
    });
  }, []);

  useEffect(() => {
    const fetchPhase = () => apiRequest('/phases/current').then(d => setActivePhase(d)).catch(err => {
      console.error('Academic phase state synchronization failure:', err);
    });
    fetchPhase();
    fetchNotifications();
    
    const interval = setInterval(() => {
        fetchPhase();
        fetchNotifications();
    }, 180000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await apiRequest('/notifications/mark-read', 'PATCH');
      fetchNotifications();
    } catch (err) {
      console.error('Failed to clear notification center:', err);
    }
  };

  const handleNotifClick = async (notif) => {
    try {
      if (!notif.read) {
        await apiRequest(`/notifications/${notif._id}/read`, 'PATCH');
        fetchNotifications();
      }
      if (notif.link) navigate(notif.link);
      setShowNotif(false);
    } catch (err) {
      console.error('Notification interaction resolution failure:', err);
    }
  };

  const rolePaths = {
    student: '/student',
    internship_office: '/office',
    faculty_supervisor: '/faculty',
    site_supervisor: '/supervisor',
    hod: '/hod'
  };

  const handleProfileClick = () => {
    setShowDD(false);
    navigate(`${rolePaths[user.role] || '/student'}/profile`);
  };

  const roleLabel = {
    student: 'Student',
    internship_office: 'Internship Office',
    faculty_supervisor: 'Faculty Supervisor',
    site_supervisor: 'Site Supervisor',
    hod: 'Head of Department'
  }[user.role] || user.role;

  return (
    <div className="bg-white border-b border-gray-100 px-3 md:px-6 h-14 md:h-16 flex items-center justify-between shadow-sm flex-shrink-0 z-[30] gap-3">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <button
          onClick={onMenuToggle}
          aria-label="Toggle sidebar navigation"
          className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-primary transition-all border-0 cursor-pointer flex-shrink-0">
          <i className="fas fa-bars text-sm" aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <h2 className="text-sm md:text-base font-bold text-primary leading-tight truncate">{pageLabel}</h2>
          <p className="text-[10px] text-gray-400 leading-tight hidden sm:block">CUI Abbottabad · {formatDate()}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
        <div className="relative">
          <button
            onClick={() => { setShowNotif(!showNotif); setShowDD(false); }}
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            aria-expanded={showNotif}
            className="w-9 h-9 rounded-xl bg-gray-50 border-0 cursor-pointer flex items-center justify-center text-gray-600 hover:bg-blue-50 hover:text-secondary transition-all relative">
            <i className="fas fa-bell text-sm" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            )}
          </button>
          {showNotif && (
            <div className="absolute right-0 top-11 bg-white border border-gray-100 rounded-2xl w-80 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                <span className="text-[11px] font-black text-primary uppercase tracking-wider">Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-[10px] font-bold text-secondary hover:underline bg-transparent border-0 cursor-pointer">
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="max-h-[350px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((n, i) => (
                    <div 
                      key={n._id || i} 
                      onClick={() => handleNotifClick(n)}
                      className={`flex items-start gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/80 cursor-pointer transition-colors ${!n.read ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        n.type === 'phase_change' ? 'bg-amber-50 text-amber-500' :
                        n.type === 'assignment_submission' ? 'bg-emerald-50 text-emerald-500' :
                        n.type === 'internship_request' ? 'bg-blue-50 text-blue-500' :
                        'bg-slate-50 text-slate-500'
                      }`}>
                        <i className={`fas ${
                          n.type === 'phase_change' ? 'fa-bolt' :
                          n.type === 'assignment_submission' ? 'fa-file-upload' :
                          n.type === 'internship_request' ? 'fa-user-clock' :
                          'fa-bell'
                        } text-xs`} aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs leading-snug ${!n.read ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>{n.title}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[9px] text-gray-300 font-bold uppercase mt-1.5 tracking-tighter">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-gray-300">
                    <i className="fas fa-bell-slash text-2xl mb-2 opacity-20" />
                    <p className="text-xs font-medium">No notifications yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => { setShowDD(!showDD); setShowNotif(false); }}
            aria-label="User menu"
            aria-expanded={showDD}
            className="flex items-center gap-2 p-1 md:px-2.5 md:py-1.5 bg-gray-50 rounded-xl cursor-pointer border border-gray-100 hover:bg-blue-50 hover:border-blue-100 transition-all">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm overflow-hidden flex-shrink-0">
              {user.profilePicture
                ? <img src={user.profilePicture} alt={`${user.name}'s profile`} width={32} height={32} className="w-full h-full object-cover" />
                : initials}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-gray-800 leading-tight truncate max-w-28">{user.name}</div>
              <div className="text-[9px] text-gray-400 leading-tight font-medium uppercase tracking-tight">{roleLabel}</div>
            </div>
            <i className="fas fa-chevron-down text-gray-400 ml-0.5 hidden sm:block" aria-hidden="true" style={{ fontSize: 9 }} />
          </button>

          {showDD && (
            <div className="absolute right-0 top-12 bg-white border border-gray-100 rounded-xl p-2 min-w-48 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="px-3 py-2 sm:hidden border-b border-gray-50 mb-1">
                <div className="text-xs font-bold text-gray-800">{user.name}</div>
                <div className="text-[10px] text-gray-400 uppercase">{roleLabel}</div>
              </div>
              <div onClick={handleProfileClick} className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-sm text-gray-600 cursor-pointer transition-colors" role="menuitem">
                <i className="fas fa-user-circle w-4 text-primary" aria-hidden="true" /> My Profile
              </div>
              <hr className="my-1 border-gray-100" />
              <div onClick={onLogout} className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-red-50 text-sm text-red-500 cursor-pointer transition-colors" role="menuitem">
                <i className="fas fa-power-off w-4" aria-hidden="true" /> Sign Out
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
