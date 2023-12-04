import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import { DigestTypeEnum, StepTypeEnum } from '@novu/shared';

import { schema } from '../components/notificationTemplateSchema';
import { DigestMetadata } from './DigestMetadata';
import { IForm } from '../components/formTypes';
import { TestWrapper } from '../../../testing';

const DigestWrapper = ({ data }) => {
  const methods = useForm<IForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      steps: [
        {
          digestMetadata: data,
          uuid: '123',
          template: {
            type: StepTypeEnum.DIGEST,
            subject: '',
            content: '',
            contentType: 'editor',
            variables: [],
          },
        },
      ],
    },
    mode: 'onChange',
  });

  return (
    <TestWrapper initialEntries={[{ pathname: '/workflows/edit/asd/digest/123' }]}>
      <FormProvider {...methods}>
        <DigestMetadata />
      </FormProvider>
    </TestWrapper>
  );
};

describe('Digest', function () {
  it('should render day select and be able to select multiple days', function () {
    cy.mount(
      <DigestWrapper
        data={{
          type: DigestTypeEnum.REGULAR,
        }}
      />
    );

    cy.getByTestId('digest-send-options').click();
    cy.getByTestId('digest-type').get('.mantine-SegmentedControl-control').last().click();
    cy.getByTestId('timed-group').contains('day(s)');
    cy.getByTestId('time-amount').should('have.value', '1');
    cy.getByTestId('time-at').type('16:00');
    cy.getByTestId('time-at').should('have.value', '16:00');
    cy.getByTestId('digest-unit').get('.mantine-SegmentedControl-control').last().click();
    cy.getByTestId('day-select').get('button').last().click();
    cy.get('[data-test-id=day-select] button').eq(0).click();
    cy.get('.active-day').should('have.lengthOf.at.least', 1);
    cy.get('.active-day').should('have.lengthOf.at.most', 3);
  });

  it('should render week day select and be able to select multiple days', function () {
    cy.mount(
      <DigestWrapper
        data={{
          type: DigestTypeEnum.REGULAR,
        }}
      />
    );

    cy.getByTestId('digest-send-options').click();
    cy.getByTestId('digest-type').get('.mantine-SegmentedControl-control').last().click();
    cy.getByTestId('timed-group').contains('day(s)');
    cy.getByTestId('digest-unit').get('.mantine-SegmentedControl-control').eq(5).click();
    cy.get('[data-test-id=weekday-select] button').eq(0).click();
    cy.get('[data-test-id=weekday-select] button').eq(2).click();
    cy.get('[data-test-id=weekday-select] button').eq(4).click();
    cy.get('.active-day').should('have.lengthOf.at.least', 2);
    cy.get('.active-day').should('have.lengthOf.at.most', 4);
  });
});
