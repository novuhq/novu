/* eslint-disable max-len */
import { Schema } from '../../../types/schema.types';

/**
 * Slack message payload schema
 *
 * @see https://api.slack.com/reference/messaging/payload
 */

export const slackOutputSchema = {
  type: 'object',
  properties: {
    webhookUrl: { type: 'string', format: 'uri' },
    text: { type: 'string' },
    blocks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
            enum: [
              'image',
              'context',
              'actions',
              'divider',
              'section',
              'input',
              'file',
              'header',
              'video',
              'rich_text',
            ],
          },
        },
        required: ['type'],
        additionalProperties: true,
        allOf: [
          {
            if: {
              properties: {
                type: {
                  const: 'image',
                },
              },
            },
            then: {
              $ref: '#/definitions/ImageBlock',
            },
          },
          {
            if: {
              properties: {
                type: {
                  const: 'context',
                },
              },
            },
            then: {
              $ref: '#/definitions/ContextBlock',
            },
          },
          {
            if: {
              properties: {
                type: {
                  const: 'actions',
                },
              },
            },
            then: {
              $ref: '#/definitions/ActionsBlock',
            },
          },
          {
            if: {
              properties: {
                type: {
                  const: 'divider',
                },
              },
            },
            then: {
              $ref: '#/definitions/DividerBlock',
            },
          },
          {
            if: {
              properties: {
                type: {
                  const: 'section',
                },
              },
            },
            then: {
              $ref: '#/definitions/SectionBlock',
            },
          },
          {
            if: {
              properties: {
                type: {
                  const: 'Input',
                },
              },
            },
            then: {
              $ref: '#/definitions/InputBlock',
            },
          },
          {
            if: {
              properties: {
                type: {
                  const: 'Video',
                },
              },
            },
            then: {
              $ref: '#/definitions/VideoBlock',
            },
          },
          {
            if: {
              properties: {
                type: {
                  const: 'rich_text',
                },
              },
            },
            then: {
              $ref: '#/definitions/RichTextBlock',
            },
          },
        ],
      },
      definitions: {
        KnownBlock: {
          oneOf: [
            {
              $ref: '#/definitions/ImageBlock',
            },
            {
              $ref: '#/definitions/ContextBlock',
            },
            {
              $ref: '#/definitions/ActionsBlock',
            },
            {
              $ref: '#/definitions/DividerBlock',
            },
            {
              $ref: '#/definitions/SectionBlock',
            },
            {
              $ref: '#/definitions/InputBlock',
            },
            {
              $ref: '#/definitions/FileBlock',
            },
            {
              $ref: '#/definitions/HeaderBlock',
            },
            {
              $ref: '#/definitions/VideoBlock',
            },
            {
              $ref: '#/definitions/RichTextBlock',
            },
          ],
        },
        ImageBlock: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              const: 'image',
              description: 'The type of block. For an image block, `type` is always `image`.',
            },
            block_id: {
              type: 'string',
            },
            image_url: {
              type: 'string',
              description: 'The URL of the image to be displayed. Maximum length for this field is 3000 characters.',
            },
            alt_text: {
              type: 'string',
              description:
                'A plain-text summary of the image. This should not contain any markup.\nMaximum length for this field is 2000 characters.',
            },
            title: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'An optional title for the image in the form of a {@link PlainTextElement } object.\nMaximum length for the text in this field is 2000 characters.',
            },
          },
          required: ['alt_text', 'image_url', 'type'],
          additionalProperties: false,
          description: 'Displays an image. A simple image block, designed to make those cat photos really pop.',
        },
        PlainTextElement: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              const: 'plain_text',
              description: 'The formatting to use for this text object.',
            },
            text: {
              type: 'string',
              description: 'The text for the block. The minimum length is 1 and maximum length is 3000 characters.',
            },
            emoji: {
              type: 'boolean',
              description: 'Indicates whether emojis in a text field should be escaped into the colon emoji format.',
            },
          },
          required: ['type', 'text'],
          additionalProperties: false,
          description: 'Defines an object containing some text.',
        },
        ContextBlock: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              const: 'context',
              description: 'The type of block. For a context block, `type` is always `context`.',
            },
            block_id: {
              type: 'string',
            },
            elements: {
              type: 'array',
              items: {
                anyOf: [
                  {
                    $ref: '#/definitions/ImageElement',
                  },
                  {
                    $ref: '#/definitions/PlainTextElement',
                  },
                  {
                    $ref: '#/definitions/MrkdwnElement',
                  },
                ],
              },
              description:
                'An array of {@link ImageElement }, {@link PlainTextElement } or {@link MrkdwnElement } objects.\nMaximum number of items is 10.',
            },
          },
          required: ['elements', 'type'],
          additionalProperties: false,
          description: 'Displays contextual info, which can include both images and text.',
        },
        ImageElement: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              const: 'image',
              description: 'The type of element. In this case `type` is always `image`.',
            },
            image_url: {
              type: 'string',
              description: 'The URL of the image to be displayed.',
            },
            alt_text: {
              type: 'string',
              description: 'A plain-text summary of the image. This should not contain any markup.',
            },
          },
          required: ['type', 'image_url', 'alt_text'],
          additionalProperties: false,
          description:
            'Displays an image as part of a larger block of content. Use this `image` block if you want a block with\nonly an image in it.',
        },
        MrkdwnElement: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              const: 'mrkdwn',
              description: 'The formatting to use for this text object.',
            },
            text: {
              type: 'string',
              description:
                'The text for the block. This field accepts any of the standard text formatting markup.\nThe minimum length is 1 and maximum length is 3000 characters.',
            },
            verbatim: {
              type: 'boolean',
              description:
                'When set to `false` (as is default) URLs will be auto-converted into links, conversation names will\nbe converted to links, and certain mentions will be {@link https://api.slack.com/reference/surfaces/formatting#automatic-parsing automatically parsed}.\nUsing a value of `true` will skip any preprocessing of this nature, although you can still include\n{@link https://api.slack.com/reference/surfaces/formatting#advanced manual parsing strings}.',
            },
          },
          required: ['type', 'text'],
          additionalProperties: false,
          description: 'Defines an object containing some text.',
        },
        ActionsBlock: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              const: 'actions',
              description: 'The type of block. For an actions block, `type` is always `actions`.',
            },
            block_id: {
              type: 'string',
              description:
                'A string acting as a unique identifier for a block. If not specified, a `block_id` will be generated.\nYou can use this `block_id` when you receive an interaction payload to\n{@link https://api.slack.com/interactivity/handling#payloads identify the source of the action}.\nMaximum length for this field is 255 characters. `block_id` should be unique for each message and each iteration of\na message. If a message is updated, use a new `block_id`.',
            },
            elements: {
              type: 'array',
              items: {
                anyOf: [
                  {
                    $ref: '#/definitions/Button',
                  },
                  {
                    $ref: '#/definitions/Checkboxes',
                  },
                  {
                    $ref: '#/definitions/Datepicker',
                  },
                  {
                    $ref: '#/definitions/DateTimepicker',
                  },
                  {
                    $ref: '#/definitions/MultiSelect',
                  },
                  {
                    $ref: '#/definitions/Overflow',
                  },
                  {
                    $ref: '#/definitions/RadioButtons',
                  },
                  {
                    $ref: '#/definitions/Select',
                  },
                  {
                    $ref: '#/definitions/Timepicker',
                  },
                  {
                    $ref: '#/definitions/WorkflowButton',
                  },
                  {
                    $ref: '#/definitions/RichTextInput',
                  },
                ],
              },
              description:
                'An array of {@link InteractiveElements } objects.\nThere is a maximum of 25 elements in each action block.',
            },
          },
          required: ['elements', 'type'],
          additionalProperties: false,
          description: 'Holds multiple interactive elements.',
        },
        Button: {
          type: 'object',
          properties: {
            confirm: {
              $ref: '#/definitions/ConfirmationDialog',
              description:
                'A {@link Confirm } object that defines an optional confirmation dialog after the element is interacted\nwith.',
            },
            type: {
              type: 'string',
              const: 'button',
              description: 'The type of element. In this case `type` is always `button`.',
            },
            action_id: {
              type: 'string',
            },
            text: {
              $ref: '#/definitions/PlainTextElement',
              description:
                "A {@link PlainTextElement } that defines the button's text. `text` may truncate with ~30 characters.\nMaximum length for the text in this field is 75 characters.",
            },
            value: {
              type: 'string',
              description:
                'The value to send along with the {@link https://api.slack.com/interactivity/handling#payloads interaction payload}.\nMaximum length for this field is 2000 characters.',
            },
            url: {
              type: 'string',
              description:
                "A URL to load in the user's browser when the button is clicked. Maximum length for this field is 3000\ncharacters. If you're using `url`, you'll still receive an {@link https://api.slack.com/interactivity/handling#payloads interaction payload}\nand will need to send an {@link https://api.slack.com/interactivity/handling#acknowledgment_response acknowledgement response}.",
            },
            style: {
              type: 'string',
              enum: ['danger', 'primary'],
              description:
                "Decorates buttons with alternative visual color schemes. Use this option with restraint.\n`primary` gives buttons a green outline and text, ideal for affirmation or confirmation actions. `primary` should\nonly be used for one button within a set.\n`danger` gives buttons a red outline and text, and should be used when the action is destructive. Use `danger` even\nmore sparingly than primary.\nIf you don't include this field, the default button style will be used.",
            },
            accessibility_label: {
              type: 'string',
              description:
                'A label for longer descriptive text about a button element. This label will be read out by screen\nreaders instead of the button `text` object. Maximum length for this field is 75 characters.',
            },
          },
          required: ['text', 'type'],
          additionalProperties: false,
          description: 'Allows users a direct path to performing basic actions.',
        },
        Actionable: {
          type: 'object',
          additionalProperties: false,
          properties: {
            type: {
              type: 'string',
            },
            action_id: {
              type: 'string',
            },
          },
          required: ['type'],
        },
        Action: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
            },
            action_id: {
              type: 'string',
            },
          },
          required: ['type'],
          additionalProperties: false,
        },
        Confirmable: {
          type: 'object',
          properties: {
            confirm: {
              $ref: '#/definitions/ConfirmationDialog',
              description:
                'A {@link Confirm } object that defines an optional confirmation dialog after the element is interacted\nwith.',
            },
          },
          additionalProperties: false,
        },
        ConfirmationDialog: {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: {
              $ref: '#/definitions/PlainTextElement',
              description:
                "A {@link PlainTextElement } text object that defines the dialog's title.\nMaximum length for this field is 100 characters.",
            },
            text: {
              anyOf: [
                {
                  $ref: '#/definitions/PlainTextElement',
                },
                {
                  $ref: '#/definitions/MrkdwnElement',
                },
              ],
              description:
                'A {@link PlainTextElement } text object that defines the explanatory text that appears in the confirm\ndialog. Maximum length for the `text` in this field is 300 characters.',
            },
            confirm: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'A {@link PlainTextElement } text object to define the text of the button that confirms the action.\nMaximum length for the `text` in this field is 30 characters.',
            },
            deny: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'A {@link PlainTextElement } text object to define the text of the button that cancels the action.\nMaximum length for the `text` in this field is 30 characters.',
            },
            style: {
              type: 'string',
              enum: ['primary', 'danger'],
              description:
                'Defines the color scheme applied to the `confirm` button. A value of `danger` will display the button\nwith a red background on desktop, or red text on mobile. A value of `primary` will display the button with a green\nbackground on desktop, or blue text on mobile. If this field is not provided, the default value will be `primary`.',
            },
          },
          required: ['text'],
          description: 'Defines a dialog that adds a confirmation step to interactive elements.',
        },
        Confirm: {
          type: 'object',
          properties: {
            title: {
              $ref: '#/definitions/PlainTextElement',
              description:
                "A {@link PlainTextElement } text object that defines the dialog's title.\nMaximum length for this field is 100 characters.",
            },
            text: {
              anyOf: [
                {
                  $ref: '#/definitions/PlainTextElement',
                },
                {
                  $ref: '#/definitions/MrkdwnElement',
                },
              ],
              description:
                'A {@link PlainTextElement } text object that defines the explanatory text that appears in the confirm\ndialog. Maximum length for the `text` in this field is 300 characters.',
            },
            confirm: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'A {@link PlainTextElement } text object to define the text of the button that confirms the action.\nMaximum length for the `text` in this field is 30 characters.',
            },
            deny: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'A {@link PlainTextElement } text object to define the text of the button that cancels the action.\nMaximum length for the `text` in this field is 30 characters.',
            },
            style: {
              type: 'string',
              enum: ['primary', 'danger'],
              description:
                'Defines the color scheme applied to the `confirm` button. A value of `danger` will display the button\nwith a red background on desktop, or red text on mobile. A value of `primary` will display the button with a green\nbackground on desktop, or blue text on mobile. If this field is not provided, the default value will be `primary`.',
            },
          },
          required: ['text'],
          additionalProperties: false,
          description: 'Defines a dialog that adds a confirmation step to interactive elements.',
        },
        Checkboxes: {
          type: 'object',
          properties: {
            focus_on_load: {
              type: 'boolean',
            },
            confirm: {
              $ref: '#/definitions/ConfirmationDialog',
              description:
                'A {@link Confirm } object that defines an optional confirmation dialog after the element is interacted\nwith.',
            },
            type: {
              type: 'string',
              const: 'checkboxes',
              description: 'The type of element. In this case `type` is always `checkboxes`.',
            },
            action_id: {
              type: 'string',
            },
            initial_options: {
              type: 'array',
              items: {
                $ref: '#/definitions/Option',
              },
              description:
                'An array of {@link Option } objects that exactly matches one or more of the options within `options`.\nThese options will be selected when the checkbox group initially loads.',
            },
            options: {
              type: 'array',
              items: {
                $ref: '#/definitions/Option',
              },
              description: 'An array of {@link Option } objects. A maximum of 10 options are allowed.',
            },
          },
          required: ['options', 'type'],
          additionalProperties: false,
          description: 'Allows users to choose multiple items from a list of options.',
        },
        Focusable: {
          type: 'object',
          properties: {
            focus_on_load: {
              type: 'boolean',
            },
          },
          additionalProperties: false,
        },
        Option: {
          anyOf: [
            {
              $ref: '#/definitions/MrkdwnOption',
            },
            {
              $ref: '#/definitions/PlainTextOption',
            },
          ],
          description:
            'Defines a single item in a number of item selection elements. An object that represents a single\nselectable item in a select menu, multi-select menu, checkbox group, radio button group, or overflow menu.',
        },
        MrkdwnOption: {
          type: 'object',
          properties: {
            value: {
              type: 'string',
              description:
                'A unique string value that will be passed to your app when this option is chosen.\nMaximum length for this field is 75 characters.',
            },
            url: {
              type: 'string',
              description:
                "Only available in overflow menus! A URL to load in the user's browser when the option is clicked.\nMaximum length for this field is 3000 characters.",
            },
            description: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'A {@link PlainTextElement } that defines a line of descriptive text shown below the `text` field.\nMaximum length for the `text` within this field is 75 characters.',
            },
            text: {
              $ref: '#/definitions/MrkdwnElement',
              description:
                'A {@link MrkdwnElement } that defines the text shown in the option on the menu. To be used with\nradio buttons and checkboxes. Maximum length for the `text` in this field is 75 characters.',
            },
          },
          required: ['text'],
          additionalProperties: false,
        },
        PlainTextOption: {
          type: 'object',
          properties: {
            value: {
              type: 'string',
              description:
                'A unique string value that will be passed to your app when this option is chosen.\nMaximum length for this field is 75 characters.',
            },
            url: {
              type: 'string',
              description:
                "Only available in overflow menus! A URL to load in the user's browser when the option is clicked.\nMaximum length for this field is 3000 characters.",
            },
            description: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'A {@link PlainTextElement } that defines a line of descriptive text shown below the `text` field.\nMaximum length for the `text` within this field is 75 characters.',
            },
            text: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'A {@link PlainTextElement } that defines the text shown in the option on the menu. To be used with\noverflow, select and multi-select menus. Maximum length for the `text` in this field is 75 characters.',
            },
          },
          required: ['text'],
          additionalProperties: false,
        },
        Datepicker: {
          type: 'object',
          properties: {
            placeholder: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'A {@link PlainTextElement } object that defines the placeholder text shown on the element. Maximum\nlength for the `text` field in this object is 150 characters.',
            },
            focus_on_load: {
              type: 'boolean',
              description:
                'Indicates whether the element will be set to auto focus within the\n{@link https://api.slack.com/reference/surfaces/views `view` object}. Only one element can be set to `true`.\nDefaults to `false`.',
            },
            confirm: {
              $ref: '#/definitions/ConfirmationDialog',
              description:
                'A {@link Confirm } object that defines an optional confirmation dialog after the element is interacted\nwith.',
            },
            type: {
              type: 'string',
              const: 'datepicker',
              description: 'The type of element. In this case `type` is always `datepicker`.',
            },
            action_id: {
              type: 'string',
              description:
                ': An identifier for this action. You can use this when you receive an interaction payload to\n{@link https://api.slack.com/interactivity/handling#payloads identify the source of the action}. Should be unique\namong all other `action_id`s in the containing block. Maximum length for this field is 255 characters.',
            },
            initial_date: {
              type: 'string',
              description:
                'The initial date that is selected when the element is loaded.\nThis should be in the format `YYYY-MM-DD`.',
            },
          },
          required: ['type'],
          additionalProperties: false,
          description: 'Allows users to select a date from a calendar style UI.',
        },
        Placeholdable: {
          type: 'object',
          properties: {
            placeholder: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'A {@link PlainTextElement } object that defines the placeholder text shown on the element. Maximum\nlength for the `text` field in this object is 150 characters.',
            },
          },
          additionalProperties: false,
        },
        DateTimepicker: {
          type: 'object',
          properties: {
            focus_on_load: {
              type: 'boolean',
              description:
                'Indicates whether the element will be set to auto focus within the\n{@link https://api.slack.com/reference/surfaces/views `view` object}. Only one element can be set to `true`.\nDefaults to `false`.',
            },
            confirm: {
              $ref: '#/definitions/ConfirmationDialog',
              description:
                'A {@link Confirm } object that defines an optional confirmation dialog after the element is interacted\nwith.',
            },
            type: {
              type: 'string',
              const: 'datetimepicker',
              description: 'The type of element. In this case `type` is always `datetimepicker`.',
            },
            action_id: {
              type: 'string',
              description:
                ': An identifier for this action. You can use this when you receive an interaction payload to\n{@link https://api.slack.com/interactivity/handling#payloads identify the source of the action}. Should be unique\namong all other `action_id`s in the containing block. Maximum length for this field is 255 characters.',
            },
            initial_date_time: {
              type: 'number',
            },
          },
          required: ['type'],
          additionalProperties: false,
          description:
            'Allows users to select both a date and a time of day, formatted as a Unix timestamp. On desktop\nclients, this time picker will take the form of a dropdown list and the date picker will take the form of a dropdown\ncalendar. Both options will have free-text entry for precise choices. On mobile clients, the time picker and date\npicker will use native UIs.',
        },
        MultiSelect: {
          anyOf: [
            {
              $ref: '#/definitions/MultiUsersSelect',
            },
            {
              $ref: '#/definitions/MultiStaticSelect',
            },
            {
              $ref: '#/definitions/MultiConversationsSelect',
            },
            {
              $ref: '#/definitions/MultiChannelsSelect',
            },
            {
              $ref: '#/definitions/MultiExternalSelect',
            },
          ],
          description:
            'Allows users to select multiple items from a list of options.\nJust like regular {@link Select }, multi-select menus also include type-ahead functionality, where a user can type a\npart or all of an option string to filter the list.\nThere are different types of multi-select menu that depend on different data sources for their lists of options:\n{@link MultiStaticSelect }, {@link MultiExternalSelect }, {@link MultiUsersSelect }, {@link MultiConversationsSelect },\n{@link MultiChannelsSelect }.',
        },
        MultiUsersSelect: {
          type: 'object',
          properties: {
            placeholder: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'A {@link PlainTextElement } object that defines the placeholder text shown on the element. Maximum\nlength for the `text` field in this object is 150 characters.',
            },
            focus_on_load: {
              type: 'boolean',
              description:
                'Indicates whether the element will be set to auto focus within the\n{@link https://api.slack.com/reference/surfaces/views `view` object}. Only one element can be set to `true`.\nDefaults to `false`.',
            },
            confirm: {
              $ref: '#/definitions/ConfirmationDialog',
              description:
                'A {@link Confirm } object that defines an optional confirmation dialog after the element is interacted\nwith.',
            },
            type: {
              type: 'string',
              const: 'multi_users_select',
              description: 'The type of element. In this case `type` is always `multi_users_select`.',
            },
            action_id: {
              type: 'string',
              description:
                ': An identifier for this action. You can use this when you receive an interaction payload to\n{@link https://api.slack.com/interactivity/handling#payloads identify the source of the action}. Should be unique\namong all other `action_id`s in the containing block. Maximum length for this field is 255 characters.',
            },
            initial_users: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'An array of user IDs of any valid users to be pre-selected when the menu loads.',
            },
            max_selected_items: {
              type: 'number',
              description:
                'Specifies the maximum number of items that can be selected in the menu. Minimum number is `1`.',
            },
          },
          required: ['type'],
          additionalProperties: false,
          description:
            'This multi-select menu will populate its options with a list of Slack users visible to the current user\nin the active workspace.',
        },
        MultiStaticSelect: {
          type: 'object',
          properties: {
            placeholder: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'A {@link PlainTextElement } object that defines the placeholder text shown on the element. Maximum\nlength for the `text` field in this object is 150 characters.',
            },
            focus_on_load: {
              type: 'boolean',
              description:
                'Indicates whether the element will be set to auto focus within the\n{@link https://api.slack.com/reference/surfaces/views `view` object}. Only one element can be set to `true`.\nDefaults to `false`.',
            },
            confirm: {
              $ref: '#/definitions/ConfirmationDialog',
              description:
                'A {@link Confirm } object that defines an optional confirmation dialog after the element is interacted\nwith.',
            },
            type: {
              type: 'string',
              const: 'multi_static_select',
              description: 'The type of element. In this case `type` is always `multi_static_select`.',
            },
            action_id: {
              type: 'string',
              description:
                ': An identifier for this action. You can use this when you receive an interaction payload to\n{@link https://api.slack.com/interactivity/handling#payloads identify the source of the action}. Should be unique\namong all other `action_id`s in the containing block. Maximum length for this field is 255 characters.',
            },
            initial_options: {
              type: 'array',
              items: {
                $ref: '#/definitions/PlainTextOption',
              },
              description:
                'An array of option objects that exactly match one or more of the options within `options` or\n`option_groups`. These options will be selected when the menu initially loads.',
            },
            options: {
              type: 'array',
              items: {
                $ref: '#/definitions/PlainTextOption',
              },
              description:
                'An array of {@link PlainTextOption }. Maximum number of options is 100. If `option_groups` is\nspecified, this field should not be.',
            },
            option_groups: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: {
                    $ref: '#/definitions/PlainTextElement',
                  },
                  options: {
                    type: 'array',
                    items: {
                      $ref: '#/definitions/PlainTextOption',
                    },
                  },
                },
                required: ['label', 'options'],
                additionalProperties: false,
              },
              description:
                'An array of option group objects. Maximum number of option groups is 100. If `options` is specified,\nthis field should not be.',
            },
            max_selected_items: {
              type: 'number',
              description:
                'Specifies the maximum number of items that can be selected in the menu. Minimum number is 1.',
            },
          },
          required: ['type'],
          additionalProperties: false,
          description:
            'This is the simplest form of select menu, with a static list of options passed in when defining the\nelement.',
        },
        MultiConversationsSelect: {
          type: 'object',
          properties: {
            placeholder: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'A {@link PlainTextElement } object that defines the placeholder text shown on the element. Maximum\nlength for the `text` field in this object is 150 characters.',
            },
            focus_on_load: {
              type: 'boolean',
              description:
                'Indicates whether the element will be set to auto focus within the\n{@link https://api.slack.com/reference/surfaces/views `view` object}. Only one element can be set to `true`.\nDefaults to `false`.',
            },
            confirm: {
              $ref: '#/definitions/ConfirmationDialog',
              description:
                'A {@link Confirm } object that defines an optional confirmation dialog after the element is interacted\nwith.',
            },
            type: {
              type: 'string',
              const: 'multi_conversations_select',
              description: 'The type of element. In this case `type` is always `conversations_select`.',
            },
            action_id: {
              type: 'string',
              description:
                ': An identifier for this action. You can use this when you receive an interaction payload to\n{@link https://api.slack.com/interactivity/handling#payloads identify the source of the action}. Should be unique\namong all other `action_id`s in the containing block. Maximum length for this field is 255 characters.',
            },
            initial_conversations: {
              type: 'array',
              items: {
                type: 'string',
              },
              description:
                'An array of one or more IDs of any valid conversations to be pre-selected when the menu loads. If\n`default_to_current_conversation` is also supplied, `initial_conversation` will be ignored.',
            },
            max_selected_items: {
              type: 'number',
              description:
                'Specifies the maximum number of items that can be selected in the menu. Minimum number is 1.',
            },
            default_to_current_conversation: {
              type: 'boolean',
              description:
                'Pre-populates the select menu with the conversation that the user was viewing when they opened the\nmodal, if available. Default is `false`.',
            },
            filter: {
              type: 'object',
              properties: {
                include: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['im', 'mpim', 'private', 'public'],
                  },
                },
                exclude_external_shared_channels: {
                  type: 'boolean',
                },
                exclude_bot_users: {
                  type: 'boolean',
                },
              },
              additionalProperties: false,
              description:
                'A filter object that reduces the list of available conversations using the specified criteria.',
            },
          },
          required: ['type'],
          additionalProperties: false,
          description:
            'This multi-select menu will populate its options with a list of public and private channels, DMs, and\nMPIMs visible to the current user in the active workspace.',
        },
        MultiChannelsSelect: {
          type: 'object',
          properties: {
            placeholder: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'A {@link PlainTextElement } object that defines the placeholder text shown on the element. Maximum\nlength for the `text` field in this object is 150 characters.',
            },
            focus_on_load: {
              type: 'boolean',
              description:
                'Indicates whether the element will be set to auto focus within the\n{@link https://api.slack.com/reference/surfaces/views `view` object}. Only one element can be set to `true`.\nDefaults to `false`.',
            },
            confirm: {
              $ref: '#/definitions/ConfirmationDialog',
              description:
                'A {@link Confirm } object that defines an optional confirmation dialog after the element is interacted\nwith.',
            },
            type: {
              type: 'string',
              const: 'multi_channels_select',
              description: 'The type of element. In this case `type` is always `multi_channels_select`.',
            },
            action_id: {
              type: 'string',
              description:
                ': An identifier for this action. You can use this when you receive an interaction payload to\n{@link https://api.slack.com/interactivity/handling#payloads identify the source of the action}. Should be unique\namong all other `action_id`s in the containing block. Maximum length for this field is 255 characters.',
            },
            initial_channels: {
              type: 'array',
              items: {
                type: 'string',
              },
              description:
                'An array of one or more IDs of any valid public channel to be pre-selected when the menu loads.',
            },
            max_selected_items: {
              type: 'number',
              description:
                'Specifies the maximum number of items that can be selected in the menu. Minimum number is 1.',
            },
          },
          required: ['type'],
          additionalProperties: false,
          description:
            'This multi-select menu will populate its options with a list of public channels visible to the current\nuser in the active workspace.',
        },
        MultiExternalSelect: {
          type: 'object',
          properties: {
            placeholder: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'A {@link PlainTextElement } object that defines the placeholder text shown on the element. Maximum\nlength for the `text` field in this object is 150 characters.',
            },
            focus_on_load: {
              type: 'boolean',
              description:
                'Indicates whether the element will be set to auto focus within the\n{@link https://api.slack.com/reference/surfaces/views `view` object}. Only one element can be set to `true`.\nDefaults to `false`.',
            },
            confirm: {
              $ref: '#/definitions/ConfirmationDialog',
              description:
                'A {@link Confirm } object that defines an optional confirmation dialog after the element is interacted\nwith.',
            },
            type: {
              type: 'string',
              const: 'multi_external_select',
              description: 'The type of element. In this case `type` is always `multi_external_select`.',
            },
            action_id: {
              type: 'string',
              description:
                ': An identifier for this action. You can use this when you receive an interaction payload to\n{@link https://api.slack.com/interactivity/handling#payloads identify the source of the action}. Should be unique\namong all other `action_id`s in the containing block. Maximum length for this field is 255 characters.',
            },
            initial_options: {
              type: 'array',
              items: {
                $ref: '#/definitions/PlainTextOption',
              },
              description: 'An array of options to be selected when the menu initially loads.',
            },
            min_query_length: {
              type: 'number',
              description:
                'When the typeahead field is used, a request will be sent on every character change. If you prefer\nfewer requests or more fully ideated queries, use the `min_query_length` attribute to tell Slack the fewest number\nof typed characters required before dispatch. The default value is `3`.',
            },
            max_selected_items: {
              type: 'number',
              description:
                'Specifies the maximum number of items that can be selected in the menu. Minimum number is 1.',
            },
          },
          required: ['type'],
          additionalProperties: false,
          description:
            'This menu will load its options from an external data source, allowing for a dynamic list of options.',
        },
        Overflow: {
          type: 'object',
          properties: {
            confirm: {
              $ref: '#/definitions/ConfirmationDialog',
              description:
                'A {@link Confirm } object that defines an optional confirmation dialog after the element is interacted\nwith.',
            },
            type: {
              type: 'string',
              const: 'overflow',
              description: 'The type of element. In this case `type` is always `number_input`.',
            },
            action_id: {
              type: 'string',
              description:
                ': An identifier for this action. You can use this when you receive an interaction payload to\n{@link https://api.slack.com/interactivity/handling#payloads identify the source of the action}. Should be unique\namong all other `action_id`s in the containing block. Maximum length for this field is 255 characters.',
            },
            options: {
              type: 'array',
              items: {
                $ref: '#/definitions/PlainTextOption',
              },
              description: 'An array of up to 5 {@link PlainTextOption } to display in the menu.',
            },
          },
          required: ['options', 'type'],
          additionalProperties: false,
          description:
            'Allows users to press a button to view a list of options.\nUnlike the select menu, there is no typeahead field, and the button always appears with an ellipsis ("…") rather\nthan customizable text. As such, it is usually used if you want a more compact layout than a select menu, or to\nsupply a list of less visually important actions after a row of buttons. You can also specify simple URL links as\noverflow menu options, instead of actions.',
        },
        RadioButtons: {
          type: 'object',
          properties: {
            focus_on_load: {
              type: 'boolean',
              description:
                'Indicates whether the element will be set to auto focus within the\n{@link https://api.slack.com/reference/surfaces/views `view` object}. Only one element can be set to `true`.\nDefaults to `false`.',
            },
            confirm: {
              $ref: '#/definitions/ConfirmationDialog',
              description:
                'A {@link Confirm } object that defines an optional confirmation dialog after the element is interacted\nwith.',
            },
            type: {
              type: 'string',
              const: 'radio_buttons',
              description: 'The type of element. In this case `type` is always `radio_buttons`.',
            },
            action_id: {
              type: 'string',
              description:
                ': An identifier for this action. You can use this when you receive an interaction payload to\n{@link https://api.slack.com/interactivity/handling#payloads identify the source of the action}. Should be unique\namong all other `action_id`s in the containing block. Maximum length for this field is 255 characters.',
            },
            initial_option: {
              $ref: '#/definitions/Option',
              description:
                'An {@link Option } object that exactly matches one of the options within `options`. This option will\nbe selected when the radio button group initially loads.',
            },
            options: {
              type: 'array',
              items: {
                $ref: '#/definitions/Option',
              },
              description: 'An array of {@link Option } objects. A maximum of 10 options are allowed.',
            },
          },
          required: ['options', 'type'],
          additionalProperties: false,
          description: 'Allows users to choose one item from a list of possible options.',
        },
        Select: {
          anyOf: [
            {
              $ref: '#/definitions/UsersSelect',
            },
            {
              $ref: '#/definitions/StaticSelect',
            },
            {
              $ref: '#/definitions/ConversationsSelect',
            },
            {
              $ref: '#/definitions/ChannelsSelect',
            },
            {
              $ref: '#/definitions/ExternalSelect',
            },
          ],
          description:
            'Allows users to choose an option from a drop down menu.\nThe select menu also includes type-ahead functionality, where a user can type a part or all of an option string to\nfilter the list. There are different types of select menu elements that depend on different data sources for their\nlists of options: {@link StaticSelect }, {@link ExternalSelect }, {@link UsersSelect }, {@link ConversationsSelect },\n{@link ChannelsSelect }.',
        },
        UsersSelect: {
          type: 'object',
          properties: {
            placeholder: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'A {@link PlainTextElement } object that defines the placeholder text shown on the element. Maximum\nlength for the `text` field in this object is 150 characters.',
            },
            focus_on_load: {
              type: 'boolean',
              description:
                'Indicates whether the element will be set to auto focus within the\n{@link https://api.slack.com/reference/surfaces/views `view` object}. Only one element can be set to `true`.\nDefaults to `false`.',
            },
            confirm: {
              $ref: '#/definitions/ConfirmationDialog',
              description:
                'A {@link Confirm } object that defines an optional confirmation dialog after the element is interacted\nwith.',
            },
            type: {
              type: 'string',
              const: 'users_select',
              description: 'The type of element. In this case `type` is always `users_select`.',
            },
            action_id: {
              type: 'string',
              description:
                ': An identifier for this action. You can use this when you receive an interaction payload to\n{@link https://api.slack.com/interactivity/handling#payloads identify the source of the action}. Should be unique\namong all other `action_id`s in the containing block. Maximum length for this field is 255 characters.',
            },
            initial_user: {
              type: 'string',
              description: 'The user ID of any valid user to be pre-selected when the menu loads.',
            },
          },
          required: ['type'],
          additionalProperties: false,
          description:
            'This select menu will populate its options with a list of Slack users visible to the current user in the\nactive workspace.',
        },
        StaticSelect: {
          type: 'object',
          properties: {
            placeholder: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'A {@link PlainTextElement } object that defines the placeholder text shown on the element. Maximum\nlength for the `text` field in this object is 150 characters.',
            },
            focus_on_load: {
              type: 'boolean',
              description:
                'Indicates whether the element will be set to auto focus within the\n{@link https://api.slack.com/reference/surfaces/views `view` object}. Only one element can be set to `true`.\nDefaults to `false`.',
            },
            confirm: {
              $ref: '#/definitions/ConfirmationDialog',
              description:
                'A {@link Confirm } object that defines an optional confirmation dialog after the element is interacted\nwith.',
            },
            type: {
              type: 'string',
              const: 'static_select',
              description: 'The type of element. In this case `type` is always `static_select`.',
            },
            action_id: {
              type: 'string',
              description:
                ': An identifier for this action. You can use this when you receive an interaction payload to\n{@link https://api.slack.com/interactivity/handling#payloads identify the source of the action}. Should be unique\namong all other `action_id`s in the containing block. Maximum length for this field is 255 characters.',
            },
            initial_option: {
              $ref: '#/definitions/PlainTextOption',
              description:
                'A single option that exactly matches one of the options within `options` or `option_groups`.\nThis option will be selected when the menu initially loads.',
            },
            options: {
              type: 'array',
              items: {
                $ref: '#/definitions/PlainTextOption',
              },
              description:
                'An array of {@link PlainTextOption }. Maximum number of options is 100. If `option_groups` is\nspecified, this field should not be.',
            },
            option_groups: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: {
                    $ref: '#/definitions/PlainTextElement',
                  },
                  options: {
                    type: 'array',
                    items: {
                      $ref: '#/definitions/PlainTextOption',
                    },
                  },
                },
                required: ['label', 'options'],
                additionalProperties: false,
              },
              description:
                'An array of option group objects. Maximum number of option groups is 100. If `options` is specified,\nthis field should not be.',
            },
          },
          required: ['type'],
          additionalProperties: false,
          description:
            'This is the simplest form of select menu, with a static list of options passed in when defining the\nelement.',
        },
        ConversationsSelect: {
          type: 'object',
          properties: {
            placeholder: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'A {@link PlainTextElement } object that defines the placeholder text shown on the element. Maximum\nlength for the `text` field in this object is 150 characters.',
            },
            focus_on_load: {
              type: 'boolean',
              description:
                'Indicates whether the element will be set to auto focus within the\n{@link https://api.slack.com/reference/surfaces/views `view` object}. Only one element can be set to `true`.\nDefaults to `false`.',
            },
            confirm: {
              $ref: '#/definitions/ConfirmationDialog',
              description:
                'A {@link Confirm } object that defines an optional confirmation dialog after the element is interacted\nwith.',
            },
            type: {
              type: 'string',
              const: 'conversations_select',
              description: 'The type of element. In this case `type` is always `conversations_select`.',
            },
            action_id: {
              type: 'string',
              description:
                ': An identifier for this action. You can use this when you receive an interaction payload to\n{@link https://api.slack.com/interactivity/handling#payloads identify the source of the action}. Should be unique\namong all other `action_id`s in the containing block. Maximum length for this field is 255 characters.',
            },
            initial_conversation: {
              type: 'string',
              description:
                'The ID of any valid conversation to be pre-selected when the menu loads. If\n`default_to_current_conversation` is also supplied, `initial_conversation` will take precedence.',
            },
            response_url_enabled: {
              type: 'boolean',
              description:
                "When set to `true`, the {@link https://api.slack.com/reference/interaction-payloads/views#view_submission `view_submission` payload}\nfrom the menu's parent view will contain a `response_url`. This `response_url` can be used for\n{@link https://api.slack.com/interactivity/handling#message_responses message responses}. The target conversation\nfor the message will be determined by the value of this select menu.",
            },
            default_to_current_conversation: {
              type: 'boolean',
              description:
                'Pre-populates the select menu with the conversation that the user was viewing when they opened the\nmodal, if available. Default is `false`.',
            },
            filter: {
              type: 'object',
              properties: {
                include: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['im', 'mpim', 'private', 'public'],
                  },
                },
                exclude_external_shared_channels: {
                  type: 'boolean',
                },
                exclude_bot_users: {
                  type: 'boolean',
                },
              },
              additionalProperties: false,
              description:
                'A filter object that reduces the list of available conversations using the specified criteria.',
            },
          },
          required: ['type'],
          additionalProperties: false,
          description:
            'This select menu will populate its options with a list of public and private channels, DMs, and MPIMs\nvisible to the current user in the active workspace.',
        },
        ChannelsSelect: {
          type: 'object',
          properties: {
            placeholder: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'A {@link PlainTextElement } object that defines the placeholder text shown on the element. Maximum\nlength for the `text` field in this object is 150 characters.',
            },
            focus_on_load: {
              type: 'boolean',
              description:
                'Indicates whether the element will be set to auto focus within the\n{@link https://api.slack.com/reference/surfaces/views `view` object}. Only one element can be set to `true`.\nDefaults to `false`.',
            },
            confirm: {
              $ref: '#/definitions/ConfirmationDialog',
              description:
                'A {@link Confirm } object that defines an optional confirmation dialog after the element is interacted\nwith.',
            },
            type: {
              type: 'string',
              const: 'channels_select',
              description: 'The type of element. In this case `type` is always `channels_select`.',
            },
            action_id: {
              type: 'string',
              description:
                ': An identifier for this action. You can use this when you receive an interaction payload to\n{@link https://api.slack.com/interactivity/handling#payloads identify the source of the action}. Should be unique\namong all other `action_id`s in the containing block. Maximum length for this field is 255 characters.',
            },
            initial_channel: {
              type: 'string',
              description: 'The ID of any valid public channel to be pre-selected when the menu loads.',
            },
            response_url_enabled: {
              type: 'boolean',
              description:
                "When set to `true`, the {@link https://api.slack.com/reference/interaction-payloads/views#view_submission `view_submission` payload}\nfrom the menu's parent view will contain a `response_url`. This `response_url` can be used for\n{@link https://api.slack.com/interactivity/handling#message_responses message responses}. The target channel\nfor the message will be determined by the value of this select menu.",
            },
          },
          required: ['type'],
          additionalProperties: false,
          description:
            'This select menu will populate its options with a list of public channels visible to the current user\nin the active workspace.',
        },
        ExternalSelect: {
          type: 'object',
          properties: {
            placeholder: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'A {@link PlainTextElement } object that defines the placeholder text shown on the element. Maximum\nlength for the `text` field in this object is 150 characters.',
            },
            focus_on_load: {
              type: 'boolean',
              description:
                'Indicates whether the element will be set to auto focus within the\n{@link https://api.slack.com/reference/surfaces/views `view` object}. Only one element can be set to `true`.\nDefaults to `false`.',
            },
            confirm: {
              $ref: '#/definitions/ConfirmationDialog',
              description:
                'A {@link Confirm } object that defines an optional confirmation dialog after the element is interacted\nwith.',
            },
            type: {
              type: 'string',
              const: 'external_select',
              description: 'The type of element. In this case `type` is always `external_select`.',
            },
            action_id: {
              type: 'string',
              description:
                ': An identifier for this action. You can use this when you receive an interaction payload to\n{@link https://api.slack.com/interactivity/handling#payloads identify the source of the action}. Should be unique\namong all other `action_id`s in the containing block. Maximum length for this field is 255 characters.',
            },
            initial_option: {
              $ref: '#/definitions/PlainTextOption',
              description: 'A single option to be selected when the menu initially loads.',
            },
            min_query_length: {
              type: 'number',
              description:
                'When the typeahead field is used, a request will be sent on every character change. If you prefer\nfewer requests or more fully ideated queries, use the `min_query_length` attribute to tell Slack the fewest number\nof typed characters required before dispatch. The default value is `3`.',
            },
          },
          required: ['type'],
          additionalProperties: false,
          description:
            'This select menu will load its options from an external data source, allowing for a dynamic list of\noptions.',
        },
        Timepicker: {
          type: 'object',
          properties: {
            placeholder: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'A {@link PlainTextElement } object that defines the placeholder text shown on the element. Maximum\nlength for the `text` field in this object is 150 characters.',
            },
            focus_on_load: {
              type: 'boolean',
              description:
                'Indicates whether the element will be set to auto focus within the\n{@link https://api.slack.com/reference/surfaces/views `view` object}. Only one element can be set to `true`.\nDefaults to `false`.',
            },
            confirm: {
              $ref: '#/definitions/ConfirmationDialog',
              description:
                'A {@link Confirm } object that defines an optional confirmation dialog after the element is interacted\nwith.',
            },
            type: {
              type: 'string',
              const: 'timepicker',
              description: 'The type of element. In this case `type` is always `timepicker`.',
            },
            action_id: {
              type: 'string',
              description:
                ': An identifier for this action. You can use this when you receive an interaction payload to\n{@link https://api.slack.com/interactivity/handling#payloads identify the source of the action}. Should be unique\namong all other `action_id`s in the containing block. Maximum length for this field is 255 characters.',
            },
            initial_time: {
              type: 'string',
              description:
                'The initial time that is selected when the element is loaded. This should be in the format `HH:mm`,\nwhere `HH` is the 24-hour format of an hour (00 to 23) and `mm` is minutes with leading zeros (00 to 59),\nfor example 22:25 for 10:25pm.',
            },
            timezone: {
              type: 'string',
              description:
                'A string in the IANA format, e.g. "America/Chicago". The timezone is displayed to end users as hint\ntext underneath the time picker. It is also passed to the app upon certain interactions, such as view_submission.',
            },
          },
          required: ['type'],
          additionalProperties: false,
          description:
            'Allows users to choose a time from a rich dropdown UI. On desktop clients, this time picker will take\nthe form of a dropdown list with free-text entry for precise choices. On mobile clients, the time picker will use\nnative time picker UIs.',
        },
        WorkflowButton: {
          type: 'object',
          properties: {
            confirm: {
              $ref: '#/definitions/ConfirmationDialog',
              description:
                'A {@link Confirm } object that defines an optional confirmation dialog after the element is interacted\nwith.',
            },
            type: {
              type: 'string',
              const: 'workflow_button',
              description: 'The type of element. In this case `type` is always `workflow_button`.',
            },
            text: {
              $ref: '#/definitions/PlainTextElement',
              description:
                "A {@link PlainTextElement } that defines the button's text. `text` may truncate with ~30 characters.\nMaximum length for the `text` in this field is 75 characters.",
            },
            workflow: {
              type: 'object',
              properties: {
                trigger: {
                  type: 'object',
                  properties: {
                    url: {
                      type: 'string',
                      description:
                        'The trigger URL of the {@link https://api.slack.com/automation/triggers/link#workflow_buttons link trigger}',
                    },
                    customizable_input_parameters: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: {
                            type: 'string',
                            description:
                              'Name of the customizable input, which should be the name of a workflow input parameter for the\nmatching workflow of the link trigger.',
                          },
                          value: {
                            type: 'string',
                            description:
                              'The value of the customizable input parameter. The type of the value is expected to match the\nspecified type for the matching workflow input parameter.',
                          },
                        },
                        required: ['name', 'value'],
                        additionalProperties: false,
                      },
                      description:
                        'List of customizable input parameters and their values. Should match input parameters specified on\nthe provided trigger.',
                    },
                  },
                  required: ['url'],
                  additionalProperties: false,
                  description:
                    'Properties of the {@link https://api.slack.com/automation/triggers/link#workflow_buttons link trigger}that will be invoked via this button.',
                },
              },
              required: ['trigger'],
              additionalProperties: false,
              description:
                'A workflow object that contains details about the workflow that will run when the button is clicked.',
            },
            style: {
              type: 'string',
              enum: ['danger', 'primary'],
              description:
                "Decorates buttons with alternative visual color schemes. Use this option with restraint.\n`primary` gives buttons a green outline and text, ideal for affirmation or confirmation actions. `primary` should\nonly be used for one button within a set.\n`danger` gives buttons a red outline and text, and should be used when the action is destructive. Use `danger` even\nmore sparingly than primary.\nIf you don't include this field, the default button style will be used.",
            },
            accessibility_label: {
              type: 'string',
              description:
                'A label for longer descriptive text about a button element. This label will be read out by screen\nreaders instead of the button `text` object. Maximum length for this field is 75 characters.',
            },
          },
          required: ['type', 'text', 'workflow'],
          additionalProperties: false,
          description:
            'Allows users to run a {@link https://api.slack.com/automation/triggers/link#workflow_buttons link trigger} with customizable inputs.',
        },
        RichTextInput: {
          type: 'object',
          properties: {
            placeholder: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'A {@link PlainTextElement } object that defines the placeholder text shown on the element. Maximum\nlength for the `text` field in this object is 150 characters.',
            },
            focus_on_load: {
              type: 'boolean',
              description:
                'Indicates whether the element will be set to auto focus within the\n{@link https://api.slack.com/reference/surfaces/views `view` object}. Only one element can be set to `true`.\nDefaults to `false`.',
            },
            dispatch_action_config: {
              $ref: '#/definitions/DispatchActionConfig',
            },
            type: {
              type: 'string',
              const: 'rich_text_input',
              description: 'The type of element. In this case `type` is always `rich_text_input`.',
            },
            action_id: {
              type: 'string',
              description:
                ': An identifier for this action. You can use this when you receive an interaction payload to\n{@link https://api.slack.com/interactivity/handling#payloads identify the source of the action}. Should be unique\namong all other `action_id`s in the containing block. Maximum length for this field is 255 characters.',
            },
            initial_value: {
              $ref: '#/definitions/RichTextBlock',
              description: 'Initial contents of the input when it is loaded.',
            },
          },
          required: ['type'],
          additionalProperties: false,
          description:
            'A rich text input creates a composer/WYSIWYG editor for entering formatted text, offering nearly the\nsame experience you have writing messages in Slack.',
        },
        Dispatchable: {
          type: 'object',
          properties: {
            dispatch_action_config: {
              $ref: '#/definitions/DispatchActionConfig',
            },
          },
          additionalProperties: false,
        },
        DispatchActionConfig: {
          type: 'object',
          properties: {
            trigger_actions_on: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['on_enter_pressed', 'on_character_entered'],
              },
              description:
                'An array of interaction types that you would like to receive a\n{@link https://api.slack.com/reference/interaction-payloads/block-actions `block_actions` payload} for. Should be\none or both of:\n`on_enter_pressed` — payload is dispatched when user presses the enter key while the input is in focus. Hint\ntext will appear underneath the input explaining to the user to press enter to submit.\n`on_character_entered` — payload is dispatched when a character is entered (or removed) in the input.',
            },
          },
          additionalProperties: false,
          description:
            'Defines when a {@link PlainTextElement } will return a {@link https://api.slack.com/reference/interaction-payloads/block-actions `block_actions` interaction payload}.',
        },
        RichTextBlock: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              const: 'rich_text',
              description: 'The type of block. For a rich text block, `type` is always `rich_text`.',
            },
            block_id: {
              type: 'string',
              description:
                'A string acting as a unique identifier for a block. If not specified, a `block_id` will be generated.\nYou can use this `block_id` when you receive an interaction payload to\n{@link https://api.slack.com/interactivity/handling#payloads identify the source of the action}.\nMaximum length for this field is 255 characters. `block_id` should be unique for each message and each iteration of\na message. If a message is updated, use a new `block_id`.',
            },
            elements: {
              type: 'array',
              items: {
                anyOf: [
                  {
                    $ref: '#/definitions/RichTextSection',
                  },
                  {
                    $ref: '#/definitions/RichTextList',
                  },
                  {
                    $ref: '#/definitions/RichTextQuote',
                  },
                  {
                    $ref: '#/definitions/RichTextPreformatted',
                  },
                ],
              },
            },
          },
          required: ['elements', 'type'],
          additionalProperties: false,
        },
        RichTextSection: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              const: 'rich_text_section',
              description: 'The type of element. In this case `type` is always `rich_text_section`.',
            },
            elements: {
              type: 'array',
              items: {
                $ref: '#/definitions/RichTextElement',
              },
            },
          },
          required: ['type', 'elements'],
          additionalProperties: false,
          description: 'A section block within a rich text field.',
        },
        RichTextElement: {
          anyOf: [
            {
              $ref: '#/definitions/RichTextBroadcastMention',
            },
            {
              $ref: '#/definitions/RichTextColor',
            },
            {
              $ref: '#/definitions/RichTextChannelMention',
            },
            {
              $ref: '#/definitions/RichTextDate',
            },
            {
              $ref: '#/definitions/RichTextEmoji',
            },
            {
              $ref: '#/definitions/RichTextLink',
            },
            {
              $ref: '#/definitions/RichTextTeamMention',
            },
            {
              $ref: '#/definitions/RichTextText',
            },
            {
              $ref: '#/definitions/RichTextUserMention',
            },
            {
              $ref: '#/definitions/RichTextUsergroupMention',
            },
          ],
          description: 'Union of rich text sub-elements for use within rich text blocks.',
        },
        RichTextBroadcastMention: {
          type: 'object',
          properties: {
            style: {
              type: 'object',
              properties: {
                bold: {
                  type: 'boolean',
                },
                italic: {
                  type: 'boolean',
                },
                strike: {
                  type: 'boolean',
                },
                highlight: {
                  type: 'boolean',
                },
              },
              additionalProperties: false,
            },
            type: {
              type: 'string',
              const: 'broadcast',
              description: 'The type of element. In this case `type` is always `broadcast`.',
            },
            range: {
              type: 'string',
              enum: ['here', 'channel', 'everyone'],
              description: 'The range of the broadcast; can be one of `here`, `channel` and `everyone`.',
            },
          },
          required: ['type', 'range'],
          additionalProperties: false,
          description: 'A broadcast mention element for use in a rich text message.',
        },
        RichTextStyleable: {
          type: 'object',
          properties: {
            style: {
              type: 'object',
              properties: {
                bold: {
                  type: 'boolean',
                },
                italic: {
                  type: 'boolean',
                },
                strike: {
                  type: 'boolean',
                },
                highlight: {
                  type: 'boolean',
                },
              },
              additionalProperties: false,
            },
          },
          additionalProperties: false,
          description: 'For use styling Rich Text message sub-elements.',
        },
        RichTextColor: {
          type: 'object',
          properties: {
            style: {
              type: 'object',
              properties: {
                bold: {
                  type: 'boolean',
                },
                italic: {
                  type: 'boolean',
                },
                strike: {
                  type: 'boolean',
                },
                highlight: {
                  type: 'boolean',
                },
              },
              additionalProperties: false,
            },
            type: {
              type: 'string',
              const: 'color',
              description: 'The type of element. In this case `type` is always `color`.',
            },
            value: {
              type: 'string',
              description: 'The hex value for the color.',
            },
          },
          required: ['type', 'value'],
          additionalProperties: false,
          description: 'A hex color element for use in a rich text message.',
        },
        RichTextChannelMention: {
          type: 'object',
          properties: {
            style: {
              type: 'object',
              properties: {
                bold: {
                  type: 'boolean',
                },
                italic: {
                  type: 'boolean',
                },
                strike: {
                  type: 'boolean',
                },
                highlight: {
                  type: 'boolean',
                },
              },
              additionalProperties: false,
            },
            type: {
              type: 'string',
              const: 'channel',
              description: 'The type of element. In this case `type` is always `channel`.',
            },
            channel_id: {
              type: 'string',
              description: 'The encoded channel ID, e.g. C1234ABCD.',
            },
          },
          required: ['type', 'channel_id'],
          additionalProperties: false,
          description: 'A channel mention element for use in a rich text message.',
        },
        RichTextDate: {
          type: 'object',
          properties: {
            style: {
              type: 'object',
              properties: {
                bold: {
                  type: 'boolean',
                },
                italic: {
                  type: 'boolean',
                },
                strike: {
                  type: 'boolean',
                },
                highlight: {
                  type: 'boolean',
                },
              },
              additionalProperties: false,
            },
            type: {
              type: 'string',
              const: 'date',
              description: 'The type of element. In this case `type` is always `date`.',
            },
            timestamp: {
              type: 'number',
              description: 'A UNIX timestamp for the date to be displayed in seconds.',
            },
            format: {
              type: 'string',
              description:
                'A template string containing curly-brace-enclosed tokens to substitute your provided `timestamp`\nin a particularly-formatted way. For example: `Posted at {date_long}`. The available date formatting tokens are:\n- `{day_divider_pretty}`: Shows `today`, `yesterday` or `tomorrow` if applicable. Otherwise, if the date is in\ncurrent year, uses the `{date_long}` format without the year. Otherwise, falls back to using the `{date_long}`\nformat.\n- `{date_num}`: Shows date as YYYY-MM-DD.\n- `{date_slash}`: Shows date as DD/MM/YYYY (subject to locale preferences).\n- `{date_long}`: Shows date as a long-form sentence including day-of-week, e.g. `Monday, December 23rd, 2013`.\n- `{date_long_full}`: Shows date as a long-form sentence without day-of-week, e.g. `August 9, 2020`.\n- `{date_long_pretty}`: Shows `yesterday`, `today` or `tomorrow`, otherwise uses the `{date_long}` format.\n- `{date}`: Same as `{date_long_full}` but without the year.\n- `{date_pretty}`: Shows `today`, `yesterday` or `tomorrow` if applicable, otherwise uses the `{date}` format.\n- `{date_short}`: Shows date using short month names without day-of-week, e.g. `Aug 9, 2020`.\n- `{date_short_pretty}`: Shows `today`, `yesterday` or `tomorrow` if applicable, otherwise uses the `{date_short}`\nformat.\n- `{time}`: Depending on user preferences, shows just the time-of-day portion of the timestamp using either 12 or\n24 hour clock formats, e.g. `2:34 PM` or `14:34`.\n- `{time_secs}`: Depending on user preferences, shows just the time-of-day portion of the timestamp using either 12\nor 24 hour clock formats, including seconds, e.g. `2:34:56 PM` or `14:34:56`.\n- `{ago}`: A human-readable period of time, e.g. `3 minutes ago`, `4 hours ago`, `2 days ago`.\nTODO: test/document `{member_local_time}`, `{status_expiration}` and `{calendar_header}`',
            },
            url: {
              type: 'string',
              description: 'URL to link the entire `format` string to.',
            },
            fallback: {
              type: 'string',
              description: 'Text to display in place of the date should parsing, formatting or displaying fails.',
            },
          },
          required: ['type', 'timestamp', 'format'],
          additionalProperties: false,
          description: 'A date element for use in a rich text message.',
        },
        RichTextEmoji: {
          type: 'object',
          properties: {
            style: {
              type: 'object',
              properties: {
                bold: {
                  type: 'boolean',
                },
                italic: {
                  type: 'boolean',
                },
                strike: {
                  type: 'boolean',
                },
                highlight: {
                  type: 'boolean',
                },
              },
              additionalProperties: false,
            },
            type: {
              type: 'string',
              const: 'emoji',
              description: 'The type of element. In this case `type` is always `emoji`.',
            },
            name: {
              type: 'string',
              description: 'Name of emoji, without colons or skin tones, e.g. `wave`',
            },
            unicode: {
              type: 'string',
              description:
                'Lowercase hexadecimal Unicode representation of a standard emoji (not for use with custom emoji).',
            },
            url: {
              type: 'string',
              description: 'URL of emoji asset. Only used when sharing custom emoji across workspaces.',
            },
          },
          required: ['type', 'name'],
          additionalProperties: false,
          description: 'An emoji element for use in a rich text message.',
        },
        RichTextLink: {
          type: 'object',
          properties: {
            style: {
              type: 'object',
              properties: {
                bold: {
                  type: 'boolean',
                },
                italic: {
                  type: 'boolean',
                },
                strike: {
                  type: 'boolean',
                },
                highlight: {
                  type: 'boolean',
                },
              },
              additionalProperties: false,
              description:
                'A limited style object for styling rich text message elements\n(excluding pre-formatted, or code, elements).',
            },
            type: {
              type: 'string',
              const: 'link',
              description: 'The type of element. In this case `type` is always `link`.',
            },
            text: {
              type: 'string',
              description: 'The text to link.',
            },
            unsafe: {
              type: 'boolean',
              description: 'TODO: ?',
            },
            url: {
              type: 'string',
              description: 'URL to link to.',
            },
          },
          required: ['type', 'url'],
          additionalProperties: false,
          description: 'A link element for use in a rich text message.',
        },
        RichTextTeamMention: {
          type: 'object',
          properties: {
            style: {
              type: 'object',
              properties: {
                bold: {
                  type: 'boolean',
                },
                italic: {
                  type: 'boolean',
                },
                strike: {
                  type: 'boolean',
                },
                highlight: {
                  type: 'boolean',
                },
              },
              additionalProperties: false,
              description:
                'A limited style object for styling rich text message elements\n(excluding pre-formatted, or code, elements).',
            },
            type: {
              type: 'string',
              const: 'team',
              description: 'The type of element. In this case `type` is always `team`.',
            },
            team_id: {
              type: 'string',
              description: 'The encoded team ID, e.g. T1234ABCD.',
            },
          },
          required: ['type', 'team_id'],
          additionalProperties: false,
          description: 'A workspace or team mention element for use in a rich text message.',
        },
        RichTextText: {
          type: 'object',
          properties: {
            style: {
              type: 'object',
              properties: {
                bold: {
                  type: 'boolean',
                },
                italic: {
                  type: 'boolean',
                },
                strike: {
                  type: 'boolean',
                },
                highlight: {
                  type: 'boolean',
                },
              },
              additionalProperties: false,
              description:
                'A limited style object for styling rich text message elements\n(excluding pre-formatted, or code, elements).',
            },
            type: {
              type: 'string',
              const: 'text',
              description: 'The type of element. In this case `type` is always `text`.',
            },
            text: {
              type: 'string',
              description: 'The text to render.',
            },
          },
          required: ['type', 'text'],
          additionalProperties: false,
          description: 'A generic text element for use in a rich text message.',
        },
        RichTextUserMention: {
          type: 'object',
          properties: {
            style: {
              type: 'object',
              properties: {
                bold: {
                  type: 'boolean',
                },
                italic: {
                  type: 'boolean',
                },
                strike: {
                  type: 'boolean',
                },
                highlight: {
                  type: 'boolean',
                },
              },
              additionalProperties: false,
              description:
                'A limited style object for styling rich text message elements\n(excluding pre-formatted, or code, elements).',
            },
            type: {
              type: 'string',
              const: 'user',
              description: 'The type of element. In this case `type` is always `user`.',
            },
            user_id: {
              type: 'string',
              description: 'The encoded user ID, e.g. U1234ABCD.',
            },
          },
          required: ['type', 'user_id'],
          additionalProperties: false,
          description: 'A user mention element for use in a rich text message.',
        },
        RichTextUsergroupMention: {
          type: 'object',
          properties: {
            style: {
              type: 'object',
              properties: {
                bold: {
                  type: 'boolean',
                },
                italic: {
                  type: 'boolean',
                },
                strike: {
                  type: 'boolean',
                },
                highlight: {
                  type: 'boolean',
                },
              },
              additionalProperties: false,
              description:
                'A limited style object for styling rich text message elements\n(excluding pre-formatted, or code, elements).',
            },
            type: {
              type: 'string',
              const: 'usergroup',
              description: 'The type of element. In this case `type` is always `usergroup`.',
            },
            usergroup_id: {
              type: 'string',
              description: 'The encoded usergroup ID, e.g. S1234ABCD.',
            },
          },
          required: ['type', 'usergroup_id'],
          additionalProperties: false,
          description: 'A usergroup mention element for use in a rich text message.',
        },
        RichTextList: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              const: 'rich_text_list',
              description: 'The type of element. In this case `type` is always `rich_text_list`.',
            },
            elements: {
              type: 'array',
              items: {
                $ref: '#/definitions/RichTextSection',
              },
              description: 'An array of {@link RichTextSection } elements comprising each list item.',
            },
            style: {
              type: 'string',
              enum: ['bullet', 'ordered'],
              description:
                'The type of list. Can be either `bullet` (the list points are all rendered the same way) or `ordered`\n(the list points increase numerically from 1).',
            },
            indent: {
              type: 'number',
              description:
                'The style of the list points. Can be a number from `0` (default) to `8`. Yields a different character\nor characters rendered as the list points. Also affected by the `style` property.',
            },
            border: {
              type: 'number',
              enum: [0, 1],
              description:
                'Whether to render a quote-block-like border on the inline side of the list. `0` renders no border\nwhile `1` renders a border.',
            },
          },
          required: ['type', 'elements', 'style'],
          additionalProperties: false,
          description: 'A list block within a rich text field.',
        },
        RichTextQuote: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              const: 'rich_text_quote',
              description: 'The type of element. In this case `type` is always `rich_text_quote`.',
            },
            elements: {
              type: 'array',
              items: {
                $ref: '#/definitions/RichTextElement',
              },
              description: 'An array of {@link RichTextElement } comprising the quote block.',
            },
          },
          required: ['type', 'elements'],
          additionalProperties: false,
          description: 'A quote block within a rich text field.',
        },
        RichTextPreformatted: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              const: 'rich_text_preformatted',
              description: 'The type of element. In this case `type` is always `rich_text_preformatted`.',
            },
            elements: {
              type: 'array',
              items: {
                anyOf: [
                  {
                    $ref: '#/definitions/RichTextText',
                  },
                  {
                    $ref: '#/definitions/RichTextLink',
                  },
                ],
              },
              description:
                'An array of either {@link RichTextLink } or {@link RichTextText } comprising the preformatted text.',
            },
            border: {
              type: 'number',
              enum: [0, 1],
              description:
                'Whether to render a quote-block-like border on the inline side of the preformatted text.\n`0` renders no border, while `1` renders a border. Defaults to `0`.',
            },
          },
          required: ['type', 'elements'],
          additionalProperties: false,
          description: 'A block of preformatted text within a rich text field.',
        },
        DividerBlock: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              const: 'divider',
              description: 'The type of block. For a divider block, `type` is always `divider`.',
            },
            block_id: {
              type: 'string',
              description:
                'A string acting as a unique identifier for a block. If not specified, a `block_id` will be generated.\nYou can use this `block_id` when you receive an interaction payload to\n{@link https://api.slack.com/interactivity/handling#payloads identify the source of the action}.\nMaximum length for this field is 255 characters. `block_id` should be unique for each message and each iteration of\na message. If a message is updated, use a new `block_id`.',
            },
          },
          required: ['type'],
          additionalProperties: false,
        },
        SectionBlock: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              const: 'section',
              description: 'The type of block. For a section block, `type` is always `section`.',
            },
            block_id: {
              type: 'string',
              description:
                'A string acting as a unique identifier for a block. If not specified, a `block_id` will be generated.\nYou can use this `block_id` when you receive an interaction payload to\n{@link https://api.slack.com/interactivity/handling#payloads identify the source of the action}.\nMaximum length for this field is 255 characters. `block_id` should be unique for each message and each iteration of\na message. If a message is updated, use a new `block_id`.',
            },
            text: {
              anyOf: [
                {
                  $ref: '#/definitions/PlainTextElement',
                },
                {
                  $ref: '#/definitions/MrkdwnElement',
                },
              ],
              description:
                'The text for the block, in the form of a text object. Minimum length for the `text` in this field is\n1 and maximum length is 3000 characters. This field is not required if a valid array of `fields` objects is\nprovided instead.',
            },
            fields: {
              type: 'array',
              items: {
                anyOf: [
                  {
                    $ref: '#/definitions/PlainTextElement',
                  },
                  {
                    $ref: '#/definitions/MrkdwnElement',
                  },
                ],
              },
              description:
                'Required if no `text` is provided. An array of text objects. Any text objects included with `fields`\nwill be rendered in a compact format that allows for 2 columns of side-by-side text. Maximum number of items is 10.\nMaximum length for the text in each item is 2000 characters.\n{@link https://app.slack.com/block-kit-builder/#%7B%22blocks%22:%5B%7B%22type%22:%22section%22,%22text%22:%7B%22text%22:%22A%20message%20*with%20some%20bold%20text*%20and%20_some%20italicized%20text_.%22,%22type%22:%22mrkdwn%22%7D,%22fields%22:%5B%7B%22type%22:%22mrkdwn%22,%22text%22:%22*Priority*%22%7D,%7B%22type%22:%22mrkdwn%22,%22text%22:%22*Type*%22%7D,%7B%22type%22:%22plain_text%22,%22text%22:%22High%22%7D,%7B%22type%22:%22plain_text%22,%22text%22:%22String%22%7D%5D%7D%5D%7D Click here for an example}.',
            },
            accessory: {
              anyOf: [
                {
                  $ref: '#/definitions/Button',
                },
                {
                  $ref: '#/definitions/Overflow',
                },
                {
                  $ref: '#/definitions/Datepicker',
                },
                {
                  $ref: '#/definitions/Timepicker',
                },
                {
                  $ref: '#/definitions/Select',
                },
                {
                  $ref: '#/definitions/MultiSelect',
                },
                {
                  $ref: '#/definitions/Actionable',
                },
                {
                  $ref: '#/definitions/ImageElement',
                },
                {
                  $ref: '#/definitions/RadioButtons',
                },
                {
                  $ref: '#/definitions/Checkboxes',
                },
              ],
              description: 'One of the compatible element objects.',
            },
          },
          required: ['type'],
          additionalProperties: false,
          description:
            'Displays text, possibly alongside block elements. A section can be used as a simple text block, in\ncombination with text fields, or side-by-side with certain\n{@link https://api.slack.com/reference/messaging/block-elements block elements}.',
        },
        InputBlock: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              const: 'input',
              description: 'The type of block. For an input block, `type` is always `input`.',
            },
            block_id: {
              type: 'string',
              description:
                'A string acting as a unique identifier for a block. If not specified, a `block_id` will be generated.\nYou can use this `block_id` when you receive an interaction payload to\n{@link https://api.slack.com/interactivity/handling#payloads identify the source of the action}.\nMaximum length for this field is 255 characters. `block_id` should be unique for each message and each iteration of\na message. If a message is updated, use a new `block_id`.',
            },
            label: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'A label that appears above an input element in the form of a {@link PlainTextElement } object.\nMaximum length for the text in this field is 2000 characters.',
            },
            hint: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'An optional hint that appears below an input element in a lighter grey. It must be a\n{@link PlainTextElement object}. Maximum length for the `text` in this field is 2000 characters.',
            },
            optional: {
              type: 'boolean',
              description:
                'A boolean that indicates whether the input element may be empty when a user submits the modal.\nDefaults to `false`.',
            },
            element: {
              anyOf: [
                {
                  $ref: '#/definitions/Select',
                },
                {
                  $ref: '#/definitions/MultiSelect',
                },
                {
                  $ref: '#/definitions/Datepicker',
                },
                {
                  $ref: '#/definitions/Timepicker',
                },
                {
                  $ref: '#/definitions/DateTimepicker',
                },
                {
                  $ref: '#/definitions/PlainTextInput',
                },
                {
                  $ref: '#/definitions/URLInput',
                },
                {
                  $ref: '#/definitions/EmailInput',
                },
                {
                  $ref: '#/definitions/NumberInput',
                },
                {
                  $ref: '#/definitions/RadioButtons',
                },
                {
                  $ref: '#/definitions/Checkboxes',
                },
                {
                  $ref: '#/definitions/RichTextInput',
                },
              ],
              description: 'A block element.',
            },
            dispatch_action: {
              type: 'boolean',
              description:
                'A boolean that indicates whether or not the use of elements in this block should dispatch a\n{@link https://api.slack.com/reference/interaction-payloads/block-actions block_actions payload}. Defaults to `false`.',
            },
          },
          required: ['element', 'label', 'type'],
          additionalProperties: false,
          description: 'Collects information from users via block elements.',
        },
        PlainTextInput: {
          type: 'object',
          properties: {
            placeholder: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'A {@link PlainTextElement } object that defines the placeholder text shown on the element. Maximum\nlength for the `text` field in this object is 150 characters.',
            },
            focus_on_load: {
              type: 'boolean',
              description:
                'Indicates whether the element will be set to auto focus within the\n{@link https://api.slack.com/reference/surfaces/views `view` object}. Only one element can be set to `true`.\nDefaults to `false`.',
            },
            dispatch_action_config: {
              $ref: '#/definitions/DispatchActionConfig',
            },
            type: {
              type: 'string',
              const: 'plain_text_input',
              description: 'The type of element. In this case `type` is always `plain_text_input`.',
            },
            action_id: {
              type: 'string',
              description:
                ': An identifier for this action. You can use this when you receive an interaction payload to\n{@link https://api.slack.com/interactivity/handling#payloads identify the source of the action}. Should be unique\namong all other `action_id`s in the containing block. Maximum length for this field is 255 characters.',
            },
            initial_value: {
              type: 'string',
              description: 'The initial value in the plain-text input when it is loaded.',
            },
            multiline: {
              type: 'boolean',
              description:
                'Indicates whether the input will be a single line (`false`) or a larger textarea (`true`).\nDefaults to `false`.',
            },
            min_length: {
              type: 'number',
              description:
                'The minimum length of input that the user must provide. If the user provides less, they will receive\nan error. Maximum value is 3000.',
            },
            max_length: {
              type: 'number',
              description:
                'The maximum length of input that the user can provide. If the user provides more,\nthey will receive an error.',
            },
          },
          required: ['type'],
          additionalProperties: false,
          description: 'Allows users to enter freeform text data into a single-line or multi-line field.',
        },
        URLInput: {
          type: 'object',
          properties: {
            placeholder: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'A {@link PlainTextElement } object that defines the placeholder text shown on the element. Maximum\nlength for the `text` field in this object is 150 characters.',
            },
            focus_on_load: {
              type: 'boolean',
              description:
                'Indicates whether the element will be set to auto focus within the\n{@link https://api.slack.com/reference/surfaces/views `view` object}. Only one element can be set to `true`.\nDefaults to `false`.',
            },
            dispatch_action_config: {
              $ref: '#/definitions/DispatchActionConfig',
            },
            type: {
              type: 'string',
              const: 'url_text_input',
              description: 'The type of element. In this case `type` is always `url_text_input`.',
            },
            action_id: {
              type: 'string',
              description:
                ': An identifier for this action. You can use this when you receive an interaction payload to\n{@link https://api.slack.com/interactivity/handling#payloads identify the source of the action}. Should be unique\namong all other `action_id`s in the containing block. Maximum length for this field is 255 characters.',
            },
            initial_value: {
              type: 'string',
              description: 'The initial value in the URL input when it is loaded.',
            },
          },
          required: ['type'],
          additionalProperties: false,
          description: 'Allows user to enter a URL into a single-line field.',
        },
        EmailInput: {
          type: 'object',
          properties: {
            placeholder: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'A {@link PlainTextElement } object that defines the placeholder text shown on the element. Maximum\nlength for the `text` field in this object is 150 characters.',
            },
            focus_on_load: {
              type: 'boolean',
              description:
                'Indicates whether the element will be set to auto focus within the\n{@link https://api.slack.com/reference/surfaces/views `view` object}. Only one element can be set to `true`.\nDefaults to `false`.',
            },
            dispatch_action_config: {
              $ref: '#/definitions/DispatchActionConfig',
              description:
                'A {@link DispatchActionConfig } object that determines when during text input the element returns a\n{@link https://api.slack.com/reference/interaction-payloads/block-actions `block_actions` payload}.',
            },
            type: {
              type: 'string',
              const: 'email_text_input',
              description: 'The type of element. In this case `type` is always `email_text_input`.',
            },
            action_id: {
              type: 'string',
              description:
                ': An identifier for this action. You can use this when you receive an interaction payload to\n{@link https://api.slack.com/interactivity/handling#payloads identify the source of the action}. Should be unique\namong all other `action_id`s in the containing block. Maximum length for this field is 255 characters.',
            },
            initial_value: {
              type: 'string',
              description: 'The initial value in the email input when it is loaded.',
            },
          },
          required: ['type'],
          additionalProperties: false,
          description: 'Allows user to enter an email into a single-line field.',
        },
        NumberInput: {
          type: 'object',
          properties: {
            placeholder: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'A {@link PlainTextElement } object that defines the placeholder text shown on the element. Maximum\nlength for the `text` field in this object is 150 characters.',
            },
            focus_on_load: {
              type: 'boolean',
              description:
                'Indicates whether the element will be set to auto focus within the\n{@link https://api.slack.com/reference/surfaces/views `view` object}. Only one element can be set to `true`.\nDefaults to `false`.',
            },
            dispatch_action_config: {
              $ref: '#/definitions/DispatchActionConfig',
              description:
                'A {@link DispatchActionConfig } object that determines when during text input the element returns a\n{@link https://api.slack.com/reference/interaction-payloads/block-actions `block_actions` payload}.',
            },
            type: {
              type: 'string',
              const: 'number_input',
              description: 'The type of element. In this case `type` is always `number_input`.',
            },
            action_id: {
              type: 'string',
              description:
                ': An identifier for this action. You can use this when you receive an interaction payload to\n{@link https://api.slack.com/interactivity/handling#payloads identify the source of the action}. Should be unique\namong all other `action_id`s in the containing block. Maximum length for this field is 255 characters.',
            },
            is_decimal_allowed: {
              type: 'boolean',
              description:
                'Decimal numbers are allowed if this property is `true`, set the value to `false` otherwise.',
            },
            initial_value: {
              type: 'string',
              description: 'The initial value in the input when it is loaded.',
            },
            min_value: {
              type: 'string',
              description: 'The minimum value, cannot be greater than `max_value`.',
            },
            max_value: {
              type: 'string',
              description: 'The maximum value, cannot be less than `min_value`.',
            },
          },
          required: ['is_decimal_allowed', 'type'],
          additionalProperties: false,
          description:
            'Allows user to enter a number into a single-line field. The number input element accepts both whole and\ndecimal numbers. For example, 0.25, 5.5, and -10 are all valid input values. Decimal numbers are only allowed when\n`is_decimal_allowed` is equal to `true`.',
        },
        FileBlock: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              const: 'file',
              description: 'The type of block. For a file block, `type` is always `file`.',
            },
            block_id: {
              type: 'string',
              description:
                'A string acting as a unique identifier for a block. If not specified, a `block_id` will be generated.\nYou can use this `block_id` when you receive an interaction payload to\n{@link https://api.slack.com/interactivity/handling#payloads identify the source of the action}.\nMaximum length for this field is 255 characters. `block_id` should be unique for each message and each iteration of\na message. If a message is updated, use a new `block_id`.',
            },
            source: {
              type: 'string',
              description: 'At the moment, source will always be `remote` for a remote file.',
            },
            external_id: {
              type: 'string',
              description: 'The external unique ID for this file.',
            },
          },
          required: ['external_id', 'source', 'type'],
          additionalProperties: false,
          description:
            "Displays a {@link https://api.slack.com/messaging/files/remote remote file}. You can't add this block to\napp surfaces directly, but it will show up when {@link https://api.slack.com/messaging/retrieving retrieving messages}\nthat contain remote files. If you want to add remote files to messages,\n{@link https://api.slack.com/messaging/files/remote follow our guide}.",
        },
        HeaderBlock: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              const: 'header',
              description: 'The type of block. For a header block, `type` is always `header`.',
            },
            block_id: {
              type: 'string',
              description:
                'A string acting as a unique identifier for a block. If not specified, a `block_id` will be generated.\nYou can use this `block_id` when you receive an interaction payload to\n{@link https://api.slack.com/interactivity/handling#payloads identify the source of the action}.\nMaximum length for this field is 255 characters. `block_id` should be unique for each message and each iteration of\na message. If a message is updated, use a new `block_id`.',
            },
            text: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'The text for the block, in the form of a {@link PlainTextElement }.\nMaximum length for the text in this field is 150 characters.',
            },
          },
          required: ['text', 'type'],
          additionalProperties: false,
          description:
            "Displays a larger-sized text block. A `header` is a plain-text block that displays in a larger, bold\nfont. Use it to delineate between different groups of content in your app's surfaces.",
        },
        VideoBlock: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              const: 'video',
              description: 'The type of block. For a video block, `type` is always `video`.',
            },
            block_id: {
              type: 'string',
              description:
                'A string acting as a unique identifier for a block. If not specified, a `block_id` will be generated.\nYou can use this `block_id` when you receive an interaction payload to\n{@link https://api.slack.com/interactivity/handling#payloads identify the source of the action}.\nMaximum length for this field is 255 characters. `block_id` should be unique for each message and each iteration of\na message. If a message is updated, use a new `block_id`.',
            },
            video_url: {
              type: 'string',
              description:
                'The URL to be embedded. Must match any existing\n{@link https://api.slack.com/reference/messaging/link-unfurling#configuring_domains unfurl domains} within the app\nand point to a HTTPS URL.',
            },
            thumbnail_url: {
              type: 'string',
              description: 'The thumbnail image URL.',
            },
            alt_text: {
              type: 'string',
              description: 'A tooltip for the video. Required for accessibility.',
            },
            title: {
              $ref: '#/definitions/PlainTextElement',
              description:
                'Video title as a {@link PlainTextElement } object. `text` within must be less than 200 characters.',
            },
            title_url: {
              type: 'string',
              description:
                'Hyperlink for the title text. Must correspond to the non-embeddable URL for the video.\nMust go to an HTTPS URL.',
            },
            author_name: {
              type: 'string',
              description: 'Author name to be displayed. Must be less than 50 characters.',
            },
            provider_name: {
              type: 'string',
              description: 'The originating application or domain of the video, e.g. YouTube.',
            },
            provider_icon_url: {
              type: 'string',
              description: 'Icon for the video provider, e.g. YouTube icon.',
            },
            description: {
              $ref: '#/definitions/PlainTextElement',
              description: 'Description for video using a {@link PlainTextElement } object.',
            },
          },
          required: ['alt_text', 'thumbnail_url', 'title', 'type', 'video_url'],
          additionalProperties: false,
          description:
            'Displays an embedded video player. A video block is designed to embed videos in all app surfaces (e.g.\nlink unfurls, messages, modals, App Home) — anywhere you can put blocks! To use the video block within your app, you\nmust have the {@link https://api.slack.com/scopes/links.embed:write `links.embed:write` scope}.',
        },
      },
    },
  },
  additionalProperties: false,
} as const satisfies Schema;

export const slackProviderSchemas = {
  output: slackOutputSchema,
};
