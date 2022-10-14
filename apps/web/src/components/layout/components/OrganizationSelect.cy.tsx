import { QueryClient, QueryClientProvider } from 'react-query';
import { TestWrapper } from '../../../testing';
import OrganizationSelect from './OrganizationSelect';

describe('Organization Select Component Test', () => {
  const organizationSelectComponentSelector = '[data-test-id="organization-switch"]';
  const queryClient = new QueryClient();

  it('should Render the Organization Select Component', () => {
    cy.mount(
      <TestWrapper>
        <QueryClientProvider client={queryClient}>
          <OrganizationSelect />
        </QueryClientProvider>
      </TestWrapper>
    );
  });

  it('should get the organization-switch data test id', () => {
    cy.mount(
      <TestWrapper>
        <QueryClientProvider client={queryClient}>
          <OrganizationSelect />
        </QueryClientProvider>
      </TestWrapper>
    );

    cy.get(organizationSelectComponentSelector);
  });
});
