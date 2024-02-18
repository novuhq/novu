import { Button } from './Button';
import { TestWrapper } from '../testing';

it('should display the button text when passed as children', () => {
  cy.mount(
    <TestWrapper>
      <Button>Test Button</Button>
    </TestWrapper>
  );

  cy.get('button').should('have.text', 'Test Button');
});

it('should display loading state of a button', function () {
  cy.mount(
    <TestWrapper>
      <Button loading={true}>Test Button</Button>
    </TestWrapper>
  );

  cy.get('button').should('have.css', 'pointer-events', 'none');
  cy.get('button').should('have.attr', 'data-loading');
});
