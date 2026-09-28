import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Bell,
  ListCheck,
  Mail,
  User,
  Settings,
  CreditCard,
  Lock,
  LogOut,
  ChevronDown,
} from 'lucide-react';

export default function AppHeader({
  onToggleSidebar,
  activeNav,
  onSelectNav,
  user,
  onLogout,
}) {
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setAvatarMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <header className="app-header">
      {/* Left Area: Hamburger + Quick Nav Links */}
      <div className="header-left">
        <button
          type="button"
          className="header-toggler-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle Sidebar"
        >
          <Menu size={20} />
        </button>

        <nav className="header-nav-links">
          <button
            type="button"
            className={`header-nav-link ${activeNav === 'dashboard' ? 'active' : ''}`}
            onClick={() => onSelectNav('dashboard')}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={`header-nav-link ${activeNav === 'users' ? 'active' : ''}`}
            onClick={() => onSelectNav('users')}
          >
            Users
          </button>
          <button
            type="button"
            className={`header-nav-link ${activeNav === 'settings' ? 'active' : ''}`}
            onClick={() => onSelectNav('settings')}
          >
            Settings
          </button>
        </nav>
      </div>

      {/* Right Area: Icon Badges + Avatar Dropdown */}
      <div className="header-right">
        {/* Notification Bell */}
        <button type="button" className="header-icon-btn" title="Notifications">
          <Bell size={18} />
          <span className="header-badge badge-danger">5</span>
        </button>

        {/* Task List */}
        <button type="button" className="header-icon-btn" title="Tasks">
          <ListCheck size={18} />
          <span className="header-badge badge-warning">5</span>
        </button>

        {/* Messages */}
        <button type="button" className="header-icon-btn" title="Messages">
          <Mail size={18} />
          <span className="header-badge badge-info">7</span>
        </button>

        {/* User Avatar + Dropdown */}
        <div className="header-user-dropdown" ref={dropdownRef}>
          <button
            type="button"
            className="header-avatar-btn"
            onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
          >
            <div className="header-avatar-img">
              {user?.fullName ? user.fullName[0].toUpperCase() : 'A'}
            </div>
            <span className="avatar-status-dot" />
          </button>

          {avatarMenuOpen && (
            <div className="avatar-dropdown-menu">
              <div className="dropdown-header">
                <strong>{user?.fullName || 'Administrator'}</strong>
                <span className="dropdown-user-role">{user?.role || 'Admin'}</span>
              </div>
              <div className="dropdown-divider" />
              <button
                type="button"
                className="dropdown-item"
                onClick={() => { setAvatarMenuOpen(false); onSelectNav('users'); }}
              >
                <User size={16} /> Profile
              </button>
              <button
                type="button"
                className="dropdown-item"
                onClick={() => { setAvatarMenuOpen(false); onSelectNav('settings'); }}
              >
                <Settings size={16} /> Settings
              </button>
              <button
                type="button"
                className="dropdown-item"
                onClick={() => { setAvatarMenuOpen(false); onSelectNav('invoices'); }}
              >
                <CreditCard size={16} /> Payments
              </button>
              <div className="dropdown-divider" />
              <button
                type="button"
                className="dropdown-item"
                onClick={() => setAvatarMenuOpen(false)}
              >
                <Lock size={16} /> Lock Account
              </button>
              <button
                type="button"
                className="dropdown-item text-danger"
                onClick={() => { setAvatarMenuOpen(false); onLogout(); }}
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
