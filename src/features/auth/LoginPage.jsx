import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { EyeIcon, EyeOffIcon } from '../../components/icons/Icons';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { DEMO_ACCOUNT_ENABLED, DEMO_EMAIL, DEMO_PASSWORD } from '../../config/constants';
import useAuth from '../../hooks/useAuth';
import { loginSchema, validate } from '../../lib/validators';
import AuthLayout from './AuthLayout';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = location.state?.from || '/';

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { data, errors: nextErrors } = validate(loginSchema, { email, password });
    setErrors(nextErrors);
    setFormError('');
    if (!data) return;

    setSubmitting(true);
    try {
      await login({ email: data.email, password: data.password, remember });
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setFormError('Email or password is incorrect.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-[22px] font-semibold tracking-[-0.3px]">Welcome back</h1>
      <p className="mt-1 text-[13px] text-muted">Sign in to manage your invoices.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-5">
        {formError && (
          <div className="mb-4 rounded-notice border border-danger-border bg-danger-hover-bg px-3 py-2 text-xs text-danger">
            {formError}
          </div>
        )}

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
        />

        <Input
          className="mt-3.5"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="text-muted transition-colors hover:text-ink"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          }
        />

        <div className="mt-3.5 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="h-3.5 w-3.5 accent-brand"
            />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-xs font-medium text-brand hover:text-brand-hover">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" loading={submitting} className="mt-5 w-full">
          Sign in
        </Button>
      </form>

      {DEMO_ACCOUNT_ENABLED && (
        <p className="mt-4 text-center text-[11px] text-muted">
          Demo: {DEMO_EMAIL} / {DEMO_PASSWORD}
        </p>
      )}

      <p className="mt-4 text-center text-xs text-muted">
        New to Ledgerly?{' '}
        <Link to="/signup" className="font-medium text-brand hover:text-brand-hover">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
