import { Link } from 'react-router-dom';
import ThemeToggle from '../../components/layout/ThemeToggle';
import { APP_NAME } from '../../config/constants';

/** Centred card used by the login, signup and reset pages. */
export default function AuthLayout({ children }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-page px-[18px] py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <Link to="/" className="mb-6 flex items-center gap-2 text-ink">
        <span className="flex h-10 w-10 items-center justify-center rounded-logo bg-grad-logo text-[18px] font-semibold text-white shadow-logo">
          L
        </span>
        <span className="text-[20px] font-semibold tracking-[-0.2px]">{APP_NAME}</span>
      </Link>

      <div className="w-full max-w-[420px] rounded-card border border-line bg-card p-6 shadow-card">{children}</div>
    </div>
  );
}
