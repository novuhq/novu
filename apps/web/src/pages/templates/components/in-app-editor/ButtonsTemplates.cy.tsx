import { TestWrapper } from '../../../../testing';
import { ButtonsTemplates } from './ButtonsTemplates';

let selectedSpy;
let popoverVisible;
let selectedTemplate;

beforeEach(() => {
  selectedSpy = cy.spy().as('selectedSpy');
  popoverVisible = cy.spy().as('popoverVisible');
  selectedTemplate = cy.spy().as('selectedTemplate');
});

it('should call callbacks when template clicked', function () {
  cy.mount(
    <TestWrapper>
      <ButtonsTemplates
        setTemplateSelected={selectedSpy}
        setIsPopoverVisible={popoverVisible}
        setSelectedTemplate={selectedTemplate}
      />
    </TestWrapper>
  );

  cy.getByTestId('template-container-click-area').eq(0).click();
  cy.get('@selectedSpy').should('have.been.calledWith', true);
  cy.get('@selectedTemplate').should('have.been.calledWith', [{ type: 'primary', content: 'Primary' }]);
  cy.get('@popoverVisible').should('have.been.calledWith', false);
});

it('should render 3 templates to display', function () {
  cy.mount(
    <TestWrapper>
      <ButtonsTemplates
        setTemplateSelected={selectedSpy}
        setIsPopoverVisible={popoverVisible}
        setSelectedTemplate={selectedTemplate}
      />
    </TestWrapper>
  );

  cy.getByTestId('template-container-click-area').should('have.length', 3);
});
