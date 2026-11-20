import { useId, useState } from 'react';
import PageHeader from '../components/layout/PageHeader.jsx';
import AuthField from '../components/auth/AuthField.jsx';
import { validatePasswordChange } from '../utils/authValidation.js';

const tabs = ['appearance', 'password'];
const themeOptions = [
  { value: 'light', label: 'Light Mode', description: 'Bright surfaces for daytime reading.' },
  { value: 'dark', label: 'Dark Mode', description: 'Dark surfaces for low-light reading.' },
];
const fontSizeOptions = [
  { value: 'small', label: 'Small', description: 'Compact text for dense browsing.' },
  { value: 'medium', label: 'Medium', description: 'Balanced text for everyday reading.' },
  { value: 'large', label: 'Large', description: 'Larger text for easier reading.' },
];

function PasswordForm() {
  const formId = useId();
  const [values, setValues] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');
  const [resetCount, setResetCount] = useState(0);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues(current => ({ ...current, [name]: value }));
    setErrors(current => ({ ...current, [name]: '', ...(name === 'newPassword' ? { confirmPassword: '' } : {}) }));
    setNotice('');
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validatePasswordChange(values);
    setErrors(nextErrors);
    setNotice('');
    const firstInvalidField = Object.keys(nextErrors)[0];
    if (firstInvalidField) {
      event.currentTarget.elements.namedItem(firstInvalidField).focus();
      return;
    }

    setNotice('No password was changed. Your current password has not been verified; the authentication API is not connected yet.');
  }

  function handleReset() {
    setValues({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setErrors({});
    setNotice('');
    setResetCount(current => current + 1);
  }

  return (
    <form className="settings-form" onSubmit={handleSubmit} onReset={handleReset} noValidate aria-label="Change password">
      <div className="settings-password-fields" key={resetCount}>
        <AuthField
          id={`${formId}-current-password`}
          name="currentPassword"
          label="Current Password"
          type="password"
          autoComplete="current-password"
          value={values.currentPassword}
          onChange={handleChange}
          error={errors.currentPassword}
        />
        <AuthField
          id={`${formId}-new-password`}
          name="newPassword"
          label="New Password"
          type="password"
          autoComplete="new-password"
          hint="Use at least 8 characters, including a letter and a number."
          value={values.newPassword}
          onChange={handleChange}
          error={errors.newPassword}
        />
        <AuthField
          id={`${formId}-confirm-password`}
          name="confirmPassword"
          label="Confirm New Password"
          type="password"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
        />
      </div>
      <p className="settings-preview-note">Design preview · password changes are not connected yet. Leaving this tab clears these fields.</p>
      <p className="settings-notice" role="status">{notice}</p>
      <footer className="settings-actions">
        <button className="settings-secondary" type="reset">Cancel</button>
        <button className="settings-submit" type="submit">Change Password</button>
      </footer>
    </form>
  );
}

export default function SettingsPage() {
  const settingsId = useId();
  const [activeTab, setActiveTab] = useState('appearance');
  const [preferences, setPreferences] = useState(() => ({ theme: document.documentElement.dataset.theme, fontSize: document.documentElement.dataset.fontSize }));
  const [notices, setNotices] = useState({ theme: '', fontSize: '' });

  function handleTabKeyDown(event) {
    const index = tabs.indexOf(activeTab);
    let nextIndex;
    switch (event.key) {
      case 'ArrowRight': nextIndex = (index + 1) % tabs.length; break;
      case 'ArrowLeft': nextIndex = (index + tabs.length - 1) % tabs.length; break;
      case 'Home': nextIndex = 0; break;
      case 'End': nextIndex = tabs.length - 1; break;
      default: return;
    }
    event.preventDefault();
    const nextTab = tabs[nextIndex];
    setActiveTab(nextTab);
    document.getElementById(`${settingsId}-${nextTab}-tab`).focus();
  }

  function handlePreferenceChange(event) {
    const { name, value } = event.target;
    setPreferences(current => ({ ...current, [name]: value }));
    const storageKey = name === 'theme' ? 'coffee-zone-theme' : 'coffee-zone-font-size';
    const label = name === 'theme' ? 'Theme' : 'Text size';

    document.documentElement.dataset[name] = value;
    try {
      localStorage.setItem(storageKey, value);
      setNotices(current => ({ ...current, [name]: `${label} applied and saved in this browser.` }));
    } catch {
      setNotices(current => ({ ...current, [name]: `${label} applied for this visit, but browser storage is unavailable. It could not be saved for your next visit.` }));
    }
  }

  return (
    <>
      <PageHeader title="Settings" />
      <div className="settings-content">
        <div className="settings-tabs" role="tablist" aria-label="Settings sections">
          {tabs.map(tab => (
            <button
              key={tab}
              id={`${settingsId}-${tab}-tab`}
              className="settings-tab"
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`${settingsId}-${tab}-panel`}
              tabIndex={activeTab === tab ? 0 : -1}
              onClick={() => setActiveTab(tab)}
              onKeyDown={handleTabKeyDown}
            >
              {tab === 'appearance' ? 'Appearance' : 'Password'}
            </button>
          ))}
        </div>
        <section id={`${settingsId}-appearance-panel`} className="settings-panel" role="tabpanel" aria-labelledby={`${settingsId}-appearance-tab`} tabIndex={0} hidden={activeTab !== 'appearance'}>
          <header className="settings-heading">
            <h2>Interface Preferences</h2>
            <p>Choose how Coffee Zone looks and reads on your screen.</p>
          </header>
          <div className="settings-form">
            <fieldset className="settings-group">
              <legend>Appearance</legend>
              <p id={`${settingsId}-theme-description`}>Select the theme that works best for your reading environment.</p>
              <div className="settings-options settings-theme-options">
                {themeOptions.map(option => (
                  <label className="settings-choice" key={option.value}>
                    <input type="radio" name="theme" value={option.value} checked={preferences.theme === option.value} onChange={handlePreferenceChange} aria-describedby={`${settingsId}-theme-description`} />
                    <span className="settings-choice-label">{option.label}</span>
                    <span className="settings-choice-description">{preferences.theme === option.value ? 'Currently selected' : option.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="settings-group">
              <legend>Font Size</legend>
              <p id={`${settingsId}-font-description`}>Adjust text size for comfort while browsing and reading.</p>
              <div className="settings-options settings-font-options">
                {fontSizeOptions.map(option => (
                  <label className="settings-choice" key={option.value}>
                    <input type="radio" name="fontSize" value={option.value} checked={preferences.fontSize === option.value} onChange={handlePreferenceChange} aria-describedby={`${settingsId}-font-description`} />
                    <span className="settings-choice-label">{option.label}</span>
                    <span className="settings-choice-description">{preferences.fontSize === option.value ? 'Currently selected' : option.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="settings-preview-note">Theme and text size changes are applied and saved automatically in this browser.</p>
            <p className="settings-notice" role="status">{notices.theme}</p>
            <p className="settings-notice" role="status">{notices.fontSize}</p>
          </div>
        </section>
        <section id={`${settingsId}-password-panel`} className="settings-panel" role="tabpanel" aria-labelledby={`${settingsId}-password-tab`} tabIndex={0} hidden={activeTab !== 'password'}>
          {activeTab === 'password' && (
            <>
              <header className="settings-heading">
                <h2>Change Password</h2>
                <p>Update the password you use to access Coffee Zone.</p>
              </header>
              <PasswordForm />
            </>
          )}
        </section>
      </div>
    </>
  );
}
