import RegisterForm from '../components/auth/RegisterForm.jsx';

export default function RegisterPage() {
  return (
    <>
      <p className="auth-eyebrow">YOUR NEXT COMMIT STARTS HERE</p>
      <h1 className="auth-title">Code connects.</h1>
      <p className="auth-description">Share what you build, learn together, and find your place in tech.</p>
      <RegisterForm />
    </>
  );
}
