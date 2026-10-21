import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-page px-[18px] text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">404</p>
      <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.4px]">Page not found</h1>
      <p className="mt-1 text-[13px] text-muted">The page you are looking for does not exist.</p>
      <Link to="/" className="mt-5 text-[13px] font-medium text-brand hover:text-brand-hover">
        Back to dashboard
      </Link>
    </div>
  );
}
