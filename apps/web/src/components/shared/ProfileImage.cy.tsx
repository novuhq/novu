import { Controller, useForm } from 'react-hook-form';
import { TestWrapper } from '../../testing';
import { ProfileImage } from './ProfileImage';

const TestWrapperWithForm = ({ imageUrl }: { imageUrl: string }) => {
  const { control } = useForm({
    defaultValues: {
      image: imageUrl,
    },
  });

  return (
    <TestWrapper>
      <Controller control={control} name="image" render={({ field }) => <ProfileImage {...field} />} />
    </TestWrapper>
  );
};

it('should render the Profile image component', () => {
  cy.mount(<TestWrapperWithForm imageUrl="" />);

  cy.getByTestId('profile-image').should('exist');
});

it('should render img component when imageUrl is passed', () => {
  cy.mount(<TestWrapperWithForm imageUrl="https://example.com/image.png" />);

  cy.getByTestId('person-icon').should('not.exist');
  cy.getByTestId('preview-img').should('exist');
  cy.getByTestId('preview-img').should('have.attr', 'src', 'https://example.com/image.png');
  cy.getByTestId('preview-img').should('have.attr', 'alt', 'image');
});

it('should render IconPerson component when imageUrl is not passed', () => {
  cy.mount(<TestWrapperWithForm imageUrl="" />);

  cy.getByTestId('preview-image').should('not.exist');
  cy.getByTestId('person-icon').should('exist');
});

it('should render the input container on hover', () => {
  cy.mount(<TestWrapperWithForm imageUrl="" />);

  cy.getByTestId('profile-image').trigger('mouseover');

  cy.getByTestId('image-input-container').should('be.visible');
  cy.getByTestId('file-upload-icon').should('be.visible');
  cy.getByTestId('upload-text').should('have.text', 'Upload');
  cy.getByTestId('image-file-input').should('have.attr', 'name', 'image');
  cy.getByTestId('image-file-input').should('have.attr', 'accept', 'image/png, image/jpeg');
});
