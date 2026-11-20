import { useState } from 'react';
import Icon from '../common/Icon.jsx';

export default function AuthField({ id, label, type = 'text', error, hint, prefix, ...inputProps }) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPassword = type === 'password';
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ');

  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className={`auth-input-wrapper${prefix ? ' has-prefix' : ''}`}>
        {prefix && <span className="auth-input-prefix" aria-hidden="true">{prefix}</span>}
        <input
          {...inputProps}
          id={id}
          type={isPassword && isPasswordVisible ? 'text' : type}
          className={`auth-input${isPassword ? ' has-toggle' : ''}`}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy || undefined}
          required
        />
        {isPassword && (
          <button
            className="password-toggle"
            type="button"
            aria-label={`${isPasswordVisible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
            aria-controls={id}
            aria-pressed={isPasswordVisible}
            onClick={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            <Icon name={isPasswordVisible ? 'eye' : 'eyeOff'} />
          </button>
        )}
      </div>
      {hint && <p className="auth-field-hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="auth-field-error" id={`${id}-error`}>{error}</p>}
    </div>
  );
}
