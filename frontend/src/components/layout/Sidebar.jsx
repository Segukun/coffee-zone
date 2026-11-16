import { Link, NavLink } from 'react-router-dom';
import { IoHomeOutline, IoSettingsOutline } from 'react-icons/io5';
import { CgProfile } from 'react-icons/cg';
import Avatar from '../common/Avatar.jsx';
import BrandLogo from '../common/BrandLogo.jsx';

const navigationItems = [
  { to: '/', label: 'Home', icon: IoHomeOutline },
  { to: '/profile', label: 'Profile', icon: CgProfile },
  { to: '/settings', label: 'Settings', icon: IoSettingsOutline },
];

export default function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Main sidebar">
      <Link className="sidebar-brand" to="/" aria-label="Coffee Zone · Home"><BrandLogo /></Link>
      <nav className="main-nav" aria-label="Main navigation">
        {navigationItems.map(({ to, label, icon: NavigationIcon }) => (
          <NavLink key={to} to={to} end className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>
            <NavigationIcon className="icon" size={24} aria-hidden="true" focusable="false" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="user-placeholder">
          <Avatar initials="CZ" accent />
          <div><strong>Your space</strong><span>User · coming soon</span></div>
        </div>
        <p className="sidebar-copyright">Coffee Zone © 2026</p>
      </div>
    </aside>
  );
}
