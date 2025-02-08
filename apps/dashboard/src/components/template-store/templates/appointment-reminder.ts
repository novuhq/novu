import { StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { WorkflowTemplate } from './types';

export const appointmentReminderTemplate: WorkflowTemplate = {
  id: 'clinic-appointment-reminder',
  name: 'Clinic Appointment Reminder',
  description: 'Streamline healthcare appointments with timely reminders and post-visit feedback collection',
  category: 'operational',
  isPopular: false,
  workflowDefinition: {
    name: 'Clinic Appointment Reminder',
    description:
      'The workflow reminds the patient about the upcoming appointment and also prompt for feedback after the appointment.',
    workflowId: 'clinic-appointment-reminder',
    steps: [
      {
        name: 'Email Step',
        type: StepTypeEnum.EMAIL,
        controlValues: {
          body: '{"type":"doc","content":[{"type":"image","attrs":{"src":"http://img.freepik.com/free-vector/health-care-logo-icon_125964-471.jpg?ga=GA1.1.747163298.1730994384&semt=ais_hybrid","alt":null,"title":null,"width":136,"height":136,"alignment":"center","externalLink":null,"isExternalLinkVariable":false,"isSrcVariable":false,"showIfKey":null}},{"type":"heading","attrs":{"textAlign":"left","level":3},"content":[{"type":"text","text":"See you soon, "},{"type":"variable","attrs":{"id":"subscriber.firstName","label":null,"fallback":null,"required":false}},{"type":"text","text":" !"}]},{"type":"horizontalRule"},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"#000000"}}],"text":"This is a reminder about the appointment you have scheduled in our clinic."}]},{"type":"section","attrs":{"borderRadius":0,"backgroundColor":"","align":"left","borderWidth":0,"borderColor":"","paddingTop":0,"paddingRight":0,"paddingBottom":0,"paddingLeft":0,"marginTop":0,"marginRight":0,"marginBottom":0,"marginLeft":0,"showIfKey":null},"content":[{"type":"section","attrs":{"borderRadius":6,"backgroundColor":"#f5f5f5","align":"left","borderWidth":0,"borderColor":"#e2e2e2","paddingTop":12,"paddingRight":12,"paddingBottom":12,"paddingLeft":12,"marginTop":0,"marginRight":0,"marginBottom":0,"marginLeft":0,"showIfKey":null},"content":[{"type":"section","attrs":{"borderRadius":0,"backgroundColor":"","align":"left","borderWidth":0,"borderColor":"","paddingTop":0,"paddingRight":0,"paddingBottom":0,"paddingLeft":0,"marginTop":0,"marginRight":0,"marginBottom":0,"marginLeft":0,"showIfKey":null},"content":[{"type":"section","attrs":{"borderRadius":6,"backgroundColor":"","align":"left","borderWidth":0,"borderColor":"","paddingTop":0,"paddingRight":0,"paddingBottom":0,"paddingLeft":0,"marginTop":0,"marginRight":0,"marginBottom":0,"marginLeft":0,"showIfKey":null},"content":[{"type":"columns","attrs":{"showIfKey":null,"gap":8},"content":[{"type":"column","attrs":{"columnId":"b3e24c39-bc09-4e95-b267-8c73b6a3e69b","width":"auto","verticalAlign":"top"},"content":[{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","marks":[{"type":"bold"}],"text":"Appointment date"},{"type":"hardBreak"},{"type":"variable","attrs":{"id":"payload.appointment_date","label":null,"fallback":"Monday, 16 November at 11:00","required":true}},{"type":"text","text":" "}]},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","marks":[{"type":"bold"}],"text":"Appointment with"},{"type":"hardBreak"},{"type":"variable","attrs":{"id":"payload.assigned_doctor","label":null,"fallback":null,"required":false}},{"type":"text","text":" "}]}]},{"type":"column","attrs":{"columnId":"35f83ecc-9254-4a1a-a554-325b8572b78e","width":"auto","verticalAlign":"top"},"content":[{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","marks":[{"type":"bold"}],"text":"Appointment Type"},{"type":"hardBreak"},{"type":"variable","attrs":{"id":"payload.appointment_type","label":null,"fallback":null,"required":true}}]},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","marks":[{"type":"bold"}],"text":"Appointment at"},{"type":"hardBreak"},{"type":"variable","attrs":{"id":"payload.clinic_address","label":null,"fallback":null,"required":false}},{"type":"text","text":" "}]}]}]}]}]}]},{"type":"footer","attrs":{"textAlign":"left","maily-component":"footer"}},{"type":"horizontalRule"},{"type":"footer","attrs":{"textAlign":"left","maily-component":"footer"},"content":[{"type":"text","text":"You\'re receiving this email, as you have an appointment services booked with us, please follow "},{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"#0062ff"}},{"type":"underline"}],"text":"this"},{"type":"text","text":" link to "},{"type":"text","marks":[{"type":"underline"}],"text":"reschedule"},{"type":"text","text":" or "},{"type":"text","marks":[{"type":"underline"}],"text":"cancel"},{"type":"text","text":" the appointment. "}]}]}]}',
          subject: 'Reminder: Upcoming Appointment on {{payload.appointment_date}}',
        },
      },
      {
        name: 'Delay Step',
        type: StepTypeEnum.DELAY,
        controlValues: {
          amount: 5,
          unit: 'days',
          type: 'regular',
        },
      },
      {
        name: 'SMS Step',
        type: StepTypeEnum.SMS,
        controlValues: {
          body: 'Hey {{subscriber.firstName}}, this is {{payload.assigned_doctor}}. \nJust a reminder, we meet in 48 hours for your appointment at {{payload.clinic_name}}.',
        },
      },
      {
        name: 'Delay Step',
        type: StepTypeEnum.DELAY,
        controlValues: {
          amount: 24,
          unit: 'hours',
          type: 'regular',
        },
      },
      {
        name: 'SMS Step',
        type: StepTypeEnum.SMS,
        controlValues: {
          body: 'Hi {{subscriber.firstName}}, your appointment is tomorrow at {{payload.clinic_name}}.\n\nPlease note the following parking instructions:\n\n{{payload.parking_instructions}}\n\nSee you soon!',
        },
      },
      {
        name: 'Delay Step',
        type: StepTypeEnum.DELAY,
        controlValues: {
          amount: 2,
          unit: 'days',
          type: 'regular',
        },
      },
      {
        name: 'Email Step',
        type: StepTypeEnum.EMAIL,
        controlValues: {
          body: '{"type":"doc","content":[{"type":"image","attrs":{"src":"https://img.freepik.com/free-vector/health-care-logo-icon_125964-471.jpg?ga=GA1.1.747163298.1730994384&semt=ais_hybrid","alt":null,"title":null,"width":160,"height":160,"alignment":"center","externalLink":null,"isExternalLinkVariable":false,"isSrcVariable":false,"showIfKey":null}},{"type":"horizontalRule"},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"Hi "},{"type":"variable","attrs":{"id":"subscriber.firstName","label":null,"fallback":"John","required":false}},{"type":"text","text":","}]},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"We hope your appointment with "},{"type":"variable","attrs":{"id":"payload.assigned_doctor","label":null,"fallback":null,"required":false}},{"type":"text","text":" went well. We would love to hear your feedback to help us improve."}]},{"type":"button","attrs":{"text":"60 Seconds Survey ","isTextVariable":false,"url":"payload.feedback_link","isUrlVariable":true,"alignment":"center","variant":"filled","borderRadius":"smooth","buttonColor":"#55b2d3","textColor":"#ffffff","showIfKey":null}},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"Thank you for choosing "},{"type":"variable","attrs":{"id":"payload.clinic_name","label":null,"fallback":null,"required":false}},{"type":"text","text":". We look forward to seeing you again."}]},{"type":"horizontalRule"},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"Stay healthy!"}]},{"type":"paragraph","attrs":{"textAlign":"center"}},{"type":"footer","attrs":{"textAlign":"left","maily-component":"footer"},"content":[{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"#b2b3b4"}}],"text":"This is a mandatory service email to keep you informed about important updates related to your account at "},{"type":"variable","attrs":{"id":"payload.clinic_name","label":null,"fallback":null,"required":false}}]}]}',
          subject: 'How was your appointment at {{payload.clinic_name}} clinic?',
        },
      },
    ],
    tags: ['reminders'],
    active: true,
    __source: WorkflowCreationSourceEnum.TEMPLATE_STORE,
  },
};
