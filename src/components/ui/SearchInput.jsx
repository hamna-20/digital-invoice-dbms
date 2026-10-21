import { SearchIcon } from '../icons/Icons';

/** Search field with a magnifier icon; filters on every keystroke by the caller. */
export default function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative w-[260px] max-w-full max-[600px]:w-full">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
        <SearchIcon />
      </span>
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-input border border-input-border bg-card py-2.5 pl-9 pr-3 text-[13px] text-ink placeholder:text-muted focus:border-input-focus focus:outline-none focus:ring-4 focus:ring-brand/15"
      />
    </div>
  );
}
