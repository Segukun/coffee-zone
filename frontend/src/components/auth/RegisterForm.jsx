import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthField from './AuthField.jsx';
import { validateRegister } from '../../utils/authValidation.js';

export default function RegisterForm() {
  const [values, setValues] = useState({ name: '', username: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');

  function handleChange(event) {
    const { name, value } = event.target;
    setValues({ ...values, [name]: value });
    setErrors({ ...errors, [name]: '', ...(name === 'password' ? { confirmPassword: '' } : {}) });
    setNotice('');
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateRegister(values);
    setErrors(nextErrors);
    setNotice('');

    if (Object.keys(nextErrors).length) {
      event.currentTarget.elements.namedItem(Object.keys(nextErrors)[0]).focus();
      return;
    }

    setNotice('Your form is valid, but no account has been created. The authentication API still needs to be connected.');
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate aria-label="Sign Up">
      <AuthField
        id="register-name"
        name="name"
        label="Name"
        autoComplete="name"
        placeholder="Alex Morgan"
        value={values.name}
        onChange={handleChange}
        error={errors.name}
      />
      <AuthField
        id="register-username"
        name="username"
        label="Username"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        prefix="@"
        placeholder="alexcodes"
        value={values.username}
        onChange={handleChange}
        error={errors.username}
      />
      <AuthField
        id="register-email"
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="alex.morgan@email.com"
        value={values.email}
        onChange={handleChange}
        error={errors.email}
      />
      <AuthField
        id="register-password"
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        placeholder="Create a password"
        hint="Use at least 8 characters, including a letter and a number."
        value={values.password}
        onChange={handleChange}
        error={errors.password}
      />
      <AuthField
        id="register-confirm-password"
        name="confirmPassword"
        label="Confirm Password"
        type="password"
        autoComplete="new-password"
        placeholder="Confirm your password"
        value={values.confirmPassword}
        onChange={handleChange}
        error={errors.confirmPassword}
      />
      <button className="auth-submit" type="submit">Sign Up</button>
      <p className="auth-form-notice" role="status">{notice}</p>
      <p className="auth-legal-note">Terms of Service and Privacy Policy will be available before registration opens.</p>
      <p className="auth-switch">Already have an account? <Link to="/login">Login</Link></p>
      <p className="auth-pending-note">Backend connection pending. This form does not create an account yet.</p>
    </form>
  );
}
