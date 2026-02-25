import React from 'react';

export default function Sidebar({ user, collapsed, onToggle, activePage, setActivePage, navItems, onLogout, disabled }) {
  const [openMenus, setOpenMenus] = React.useState({});

  const toggleMenu = (id) => {
    setOpenMenus(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className={`bg-primary flex flex-col flex-shrink-0 transition-all duration-300 overflow-hidden ${collapsed ? 'w-[68px]' : 'w-64'}`}>
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
          <i className="fas fa-graduation-cap text-white text-sm"></i>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-white text-sm font-bold whitespace-nowrap">CUI DIMS</div>
            <div className="text-white/60 text-xs whitespace-nowrap leading-tight">{user.role}</div>
            {disabled && <div className="text-[#FFD700] text-[10px] font-bold uppercase tracking-wider animate-pulse pt-0.5">Account Locked</div>}
          </div>
        )}
        <button
          onClick={onToggle}
          className="ml-auto bg-transparent border-0 text-white/70 cursor-pointer flex-shrink-0 p-1">
          <i className={`fas ${collapsed ? 'fa-chevron-right' : 'fa-chevron-left'} text-sm`}></i>
        </button>
      </div>

      <nav className={`flex-1 overflow-y-auto p-2 sidebar-nav ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        {navItems.map(item => {
          const hasChildren = item.children && item.children.length > 0;
          const isOpen = openMenus[item.id];
          const isActive = activePage === item.id || (hasChildren && item.children.some(c => c.id === activePage));

          return (
            <div key={item.id} className="mb-1">
              <div
                title={collapsed ? item.label : ''}
                onClick={() => {
                  if (disabled) return;
                  if (hasChildren) toggleMenu(item.id);
                  else setActivePage(item.id);
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                  ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                  ${isActive
                    ? 'bg-secondary text-white shadow-lg shadow-blue-600/30'
                    : 'text-white/70 ' + (!disabled ? 'hover:bg-white/10 hover:text-white' : '')}`}>
                <i className={`fas ${item.icon} text-sm w-5 text-center flex-shrink-0`}></i>
                {!collapsed && (
                  <>
                    <span className="text-sm font-medium whitespace-nowrap overflow-hidden flex-1">{item.label}</span>
                    {hasChildren && (
                      <i className={`fas fa-chevron-down text-[10px] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}></i>
                    )}
                  </>
                )}
              </div>
              
              {!collapsed && hasChildren && isOpen && (
                <div className="mt-1 ml-4 border-l border-white/10 pl-2 space-y-1 animate-in slide-in-from-top-1 duration-200">
                  {item.children.map(child => (
                    <div
                      key={child.id}
                      onClick={() => setActivePage(child.id)}
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
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </div>
      </div>
    </div>
  );
}
