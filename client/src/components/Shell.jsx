import React, { useState, useMemo } from 'react';
import {
  Activity, BarChart3, Brain, Building2, ChevronsLeft, ChevronsRight, FileText, Gauge, LayoutDashboard,
  LogOut, Menu, RefreshCw, Search, Settings, ShieldAlert, ShieldCheck, UserCog, Users, X, Check
} from 'lucide-react';
import { initials, roleLabels, percent } from '../lib/api.js';
import { scoreOf, sourceOf } from '../lib/eeg.js';
import { useDismiss } from './ui.jsx';

const RESEARCH = ['doctor', 'admin', 'patient', 'caregiver'];
const HOSPITAL = ['admin', 'doctor', 'receptionist', 'nurse', 'lab_technician', 'pharmacist', 'billing'];

export const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, group: 'Workspace', roles: RESEARCH },
  { id: 'patients', label: 'Subjects / Patients', icon: Users, group: 'Workspace', roles: ['doctor', 'admin'] },
  { id: 'analyses', label: 'EEG Analysis', icon: Activity, group: 'Workspace', roles: RESEARCH },
  { id: 'detection', label: 'Seizure Detection', icon: ShieldAlert, group: 'Workspace', roles: RESEARCH },
  { id: 'twin', label: 'Digital Twin', icon: Brain, group: 'Workspace', roles: RESEARCH },
  { id: 'notes', label: 'Care Plan & Rx', icon: FileText, group: 'Workspace', roles: RESEARCH },
  { id: 'reports', label: 'Reports', icon: BarChart3, group: 'Insights', roles: RESEARCH },
  { id: 'performance', label: 'Model Performance', icon: Gauge, group: 'Insights', roles: RESEARCH },
  { id: 'admin', label: 'Governance & Audit', icon: ShieldCheck, group: 'Administration', roles: ['admin'] },
  { id: 'hms', label: 'Hospital Operations', icon: Building2, group: 'Administration', roles: ['admin', 'doctor'] },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'Administration', roles: Object.keys(roleLabels) }
];

/** Navigation visible to a role. Hospital-only roles land directly on Hospital operations. */
export const navFor = (role) => {
  if (!RESEARCH.includes(role) && HOSPITAL.includes(role)) {
    return [
      { id: 'hms', label: 'Hospital Operations', icon: Building2, group: 'Workspace', roles: [role] },
      NAV.find((n) => n.id === 'settings')
    ];
  }
  return NAV.filter((n) => n.roles.includes(role));
};

export function Sidebar({
  role,
  items,
  active,
  tab,
  onNavigate,
  onSelect,
  user,
  collapsed,
  onToggleCollapse,
  open,
  mobileOpen,
  onClose,
  onCloseMobile,
  onLogout
}) {
  const navItems = items || navFor(role || user?.role || 'doctor');
  const activeId = active ?? tab;
  const go = onNavigate || onSelect;
  const isOpen = open ?? mobileOpen;
  const closeDrawer = onClose || onCloseMobile;

  const groups = navItems.reduce((acc, item) => {
    if (!item) return acc;
    (acc[item.group] ||= []).push(item);
    return acc;
  }, {});

  return (
    <>
      {isOpen && <div className="scrim" onClick={closeDrawer} aria-hidden="true" />}
      <aside className={`sidebar${isOpen ? ' is-open' : ''}`} aria-label="Primary">
        <div className="sb-brand">
          <button type="button" className="sb-brand-btn" onClick={() => { go('overview'); closeDrawer?.(); }} aria-label="NeuroTwin home">
            <span className="sb-logo"><Brain size={19} /></span>
            <span className="sb-brand-text">NeuroTwin<small>EEG Digital Twin</small></span>
          </button>
          <button type="button" className="btn btn-ghost btn-icon btn-sm sb-collapse" onClick={onToggleCollapse} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed}>
            {collapsed ? <ChevronsRight size={17} /> : <ChevronsLeft size={17} />}
          </button>
          <button type="button" className="btn btn-ghost btn-icon btn-sm menu-btn" onClick={closeDrawer} aria-label="Close navigation" style={{ marginLeft: 'auto' }}><X size={18} /></button>
        </div>
        <nav className="sb-nav" aria-label="Main">
          {Object.entries(groups).map(([group, list]) => (
            <React.Fragment key={group}>
              <p className="sb-section">{group}</p>
              {list.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`sb-link${activeId === item.id ? ' is-active' : ''}`}
                    aria-current={activeId === item.id ? 'page' : undefined}
                    data-tip={collapsed ? item.label : undefined}
                    onClick={() => { go(item.id); closeDrawer?.(); }}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </nav>
        <div className="sb-footer">
          <div className="sb-note"><ShieldCheck size={14} /><span>Research prototype. Not a diagnostic device.</span></div>
          <div className="sb-user">
            <span className="avatar">{initials(user?.name)}</span>
            <span className="sb-user-text"><b>{user?.name}</b><small>{roleLabels[user?.role] || user?.role}</small></span>
            <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onLogout} aria-label="Sign out" data-tip="Sign out"><LogOut size={17} /></button>
          </div>
        </div>
      </aside>
    </>
  );
}

const SEARCHABLE = ['doctor', 'admin'];

export function Topbar({
  item,
  tab,
  user,
  modelState,
  modelStatus,
  patients = [],
  analyses = [],
  onOpenNav,
  onOpenMobile,
  onRefresh,
  refreshing,
  onNavigate,
  onSelectPatient,
  onSelectAnalysis,
  onSwitchRole,
  switchingRole,
  onLogout
}) {
  const [menu, setMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');

  const ref = useDismiss(menu, () => setMenu(false));
  const searchRef = useDismiss(searchOpen, () => setSearchOpen(false));

  const currentItem = item || NAV.find((n) => n.id === tab) || NAV[0];
  const stateStr = modelState || modelStatus?.model_state || 'ready';
  const ready = stateStr === 'ready';
  const checking = stateStr === 'checking';
  const statusText = ready ? 'Model ready' : checking ? 'Checking model' : 'Model offline';

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return { pts: [], recs: [] };
    const pts = patients.filter((p) => `${p.fullName} ${p.mrn}`.toLowerCase().includes(term)).slice(0, 4);
    const recs = analyses.filter((a) => `${sourceOf(a)} ${a.label || ''}`.toLowerCase().includes(term)).slice(0, 4);
    return { pts, recs };
  }, [q, patients, analyses]);

  return (
    <header className="topbar">
      <button type="button" className="btn btn-ghost btn-icon menu-btn" onClick={onOpenNav || onOpenMobile} aria-label="Open navigation"><Menu size={20} /></button>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li>NeuroTwin</li>
          {currentItem?.group && currentItem.id !== 'overview' && <li>{currentItem.group}</li>}
          <li aria-current="page">{currentItem?.label}</li>
        </ol>
      </nav>
      {SEARCHABLE.includes(user?.role) && (
        <div className="menu-wrap topbar-search" ref={searchRef}>
          <div className="search" role="search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={q}
              onFocus={() => setSearchOpen(true)}
              onChange={(e) => { setQ(e.target.value); setSearchOpen(true); }}
              placeholder="Search recordings, subjects, MRN…"
              aria-label="Search recordings and subjects"
            />
          </div>
          {searchOpen && q.trim() && (
            <div className="menu" style={{ left: 0, right: 0, minWidth: 300 }}>
              {matches.pts.length > 0 && (
                <>
                  <p className="menu-label">Subjects</p>
                  {matches.pts.map((p) => (
                    <button
                      key={p._id}
                      type="button"
                      className="menu-item"
                      onClick={() => {
                        onSelectPatient?.(p._id);
                        onNavigate?.('twin');
                        setSearchOpen(false);
                        setQ('');
                      }}
                    >
                      <Users size={15} />
                      <span>{p.fullName}</span>
                      <span className="muted mono" style={{ marginLeft: 'auto', fontSize: 12 }}>{p.mrn}</span>
                    </button>
                  ))}
                </>
              )}
              {matches.recs.length > 0 && (
                <>
                  <p className="menu-label">EEG Analyses</p>
                  {matches.recs.map((a) => (
                    <button
                      key={a._id}
                      type="button"
                      className="menu-item"
                      onClick={() => {
                        onSelectAnalysis?.(a);
                        setSearchOpen(false);
                        setQ('');
                      }}
                    >
                      <Activity size={15} />
                      <span>{sourceOf(a)}</span>
                      <span className="muted mono" style={{ marginLeft: 'auto', fontSize: 12 }}>{percent(scoreOf(a), 0)}</span>
                    </button>
                  ))}
                </>
              )}
              {!matches.pts.length && !matches.recs.length && (
                <div style={{ padding: '10px 12px', fontSize: 13 }} className="muted">
                  No matching subjects or EEG recordings.
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <div className="topbar-end">
        <span className={`status-pill ${ready ? 'is-ready' : checking ? '' : 'is-down'}`} role="status" title="EEG model service status">
          <i className="dot" /><span className="label">{statusText}</span>
        </span>
        <button type="button" className="btn btn-ghost btn-icon" onClick={onRefresh} disabled={refreshing} aria-label="Refresh workspace data" data-tip="Refresh">
          <RefreshCw size={17} className={refreshing ? 'spin' : ''} />
        </button>
        <div className="menu-wrap" ref={ref}>
          <button type="button" className="profile-btn" onClick={() => setMenu((v) => !v)} aria-haspopup="menu" aria-expanded={menu} aria-label="Account menu">
            <span className="avatar">{initials(user?.name)}</span>
            <span className="profile-name" style={{ fontSize: 13, fontWeight: 600 }}>{user?.name?.split(' ').slice(-1)[0]}</span>
          </button>
          {menu && (
            <div className="menu" role="menu">
              <div style={{ padding: '8px 10px 6px' }}>
                <b style={{ display: 'block' }}>{user?.name}</b>
                <span className="muted" style={{ fontSize: 12.5 }}>{roleLabels[user?.role] || user?.role}{user?.email ? ` · ${user.email}` : ''}</span>
              </div>
              <div className="menu-sep" />
              <button type="button" className="menu-item" role="menuitem" onClick={() => { setMenu(false); onNavigate?.('settings'); }}><Settings size={16} /> Settings</button>
              <div className="menu-sep" />
              <p className="menu-label">Switch demo account</p>
              {['doctor', 'patient', 'caregiver', 'admin'].map((roleKey) => (
                <button
                  key={roleKey}
                  type="button"
                  className="menu-item"
                  role="menuitem"
                  disabled={user?.role === roleKey || Boolean(switchingRole)}
                  onClick={() => {
                    setMenu(false);
                    onSwitchRole?.({ key: roleKey, identifier: roleKey, password: 'DemoPass123!' });
                  }}
                >
                  <UserCog size={16} /> {roleLabels[roleKey]} {user?.role === roleKey && <Check size={15} style={{ marginLeft: 'auto' }} />}
                </button>
              ))}
              <div className="menu-sep" />
              <button type="button" className="menu-item is-danger" role="menuitem" onClick={onLogout}><LogOut size={16} /> Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
