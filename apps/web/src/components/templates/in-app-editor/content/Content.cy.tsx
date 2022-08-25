import { TestWrapper } from '../../../../testing';
import { Content } from './Content';

it('should display the button text when passed as children', () => {
  const onChangeSpy = cy.spy().as('changeSpy');

  cy.mount(
    <TestWrapper>
      <Content
        contentPlaceholder={'contentPlaceholder'}
        readonly={false}
        onChange={onChangeSpy}
        content={
          '{{<span>firstName</span>}} {{<span style="font-weight: bold;">lastName</span>}} <span style="font-weight: bold;">{{welcomeTo}}</span><br />'
        }
        showPlaceHolder={false}
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

it('should display error message when empty content', () => {
  const onChangeSpy = cy.spy().as('changeSpy');

  cy.mount(
    <TestWrapper>
      <Content
        contentPlaceholder={'contentPlaceholder'}
        readonly={false}
        onChange={onChangeSpy}
        content={''}
        errors={
          {
            steps: [
              {
                template: {
                  content: {
                    message: 'Required - Message Content',
                    type: 'too_small',
                    ref: { name: 'steps.0.template.content' },
                  },
                },
              },
            ],
          } as any
        }
        showPlaceHolder={false}
        index={0}
      />
    </TestWrapper>
  );

  cy.getByTestId('content-text-area').contains('Required - Message Content');
});
