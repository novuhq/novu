import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IOrganizationEntity } from '@novu/shared';

import { BrandingForm } from './BrandingForm';
import { TestWrapper } from '../../../testing';
import { Outlet, Route, Routes } from 'react-router-dom';

const testOrganization: IOrganizationEntity = {
  _id: '1',
  name: 'Test',
  branding: {
    logo: 'https://test.com/logo.png',
    color: '#000000',
    fontFamily: 'Arial',
    fontColor: '#ffffff',
    contentBackground: '#ffffff',
    direction: 'ltr',
  },
  createdAt: '2023-12-27T13:17:06.309Z',
  updatedAt: '2023-12-27T13:17:06.409Z',
};

const queryClient = new QueryClient();

const BrandingFormRoute = ({ organization = undefined }: { organization?: IOrganizationEntity | undefined }) => {
  return (
    <Routes>
      <Route path="/" element={<Outlet context={{ currentOrganization: organization }} />}>
        <Route index element={<BrandingForm />} />
      </Route>
    </Routes>
  );
};

describe('Testing BrandingForm', () => {
  beforeEach(() => {
    cy.mount(
      <QueryClientProvider client={queryClient}>
        <TestWrapper>
          <BrandingFormRoute />
        </TestWrapper>
      </QueryClientProvider>
    );
  });
  it('should render', () => {
    cy.get('form').should('exist');
  });
  it('should render loading overlay', () => {
    cy.mount(
      <QueryClientProvider client={queryClient}>
        <TestWrapper>
          <BrandingFormRoute />
        </TestWrapper>
      </QueryClientProvider>
    );
    cy.get('form').should('exist');
    cy.get('.mantine-LoadingOverlay-root').should('exist');
  });
  it('should render with organization', () => {
    cy.mount(
      <QueryClientProvider client={queryClient}>
        <TestWrapper>
          <BrandingFormRoute organization={testOrganization} />
        </TestWrapper>
      </QueryClientProvider>
    );
    cy.get('form').should('exist');
    cy.get('.mantine-LoadingOverlay-root').should('not.exist');
    cy.get('[data-test-id="logo-image-wrapper"]').should('exist');
    cy.get('[data-test-id="font-family-selector"]').should('exist');
    cy.get('[data-test-id="color-picker"]').should('exist');
    cy.get('[data-test-id="upload-image-button"]').should('exist');
  });
  it('default values should be correct', () => {
    cy.get('[data-test-id="logo-image-wrapper"]').should('not.exist');
    cy.get('[data-test-id="upload-image-button"]').should('exist');
    cy.get('[data-test-id="font-family-selector"]').should('have.value', 'inherit');
    cy.get('[data-test-id="color-picker"]').should('have.value', '#f47373');
  });
});
