import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../../config/constants';
import { BarChartIcon, CubeIcon, HomeIcon, PeopleIcon, ReceiptIcon } from '../icons/Icons';

const ICONS = {
  home: HomeIcon,
  invoices: ReceiptIcon,
  customers: PeopleIcon,
  products: CubeIcon,
  reports: BarChartIcon,
};

/** The five main navigation tabs (icons only below 560px). */
export default function NavTabs() {
  return (
    <nav
      aria-label="Main"
      className="no-scrollbar flex gap-1 overflow-x-auto rounded-nav bg-line-soft p-1 max-[900px]:order-3 max-[900px]:w-full"
    >
      {NAV_ITEMS.map((item) => {
        const Icon = ICONS[item.key];
        return (
          <NavLink
            key={item.key}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-[7px] whitespace-nowrap rounded-tab px-[14px] py-2 text-[13px] font-medium transition-colors max-[560px]:px-[11px] max-[560px]:py-[9px] ${
                isActive
                  ? 'bg-card text-brand shadow-tab-active dark:bg-white/10 dark:text-brand-light'
                  : 'text-muted hover:bg-card/60 hover:text-ink'
              }`
            }
          >
            <Icon />
            <span className="max-[560px]:hidden">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
