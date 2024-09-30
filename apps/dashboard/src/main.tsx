import { StrictMode } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import ErrorPage from '@/components/error-page';
import { Root, AuthLayout, DashboardLayout } from './layout';
import { Workflows, SignIn, SignUp, OrganizationList } from '@/pages';
import { ProtectedRoutes } from './components/protected-routes';
import './index.css';

const router = createBrowserRouter([
  {
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: 'auth',
        element: <AuthLayout />,
        children: [
          {
            path: 'sign-in/*',
            element: <SignIn />,
          },
          {
            path: 'sign-up/*',
            element: <SignUp />,
          },
          {
            path: 'sign-up/organization-list',
            element: <OrganizationList />,
          },
        ],
      },
      {
        path: '/',
        element: (
          <ProtectedRoutes>
            <DashboardLayout />
          </ProtectedRoutes>
        ),
        children: [
          {
            path: 'workflows',
            element: <Workflows />,
          },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
