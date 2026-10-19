import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, Users, CheckSquare, Menu, X, Sparkles } from 'lucide-react';

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="app-header">
      <div className="header-inner container">
        {/* Navigation Links */}
        <nav className="nav-links desktop-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/employees"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Users size={16} />
            <span>Employees</span>
          </NavLink>
          <NavLink
            to="/tasks"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <CheckSquare size={16} />
            <span>Tasks</span>
          </NavLink>
        </nav>

        {/* Center / Right Header Title */}
        <div className="header-brand">
          <div className="brand-badge">
            <span className="brand-dot"></span>
            <span className="brand-text">Roots Media Marketing</span>
          </div>
          <span className="header-subtext">MERN stack developer practical task</span>
        </div>

        {/* Mobile menu button */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer animate-fade-in">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/employees"
            className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <Users size={18} />
            <span>Employees</span>
          </NavLink>
          <NavLink
            to="/tasks"
            className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <CheckSquare size={18} />
            <span>Tasks</span>
          </NavLink>
        </div>
      )}
    </header>
  );
};
