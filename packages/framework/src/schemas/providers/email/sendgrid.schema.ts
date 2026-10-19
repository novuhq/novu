import type { JsonSchema } from '../../../types/schema.types';

/**
 * Sendgrid `POST /v3/mail/send` schema
 *
 * @see https://www.twilio.com/docs/sendgrid/api-reference/mail-send
 */
const sendgridOutputSchema = {
  type: 'object',
  properties: {
    personalizations: {
      type: 'array',
      description:
        'An array of messages and their metadata. Each object within personalizations can be thought of as an envelope - it defines who should receive an individual message and how that message should be handled. See our [Personalizations documentation](https://sendgrid.com/docs/for-developers/sending-email/personalizations/) for examples.',
      uniqueItems: false,
      maxItems: 1000,
      items: {
        type: 'object',
        properties: {
          from: {
            title: 'From Email Object',
            type: 'object',
            properties: {
              email: {
                type: 'string',
                format: 'email',
                description:
                  "The 'From' email address used to deliver the message. This address should be a verified sender in your Twilio SendGrid account.",
              },
              name: {
                type: 'string',
                description: 'A name or title associated with the sending email address.',
              },
            },
            required: ['email'],
          },
          to: {
            title: 'To Email Array',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                  description: "The intended recipient's email address.",
                },
                name: {
                  type: 'string',
                  description: "The intended recipient's name.",
                },
              },
              required: ['email'],
            },
          },
          cc: {
            type: 'array',
            description:
              "An array of recipients who will receive a copy of your email. Each object in this array must contain the recipient's email address. Each object in the array may optionally contain the recipient's name.",
            maxItems: 1000,
            items: {
              title: 'CC BCC Email Object',
              type: 'object',
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                  description: "The intended recipient's email address.",
                },
                name: {
                  type: 'string',
                  description: "The intended recipient's name.",
                },
              },
              required: ['email'],
            },
          },
          bcc: {
            type: 'array',
            description:
              "An array of recipients who will receive a blind carbon copy of your email. Each object in this array must contain the recipient's email address. Each object in the array may optionally contain the recipient's name.",
            maxItems: 1000,
            items: {
              title: 'CC BCC Email Object',
              type: 'object',
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                  description: "The intended recipient's email address.",
                },
                name: {
                  type: 'string',
                  description: "The intended recipient's name.",
                },
              },
              required: ['email'],
            },
          },
          subject: {
            type: 'string',
            description:
              'The subject of your email. See character length requirements according to [RFC 2822](http://stackoverflow.com/questions/1592291/what-is-the-email-subject-length-limit#answer-1592310).',
            minLength: 1,
          },
          headers: {
            type: 'object',
            description:
              'A collection of JSON key/value pairs allowing you to specify handling instructions for your email. You may not overwrite the following headers: `x-sg-id`, `x-sg-eid`, `received`, `dkim-signature`, `Content-Type`, `Content-Transfer-Encoding`, `To`, `From`, `Subject`, `Reply-To`, `CC`, `BCC`',
          },
          substitutions: {
            type: 'object',
            description:
              'Substitutions allow you to insert data without using Dynamic Transactional Templates. This field should **not** be used in combination with a Dynamic Transactional Template, which can be identified by a `templateId` starting with `d-`. This field is a collection of key/value pairs following the pattern "substitutionTag":"value to substitute". The key/value pairs must be strings. These substitutions will apply to the text and html content of the body of your email, in addition to the `subject` and `reply-to` parameters. The total collective size of your substitutions may not exceed 10,000 bytes per personalization object.',
            maxProperties: 10000,
          },
          dynamicTemplateData: {
            type: 'object',
            description:
              'Dynamic template data is available using Handlebars syntax in Dynamic Transactional Templates. This field should be used in combination with a Dynamic Transactional Template, which can be identified by a `templateId` starting with `d-`. This field is a collection of key/value pairs following the pattern "variable_name":"value to insert".',
          },
          customArgs: {
            type: 'object',
            description:
              'Values that are specific to this personalization that will be carried along with the email and its activity data. Substitutions will not be made on custom arguments, so any string that is entered into this parameter will be assumed to be the custom argument that you would like to be used. This field may not exceed 10,000 bytes.',
            maxProperties: 10000,
          },
          sendAt: {
            type: 'integer',
            description:
              'A unix timestamp allowing you to specify when your email should be delivered. Scheduling delivery more than 72 hours in advance is forbidden.',
          },
        },
        required: ['to'],
      },
    },
    from: {
      title: 'From Email Object',
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          description:
            "The 'From' email address used to deliver the message. This address should be a verified sender in your Twilio SendGrid account.",
        },
        name: {
          type: 'string',
          description: 'A name or title associated with the sending email address.',
        },
      },
      required: ['email'],
    },
    replyTo: {
      title: 'Reply_to Email Object',
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          description: 'The email address where any replies or bounces will be returned.',
        },
        name: {
          type: 'string',
          description: 'A name or title associated with the `replyTo` email address.',
        },
      },
      required: ['email'],
    },
    replyToList: {
      type: 'array',
      description:
        "An array of recipients who will receive replies and/or bounces. Each object in this array must contain the recipient's email address. Each object in the array may optionally contain the recipient's name. You can either choose to use “replyTo” field or “replyToList” but not both.",
      uniqueItems: true,
      maxItems: 1000,
      items: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            description: 'The email address where any replies or bounces will be returned.',
            format: 'email',
          },
          name: {
            type: 'string',
            description: 'A name or title associated with the `replyToList` email address.',
          },
        },
        required: ['email'],
      },
    },
    subject: {
      type: 'string',
      description:
        "The global or 'message level' subject of your email. This may be overridden by subject lines set in personalizations.",
      minLength: 1,
    },
    content: {
      type: 'array',
      description:
        'An array where you can specify the content of your email. You can include multiple [MIME types](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types) of content, but you must specify at least one MIME type. To include more than one MIME type, add another object to the array containing the `type` and `value` parameters.',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description:
              'The MIME type of the content you are including in your email (e.g., `“text/plain”` or `“text/html”`).',
            minLength: 1,
          },
          value: {
            type: 'string',
            description: 'The actual content of the specified MIME type that you are including in your email.',
            minLength: 1,
          },
        },
        required: ['type', 'value'],
      },
    },
    attachments: {
      type: 'array',
      description: 'An array of objects where you can specify any attachments you want to include.',
      items: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'The Base64 encoded content of the attachment.',
            minLength: 1,
          },
          type: {
            type: 'string',
            description: 'The MIME type of the content you are attaching (e.g., `“text/plain”` or `“text/html”`).',
            minLength: 1,
          },
          filename: {
            type: 'string',
            description: "The attachment's filename.",
          },
          disposition: {
            type: 'string',
            default: 'attachment',
            description:
              "The attachment's content-disposition, specifying how you would like the attachment to be displayed. For example, `“inline”` results in the attached file are displayed automatically within the message while `“attachment”` results in the attached file require some action to be taken before it is displayed, such as opening or downloading the file.",
            enum: ['inline', 'attachment'],
          },
          contentId: {
            type: 'string',
            description:
              "The attachment's content ID. This is used when the disposition is set to `“inline”` and the attachment is an image, allowing the file to be displayed within the body of your email.",
          },
        },
        required: ['content', 'filename'],
      },
    },
    templateId: {
      type: 'string',
      description:
        'An email template ID. A template that contains a subject and content — either text or html — will override any subject and content values specified at the personalizations or message level.',
    },
    headers: {
      description:
        'An object containing key/value pairs of header names and the value to substitute for them. The key/value pairs must be strings. You must ensure these are properly encoded if they contain unicode characters. These headers cannot be one of the reserved headers.',
      type: 'object',
    },
    categories: {
      type: 'array',
      description: 'An array of category names for this message. Each category name may not exceed 255 characters. ',
      uniqueItems: true,
      maxItems: 10,
      items: {
        type: 'string',
        maxLength: 255,
      },
    },
    customArgs: {
      description:
        'Values that are specific to the entire send that will be carried along with the email and its activity data.  Key/value pairs must be strings. Substitutions will not be made on custom arguments, so any string that is entered into this parameter will be assumed to be the custom argument that you would like to be used. This parameter is overridden by `customArgs` set at the personalizations level. Total `customArgs` size may not exceed 10,000 bytes.',
      type: 'string',
    },
    sendAt: {
      type: 'integer',
      description:
        "A unix timestamp allowing you to specify when you want your email to be delivered. This may be overridden by the `sendAt` parameter set at the personalizations level. Delivery cannot be scheduled more than 72 hours in advance. If you have the flexibility, it's better to schedule mail for off-peak times. Most emails are scheduled and sent at the top of the hour or half hour. Scheduling email to avoid peak times — for example, scheduling at 10:53 — can result in lower deferral rates due to the reduced traffic during off-peak times.",
    },
    batchId: {
      type: 'string',
      description:
        'An ID representing a batch of emails to be sent at the same time. Including a `batchId` in your request allows you include this email in that batch. It also enables you to cancel or pause the delivery of that batch. For more information, see the [Cancel Scheduled Sends API](https://sendgrid.com/docs/api-reference/).',
    },
    asm: {
      type: 'object',
      description: 'An object allowing you to specify how to handle unsubscribes.',
      properties: {
        groupId: {
          type: 'integer',
          description: 'The unsubscribe group to associate with this email.',
        },
        groupsToDisplay: {
          type: 'array',
          description:
            'An array containing the unsubscribe groups that you would like to be displayed on the unsubscribe preferences page.',
          maxItems: 25,
          items: {
            type: 'integer',
          },
        },
      },
      required: ['groupId'],
    },
    ipPoolName: {
      type: 'string',
      description: 'The IP Pool that you would like to send this email from.',
      minLength: 2,
      maxLength: 64,
    },
    mailSettings: {
      type: 'object',
      description:
        'A collection of different mail settings that you can use to specify how you would like this email to be handled.',
      properties: {
        bypassListManagement: {
          type: 'object',
          description:
            'Allows you to bypass all unsubscribe groups and suppressions to ensure that the email is delivered to every single recipient. This should only be used in emergencies when it is absolutely necessary that every recipient receives your email. This filter cannot be combined with any other bypass filters. See our [documentation](https://sendgrid.com/docs/ui/sending-email/index-suppressions/#bypass-suppressions) for more about bypass filters.',
          properties: {
            enable: {
              type: 'boolean',
              description: 'Indicates if this setting is enabled.',
            },
          },
        },
        bypassSpamManagement: {
          type: 'object',
          description:
            'Allows you to bypass the spam report list to ensure that the email is delivered to recipients. Bounce and unsubscribe lists will still be checked; addresses on these other lists will not receive the message. This filter cannot be combined with the `bypassListManagement` filter. See our [documentation](https://sendgrid.com/docs/ui/sending-email/index-suppressions/#bypass-suppressions) for more about bypass filters.',
          properties: {
            enable: {
              type: 'boolean',
              description: 'Indicates if this setting is enabled.',
            },
          },
        },
        bypassBounceManagement: {
          type: 'object',
          description:
            'Allows you to bypass the bounce list to ensure that the email is delivered to recipients. Spam report and unsubscribe lists will still be checked; addresses on these other lists will not receive the message. This filter cannot be combined with the `bypassListManagement` filter. See our [documentation](https://sendgrid.com/docs/ui/sending-email/index-suppressions/#bypass-suppressions) for more about bypass filters.',
          properties: {
            enable: {
              type: 'boolean',
              description: 'Indicates if this setting is enabled.',
            },
          },
        },
        bypassUnsubscribeManagement: {
          type: 'object',
          description:
            'Allows you to bypass the global unsubscribe list to ensure that the email is delivered to recipients. Bounce and spam report lists will still be checked; addresses on these other lists will not receive the message. This filter applies only to global unsubscribes and will not bypass group unsubscribes. This filter cannot be combined with the `bypassListManagement` filter. See our [documentation](https://sendgrid.com/docs/ui/sending-email/index-suppressions/#bypass-suppressions) for more about bypass filters.',
          properties: {
            enable: {
              type: 'boolean',
              description: 'Indicates if this setting is enabled.',
            },
          },
        },
        footer: {
          type: 'object',
          description: 'The default footer that you would like included on every email.',
          properties: {
            enable: {
              type: 'boolean',
              description: 'Indicates if this setting is enabled.',
            },
            text: {
              type: 'string',
              description: 'The plain text content of your footer.',
            },
            html: {
              type: 'string',
              description: 'The HTML content of your footer.',
            },
          },
        },
        sandboxMode: {
          type: 'object',
          description:
            'Sandbox Mode allows you to send a test email to ensure that your request body is valid and formatted correctly.',
          properties: {
            enable: {
              type: 'boolean',
              description: 'Indicates if this setting is enabled.',
            },
          },
        },
      },
    },
    trackingSettings: {
      type: 'object',
      description:
        'Settings to determine how you would like to track the metrics of how your recipients interact with your email.',
      properties: {
        clickTracking: {
          type: 'object',
          description: 'Allows you to track if a recipient clicked a link in your email.',
          properties: {
            enable: {
              type: 'boolean',
              description: 'Indicates if this setting is enabled.',
            },
            enableText: {
              type: 'boolean',
              description: 'Indicates if this setting should be included in the `text/plain` portion of your email.',
            },
          },
        },
        openTracking: {
          type: 'object',
          description:
            'Allows you to track if the email was opened by including a single pixel image in the body of the content. When the pixel is loaded, Twilio SendGrid can log that the email was opened.',
          properties: {
            enable: {
              type: 'boolean',
              description: 'Indicates if this setting is enabled.',
            },
            substitutionTag: {
              type: 'string',
              description:
                'Allows you to specify a substitution tag that you can insert in the body of your email at a location that you desire. This tag will be replaced by the open tracking pixel.',
            },
          },
        },
        subscriptionTracking: {
          type: 'object',
          description:
            'Allows you to insert a subscription management link at the bottom of the text and HTML bodies of your email. If you would like to specify the location of the link within your email, you may use the `substitutionTag`.',
          properties: {
            enable: {
              type: 'boolean',
              description: 'Indicates if this setting is enabled.',
            },
            text: {
              type: 'string',
              description:
                'Text to be appended to the email with the subscription tracking link. You may control where the link is by using the tag <% %>',
            },
            html: {
              type: 'string',
              description:
                'HTML to be appended to the email with the subscription tracking link. You may control where the link is by using the tag <% %>',
            },
            substitutionTag: {
              type: 'string',
              description:
                'A tag that will be replaced with the unsubscribe URL. for example: `[unsubscribe_url]`. If this parameter is used, it will override both the `text` and `html` parameters. The URL of the link will be placed at the substitution tag’s location with no additional formatting.',
            },
          },
        },
        ganalytics: {
          type: 'object',
          description: 'Allows you to enable tracking provided by Google Analytics.',
          properties: {
            enable: {
              type: 'boolean',
              description: 'Indicates if this setting is enabled.',
            },
            utmSource: {
              type: 'string',
              description: 'Name of the referrer source. (e.g. Google, SomeDomain.com, or Marketing Email)',
            },
            utmMedium: {
              type: 'string',
              description: 'Name of the marketing medium. (e.g. Email)',
            },
            utmTerm: {
              type: 'string',
              description: 'Used to identify any paid keywords.',
            },
            utmContent: {
              type: 'string',
              description: 'Used to differentiate your campaign from advertisements.',
            },
            utmCampaign: {
              type: 'string',
              description: 'The name of the campaign.',
            },
          },
        },
      },
    },
  },
  required: [],
  additionalProperties: false,
} as const satisfies JsonSchema;

export const sendgridProviderSchemas = {
  output: sendgridOutputSchema,
};
