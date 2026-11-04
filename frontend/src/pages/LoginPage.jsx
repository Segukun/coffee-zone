import PagePlaceholder from '../components/common/PagePlaceholder.jsx';

export default function LoginPage() {
  return (
    <>
      <h1 className="auth-title">Your community.<br />Your next idea.</h1>
      <p className="auth-description">Coffee, a little code, and people who get you. Log in to keep the conversation going.</p>
      <PagePlaceholder title="Login" description="This space is reserved for the login form. Authentication has not been implemented yet." />
    </>
  );
}
