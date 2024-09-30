import { ROUTES } from '@/utils/routes';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

export const AuthLayout = () => {
  const { pathname } = useLocation();
  if (pathname === '/auth') {
    return <Navigate to={ROUTES.AUTH_SIGN_IN} replace />;
  }

  return (
    <div className="grid h-screen grid-cols-2 gap-8">
      <div className="grow">Auth Layout</div>
      <div className="flex items-center justify-center">
        <Outlet />
      </div>
    </div>
  );
};
