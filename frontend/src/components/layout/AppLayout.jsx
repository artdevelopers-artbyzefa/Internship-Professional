import React, { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function AppLayout({ user, onLogout, activePage, setActivePage, navItems, children, disableSidebar = false }) {
  const [collapsed, setCollapsed] = useState(false);
  const [showDD, setShowDD] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        user={user}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        activePage={activePage}
        setActivePage={setActivePage}
        navItems={navItems}
        onLogout={onLogout}
        disabled={disableSidebar}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          user={user}
          activePage={activePage}
          navItems={navItems}
          onLogout={onLogout}
          showDD={showDD}
          setShowDD={setShowDD}
          showNotif={showNotif}
          setShowNotif={setShowNotif}
        />
        <div
          className="flex-1 overflow-y-auto p-6 bg-lightbg"
          onClick={() => { setShowDD(false); setShowNotif(false); }}>
          {children}
        </div>
      </div>
    </div>
  );
}
