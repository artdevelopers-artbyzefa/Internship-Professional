import React from 'react';
import { formatDate, getInitials } from '../../utils/helpers.js';

export default function Topbar({ user, activePage, navItems, onLogout, showDD, setShowDD, showNotif, setShowNotif }) {
  const initials = getInitials(user.name);
  const pageLabel = navItems.find(n => n.id === activePage)?.label || 'Dashboard';

  const notifications = [
    'New internship request submitted',
    'Report deadline in 2 days',
    'Evaluation pending review',
  ];

  return (
    <div className="bg-white border-b border-gray-100 px-6 h-16 flex items-center justify-between shadow-sm flex-shrink-0">
      <div>
        <h2 className="text-base font-bold text-primary leading-tight">{pageLabel}</h2>
        <p className="text-xs text-gray-400">CUI Abbottabad · {formatDate()}</p>
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
            className="flex items-center gap-2 px-3 py-1.5 bg-lightbg rounded-xl cursor-pointer border-0 font-poppins hover:bg-blue-100 transition-all">
            <div className="w-7 h-7 bg-secondary rounded-lg flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
            <div className="text-left">
              <div className="text-xs font-semibold text-gray-700 leading-tight">{user.name}</div>
              <div className="text-xs text-gray-400 leading-tight">{user.role}</div>
            </div>
            <i className="fas fa-chevron-down text-gray-400" style={{ fontSize: 9 }}></i>
          </button>
          {showDD && (
            <div className="absolute right-0 top-11 bg-white border border-gray-100 rounded-xl p-2 min-w-40 shadow-xl z-50">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-lightbg text-sm text-gray-600 cursor-pointer"><i className="fas fa-user w-4"></i> My Profile</div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-lightbg text-sm text-gray-600 cursor-pointer"><i className="fas fa-gear w-4"></i> Settings</div>
              <hr className="my-1 border-gray-100" />
              <div onClick={onLogout} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 text-sm text-danger cursor-pointer"><i className="fas fa-right-from-bracket w-4"></i> Logout</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
