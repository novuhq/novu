import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import { Novu } from '@novu/api';
import { LayoutsControllerCreateResponse } from '@novu/api/models/operations';
import { layoutControlSchema, layoutUiSchema } from '@novu/application-generic';
import { LayoutRepository } from '@novu/dal';

import { initNovuClassSdkInternalAuth } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';
import { CreateLayoutDto, UpdateLayoutDto } from '../dtos';
import { LayoutCreationSourceEnum } from '../types';

describe('Upsert Layout #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;
  let layoutRepository: LayoutRepository;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdkInternalAuth(session);
    layoutRepository = new LayoutRepository();
  });

  describe('Create Layout - POST /v2/layouts', () => {
    it('should create a new layout successfully', async () => {
      const layoutData: CreateLayoutDto = {
        layoutId: `test-layout-creation`,
        name: 'Test Layout Creation',
        __source: LayoutCreationSourceEnum.DASHBOARD,
      };

      const { result: createdLayout } = await novuClient.layouts.create(layoutData);

      expect(createdLayout).to.exist;
      expect(createdLayout.layoutId).to.equal(layoutData.layoutId);
      expect(createdLayout.name).to.equal(layoutData.name);
      expect(createdLayout.isDefault).to.be.true;
      expect(createdLayout.id).to.be.a('string');
      expect(createdLayout.createdAt).to.be.a('string');
      expect(createdLayout.updatedAt).to.be.a('string');
      expect(createdLayout.controls.values).to.deep.equal({});
      expect(createdLayout.controls.uiSchema).to.deep.equal(layoutUiSchema);
      expect(createdLayout.controls.dataSchema).to.deep.equal(layoutControlSchema);
      expect(createdLayout.variables).to.exist;
      expect(createdLayout.variables).to.be.an('object');
    });

    it('should create first layout as default and not set the second layout', async () => {
      await layoutRepository.delete({
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        isDefault: true,
      });

      const layoutData: CreateLayoutDto = {
        layoutId: `first-layout`,
        name: 'First Layout',
        __source: LayoutCreationSourceEnum.DASHBOARD,
      };

      const { result: createdLayout } = await novuClient.layouts.create(layoutData);

      expect(createdLayout.isDefault).to.be.true;

      const layoutData2: CreateLayoutDto = {
        layoutId: `second-layout`,
        name: 'Second Layout',
        __source: LayoutCreationSourceEnum.DASHBOARD,
      };

      const { result: createdLayout2 } = await novuClient.layouts.create(layoutData2);

      expect(createdLayout2.isDefault).to.be.false;
    });
  });

  describe('Update Layout - PUT /v2/layouts/:layoutId', () => {
    let existingLayout: LayoutsControllerCreateResponse['result'];

    beforeEach(async () => {
      const createData: CreateLayoutDto = {
        layoutId: `existing-layout`,
        name: 'Existing Layout',
        __source: LayoutCreationSourceEnum.DASHBOARD,
      };

      const { result } = await novuClient.layouts.create(createData);
      existingLayout = result;
    });

    it('should update an existing layout successfully', async () => {
      const updateData: UpdateLayoutDto = {
        name: 'Updated Layout Name',
        controlValues: {
          email: {
            body: '<html><body><div>{{content}}</div></body></html>',
            editorType: 'html',
          },
        },
      };

      const { result: updatedLayout } = await novuClient.layouts.update(updateData, existingLayout.layoutId);

      expect(updatedLayout.id).to.equal(existingLayout.id);
      expect(updatedLayout.layoutId).to.equal(existingLayout.layoutId);
      expect(updatedLayout.name).to.equal(updateData.name);
      expect(updatedLayout.controls.values.email?.body).to.contain(updateData.controlValues?.email?.body);
      expect(updatedLayout.controls.values.email?.editorType).to.equal(updateData.controlValues?.email?.editorType);
    });

    it('should validate HTML content when editorType is html', async () => {
      const updateData: UpdateLayoutDto = {
        name: 'HTML Layout',
        controlValues: {
          email: {
            body: 'Invalid HTML content without proper structure',
            editorType: 'html',
          },
        },
      };

      try {
        await novuClient.layouts.update(updateData, existingLayout.layoutId);
        expect.fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.statusCode).to.equal(400);
        expect(error.message).to.contain('Content must be a valid HTML content');
      }
    });

    it('should validate Maily JSON content when editorType is block', async () => {
      const updateData: UpdateLayoutDto = {
        name: 'Block Layout',
        controlValues: {
          email: {
            body: 'Invalid JSON content',
            editorType: 'block',
          },
        },
      };

      try {
        await novuClient.layouts.update(updateData, existingLayout.layoutId);
        expect.fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.statusCode).to.equal(400);
        expect(error.message).to.contain('Content must be a valid Maily JSON content');
      }
    });

    it('should not allow Maily JSON content when no content variable provided', async () => {
      const validMailyContent = JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: { textAlign: null, showIfKey: null },
            content: [{ type: 'text', text: 'Hello from layout' }],
          },
        ],
      });
      const updateData: UpdateLayoutDto = {
        name: 'Block Layout',
        controlValues: {
          email: {
            body: validMailyContent,
            editorType: 'block',
          },
        },
      };

      try {
        await novuClient.layouts.update(updateData, existingLayout.layoutId);
        expect.fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.statusCode).to.equal(400);
        expect(error.message).to.contain('The layout body should contain the "content" variable');
      }
    });

    it('should not allow HTML content when no content variable provided', async () => {
      const validHtmlContent = `
        <html>
          <head><title>Test Layout</title></head>
          <body>
            <div>Hello {{subscriber.firstName}}</div>
          </body>
        </html>
      `;
      const updateData: UpdateLayoutDto = {
        name: 'Block Layout',
        controlValues: {
          email: {
            body: validHtmlContent,
            editorType: 'html',
          },
        },
      };

      try {
        await novuClient.layouts.update(updateData, existingLayout.layoutId);
        expect.fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.statusCode).to.equal(400);
        expect(error.message).to.contain('The layout body should contain the "content" variable');
      }
    });

    it('should accept valid HTML content', async () => {
      const validHtmlContent = `
        <html>
          <head><title>Test Layout</title></head>
          <body>
            <div>Hello {{subscriber.firstName}}</div>
            <div>{{content}}</div>
          </body>
        </html>
      `;

      const updateData: UpdateLayoutDto = {
        name: 'Valid HTML Layout',
        controlValues: {
          email: {
            body: validHtmlContent,
            editorType: 'html',
          },
        },
      };

      const { result: updatedLayout } = await novuClient.layouts.update(updateData, existingLayout.layoutId);

      expect(updatedLayout.name).to.equal(updateData.name);
      expect(updatedLayout.controls.values.email?.body).to.eq(validHtmlContent);
      expect(updatedLayout.controls.values.email?.editorType).to.equal('html');
    });

    it('should accept valid Maily JSON content', async () => {
      const validMailyContent = JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: { textAlign: null, showIfKey: null },
            content: [
              { type: 'text', text: 'Hello from layout' },
              {
                type: 'variable',
                attrs: {
                  id: 'content',
                },
              },
            ],
          },
        ],
      });

      const updateData: UpdateLayoutDto = {
        name: 'Valid Block Layout',
        controlValues: {
          email: {
            body: validMailyContent,
            editorType: 'block',
          },
        },
      };

      const { result: updatedLayout } = await novuClient.layouts.update(updateData, existingLayout.layoutId);

      expect(updatedLayout.name).to.equal(updateData.name);
      expect(updatedLayout.controls.values.email?.body).to.equal(validMailyContent);
      expect(updatedLayout.controls.values.email?.editorType).to.equal('block');
    });

    it('should delete control values when set to null', async () => {
      const updateData: UpdateLayoutDto = {
        name: 'Layout with deleted controls',
        controlValues: {},
      };

      const { result: updatedLayout } = await novuClient.layouts.update(updateData, existingLayout.layoutId);

      expect(updatedLayout.name).to.equal(updateData.name);
      expect(updatedLayout.controls.values).to.deep.equal({});
    });
  });

  describe('Error Handling', () => {
    it('should return 404 when updating non-existent layout', async () => {
      const updateData: UpdateLayoutDto = {
        name: 'Non-existent Layout',
        controlValues: {
          email: {
            body: '<html><body><div>Content: {{content}}</div></body></html>',
            editorType: 'html',
          },
        },
      };

      try {
        await novuClient.layouts.update(updateData, 'non-existent-layout-id');
        expect.fail('Should have thrown 404 error');
      } catch (error: any) {
        expect(error.statusCode).to.equal(404);
      }
    });

    it('should return 400 for invalid layout data', async () => {
      try {
        await novuClient.layouts.create({
          layoutId: 'invalid-layout',
          name: '',
        } as CreateLayoutDto);
        expect.fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.statusCode).to.be.oneOf([400, 422]);
      }
    });
  });
});
