import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate, getInitials } from '../../utils/helpers.js';

export default function Topbar({ user, activePage, navItems, onLogout, showDD, setShowDD, showNotif, setShowNotif, onMenuToggle }) {
  const navigate = useNavigate();
  const initials = getInitials(user.name);
  const pageLabel = navItems.find(n => n.id === activePage)?.label || 'Dashboard';

  const rolePaths = {
    student: '/student',
    internship_office: '/office',
    faculty_supervisor: '/faculty',
    hod: '/hod'
  };

  const handleProfileClick = () => {
    setShowDD(false);
    const basePath = rolePaths[user.role] || '/student';
    navigate(`${basePath}/profile`);
  };

  const notifications = [
    'New internship request submitted',
    'Report deadline in 2 days',
    'Evaluation pending review',
  ];

  return (
    <div className="bg-white border-b border-gray-100 px-4 md:px-6 h-16 flex items-center justify-between shadow-sm flex-shrink-0 z-[30]">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-primary transition-all border-0 cursor-pointer"
        >
          <i className="fas fa-bars"></i>
        </button>
        <div>
          <h2 className="text-sm md:text-base font-bold text-primary leading-tight">{pageLabel}</h2>
          <p className="text-[10px] md:text-xs text-gray-400">CUI Abbottabad · {formatDate()}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => { setShowNotif(!showNotif); setShowDD(false); }}
            className="w-9 h-9 rounded-xl bg-lightbg border-0 cursor-pointer flex items-center justify-center text-gray-600 hover:bg-blue-100 hover:text-secondary transition-all relative">
            <i className="fas fa-bell text-sm"></i>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full border-2 border-white"></span>
          </button>
          {showNotif && (
            <div className="absolute right-0 top-11 bg-white border border-gray-100 rounded-xl p-2 min-w-60 shadow-xl z-50">
              <div className="px-3 py-2 text-xs font-bold text-primary">Notifications</div>
              {notifications.map((n, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-lightbg text-xs text-gray-600 cursor-pointer">
                  <i className="fas fa-circle text-secondary" style={{ fontSize: 5 }}></i> {n}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => { setShowDD(!showDD); setShowNotif(false); }}
            className="flex items-center gap-2 p-1 md:px-2 md:py-1.5 bg-lightbg rounded-xl cursor-pointer border-0 font-poppins hover:bg-blue-100 transition-all">
            <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm overflow-hidden flex-shrink-0">
              {user.profilePicture ? (
                <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-semibold text-gray-700 leading-tight">{user.name}</div>
              <div className="text-[10px] text-gray-400 leading-tight font-medium uppercase tracking-tighter">{user.role?.replace('_', ' ')}</div>
            </div>
            <i className="fas fa-chevron-down text-gray-400 ml-1 hidden md:block" style={{ fontSize: 9 }}></i>
          </button>
          {showDD && (
            <div className="absolute right-0 top-11 bg-white border border-gray-100 rounded-xl p-2 min-w-44 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="px-3 py-2 md:hidden border-b border-gray-50 mb-1">
                <div className="text-xs font-bold text-gray-800">{user.name}</div>
                <div className="text-[10px] text-gray-400 uppercase">{user.role?.replace('_', ' ')}</div>
              </div>
              <div
                onClick={handleProfileClick}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-lightbg text-sm text-gray-600 cursor-pointer transition-colors"
              >
                <i className="fas fa-user-circle w-4 text-secondary"></i> My Profile
              </div>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-lightbg text-sm text-gray-600 cursor-pointer transition-colors">
                <i className="fas fa-shield-halved w-4 text-blue-400"></i> Account Security
              </div>
              <hr className="my-1 border-gray-100/50" />
              <div
                onClick={onLogout}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-red-50 text-sm text-danger cursor-pointer transition-colors"
              >
                <i className="fas fa-power-off w-4"></i> Logout
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
