import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import { Novu } from '@novu/api';
import { ChannelTypeEnum } from '@novu/shared';
import { EnvironmentRepository, LayoutRepository } from '@novu/dal';

import { initNovuClassSdkInternalAuth } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';
import { CreateLayoutDto } from '../dtos';
import { LayoutCreationSourceEnum } from '../types';

describe('Preview Layout #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;
  let layoutRepository: LayoutRepository;
  let environmentRepository: EnvironmentRepository;

  beforeEach(async () => {
    // @ts-ignore
    process.env.IS_LAYOUTS_PAGE_ACTIVE = 'true';
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdkInternalAuth(session);
    layoutRepository = new LayoutRepository();
    environmentRepository = new EnvironmentRepository();

    await environmentRepository.updateOne(
      {
        _id: session.environment._id,
      },
      {
        bridge: { url: `http://localhost:${process.env.PORT}/v1/environments/${session.environment._id}/bridge` },
      }
    );
  });

  describe('Layout Preview - POST /v2/layouts/:layoutId/preview', () => {
    let htmlLayout: any;
    let blockLayout: any;

    beforeEach(async () => {
      // Create HTML layout for testing
      const htmlLayoutData: CreateLayoutDto = {
        layoutId: 'html-layout-preview-test',
        name: 'HTML Layout Preview Test',
        __source: LayoutCreationSourceEnum.DASHBOARD,
      };

      const { result: createdHtmlLayout } = await novuClient.layouts.create(htmlLayoutData);
      htmlLayout = createdHtmlLayout;

      // Update HTML layout with valid content
      await novuClient.layouts.update(
        {
          name: 'HTML Layout Preview Test',
          controlValues: {
            email: {
              body: `
                <html>
                  <head><title>Test HTML Layout</title></head>
                  <body>
                    <div style="font-family: Arial, sans-serif;">
                      <h1>Welcome {{subscriber.firstName}}!</h1>
                      <div class="content">
                        {{content}}
                      </div>
                      <footer>
                        <p>Best regards, The Team</p>
                      </footer>
                    </div>
                  </body>
                </html>
              `,
              editorType: 'html',
            },
          },
        },
        htmlLayout.layoutId
      );

      // Create Block layout for testing
      const blockLayoutData: CreateLayoutDto = {
        layoutId: 'block-layout-preview-test',
        name: 'Block Layout Preview Test',
        __source: LayoutCreationSourceEnum.DASHBOARD,
      };

      const { result: createdBlockLayout } = await novuClient.layouts.create(blockLayoutData);
      blockLayout = createdBlockLayout;

      // Update Block layout with valid Maily JSON content
      const validMailyContent = JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1, textAlign: null, showIfKey: null },
            content: [
              { type: 'text', text: 'Welcome ' },
              {
                type: 'variable',
                attrs: { id: 'subscriber.firstName', fallback: 'there' },
              },
              { type: 'text', text: '!' },
            ],
          },
          {
            type: 'paragraph',
            attrs: { textAlign: null, showIfKey: null },
            content: [
              {
                type: 'variable',
                attrs: { id: 'content' },
              },
            ],
          },
          {
            type: 'paragraph',
            attrs: { textAlign: null, showIfKey: null },
            content: [{ type: 'text', text: 'Best regards, The Team' }],
          },
        ],
      });

      await novuClient.layouts.update(
        {
          name: 'Block Layout Preview Test',
          controlValues: {
            email: {
              body: validMailyContent,
              editorType: 'block',
            },
          },
        },
        blockLayout.layoutId
      );
    });

    it('should successfully preview HTML layout with default values', async () => {
      const previewRequest = {};

      const { result } = await novuClient.layouts.generatePreview(previewRequest, htmlLayout.layoutId);

      expect(result).to.exist;
      expect(result.result.type).to.equal(ChannelTypeEnum.EMAIL);
      expect(result.result.preview).to.exist;
      expect(result.result.preview?.body).to.be.a('string');
      expect(result.result.preview?.body).to.contain('<html>');
      expect(result.previewPayloadExample).to.exist;
      expect(result.previewPayloadExample).to.be.an('object');
    });

    it('should successfully preview Block layout with default values', async () => {
      const previewRequest = {};

      const { result } = await novuClient.layouts.generatePreview(previewRequest, blockLayout.layoutId);

      expect(result).to.exist;
      expect(result.result.type).to.equal(ChannelTypeEnum.EMAIL);
      expect(result.result.preview).to.exist;
      expect(result.result.preview?.body).to.be.a('string');
      expect(result.previewPayloadExample).to.exist;
      expect(result.previewPayloadExample).to.be.an('object');
    });

    it('should preview HTML layout with custom control values', async () => {
      const customHtmlContent = `
        <html>
          <head><title>Custom Preview</title></head>
          <body>
            <div style="background-color: #f0f0f0; padding: 20px;">
              <h2>Custom HTML Content</h2>
              <p>Hello {{subscriber.firstName}} {{subscriber.lastName}}!</p>
              <div>{{content}}</div>
              <p>Custom footer message</p>
            </div>
          </body>
        </html>
      `;

      const previewRequest = {
        controlValues: {
          email: {
            body: customHtmlContent,
            editorType: 'html',
          },
        },
      };

      const { result } = await novuClient.layouts.generatePreview(previewRequest, htmlLayout.layoutId);

      expect(result.result.preview?.body).to.contain('Custom HTML Content');
      expect(result.result.preview?.body).to.contain('background-color: #f0f0f0');
      expect(result.result.preview?.body).to.contain('<html>');
    });

    it('should preview Block layout with custom control values', async () => {
      const customBlockContent = JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2, textAlign: 'center', showIfKey: null },
            content: [{ type: 'text', text: 'Custom Block Layout Preview' }],
          },
          {
            type: 'paragraph',
            attrs: { textAlign: null, showIfKey: null },
            content: [
              { type: 'text', text: 'Hello ' },
              {
                type: 'variable',
                attrs: { id: 'subscriber.firstName', fallback: 'User' },
              },
              { type: 'text', text: '!' },
            ],
          },
          {
            type: 'paragraph',
            attrs: { textAlign: null, showIfKey: null },
            content: [
              {
                type: 'variable',
                attrs: { id: 'content' },
              },
            ],
          },
        ],
      });

      const previewRequest = {
        controlValues: {
          email: {
            body: customBlockContent,
            editorType: 'block',
          },
        },
      };

      const { result } = await novuClient.layouts.generatePreview(previewRequest, blockLayout.layoutId);

      expect(result.result.preview?.body).to.be.a('string');
      expect(result.result.type).to.equal(ChannelTypeEnum.EMAIL);
    });

    it('should preview with custom payload example', async () => {
      const previewRequest = {
        previewPayload: {
          subscriber: {
            avatar: 'https://example.com/avatar.png',
            data: {},
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            locale: 'en-US',
            phone: '+1234567890',
          },
        },
      };

      const { result } = await novuClient.layouts.generatePreview(previewRequest, htmlLayout.layoutId);

      expect(result.result.preview?.body).to.exist;
      expect(result.previewPayloadExample).to.deep.include(previewRequest.previewPayload);
    });

    it('should preview with both custom control values and payload', async () => {
      const customHtmlContent = `
        <html>
          <body>
            <h1>Hello {{subscriber.firstName}} {{subscriber.lastName}}!</h1>
            <p>Email: {{subscriber.email}}</p>
            <div class="main-content">{{content}}</div>
          </body>
        </html>
      `;

      const previewRequest = {
        controlValues: {
          email: {
            body: customHtmlContent,
            editorType: 'html',
          },
        },
        previewPayload: {
          subscriber: {
            avatar: 'https://example.com/avatar.png',
            data: {},
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@example.com',
            locale: 'en-US',
            phone: '+1234567890',
          },
        },
      };

      const { result } = await novuClient.layouts.generatePreview(previewRequest, htmlLayout.layoutId);

      expect(result.result.preview?.body).to.contain('<h1>');
      expect(result.result.preview?.body).to.contain('main-content');
      expect(result.previewPayloadExample.subscriber).to.deep.equal(previewRequest.previewPayload.subscriber);
    });

    it('should handle empty control values gracefully', async () => {
      const previewRequest = {
        controlValues: {},
      };

      const { result } = await novuClient.layouts.generatePreview(previewRequest, htmlLayout.layoutId);

      expect(result).to.exist;
      expect(result.result.type).to.equal(ChannelTypeEnum.EMAIL);
      expect(result.previewPayloadExample).to.exist;
    });

    it('should handle missing previewPayload gracefully', async () => {
      const previewRequest = {
        controlValues: {
          email: {
            body: '<html><body><h1>Test</h1>{{content}}</body></html>',
            editorType: 'html',
          },
        },
      };

      const { result } = await novuClient.layouts.generatePreview(previewRequest, htmlLayout.layoutId);

      expect(result).to.exist;
      expect(result.result.type).to.equal(ChannelTypeEnum.EMAIL);
      expect(result.result.preview?.body).to.contain('<h1>Test</h1>');
    });

    it('should handle completely empty request', async () => {
      const previewRequest = {};

      const { result } = await novuClient.layouts.generatePreview(previewRequest, htmlLayout.layoutId);

      expect(result).to.exist;
      expect(result.result.type).to.equal(ChannelTypeEnum.EMAIL);
      expect(result.previewPayloadExample).to.exist;
    });

    describe('Error Handling', () => {
      it('should return 404 when previewing non-existent layout', async () => {
        const previewRequest = {
          controlValues: {
            email: {
              body: '<html><body>{{content}}</body></html>',
              editorType: 'html',
            },
          },
        };

        try {
          await novuClient.layouts.generatePreview(previewRequest, 'non-existent-layout-id');
          expect.fail('Should have thrown 404 error');
        } catch (error: any) {
          expect(error.statusCode).to.equal(404);
        }
      });

      it('should handle invalid HTML content gracefully', async () => {
        const previewRequest = {
          controlValues: {
            email: {
              body: 'Invalid HTML without content variable',
              editorType: 'html',
            },
          },
        };

        // The preview should still work but may not render optimally
        const { result } = await novuClient.layouts.generatePreview(previewRequest, htmlLayout.layoutId);

        expect(result).to.exist;
        expect(result.result.type).to.equal(ChannelTypeEnum.EMAIL);
      });

      it('should handle invalid JSON content gracefully', async () => {
        const previewRequest = {
          controlValues: {
            email: {
              body: 'Invalid JSON content',
              editorType: 'block',
            },
          },
        };

        // The preview should still work but may not render optimally
        const { result } = await novuClient.layouts.generatePreview(previewRequest, blockLayout.layoutId);

        expect(result).to.exist;
        expect(result.result.type).to.equal(ChannelTypeEnum.EMAIL);
      });

      it('should handle malformed subscriber payload gracefully', async () => {
        const previewRequest = {
          previewPayload: {
            subscriber: {
              firstName: 'Alice',
              lastName: 'Johnson',
              email: 'alice@example.com',
              accountType: 'Premium',
            },
          },
        };

        const { result } = await novuClient.layouts.generatePreview(previewRequest, htmlLayout.layoutId);

        expect(result).to.exist;
        expect(result.result.type).to.equal(ChannelTypeEnum.EMAIL);
      });
    });

    describe('Editor Type Specific Tests', () => {
      it('should properly render HTML with complex structure', async () => {
        const complexHtmlContent = `
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Complex HTML Layout</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
              .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
              .content { margin: 20px 0; padding: 20px; border: 1px solid #ddd; }
              .footer { background-color: #f8f9fa; padding: 10px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Welcome {{subscriber.firstName}}!</h1>
            </div>
            <div class="content">
              {{content}}
            </div>
            <div class="footer">
              <p>Thank you for using our service!</p>
            </div>
          </body>
          </html>
        `;

        const previewRequest = {
          controlValues: {
            email: {
              body: complexHtmlContent,
              editorType: 'html',
            },
          },
          previewPayload: {
            subscriber: {
              firstName: 'Alice',
            },
          },
        };

        const { result } = await novuClient.layouts.generatePreview(previewRequest, htmlLayout.layoutId);

        expect(result.result.preview?.body).to.contain('class="header"');
        expect(result.result.preview?.body).to.contain('Welcome Alice!');
        expect(result.result.preview?.body).to.contain('class="content"');
        expect(result.result.preview?.body).to.contain('class="footer"');
      });

      it('should properly render Block content with various node types', async () => {
        const complexBlockContent = JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1, textAlign: 'center', showIfKey: null },
              content: [
                { type: 'text', text: 'Welcome ' },
                {
                  type: 'variable',
                  attrs: { id: 'subscriber.firstName', fallback: 'User' },
                },
              ],
            },
            {
              type: 'paragraph',
              attrs: { textAlign: null, showIfKey: null },
              content: [
                { type: 'text', text: 'This is a ' },
                { type: 'text', marks: [{ type: 'bold' }], text: 'bold' },
                { type: 'text', text: ' and ' },
                { type: 'text', marks: [{ type: 'italic' }], text: 'italic' },
                { type: 'text', text: ' text example.' },
              ],
            },
            {
              type: 'bulletList',
              content: [
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      attrs: { textAlign: null, showIfKey: null },
                      content: [{ type: 'text', text: 'First item' }],
                    },
                  ],
                },
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      attrs: { textAlign: null, showIfKey: null },
                      content: [{ type: 'text', text: 'Second item' }],
                    },
                  ],
                },
              ],
            },
            {
              type: 'paragraph',
              attrs: { textAlign: null, showIfKey: null },
              content: [
                {
                  type: 'variable',
                  attrs: { id: 'content' },
                },
              ],
            },
          ],
        });

        const previewRequest = {
          controlValues: {
            email: {
              body: complexBlockContent,
              editorType: 'block',
            },
          },
        };

        const { result } = await novuClient.layouts.generatePreview(previewRequest, blockLayout.layoutId);

        expect(result.result.preview?.body).to.be.a('string');
        expect(result.result.type).to.equal(ChannelTypeEnum.EMAIL);
      });

      it('should handle mixed variable types in HTML', async () => {
        const htmlWithVariables = `
          <html>
            <body>
              <h1>Hello {{subscriber.firstName}} {{subscriber.lastName}}!</h1>
              <p>Your email: {{subscriber.email}}</p>
              <p>Account type: {{subscriber.accountType}}</p>
              <div>
                {{content}}
              </div>
              <p>Date: {{currentDate}}</p>
            </body>
          </html>
        `;

        const previewRequest = {
          controlValues: {
            email: {
              body: htmlWithVariables,
              editorType: 'html',
            },
          },
          previewPayload: {
            subscriber: {
              firstName: 'Alice',
              lastName: 'Johnson',
              email: 'alice@example.com',
              accountType: 'Premium',
            },
          },
        };

        const { result } = await novuClient.layouts.generatePreview(previewRequest, htmlLayout.layoutId);

        expect(result.result.preview?.body).to.contain('<h1>');
        expect(result.result.preview?.body).to.contain('<p>');
        expect(result.previewPayloadExample?.subscriber?.firstName).to.equal('Alice');
      });

      it('should handle conditional content in Block editor', async () => {
        const conditionalBlockContent = JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              attrs: { textAlign: null, showIfKey: 'subscriber.isPremium' },
              content: [
                { type: 'text', text: 'Premium content: ' },
                {
                  type: 'variable',
                  attrs: { id: 'premiumMessage', fallback: 'Premium features available' },
                },
              ],
            },
            {
              type: 'paragraph',
              attrs: { textAlign: null, showIfKey: null },
              content: [
                {
                  type: 'variable',
                  attrs: { id: 'content' },
                },
              ],
            },
          ],
        });

        const previewRequest = {
          controlValues: {
            email: {
              body: conditionalBlockContent,
              editorType: 'block',
            },
          },
        };

        const { result } = await novuClient.layouts.generatePreview(previewRequest, blockLayout.layoutId);

        expect(result.result.preview?.body).to.be.a('string');
        expect(result.result.type).to.equal(ChannelTypeEnum.EMAIL);
      });
    });

    describe('Performance and Edge Cases', () => {
      it('should handle very large HTML content', async () => {
        const largeHtmlContent = `
          <html>
            <body>
              ${'<p>Large content block</p>'.repeat(100)}
              {{content}}
              ${'<div>More content</div>'.repeat(50)}
            </body>
          </html>
        `;

        const previewRequest = {
          controlValues: {
            email: {
              body: largeHtmlContent,
              editorType: 'html',
            },
          },
        };

        const { result } = await novuClient.layouts.generatePreview(previewRequest, htmlLayout.layoutId);

        expect(result.result.preview?.body).to.be.a('string');
        expect(result.result.preview?.body.length).to.be.greaterThan(1000);
      });

      it('should handle very large Block content', async () => {
        const paragraphs = Array.from({ length: 50 }, (_, i) => ({
          type: 'paragraph',
          attrs: { textAlign: null, showIfKey: null },
          content: [{ type: 'text', text: `Paragraph ${i + 1} with some content.` }],
        }));

        const largeBlockContent = JSON.stringify({
          type: 'doc',
          content: [
            ...paragraphs,
            {
              type: 'paragraph',
              attrs: { textAlign: null, showIfKey: null },
              content: [
                {
                  type: 'variable',
                  attrs: { id: 'content' },
                },
              ],
            },
          ],
        });

        const previewRequest = {
          controlValues: {
            email: {
              body: largeBlockContent,
              editorType: 'block',
            },
          },
        };

        const { result } = await novuClient.layouts.generatePreview(previewRequest, blockLayout.layoutId);

        expect(result.result.preview?.body).to.be.a('string');
        expect(result.result.type).to.equal(ChannelTypeEnum.EMAIL);
      });

      it('should handle special characters in content', async () => {
        const htmlWithSpecialChars = `
          <html>
            <body>
              <h1>Special Characters: &amp; &lt; &gt; &quot; &#39;</h1>
              <p>Unicode: 🎉 ✨ 🚀 emojis and accents</p>
              {{content}}
            </body>
          </html>
        `;

        const previewRequest = {
          controlValues: {
            email: {
              body: htmlWithSpecialChars,
              editorType: 'html',
            },
          },
        };

        const { result } = await novuClient.layouts.generatePreview(previewRequest, htmlLayout.layoutId);

        expect(result.result.preview?.body).to.contain('&amp;');
        expect(result.result.preview?.body).to.contain('🎉');
      });
    });
  });
});
