import { StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { WorkflowTemplate } from './types';

export const usageLimitTemplate: WorkflowTemplate = {
  id: 'usage-threshold',
  name: 'Usage Threshold',
  description: 'Alert users about usage limits',
  category: 'operational',
  isPopular: true,
  workflowDefinition: {
    name: 'Usage Threshold',
    description: '',
    workflowId: 'usage-threshold',
    steps: [
      {
        name: 'In-App Step',
        type: StepTypeEnum.IN_APP,
        controlValues: {
          body: "You've reached your {{payload.threshold_name}} usage limit.",
          avatar: 'https://dashboard-v2.novu.co/images/warning.svg',
          subject: "Heads Up! You're Approaching Your Usage Limit",
          primaryAction: {
            label: 'Manage Usage',
            redirect: {
              target: '_self',
              url: '{{payload.manage_usage_link}}',
            },
          },
          redirect: {
            url: '',
            target: '_self',
          },
        },
      },
      {
        name: 'Email Step',
        type: StepTypeEnum.EMAIL,
        controlValues: {
          subject: "Heads Up! You're Approaching Your Usage Limit",
          body: '{"type":"doc","content":[{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"Hi "},{"type":"variable","attrs":{"id":"subscriber.firstName","label":null,"fallback":null,"required":false}},{"type":"text","text":" ,"}]},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","marks":[{"type":"textStyle","attrs":{"color":""}}],"text":"All good things come to an end... kind of. Your team\'s Novu trial does end in a week, but if you want to keep using features from your trial? Just make sure to add your billing details."}]},{"type":"section","attrs":{"borderRadius":6,"backgroundColor":"#f7f7f7","align":"left","borderWidth":0,"borderColor":"#e2e2e2","paddingTop":12,"paddingRight":12,"paddingBottom":12,"paddingLeft":12,"marginTop":0,"marginRight":0,"marginBottom":0,"marginLeft":0,"showIfKey":null},"content":[{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"You\'re now at "},{"type":"variable","attrs":{"id":"payload.percentage_used","label":null,"fallback":null,"required":false}},{"type":"text","text":"% of your usage limit."}]}]},{"type":"paragraph","attrs":{"textAlign":"left"}},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","marks":[{"type":"textStyle","attrs":{"color":""}}],"text":"If not, your team will get downgraded to "},{"type":"variable","attrs":{"id":"payload.plan","label":null,"fallback":null,"required":false}},{"type":"text","marks":[{"type":"textStyle","attrs":{"color":""}}],"text":" plan. You\'ll be able to continue to send notifications in "},{"type":"variable","attrs":{"id":"payload.application","label":null,"fallback":null,"required":false}},{"type":"text","marks":[{"type":"textStyle","attrs":{"color":""}}],"text":", but without all the power you had during your trial."},{"type":"hardBreak","marks":[{"type":"textStyle","attrs":{"color":""}}]},{"type":"hardBreak","marks":[{"type":"textStyle","attrs":{"color":""}}]},{"type":"text","marks":[{"type":"textStyle","attrs":{"color":""}}],"text":"Got questions? We\'re here to help — "},{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"#615AF1"}},{"type":"bold"}],"text":"just reach out."},{"type":"hardBreak","marks":[{"type":"textStyle","attrs":{"color":""}}]}]},{"type":"button","attrs":{"text":"Manage Usage","isTextVariable":false,"url":"payload.manage_usage_link","isUrlVariable":true,"alignment":"center","variant":"filled","borderRadius":"smooth","buttonColor":"#615AF1","textColor":"#ffffff","showIfKey":null}},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"Best,"},{"type":"hardBreak"},{"type":"text","text":"The [Company Name] Team"}]},{"type":"horizontalRule"},{"type":"footer","attrs":{"textAlign":"center","maily-component":"footer"},"content":[{"type":"text","marks":[{"type":"textStyle","attrs":{"color":""}}],"text":"Novu, Inc., "},{"type":"hardBreak","marks":[{"type":"textStyle","attrs":{"color":""}}]},{"type":"text","marks":[{"type":"textStyle","attrs":{"color":""}}],"text":"1209 Orange Street, Wilmington, DE 19801, United States"}]}]}',
        },
      },
      {
        name: 'Chat Step',
        type: StepTypeEnum.CHAT,
        controlValues: {
          body: "You've Reached Your {{payload.threshold_name}} Limit.\n\nTo ensure uninterrupted service, consider upgrading or managing your usage: {{payload.manage_usage_link}}",
        },
      },
    ],
    tags: [],
    active: true,
    __source: WorkflowCreationSourceEnum.TEMPLATE_STORE,
  },
};
