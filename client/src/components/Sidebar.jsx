import React from 'react';
import {
  Brain, LayoutDashboard, Users, Activity, FileText,
  ShieldCheck, ClipboardList, LogOut, ChevronLeft, ChevronRight,
  TrendingUp, BarChart3, Award, Sparkles, X
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  onSelectTab,
  user,
  onLogout,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile
}) {
  const role = user?.role || 'doctor';
  const isClinician = ['doctor', 'admin'].includes(role);
  const isResearchWorkspace = ['doctor', 'admin', 'patient', 'caregiver'].includes(role);
  const isHospitalRole = ['admin', 'doctor', 'receptionist', 'nurse', 'lab_technician', 'pharmacist', 'billing'].includes(role);

  // Navigation Items with RBAC
  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, roles: ['doctor', 'admin', 'patient', 'caregiver'] },
    ...(isClinician ? [{ id: 'patients', label: 'Subjects & Patients', icon: Users, roles: ['doctor', 'admin'] }] : []),
    ...(isResearchWorkspace ? [
      { id: 'analyses', label: 'EEG Analyses & Alerts', icon: Activity, roles: ['doctor', 'admin', 'patient', 'caregiver'] },
      { id: 'twin', label: 'Digital Twin', icon: Brain, roles: ['doctor', 'admin', 'patient', 'caregiver'] },
      { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, roles: ['doctor', 'admin', 'patient', 'caregiver'] },
      { id: 'model', label: 'Model Benchmarks', icon: Award, roles: ['doctor', 'admin', 'patient', 'caregiver'] },
      { id: 'notes', label: 'Treatment & Regimen', icon: FileText, roles: ['doctor', 'admin', 'patient', 'caregiver'] }
    ] : []),
    ...(role === 'admin' ? [{ id: 'admin', label: 'Governance & Audit', icon: ShieldCheck, roles: ['admin'] }] : []),
    ...(isHospitalRole ? [{ id: 'hms', label: 'Hospital Operations', icon: ClipboardList, roles: ['admin', 'doctor', 'receptionist', 'nurse', 'lab_technician', 'pharmacist', 'billing'] }] : [])
  ];

  return (
    <>
      {/* Mobile Scrim Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 95,
            backdropFilter: 'blur(4px)'
          }}
          aria-hidden="true"
        />
      )}

      <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div>
          {/* Sidebar Header & Brand */}
          <div className="sidebar-header">
            <button className="brand-link" onClick={() => onSelectTab('overview')} title="NeuroTwin BCI Workspace">
              <div className="brand-symbol">
                <Brain size={20} />
              </div>
              {!collapsed && (
                <div className="brand-text">
                  <h2>NeuroTwin</h2>
                  <span>BCI DIGITAL TWIN</span>
                </div>
              )}
            </button>

            {/* Desktop Collapse Toggle / Mobile Close */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button
                type="button"
                className="sidebar-toggle-btn"
                onClick={mobileOpen ? onCloseMobile : onToggleCollapse}
                title={mobileOpen ? "Close menu" : (collapsed ? "Expand sidebar" : "Collapse sidebar")}
                aria-label="Toggle navigation drawer"
              >
                {mobileOpen ? <X size={15} /> : (collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />)}
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="sidebar-nav-section">
            {!collapsed && <span className="nav-section-title">NAVIGATION</span>}

            {navigationItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    onSelectTab(item.id);
                    if (mobileOpen) onCloseMobile();
                  }}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={18} style={{ flexShrink: 0 }} />
                  {!collapsed && <span>{item.label}</span>}
                  {isActive && <div className="active-pill" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer & User Profile */}
        <div className="sidebar-footer">
          <div className="sidebar-profile">
            <div className="profile-avatar" title={user?.name || 'User'}>
              {user?.name?.[0] || 'U'}
            </div>
            {!collapsed && (
              <div className="profile-info">
                <b>{user?.name || 'Authorized User'}</b>
                <small>{user?.role || 'Clinician'}</small>
              </div>
            )}
            <button
              type="button"
              className="logout-icon-btn"
              onClick={onLogout}
              title="Sign out of workspace"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

