import { TestWrapper } from '../../../testing';
import { ContentContainer } from './ContentContainer';

it('should display the button text when passed as children', () => {
  const onChangeSpy = cy.spy().as('changeSpy');

  cy.mount(
    <TestWrapper>
      <ContentContainer
        contentPlaceholder={'contentPlaceholder'}
        readonly={false}
        onChange={onChangeSpy}
        value={
          '{{<span>firstName</span>}} {{<span style="font-weight: bold;">lastName</span>}} <span style="font-weight: bold;">{{welcomeTo}}</span><br />'
        }
        index={0}
      />
    </TestWrapper>
  );

  cy.getByTestId('in-app-editor-content-input').type(' ');

  cy.get('@changeSpy').should(
    'have.been.calledWith',
    '{{firstName}} {{lastName}} <span style="font-weight: bold;">{{welcomeTo}}&nbsp;</span><br>'
  );
});
