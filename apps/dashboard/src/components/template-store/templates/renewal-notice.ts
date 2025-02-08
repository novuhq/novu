import { StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { WorkflowTemplate } from './types';

export const renewalNoticeTemplate: WorkflowTemplate = {
  id: 'subscription-renewal-approaching',
  name: 'Upcoming Renewal Notice',
  description: 'Remind users about subscription renewals',
  category: 'billing',
  isPopular: false,
  workflowDefinition: {
    name: 'Upcoming Renewal Notice',
    description: '',
    workflowId: 'subscription-renewal-approaching',
    steps: [
      {
        name: 'Email Step',
        type: StepTypeEnum.EMAIL,
        controlValues: {
          subject: 'Upcoming Renewal Notice - {{payload.product}}',
          body: '{"type":"doc","content":[{"type":"section","attrs":{"borderRadius":0,"backgroundColor":"#f4f4f4","align":"left","borderWidth":2,"borderColor":"#e2e2e2","paddingTop":5,"paddingRight":5,"paddingBottom":5,"paddingLeft":5,"marginTop":0,"marginRight":0,"marginBottom":0,"marginLeft":0,"showIfKey":null},"content":[{"type":"paragraph","attrs":{"textAlign":"left"}},{"type":"section","attrs":{"borderRadius":0,"backgroundColor":"#ffffff","align":"left","borderWidth":2,"borderColor":"#e2e2e2","paddingTop":5,"paddingRight":5,"paddingBottom":5,"paddingLeft":5,"marginTop":0,"marginRight":0,"marginBottom":0,"marginLeft":0,"showIfKey":null},"content":[{"type":"image","attrs":{"src":"https://github.com/novuhq/blog/blob/main/media-assets/5f1528e4a6109a09086e396b5c9d43cb.png?raw=true","alt":null,"title":null,"width":113,"height":84.84025559105432,"alignment":"left","externalLink":null,"isExternalLinkVariable":false,"isSrcVariable":false,"showIfKey":null}},{"type":"horizontalRule"},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"Hey "},{"type":"variable","attrs":{"id":"subscriber.firstName","label":null,"fallback":null,"required":false}},{"type":"text","text":","}]},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"The support team received your request to reset your password. Click the button below to get started."}]},{"type":"button","attrs":{"text":"Reset Password","isTextVariable":false,"url":"https://{{payload.password_reset_link}}","isUrlVariable":false,"alignment":"center","variant":"filled","borderRadius":"smooth","buttonColor":"#cd5141","textColor":"#ffffff","showIfKey":null}},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"If it doesn\'t work, you can copy and paste the following link in your browser:"}]},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"variable","attrs":{"id":"payload.password_reset_link","label":null,"fallback":null,"required":false}}]},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"This link is valid for "},{"type":"variable","attrs":{"id":"payload.expiration_hours","label":null,"fallback":null,"required":false}},{"type":"text","text":" or until it is used."}]},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"Regards,"}]},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"Acme team"}]}]},{"type":"paragraph","attrs":{"textAlign":"left"}},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"Delivered by Acme 600 Harrison Street, 3rd Floor, San Francisco, CA 94107."}]}]}]}',
        },
      },
    ],
    tags: ['billing'],
    active: true,
    __source: WorkflowCreationSourceEnum.TEMPLATE_STORE,
  },
};
