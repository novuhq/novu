import React from 'react';
import { Route, Routes as RouterRoutes } from 'react-router-dom';

import { CreateGroupPage } from './pages/CreateGroupPage';
import { EditGroupPage } from './pages/EditGroupPage';
import { EditGroupTranslationsPage } from './pages/EditGroupTranslationsPage';
import { SingleTranslationFileEditPage } from './pages/SingleTranslationFileEditPage';
import { TranslationGroupsPage } from './pages/TranslationGroupsPage';

export const Routes = () => {
  return (
    <RouterRoutes>
      <Route path="" element={<TranslationGroupsPage />}>
        <Route path="create" element={<CreateGroupPage />} />
        <Route path="edit/:identifier" element={<EditGroupTranslationsPage />}>
          <Route path="settings" element={<EditGroupPage />} />
          <Route path=":locale/:mode" element={<SingleTranslationFileEditPage />} />
        </Route>
      </Route>
    </RouterRoutes>
  );
};

export enum ROUTES {
  HOME = '/translations',
  TRANSLATION_GROUP_CREATE = '/translations/create',
  TRANSLATION_GROUP_EDIT = '/translations/edit/:identifier',
}
