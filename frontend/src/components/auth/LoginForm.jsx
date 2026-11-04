import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthField from './AuthField.jsx';
import { validateLogin } from '../../utils/authValidation.js';

export default function LoginForm() {
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');

  function handleChange(event) {
    const { name, value } = event.target;
    setValues({ ...values, [name]: value });
    setErrors({ ...errors, [name]: '' });
    setNotice('');
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateLogin(values);
    setErrors(nextErrors);
    setNotice('');

    if (Object.keys(nextErrors).length) {
      event.currentTarget.elements.namedItem(Object.keys(nextErrors)[0]).focus();
      return;
    }

    setNotice('Your form is valid, but login is not available yet. The authentication API still needs to be connected.');
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate aria-label="Login">
      <AuthField
        id="login-email"
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={values.email}
        onChange={handleChange}
        error={errors.email}
      />
      <AuthField
        id="login-password"
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        placeholder="Enter your password"
        value={values.password}
        onChange={handleChange}
        error={errors.password}
      />
      <div className="auth-options">
        <label className="remember-option" title="Persistent sessions are not available yet.">
          <input type="checkbox" disabled />
          Remember me
        </label>
        <button className="auth-text-button" type="button" disabled title="Password recovery is not available yet.">
          Forgot password?
        </button>
      </div>
      <button className="auth-submit" type="submit">Login</button>
      <p className="auth-form-notice" role="status">{notice}</p>
      <p className="auth-switch">Don't have an account? <Link to="/register">Sign Up</Link></p>
      <p className="auth-pending-note">Backend connection pending. Login, remembered sessions and password recovery are not available yet.</p>
    </form>
  );
}
