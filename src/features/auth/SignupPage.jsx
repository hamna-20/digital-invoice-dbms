import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EyeIcon, EyeOffIcon } from '../../components/icons/Icons';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import { signupSchema, validate } from '../../lib/validators';
import AuthLayout from './AuthLayout';

export default function SignupPage() {
  const { signup } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', terms: false });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (event) => {
    const value = field === 'terms' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const passwordToggle = (visible, onToggle) => (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visible ? 'Hide password' : 'Show password'}
      className="text-muted transition-colors hover:text-ink"
    >
      {visible ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { data, errors: nextErrors } = validate(signupSchema, form);
    setErrors(nextErrors);
    setFormError('');
    if (!data) return;

    setSubmitting(true);
    try {
      await signup({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      toast('Account created successfully. Please sign in.');
      navigate('/login', { replace: true, state: { email: data.email } });
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-[22px] font-semibold tracking-[-0.3px]">Create your account</h1>
      <p className="mt-1 text-[13px] text-muted">Start issuing invoices in minutes.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-5">
        {formError && (
          <div className="mb-4 rounded-notice border border-danger-border bg-danger-hover-bg px-3 py-2 text-xs text-danger">
            {formError}
          </div>
        )}

        <Input label="Full name" autoComplete="name" required value={form.name} onChange={update('name')} error={errors.name} />
        <Input
          className="mt-3.5"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={update('email')}
          error={errors.email}
        />
        <Input
          className="mt-3.5"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          required
          value={form.password}
          onChange={update('password')}
          error={errors.password}
          hint="At least 8 characters with a letter and a number."
          trailing={passwordToggle(showPassword, () => setShowPassword((current) => !current))}
        />
        <Input
          className="mt-3.5"
          label="Confirm password"
          type={showConfirm ? 'text' : 'password'}
          autoComplete="new-password"
          required
          value={form.confirm}
          onChange={update('confirm')}
          error={errors.confirm}
          trailing={passwordToggle(showConfirm, () => setShowConfirm((current) => !current))}
        />

        <div className="mt-3.5">
          <label className="flex items-start gap-2 text-xs text-muted">
            <input type="checkbox" checked={form.terms} onChange={update('terms')} className="mt-0.5 h-3.5 w-3.5 accent-brand" />
            I agree to the Terms and Privacy Policy
          </label>
          {errors.terms && <p className="mt-1.5 text-[11px] leading-4 text-danger">{errors.terms}</p>}
        </div>

        <Button type="submit" loading={submitting} className="mt-5 w-full">
          Create account
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand hover:text-brand-hover">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
