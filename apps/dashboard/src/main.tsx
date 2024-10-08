import { StrictMode } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import ErrorPage from '@/components/error-page';
import { RootRoute, AuthRoute, DashboardRoute, CatchAllRoute } from './routes';
import { WorkflowsPage, SignInPage, SignUpPage, OrganizationListPage } from '@/pages';
import './index.css';
import { ROUTES } from './utils/routes';
import { Primitives } from '@/routes/primitives';

const router = createBrowserRouter([
  {
    element: <RootRoute />,
    errorElement: <ErrorPage />,
    children: [
      { path: '/primitives', element: <Primitives /> },
      {
        element: <AuthRoute />,
        children: [
          {
            path: `${ROUTES.SIGN_IN}/*`,
            element: <SignInPage />,
          },
          {
            path: `${ROUTES.SIGN_UP}/*`,
            element: <SignUpPage />,
          },
          {
            path: ROUTES.SIGNUP_ORGANIZATION_LIST,
            element: <OrganizationListPage />,
          },
        ],
      },
      {
        path: ROUTES.ROOT,
        element: <DashboardRoute />,
        children: [
          {
            path: ROUTES.ENV,
            children: [
              {
                path: ROUTES.WORKFLOWS,
                element: <WorkflowsPage />,
              },
              {
                path: '*',
                element: <CatchAllRoute />,
              },
            ],
          },
          {
            path: '*',
            element: <CatchAllRoute />,
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
