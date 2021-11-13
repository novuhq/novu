import { expect } from 'chai';
import { ChannelTypeEnum } from '@notifire/shared';
import { ContentService } from './content.service';

describe('ContentService', function () {
  describe('replaceVariables', function () {
    it('should replace duplicates entries', function () {
      const variables = {
        firstName: 'Name',
        lastName: 'Last Name',
      };

      const contentService = new ContentService();
      const modified = contentService.replaceVariables(
        '{{firstName}} is the first {{firstName}} of {{firstName}}',
        variables
      );
      expect(modified).to.equal('Name is the first Name of Name');
    });

    it('should replace multiple variables', function () {
      const variables = {
        firstName: 'Name',
        lastName: 'Last Name',
      };

      const contentService = new ContentService();
      const modified = contentService.replaceVariables(
        '{{firstName}} is the first {{lastName}} of {{firstName}}',
        variables
      );
      expect(modified).to.equal('Name is the first Last Name of Name');
    });

    it('should not manipulate variables for text without them', function () {
      const variables = {
        firstName: 'Name',
        lastName: 'Last Name',
      };

      const contentService = new ContentService();
      const modified = contentService.replaceVariables('This is a text without variables', variables);
      expect(modified).to.equal('This is a text without variables');
    });
  });

  describe('extractVariables', function () {
    it('should not find any variables', function () {
      const contentService = new ContentService();
      const extractVariables = contentService.extractVariables(
        'This is a text without variables {{ asdasdas }} {{ aasdasda sda{ {na}}'
      );
      expect(extractVariables.length).to.equal(0);
      expect(Array.isArray(extractVariables)).to.equal(true);
    });

    it('should extract all valid variables', function () {
      const contentService = new ContentService();
      const extractVariables = contentService.extractVariables(
        ' {{name}} d {{lastName}} dd {{_validName}} {{not valid}} aa {{0notValid}}tr {{organization_name}}'
      );
      expect(extractVariables.length).to.equal(4);
      expect(extractVariables).to.include('_validName');
      expect(extractVariables).to.include('lastName');
      expect(extractVariables).to.include('name');
      expect(extractVariables).to.include('organization_name');
    });
  });

  describe('extractMessageVariables', function () {
    it('should not extract variables', function () {
      const contentService = new ContentService();
      const variables = contentService.extractMessageVariables([
        {
          type: ChannelTypeEnum.IN_APP,
          subject: 'Test',
          content: 'Text',
        },
      ]);
      expect(variables.length).to.equal(0);
    });

    it('should extract subject variables', function () {
      const contentService = new ContentService();
      const variables = contentService.extractMessageVariables([
        {
          type: ChannelTypeEnum.EMAIL,
          subject: 'Test {{firstName}}',
          content: [],
        },
      ]);
      expect(variables.length).to.equal(2);
      expect(variables).to.include('firstName');
    });

    it('should add $phone when SMS channel Exists', function () {
      const contentService = new ContentService();
      const variables = contentService.extractMessageVariables([
        {
          type: ChannelTypeEnum.IN_APP,
          subject: 'Test',
          content: 'Text',
        },
        {
          type: ChannelTypeEnum.SMS,
          content: 'Text',
        },
      ]);
      expect(variables.length).to.equal(1);
      expect(variables[0]).to.equal('$phone');
    });

    it('should add $email when EMAIL channel Exists', function () {
      const contentService = new ContentService();
      const variables = contentService.extractMessageVariables([
        {
          type: ChannelTypeEnum.EMAIL,
          subject: 'Test',
          content: 'Text',
        },
        {
          type: ChannelTypeEnum.IN_APP,
          content: 'Text',
        },
      ]);
      expect(variables.length).to.equal(1);
      expect(variables[0]).to.equal('$email');
    });

    it('should extract email content variables', function () {
      const contentService = new ContentService();
      const variables = contentService.extractMessageVariables([
        {
          type: ChannelTypeEnum.EMAIL,
          subject: 'Test {{firstName}}',
          content: [
            {
              content: 'Test of {{lastName}}',
              type: 'text',
            },
            {
              content: 'Test of {{lastName}}',
              type: 'text',
              url: 'Test of {{url}}',
            },
          ],
        },
        {
          type: ChannelTypeEnum.EMAIL,
          subject: 'Test {{email}}',
          content: [
            {
              content: 'Test of {{lastName}}',
              type: 'text',
            },
            {
              content: 'Test of {{lastName}}',
              type: 'text',
              url: 'Test of {{url}}',
            },
          ],
        },
      ]);
      expect(variables.length).to.equal(5);
      expect(variables).to.include('lastName');
      expect(variables).to.include('url');
      expect(variables).to.include('firstName');
      expect(variables).to.include('email');
    });

    it('should extract in-app content variables', function () {
      const contentService = new ContentService();
      const variables = contentService.extractMessageVariables([
        {
          type: ChannelTypeEnum.IN_APP,
          content: '{{customVariables}}',
        },
      ]);

      expect(variables.length).to.equal(1);
      expect(variables).to.include('customVariables');
    });
  });
});
