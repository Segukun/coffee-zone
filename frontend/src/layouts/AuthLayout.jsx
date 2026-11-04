import { Link, Outlet } from 'react-router-dom';
import BrandLogo from '../components/common/BrandLogo.jsx';

export default function AuthLayout() {
  return (
    <div className="auth-layout">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="auth-header">
        <Link to="/" aria-label="Coffee Zone · Home"><BrandLogo /></Link>
        <nav className="auth-nav" aria-label="Coffee Zone account access">
          <Link to="/login">Login</Link>
          <Link className="outline-link" to="/register">Sign Up</Link>
        </nav>
      </header>
      <main className="auth-content" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="auth-footer">Coffee Zone © 2026</footer>
    </div>
  );
}
