import { TestWrapper } from '../../../testing';
import { PreviewWeb } from './PreviewWeb';
import { format } from 'date-fns';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({});

describe('Preview web', () => {
  it('should render without content', () => {
    cy.on('uncaught:exception', (err) => {
      if (err.message.includes('Target container is not a DOM element')) {
        return false;
      }
    });
    cy.mount(
      <TestWrapper>
        <QueryClientProvider client={queryClient}>
          <PreviewWeb
            subject="Subject"
            content=""
            integration={{
              credentials: {
                from: 'novu@novu',
              },
            }}
          />
        </QueryClientProvider>
      </TestWrapper>
    );

    cy.getByTestId('preview-subject').contains('Subject');
    cy.getByTestId('preview-from').contains('novu@novu');
    cy.getByTestId('preview-content').contains(
      "Oops! We've recognized some glitch in this HTML. Please give it another look!"
    );
    cy.getByTestId('preview-date').contains(format(new Date(), 'EEE, MMM d, HH:mm'));
  });

  it('should render with basic content', () => {
    const content = '<html><head></head><body><div>test</div></body></html>';

    cy.mount(
      <TestWrapper>
        <QueryClientProvider client={queryClient}>
          <PreviewWeb
            subject="Subject"
            content={content}
            integration={{
              credentials: {
                from: 'novu@novu',
              },
            }}
          />
        </QueryClientProvider>
      </TestWrapper>
    );

    cy.getByTestId('preview-subject').contains('Subject');
    cy.getByTestId('preview-from').contains('novu@novu');
    cy.getByTestId('preview-content').invoke('attr', 'srcdoc').should('eq', content);
    cy.getByTestId('preview-date').contains(format(new Date(), 'EEE, MMM d, HH:mm'));
  });
});
