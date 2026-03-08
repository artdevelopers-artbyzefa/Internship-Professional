import React from 'react';

export default function Sidebar({ user, collapsed, onToggle, showMobileSidebar, setShowMobileSidebar, activePage, setActivePage, navItems, onLogout, disabled }) {
  const [openMenus, setOpenMenus] = React.useState({});

  const toggleMenu = (id) => {
    setOpenMenus(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNavClick = (id, hasChildren) => {
    if (disabled) return;
    if (hasChildren) {
      toggleMenu(id);
    } else {
      setActivePage(id);
      if (window.innerWidth < 1024) setShowMobileSidebar(false);
    }
  };

  return (
    <div className={`bg-primary flex flex-col flex-shrink-0 transition-all duration-300 overflow-hidden 
      fixed lg:relative z-[50] h-full
      ${showMobileSidebar ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
      ${collapsed ? 'lg:w-[68px]' : 'lg:w-64'}`}>

      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
          <i className="fas fa-graduation-cap text-white text-sm"></i>
        </div>
        {(!collapsed || showMobileSidebar) && (
          <div className="overflow-hidden">
            <div className="text-white text-sm font-bold whitespace-nowrap">CUI DIMS</div>
            <div className="text-white/60 text-xs whitespace-nowrap leading-tight">{user.role}</div>
            {disabled && <div className="text-[#FFD700] text-[10px] font-bold tracking-wider animate-pulse pt-0.5">Account Locked</div>}
          </div>
        )}

        {/* Toggle Button for Desktop */}
        <button
          onClick={onToggle}
          className="ml-auto hidden lg:flex bg-transparent border-0 text-white/70 cursor-pointer flex-shrink-0 p-1 rounded-lg hover:bg-white/10">
          <i className={`fas ${collapsed ? 'fa-chevron-right' : 'fa-chevron-left'} text-sm`}></i>
        </button>

        {/* Close Button for Mobile */}
        <button
          onClick={() => setShowMobileSidebar(false)}
          className="ml-auto lg:hidden bg-transparent border-0 text-white/70 cursor-pointer p-1 rounded-lg hover:bg-white/10">
          <i className="fas fa-times text-lg"></i>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 sidebar-nav mt-2">
        {navItems.map(item => {
          const hasChildren = item.children && item.children.length > 0;
          const isOpen = openMenus[item.id];
          const isActive = activePage === item.id || (hasChildren && item.children.some(c => c.id === activePage));
          const isItemDisabled = disabled || item.disabled;

          return (
            <div key={item.id} className="mb-px md:mb-1">
              <div
                title={collapsed ? item.label : ''}
                onClick={() => handleNavClick(item.id, hasChildren)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                  ${isItemDisabled ? 'opacity-40 cursor-not-allowed group relative' : 'cursor-pointer'}
                  ${isActive
                    ? 'bg-secondary text-white shadow-lg shadow-blue-600/30 font-bold'
                    : 'text-white/70 ' + (!isItemDisabled ? 'hover:bg-white/10 hover:text-white' : '')}`}>
                <i className={`fas ${item.icon} text-sm w-5 text-center flex-shrink-0`}></i>
                {(!collapsed || showMobileSidebar) && (
                  <>
                    <span className="text-sm font-medium whitespace-nowrap overflow-hidden flex-1">{item.label}</span>
                    {hasChildren && (
                      <i className={`fas fa-chevron-down text-[10px] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}></i>
                    )}
                    {isItemDisabled && (
                      <i className="fas fa-lock text-[10px] text-white/40 ml-2 animate-pulse"></i>
                    )}
                  </>
                )}
              </div>

              {(!collapsed || showMobileSidebar) && hasChildren && isOpen && !isItemDisabled && (
                <div className="mt-1 ml-4 border-l border-white/10 pl-2 space-y-1 animate-in slide-in-from-top-1 duration-200">
                  {item.children.map(child => (
                    <div
                      key={child.id}
                      onClick={() => {
                        setActivePage(child.id);
                        if (window.innerWidth < 1024) setShowMobileSidebar(false);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-sm
                        ${activePage === child.id ? 'text-white font-bold bg-white/5' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                    >
                      <i className="fas fa-circle text-[4px]"></i>
                      {child.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-2 border-t border-white/10">
        <div
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-white/70 hover:bg-white/10 hover:text-white transition-all duration-200">
          <i className="fas fa-right-from-bracket text-sm w-5 text-center flex-shrink-0"></i>
          {(!collapsed || showMobileSidebar) && <span className="text-sm font-medium">Logout</span>}
        </div>
      </div>
    </div>
  );
}
