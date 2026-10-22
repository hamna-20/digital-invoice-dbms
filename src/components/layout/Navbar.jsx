import { Link, useNavigate } from 'react-router-dom';
import NavTabs from './NavTabs';
import ThemeToggle from './ThemeToggle';
import UserMenu from './UserMenu';

/** Sticky app header: brand, nav tabs, new invoice CTA, account menu, theme toggle. */
export default function Navbar() {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-[5] border-b border-line bg-card/85 pt-[env(safe-area-inset-top)] backdrop-blur-[10px] backdrop-saturate-[140%]">
      <div className="mx-auto flex max-w-[1120px] items-center gap-4 px-[18px] py-3 max-[900px]:flex-wrap">
        <Link to="/" className="mr-auto flex shrink-0 items-center gap-2 text-ink max-[900px]:mr-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-logo bg-grad-logo text-[15px] font-semibold text-white shadow-logo">
            L
          </span>
          <span className="text-[17px] font-semibold tracking-[-0.2px]">Ledgerly</span>
        </Link>

        <NavTabs />

        <button
          type="button"
          onClick={() => navigate('/invoices?new=1')}
          className="whitespace-nowrap rounded-btn bg-grad-brand px-4 py-[9px] text-[13px] font-medium text-white shadow-primary transition-all duration-150 hover:shadow-primary-hover active:translate-y-0 dark:bg-grad-brand-dark max-[900px]:ml-auto"
        >
          + New invoice
        </button>

        <UserMenu />
        <ThemeToggle />
      </div>
    </header>
  );
}
