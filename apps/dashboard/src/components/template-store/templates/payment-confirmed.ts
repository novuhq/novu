import { StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { WorkflowTemplate } from './types';

export const paymentConfirmedTemplate: WorkflowTemplate = {
  id: 'payment-confirmed',
  name: 'Payment Confirmed',
  description: 'Send payment confirmations with receipts',
  category: 'billing',
  isPopular: true,
  workflowDefinition: {
    name: 'Payment Confirmed',
    description: '',
    workflowId: 'payment-confirmed',
    steps: [
      {
        name: 'In-App Step',
        type: StepTypeEnum.IN_APP,
        controlValues: {
          body: 'Your payment of **{{payload.amount}}** for **Acme {{payload.tier}}** has been processed.',
          avatar: '',
          subject: 'Payment Successful!',
          primaryAction: {
            label: 'View Receipt',
            redirect: {
              target: '_self',
              url: '{{payload.receipt_link}}',
            },
          },
          redirect: {
            url: '{{payload.receipt_link}}',
            target: '_self',
          },
        },
      },
      {
        name: 'Email Step',
        type: StepTypeEnum.EMAIL,
        controlValues: {
          subject: 'Payment Confirmed - Thank You for Your Purchase!',
          body: '{"type":"doc","content":[{"type":"image","attrs":{"src":"https://github.com/novuhq/blog/blob/main/media-assets/5f1528e4a6109a09086e396b5c9d43cb.png?raw=true","alt":null,"title":null,"width":167,"height":125,"alignment":"center","externalLink":null,"isExternalLinkVariable":false,"isSrcVariable":false,"showIfKey":null}},{"type":"horizontalRule"},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"Hi "},{"type":"variable","attrs":{"id":"subscriber.firstName","label":null,"fallback":null,"required":false}},{"type":"text","text":","}]},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"We\'re happy to let you know that your payment for Acme "},{"type":"variable","attrs":{"id":"payload.tier","label":null,"fallback":null,"required":false}},{"type":"text","text":" has been successfully processed."}]},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","marks":[{"type":"bold"}],"text":"Details:"}]},{"type":"bulletList","content":[{"type":"listItem","attrs":{"color":""},"content":[{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"Amount: "},{"type":"variable","attrs":{"id":"payload.amount","label":null,"fallback":null,"required":false}}]}]},{"type":"listItem","attrs":{"color":""},"content":[{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"Payment Method: "},{"type":"variable","attrs":{"id":"payload.payment_method","label":null,"fallback":null,"required":false}}]}]},{"type":"listItem","attrs":{"color":""},"content":[{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"Date: "},{"type":"variable","attrs":{"id":"payload.payment_date","label":null,"fallback":null,"required":false}}]}]},{"type":"listItem","attrs":{"color":""},"content":[{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"Order ID: "},{"type":"variable","attrs":{"id":"payload.order_id","label":null,"fallback":null,"required":false}}]}]}]},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"If you have any questions or need assistance, feel free to reach out."}]},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"Thank you for your continued trust in Acme!"}]},{"type":"horizontalRule"},{"type":"button","attrs":{"text":"View Receipt","isTextVariable":false,"url":"payload.receipt","isUrlVariable":true,"alignment":"center","variant":"filled","borderRadius":"smooth","buttonColor":"#cd5141","textColor":"#ffffff","showIfKey":null}}]}',
        },
      },
    ],
    tags: ['billing'],
    active: true,
    __source: WorkflowCreationSourceEnum.TEMPLATE_STORE,
  },
};
