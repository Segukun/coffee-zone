import Icon from '../components/common/Icon.jsx';
import LoginForm from '../components/auth/LoginForm.jsx';

export default function LoginPage() {
  return (
    <>
      <h1 className="auth-title">Welcome back.</h1>
      <p className="auth-description">Your environment is ready.</p>
      <LoginForm />
    </>
  );
}
