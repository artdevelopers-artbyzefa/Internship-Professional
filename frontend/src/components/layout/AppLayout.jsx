import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function AppLayout({ user, onLogout, activePage, setActivePage, navItems, children, disableSidebar = false, hideLogout = false }) {
  const [collapsed, setCollapsed] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  useEffect(() => {
    if (window.innerWidth >= 1024 && window.innerWidth < 1280) {
      setCollapsed(true);
    }
  }, []);
  const [showDD, setShowDD] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden relative bg-lightbg selection:bg-secondary/20">
      <Sidebar
        aria-label="Main navigation"
        user={user}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        showMobileSidebar={showMobileSidebar}
        setShowMobileSidebar={setShowMobileSidebar}
        activePage={activePage}
        setActivePage={setActivePage}
        navItems={navItems}
        onLogout={onLogout}
        disabled={disableSidebar}
        hideLogout={hideLogout}
      />

      {showMobileSidebar && (
        <div
          className="fixed inset-0 bg-black/50 z-[40] lg:hidden backdrop-blur-sm"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      <div className={`flex-1 flex flex-col overflow-hidden w-full transition-all duration-300 ease-in-out`}>
        {user.isDefaultPassword && !['internship_office', 'hod'].includes(user.role) && (
          <div className="bg-yellow-50 border-b border-yellow-100 px-4 md:px-6 py-2.5 flex items-center justify-between z-[45]">
            <div className="flex items-center text-yellow-800 text-[11px] md:text-sm font-medium">
              <i className="fas fa-shield-halved mr-3 text-yellow-500 text-lg"></i>
              <span>
                <strong className="block md:inline">Security Recommendation:</strong> You are currently using the default system password. We strongly recommend updating it for account safety.
              </span>
            </div>
            <button
              onClick={() => setActivePage('profile')}
              className="text-yellow-900 font-bold underline hover:text-yellow-700 ml-4 whitespace-nowrap text-sm"
            >
              Update Now
            </button>
          </div>
        )}
        <Topbar
          user={user}
          activePage={activePage}
          navItems={navItems}
          onLogout={onLogout}
          showDD={showDD}
          setShowDD={setShowDD}
          showNotif={showNotif}
          setShowNotif={setShowNotif}
          onMenuToggle={() => {
            if (window.innerWidth >= 1024) {
              setCollapsed(!collapsed);
            } else {
              setShowMobileSidebar(!showMobileSidebar);
            }
          }}
        />
        <main
          role="main"
          aria-label="Page content"
          className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-5 lg:p-6 bg-lightbg scroll-smooth"
          onClick={() => { setShowDD(false); setShowNotif(false); }}>
          <div className="max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
