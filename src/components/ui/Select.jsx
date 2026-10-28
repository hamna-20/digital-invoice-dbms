import { Children, isValidElement, useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const FIELD =
  'flex w-full items-center justify-between gap-3 rounded-input border border-input-border bg-card px-3 py-2.5 text-left text-[13px] text-ink focus:border-input-focus focus:outline-none focus:ring-4 focus:ring-brand/15';
const OPTION =
  'block w-full rounded-lg px-3 py-2 text-left text-[13px] text-ink transition-colors hover:bg-surface focus:bg-surface';

const getEnabledIndex = (options, start, direction) => {
  let index = start;
  while (index >= 0 && index < options.length) {
    if (!options[index].props.disabled) return index;
    index += direction;
  }
  return -1;
};

/**
 * Labelled dropdown with a rounded popup and native-select keyboard controls.
 *
 * @param {object} props
 * @param {string} [props.label]
 * @param {string} [props.error]
 * @param {React.ReactNode} props.children - option elements
 * @param {(value: string) => void} props.onChange
 */
export default function Select({
  label,
  error,
  id,
  className = '',
  children,
  value = '',
  onChange,
  disabled = false,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
}) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const listboxId = `${fieldId}-options`;
  const options = Children.toArray(children).filter(
    (child) => isValidElement(child) && child.type === 'option'
  );
  const selectedIndex = options.findIndex((option) => String(option.props.value) === String(value));
  const selectedOption = options[selectedIndex];
  const hasError = Boolean(error || ariaInvalid);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const [position, setPosition] = useState(null);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    let rect = triggerRef.current.getBoundingClientRect();
    let spaceBelow = window.innerHeight - rect.bottom - 8;
    const desiredHeight = Math.min(280, options.length * 40 + 12);

    if (spaceBelow < desiredHeight) {
      let scrollParent = triggerRef.current.parentElement;
      while (scrollParent && scrollParent !== document.body) {
        const { overflowY } = window.getComputedStyle(scrollParent);
        if (
          /(auto|scroll)/.test(overflowY) &&
          scrollParent.scrollHeight > scrollParent.clientHeight
        ) {
          scrollParent.scrollTop += Math.min(desiredHeight - spaceBelow, scrollParent.scrollHeight - scrollParent.clientHeight - scrollParent.scrollTop);
          rect = triggerRef.current.getBoundingClientRect();
          spaceBelow = window.innerHeight - rect.bottom - 8;
          break;
        }
        scrollParent = scrollParent.parentElement;
      }
    }

    const maxHeight = Math.max(1, Math.min(280, spaceBelow));
    setPosition({
      left: rect.left,
      width: rect.width,
      top: rect.bottom + 4,
      bottom: undefined,
      maxHeight,
    });
  }, [options.length]);

  useEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const handlePointerDown = (event) => {
      const listbox = document.getElementById(listboxId);
      if (!containerRef.current?.contains(event.target) && !listbox?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [listboxId, open, updatePosition]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    document.getElementById(`${listboxId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, listboxId, open]);

  const chooseOption = (index) => {
    const option = options[index];
    if (!option || option.props.disabled) return;
    onChange?.(String(option.props.value));
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      if (!open) {
        setActiveIndex(getEnabledIndex(options, selectedIndex >= 0 ? selectedIndex : direction > 0 ? 0 : options.length - 1, direction));
        setOpen(true);
        return;
      }
      const start = activeIndex < 0 ? (direction > 0 ? -1 : options.length) : activeIndex;
      const next = getEnabledIndex(options, start + direction, direction);
      if (next >= 0) setActiveIndex(next);
    } else if (event.key === 'Home' || event.key === 'End') {
      if (!open) return;
      event.preventDefault();
      const start = event.key === 'Home' ? 0 : options.length - 1;
      setActiveIndex(getEnabledIndex(options, start, event.key === 'Home' ? 1 : -1));
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!open) {
        setActiveIndex(selectedIndex);
        setOpen(true);
      } else {
        chooseOption(activeIndex);
      }
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`min-w-0 ${className}`}>
      {label && (
        <label htmlFor={fieldId} className="mb-1.5 block text-xs font-medium text-muted">
          {label}
        </label>
      )}
      <button
        ref={triggerRef}
        id={fieldId}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        aria-invalid={hasError ? true : undefined}
        disabled={disabled}
        onClick={() => {
          setActiveIndex(selectedIndex);
          setOpen((current) => !current);
        }}
        onKeyDown={handleKeyDown}
        className={`${FIELD} ${hasError ? 'border-danger' : ''} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <span className={selectedOption ? '' : 'text-muted'}>
          {selectedOption?.props.children || 'Select an option'}
        </span>
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {error && <p className="mt-1.5 text-[11px] leading-4 text-danger">{error}</p>}
      {open &&
        position &&
        createPortal(
          <div
            id={listboxId}
            role="listbox"
            aria-labelledby={label ? fieldId : undefined}
            className="fixed z-[60] overflow-y-auto rounded-input border border-line bg-card p-1.5 shadow-modal"
            style={{
              left: position.left,
              width: position.width,
              top: position.top,
              bottom: position.bottom,
              maxHeight: position.maxHeight,
            }}
          >
            {options.map((option, index) => (
              <div
                key={option.key || option.props.value}
                id={`${listboxId}-${index}`}
                role="option"
                aria-selected={String(option.props.value) === String(value)}
                aria-disabled={option.props.disabled || undefined}
                onMouseMove={() => setActiveIndex(index)}
                onClick={() => chooseOption(index)}
                className={`${OPTION} ${
                  index === activeIndex ? 'bg-surface' : ''
                } ${option.props.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
              >
                {option.props.children}
              </div>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
