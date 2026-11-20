import { Link, Outlet, useMatch } from 'react-router-dom';
import BrandLogo from '../components/common/BrandLogo.jsx';

export default function AuthLayout() {
  const isRegister = Boolean(useMatch('/register'));

  return (
    <div className="auth-layout">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="auth-header">
        <Link to="/" aria-label="Coffee Zone · Home"><BrandLogo /></Link>
        <nav className="auth-nav" aria-label="Coffee Zone account access">
          <span className="auth-nav-prompt">{isRegister ? 'Already have an account?' : 'New to Coffee Zone?'}</span>
          <Link className="outline-link" to={isRegister ? '/login' : '/register'}>
            {isRegister ? 'Login' : 'Sign Up'}
          </Link>
        </nav>
      </header>
      <main className="auth-content" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="auth-footer">
        <span>Coffee Zone © 2026</span>
        <span title="Legal documents are not available yet.">Privacy Policy · Terms of Service</span>
      </footer>
    </div>
  );
}
