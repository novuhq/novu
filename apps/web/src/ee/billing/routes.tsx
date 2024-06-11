import React from 'react';
import { Route, Routes as RouterRoutes } from 'react-router-dom';
import { BillingPage } from './pages/BillingPage';

export const Routes = () => {
  return (
    <RouterRoutes>
      <Route path="" element={<BillingPage />}></Route>
    </RouterRoutes>
  );
};
