import { Link, NavLink } from 'react-router-dom';
import Avatar from '../common/Avatar.jsx';
import BrandLogo from '../common/BrandLogo.jsx';
import Icon from '../common/Icon.jsx';

const navigationItems = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/profile', label: 'Profile', icon: 'profile' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Main sidebar">
      <Link className="sidebar-brand" to="/" aria-label="Coffee Zone · Home"><BrandLogo /></Link>
      <nav className="main-nav" aria-label="Main navigation">
        {navigationItems.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} end className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>
            <Icon name={icon} />
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
