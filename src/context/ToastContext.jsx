import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Toast from '../components/ui/Toast';
import { TIMING } from '../theme/tokens';

export const ToastContext = createContext(null);

/** Shows one short-lived toast at a time (visible for 2.4s). */
export default function ToastProvider({ children }) {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  const toast = useCallback((nextMessage) => {
    if (!nextMessage) return;
    setMessage(nextMessage);
    setVisible(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setVisible(false), TIMING.toastVisibleMs);
  }, []);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast message={message} visible={visible} />
    </ToastContext.Provider>
  );
}
