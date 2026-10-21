import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

/**
 * Route guard.
 *
 * @param {object} props
 * @param {node} [props.children]
 * @param {boolean} [props.publicOnly] - signed-in users are sent to the dashboard instead
 */
export default function ProtectedRoute({ children, publicOnly = false }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return null;

  if (publicOnly) {
    return status === 'authenticated' ? <Navigate to="/" replace /> : children;
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  return children;
}
