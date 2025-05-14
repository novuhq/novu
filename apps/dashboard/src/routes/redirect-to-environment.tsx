import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { RiLoader4Line } from 'react-icons/ri';
import { buildRoute, ROUTES } from '../utils/routes';
import { useEnvironment } from '../context/environment/hooks';

interface RedirectToEnvironmentProps {
  targetRoute: string;
}

export const RedirectToEnvironment = ({ targetRoute }: RedirectToEnvironmentProps) => {
  const { currentEnvironment, areEnvironmentsInitialLoading } = useEnvironment();
  const location = useLocation();

  if (areEnvironmentsInitialLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <RiLoader4Line className="size-8 animate-spin text-primary-base" />
          <div className="text-text-sub text-label-sm">Loading environment...</div>
        </div>
      </div>
    );
  }

  if (!currentEnvironment?.slug) {
    return <Navigate to={ROUTES.ROOT} />;
  }

  const targetPath = buildRoute(targetRoute, { environmentSlug: currentEnvironment.slug });
  
  const queryParams = location.search;
  const hash = location.hash;
  
  return <Navigate to={`${targetPath}${queryParams}${hash}`} />;
};
