import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IOrganizationEntity } from '@novu/shared';

import { BrandingForm } from './BrandingForm';
import { TestWrapper } from '../../../testing';

const defaultProps: {
  isLoading: boolean;
  organization: IOrganizationEntity | undefined;
} = { isLoading: false, organization: undefined };

const testOrganization: IOrganizationEntity = {
  _id: '1',
  name: 'Test',
  members: [],
  branding: {
    logo: 'https://test.com/logo.png',
    color: '#000000',
    fontFamily: 'Arial',
    fontColor: '#ffffff',
    contentBackground: '#ffffff',
    direction: 'ltr',
  },
};

const queryClient = new QueryClient();

describe('Testing BrandingForm', () => {
  beforeEach(() => {
    cy.mount(
      <QueryClientProvider client={queryClient}>
        <TestWrapper>
          <BrandingForm {...defaultProps} />
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
          <BrandingForm {...defaultProps} isLoading={true} />
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
          <BrandingForm {...defaultProps} organization={testOrganization} />
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
  it('should render with organization and loading', () => {
    cy.mount(
      <QueryClientProvider client={queryClient}>
        <TestWrapper>
          <BrandingForm {...defaultProps} organization={testOrganization} isLoading={true} />
        </TestWrapper>
      </QueryClientProvider>
    );
    cy.get('form').should('exist');
    cy.get('.mantine-LoadingOverlay-root').should('exist');
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
