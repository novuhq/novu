import { TestWrapper } from '../../../testing';
import { PreviewMobile } from './PreviewMobile';
import { format } from 'date-fns';

describe('Preview mobile', () => {
  it('should render without content', () => {
    cy.on('uncaught:exception', (err) => {
      if (err.message.includes('Target container is not a DOM element')) {
        return false;
      }
    });
    cy.mount(
      <TestWrapper>
        <PreviewMobile
          subject="Subject"
          content=""
          integration={{
            credentials: {
              from: 'novu@novu',
            },
          }}
        />
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
        <PreviewMobile
          subject="Subject"
          content={content}
          integration={{
            credentials: {
              from: 'novu@novu',
            },
          }}
        />
      </TestWrapper>
    );

    cy.getByTestId('preview-subject').contains('Subject');
    cy.getByTestId('preview-from').contains('novu@novu');
    cy.getByTestId('preview-content').invoke('attr', 'srcdoc').should('eq', content);
    cy.getByTestId('preview-date').contains(format(new Date(), 'EEE, MMM d, HH:mm'));
  });
});
