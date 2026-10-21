import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import useAuth from '../../hooks/useAuth';
import { emailSchema, validate } from '../../lib/validators';
import AuthLayout from './AuthLayout';

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { data, errors } = validate(emailSchema, { email });
    if (!data) {
      setError(errors.email);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await requestPasswordReset(data.email);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-[22px] font-semibold tracking-[-0.3px]">Reset your password</h1>
      <p className="mt-1 text-[13px] text-muted">Enter your email and we&apos;ll send a reset link.</p>

      {submitted ? (
        <div className="mt-5">
          <p className="rounded-notice border border-line bg-surface px-3 py-3 text-[13px] text-ink">
            If an account exists for {email}, a reset link is on its way.
          </p>
          <Link to="/login" className="mt-4 block text-center text-xs font-medium text-brand hover:text-brand-hover">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-5">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={error}
          />
          <Button type="submit" loading={submitting} className="mt-5 w-full">
            Send reset link
          </Button>
        </form>
      )}

      {!submitted && (
        <p className="mt-4 text-center text-xs text-muted">
          <Link to="/login" className="font-medium text-brand hover:text-brand-hover">
            Back to sign in
          </Link>
        </p>
      )}
    </AuthLayout>
  );
}
