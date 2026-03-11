import React, { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function AppLayout({ user, onLogout, activePage, setActivePage, navItems, children, disableSidebar = false, hideLogout = false }) {
  const [collapsed, setCollapsed] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showDD, setShowDD] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden relative">
      <Sidebar
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

      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <div
          className="fixed inset-0 bg-black/50 z-[40] lg:hidden backdrop-blur-sm"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden w-full">
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
        <div
          className="flex-1 overflow-y-auto p-4 md:p-6 bg-lightbg"
          onClick={() => { setShowDD(false); setShowNotif(false); }}>
          {children}
        </div>
      </div>
    </div>
  );
}
