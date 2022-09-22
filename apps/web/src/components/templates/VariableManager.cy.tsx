import { mount } from 'cypress/react';
import { useFormContext } from 'react-hook-form';
import { TestWrapper } from '../../testing';
import { VariableManager } from './VariableManager';
import { TemplateFormProvider } from './TemplateFormProvider';

it('should show available variables - string', function () {
  mount(
    <TestWrapper>
      <TemplateFormProvider>
        <VariableManager index={0} contents={['content']} />
        <FormTester content={'Hello, {{ name }}'} />
      </TemplateFormProvider>
    </TestWrapper>
  );

  cy.getByTestId('template-variable-row').should('have.length', 1);
  cy.getByTestId('template-variable-row').contains('name');
  cy.getByTestId('template-variable-row').contains('value');
});

it('should show available variables - array', function () {
  mount(
    <TestWrapper>
      <TemplateFormProvider>
        <VariableManager index={0} contents={['content']} />
        <FormTester content={'Hello, {{#each name}} {{/each}}'} />
      </TemplateFormProvider>
    </TestWrapper>
  );

  cy.getByTestId('template-variable-row').should('have.length', 1);
  cy.getByTestId('template-variable-row').contains('name');
  cy.getByTestId('template-variable-row').contains('array');
});

it('should show available variables - boolean', function () {
  mount(
    <TestWrapper>
      <TemplateFormProvider>
        <VariableManager index={0} contents={['content']} />
        <FormTester content={'Hello, {{#if name}} {{/if}}'} />
      </TemplateFormProvider>
    </TestWrapper>
  );

  cy.getByTestId('template-variable-row').should('have.length', 1);
  cy.getByTestId('template-variable-row').contains('name');
  cy.getByTestId('template-variable-row').contains('boolean');
});

it('should show reserved variables', function () {
  mount(
    <TestWrapper>
      <TemplateFormProvider>
        <VariableManager index={0} contents={['content']} />
        <FormTester content={'Hello, {{ subscriber }}'} />
      </TemplateFormProvider>
    </TestWrapper>
  );

  cy.getByTestId('template-variable-row').should('have.length', 1);
  cy.getByTestId('template-variable-row').contains('This variable is reserved by the system');
});

function FormTester({ content }: { content: string }) {
  const { setValue } = useFormContext();

  setValue('steps.0.template.content', content);

  return <></>;
}
