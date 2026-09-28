import React, { useState } from 'react';
import { navItems } from '../_nav';
import { ChevronLeft, ChevronRight, ChevronDown, Sparkles } from 'lucide-react';

export default function AppSidebar({
  activeNav,
  onSelectNav,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) {
  const [openGroups, setOpenGroups] = useState({
    base: false,
    buttons: false,
    forms: false,
    icons: false,
    notifications: false,
    pages: false,
  });

  const toggleGroup = (groupId) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleItemClick = (id) => {
    onSelectNav(id);
    if (mobileOpen) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={onCloseMobile} />
      )}

      <aside className={`app-sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-mobile-show' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-logo-circle">
            <span className="brand-c-icon">C</span>
          </div>
          {!collapsed && (
            <div className="brand-text-wrapper">
              <span className="brand-title">CoreUI</span>
              <span className="brand-badge-pro">HOTEL</span>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <div className="sidebar-nav-container">
          <ul className="sidebar-nav">
            {navItems.map((item, idx) => {
              // 1. Section Title
              if (item.type === 'title') {
                if (collapsed) return <li key={idx} className="nav-divider" />;
                return (
                  <li key={idx} className="nav-title">
                    {item.name}
                  </li>
                );
              }

              // 2. Expandable Submenu Group
              if (item.type === 'group') {
                const IconComponent = item.icon;
                const isGroupOpen = !!openGroups[item.id];
                const isChildActive = item.items.some(child => child.id === activeNav);

                return (
                  <li key={idx} className={`nav-group ${isGroupOpen ? 'show' : ''} ${isChildActive ? 'child-active' : ''}`}>
                    <button
                      type="button"
                      className="nav-group-toggle"
                      onClick={() => toggleGroup(item.id)}
                      title={collapsed ? item.name : undefined}
                    >
                      {IconComponent && <IconComponent className="nav-icon" size={18} />}
                      {!collapsed && (
                        <>
                          <span className="nav-text">{item.name}</span>
                          <ChevronDown className={`nav-group-arrow ${isGroupOpen ? 'open' : ''}`} size={16} />
                        </>
                      )}
                    </button>

                    {!collapsed && isGroupOpen && (
                      <ul className="nav-group-items">
                        {item.items.map((child) => (
                          <li key={child.id} className="nav-group-item">
                            <button
                              type="button"
                              className={`nav-link-sub ${activeNav === child.id ? 'active' : ''}`}
                              onClick={() => handleItemClick(child.id)}
                            >
                              <span className="sub-bullet">•</span>
                              {child.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              }

              // 3. Regular Menu Item
              const IconComponent = item.icon;
              const isActive = activeNav === item.id;

              return (
                <li key={idx} className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => handleItemClick(item.id)}
                    title={collapsed ? item.name : undefined}
                  >
                    {IconComponent && <IconComponent className="nav-icon" size={18} />}
                    {!collapsed && (
                      <>
                        <span className="nav-text">{item.name}</span>
                        {item.badge && (
                          <span className={`nav-badge badge-${item.badge.color}`}>
                            {item.badge.text}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer Collapse Button */}
        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-toggler"
            onClick={onToggleCollapse}
            aria-label="Toggle Sidebar"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </aside>
    </>
  );
}
