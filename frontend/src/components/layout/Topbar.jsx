import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate, getInitials } from '../../utils/helpers.js';
import { apiRequest } from '../../utils/api.js';

// ── Phase countdown chip ───────────────────────────────────────────────────
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

// ── Main Topbar ────────────────────────────────────────────────────────────
export default function Topbar({ user, activePage, navItems, onLogout, showDD, setShowDD, showNotif, setShowNotif, onMenuToggle }) {
  const navigate = useNavigate();
  const initials = getInitials(user.name);
  const pageLabel = navItems.find(n => n.id === activePage)?.label || 'Dashboard';

  const [activePhase, setActivePhase] = useState(null);

  useEffect(() => {
    apiRequest('/phases/current').then(d => setActivePhase(d)).catch(() => { });
  }, []);

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
      {/* Left */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <button
          onClick={onMenuToggle}
          className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-primary transition-all border-0 cursor-pointer flex-shrink-0">
          <i className="fas fa-bars text-sm" />
        </button>
        <div className="min-w-0">
          <h2 className="text-sm md:text-base font-bold text-primary leading-tight truncate">{pageLabel}</h2>
          <p className="text-[10px] text-gray-400 leading-tight hidden sm:block">CUI Abbottabad · {formatDate()}</p>
        </div>
      </div>

      {/* Centre — phase chip */}
      <div className="flex-1 flex justify-center px-2">
        <PhaseChip activePhase={activePhase} />
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotif(!showNotif); setShowDD(false); }}
            className="w-9 h-9 rounded-xl bg-gray-50 border-0 cursor-pointer flex items-center justify-center text-gray-600 hover:bg-blue-50 hover:text-secondary transition-all relative">
            <i className="fas fa-bell text-sm" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>
          {showNotif && (
            <div className="absolute right-0 top-11 bg-white border border-gray-100 rounded-xl p-2 w-72 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="px-3 py-2 text-xs font-bold text-primary border-b border-gray-50 mb-1">Notifications</div>
              {[
                { icon: 'fa-file-alt', text: 'New internship application submitted', time: '2h ago' },
                { icon: 'fa-calendar', text: 'Assignment deadline approaching in 2 days', time: '5h ago' },
                { icon: 'fa-clipboard-check', text: 'Student evaluation pending your review', time: '1d ago' },
              ].map((n, i) => (
                <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div className="w-7 h-7 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className={`fas ${n.icon} text-xs`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-700 font-medium leading-tight">{n.text}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowDD(!showDD); setShowNotif(false); }}
            className="flex items-center gap-2 p-1 md:px-2.5 md:py-1.5 bg-gray-50 rounded-xl cursor-pointer border border-gray-100 hover:bg-blue-50 hover:border-blue-100 transition-all">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm overflow-hidden flex-shrink-0">
              {user.profilePicture
                ? <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                : initials}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-gray-800 leading-tight truncate max-w-28">{user.name}</div>
              <div className="text-[9px] text-gray-400 leading-tight font-medium uppercase tracking-tight">{roleLabel}</div>
            </div>
            <i className="fas fa-chevron-down text-gray-400 ml-0.5 hidden sm:block" style={{ fontSize: 9 }} />
          </button>

          {showDD && (
            <div className="absolute right-0 top-12 bg-white border border-gray-100 rounded-xl p-2 min-w-48 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200">
              {/* Mobile name header */}
              <div className="px-3 py-2 sm:hidden border-b border-gray-50 mb-1">
                <div className="text-xs font-bold text-gray-800">{user.name}</div>
                <div className="text-[10px] text-gray-400 uppercase">{roleLabel}</div>
              </div>
              <div onClick={handleProfileClick} className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-sm text-gray-600 cursor-pointer transition-colors">
                <i className="fas fa-user-circle w-4 text-primary" /> My Profile
              </div>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-sm text-gray-500 cursor-pointer transition-colors">
                <i className="fas fa-shield-halved w-4 text-blue-400" /> Account Security
              </div>
              <hr className="my-1 border-gray-100" />
              <div onClick={onLogout} className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-red-50 text-sm text-red-500 cursor-pointer transition-colors">
                <i className="fas fa-power-off w-4" /> Sign Out
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
