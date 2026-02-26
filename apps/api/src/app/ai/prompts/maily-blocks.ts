export const EXAMPLE_BLOCK_EDITOR_JSON = `{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "textAlign": null, "level": 1, "showIfKey": null },
      "content": [{ "type": "text", "text": "Heading 1" }]
    },
    {
      "type": "heading",
      "attrs": { "textAlign": null, "level": 2, "showIfKey": null },
      "content": [{ "type": "text", "text": "Heading 2" }]
    },
    {
      "type": "heading",
      "attrs": { "textAlign": null, "level": 3, "showIfKey": null },
      "content": [{ "type": "text", "text": "Heading 3" }]
    },
    {
      "type": "paragraph",
      "attrs": { "textAlign": null, "showIfKey": null },
      "content": [{ "type": "text", "text": "Paragraph" }]
    },
    {
      "type": "paragraph",
      "attrs": { "textAlign": null, "showIfKey": null },
      "content": [
        {
          "type": "variable",
          "attrs": { "id": "payload.foo", "label": null, "fallback": null, "required": false, "aliasFor": null }
        },
        { "type": "text", "text": " " }
      ]
    },
    { "type": "paragraph", "attrs": { "textAlign": null, "showIfKey": null } },
    {
      "type": "blockquote",
      "content": [
        {
          "type": "paragraph",
          "attrs": { "textAlign": null, "showIfKey": null },
          "content": [{ "type": "text", "text": "Blockquote" }]
        }
      ]
    },
    { "type": "paragraph", "attrs": { "textAlign": null, "showIfKey": null } },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "attrs": { "color": null },
          "content": [
            {
              "type": "paragraph",
              "attrs": { "textAlign": null, "showIfKey": null },
              "content": [{ "type": "text", "text": "Bullet List item1" }]
            }
          ]
        },
        {
          "type": "listItem",
          "attrs": { "color": null },
          "content": [
            {
              "type": "paragraph",
              "attrs": { "textAlign": null, "showIfKey": null },
              "content": [{ "type": "text", "text": "Bullet List item2" }]
            }
          ]
        },
        {
          "type": "listItem",
          "attrs": { "color": null },
          "content": [
            {
              "type": "paragraph",
              "attrs": { "textAlign": null, "showIfKey": null },
              "content": [{ "type": "text", "text": "Bullet List item3" }]
            }
          ]
        }
      ]
    },
    { "type": "paragraph", "attrs": { "textAlign": null, "showIfKey": null } },
    {
      "type": "orderedList",
      "attrs": { "start": 1 },
      "content": [
        {
          "type": "listItem",
          "attrs": { "color": null },
          "content": [
            {
              "type": "paragraph",
              "attrs": { "textAlign": null, "showIfKey": null },
              "content": [{ "type": "text", "text": "Numbered List item1" }]
            }
          ]
        },
        {
          "type": "listItem",
          "attrs": { "color": null },
          "content": [
            {
              "type": "paragraph",
              "attrs": { "textAlign": null, "showIfKey": null },
              "content": [{ "type": "text", "text": "Numbered List item2" }]
            }
          ]
        },
        {
          "type": "listItem",
          "attrs": { "color": null },
          "content": [
            {
              "type": "paragraph",
              "attrs": { "textAlign": null, "showIfKey": null },
              "content": [{ "type": "text", "text": "Numbered List item3" }]
            }
          ]
        }
      ]
    },
    { "type": "paragraph", "attrs": { "textAlign": null, "showIfKey": null } },
    {
      "type": "button",
      "attrs": {
        "text": "Regular Button",
        "isTextVariable": false,
        "url": "",
        "isUrlVariable": false,
        "alignment": "left",
        "variant": "filled",
        "borderRadius": "smooth",
        "buttonColor": "#000000",
        "textColor": "#ffffff",
        "showIfKey": null,
        "paddingTop": 10,
        "paddingRight": 32,
        "paddingBottom": 10,
        "paddingLeft": 32,
        "width": "auto",
        "aliasFor": null
      }
    },
    {
      "type": "button",
      "attrs": {
        "text": "Button with link",
        "isTextVariable": false,
        "url": "payload.foo",
        "isUrlVariable": false,
        "alignment": "left",
        "variant": "filled",
        "borderRadius": "smooth",
        "buttonColor": "#000000",
        "textColor": "#ffffff",
        "showIfKey": null,
        "paddingTop": 10,
        "paddingRight": 32,
        "paddingBottom": 10,
        "paddingLeft": 32,
        "width": "auto",
        "aliasFor": null
      }
    },
    {
      "type": "button",
      "attrs": {
        "text": "payload.foo",
        "isTextVariable": true,
        "url": "",
        "isUrlVariable": false,
        "alignment": "left",
        "variant": "filled",
        "borderRadius": "smooth",
        "buttonColor": "#000000",
        "textColor": "#ffffff",
        "showIfKey": null,
        "paddingTop": 10,
        "paddingRight": 32,
        "paddingBottom": 10,
        "paddingLeft": 32,
        "width": "auto",
        "aliasFor": null
      }
    },
    { "type": "paragraph", "attrs": { "textAlign": null, "showIfKey": null } },
    {
      "type": "columns",
      "attrs": { "showIfKey": null, "gap": 8, "marginBottom": 10 },
      "content": [
        {
          "type": "column",
          "attrs": { "columnId": "75a62a21-402e-4b47-9869-8e2d25a25753", "width": "auto", "verticalAlign": "top" },
          "content": [
            {
              "type": "paragraph",
              "attrs": { "textAlign": null, "showIfKey": null },
              "content": [{ "type": "text", "text": "Column1" }]
            },
            {
              "type": "paragraph",
              "attrs": { "textAlign": null, "showIfKey": null },
              "content": [{ "type": "text", "text": "Some text" }]
            }
          ]
        },
        {
          "type": "column",
          "attrs": { "columnId": "7a805fd0-2f4a-4f12-8a09-84a93a6777e3", "width": "auto", "verticalAlign": "top" },
          "content": [
            {
              "type": "paragraph",
              "attrs": { "textAlign": null, "showIfKey": null },
              "content": [{ "type": "text", "text": "Column2" }]
            },
            {
              "type": "paragraph",
              "attrs": { "textAlign": null, "showIfKey": null },
              "content": [{ "type": "text", "text": "Some text" }]
            }
          ]
        }
      ]
    },
    { "type": "paragraph", "attrs": { "textAlign": null, "showIfKey": null } },
    {
      "type": "htmlCodeBlock",
      "attrs": { "language": "html", "activeTab": "preview", "showIfKey": null },
      "content": [{ "type": "text", "text": "<p>here is HTML code</p>" }]
    },
    { "type": "paragraph", "attrs": { "textAlign": null, "showIfKey": null } },
    { "type": "horizontalRule", "attrs": { "marginTop": 10, "marginBottom": 10 } },
    { "type": "paragraph", "attrs": { "textAlign": null, "showIfKey": null } },
    { "type": "paragraph", "attrs": { "textAlign": null, "showIfKey": null }, "content": [{ "type": "hardBreak" }] },
    {
      "type": "image",
      "attrs": {
        "src": "",
        "alt": null,
        "title": null,
        "width": "auto",
        "height": "auto",
        "alignment": "center",
        "externalLink": null,
        "isExternalLinkVariable": false,
        "borderRadius": 0,
        "isSrcVariable": false,
        "aspectRatio": null,
        "lockAspectRatio": true,
        "showIfKey": null,
        "aliasFor": null
      }
    },
    {
      "type": "image",
      "attrs": {
        "src": "",
        "alt": null,
        "title": null,
        "width": "auto",
        "height": "auto",
        "alignment": "center",
        "externalLink": "payload.foo",
        "isExternalLinkVariable": true,
        "borderRadius": 0,
        "isSrcVariable": false,
        "aspectRatio": null,
        "lockAspectRatio": true,
        "showIfKey": null,
        "aliasFor": null
      }
    },
    { "type": "paragraph", "attrs": { "textAlign": null, "showIfKey": null } },
    {
      "type": "paragraph",
      "attrs": { "textAlign": null, "showIfKey": null },
      "content": [
        {
          "type": "inlineImage",
          "attrs": {
            "height": 20,
            "width": 20,
            "src": "https://maily.to/brand/logo.png",
            "isSrcVariable": false,
            "alt": null,
            "title": null,
            "externalLink": null,
            "isExternalLinkVariable": false,
            "aliasFor": null
          }
        }
      ]
    },
    {
      "type": "paragraph",
      "attrs": { "textAlign": null, "showIfKey": null },
      "content": [
        {
          "type": "inlineImage",
          "attrs": {
            "height": 20,
            "width": 20,
            "src": "https://maily.to/brand/logo.png",
            "isSrcVariable": false,
            "alt": null,
            "title": null,
            "externalLink": "payload.foo",
            "isExternalLinkVariable": true,
            "aliasFor": null
          }
        }
      ]
    },
    { "type": "paragraph", "attrs": { "textAlign": null, "showIfKey": null } },
    {
      "type": "repeat",
      "attrs": { "each": "payload.items", "isUpdatingKey": false, "showIfKey": null, "iterations": 0 },
      "content": [
        {
          "type": "paragraph",
          "attrs": { "textAlign": null, "showIfKey": null },
          "content": [
            {
              "type": "variable",
              "attrs": {
                "id": "current.foo",
                "label": null,
                "fallback": null,
                "required": false,
                "aliasFor": "payload.items.foo"
              }
            },
            { "type": "text", "text": " " }
          ]
        }
      ]
    },
    {
      "type": "section",
      "attrs": {
        "borderRadius": 6,
        "backgroundColor": "#FFFFFF",
        "align": "left",
        "borderWidth": 0,
        "borderColor": "#e2e2e2",
        "paddingTop": 8,
        "paddingRight": 8,
        "paddingBottom": 8,
        "paddingLeft": 8,
        "marginTop": 0,
        "marginRight": 0,
        "marginBottom": 10,
        "marginLeft": 0,
        "showIfKey": null
      },
      "content": [
        {
          "type": "repeat",
          "attrs": {
            "each": "steps.digest-step.events",
            "isUpdatingKey": false,
            "showIfKey": null,
            "iterations": 3
          },
          "content": [
            {
              "type": "paragraph",
              "attrs": {
                "textAlign": null,
                "showIfKey": null
              },
              "content": [
                {
                  "type": "variable",
                  "attrs": {
                    "id": "current.payload.userName",
                    "label": null,
                    "fallback": null,
                    "required": false,
                    "aliasFor": "steps.digest-step.events.payload.userName"
                  }
                },
                {
                  "type": "text",
                  "text": " commented: "
                },
                {
                  "type": "variable",
                  "attrs": {
                    "id": "current.payload.comment",
                    "label": null,
                    "fallback": null,
                    "required": false,
                    "aliasFor": "steps.digest-step.events.payload.comment"
                  }
                }
              ]
            },
            {
              "type": "paragraph",
              "attrs": {
                "textAlign": null,
                "showIfKey": null
              }
            }
          ]
        },
        {
          "type": "paragraph",
          "attrs": {
            "textAlign": null,
            "showIfKey": null
          },
          "content": [
            {
              "type": "variable",
              "attrs": {
                "id": "steps.digest-step.eventCount | minus: 3 | pluralize: 'more comment', ''",
                "label": null,
                "fallback": null,
                "required": false,
                "aliasFor": null
              }
            }
          ]
        }
      ]
    },
    { "type": "paragraph", "attrs": { "textAlign": null, "showIfKey": null } },
    {
      "type": "section",
      "attrs": {
        "borderRadius": 6,
        "backgroundColor": "#f7f7f7",
        "align": "left",
        "borderWidth": 0,
        "borderColor": "#e2e2e2",
        "paddingTop": 8,
        "paddingRight": 8,
        "paddingBottom": 8,
        "paddingLeft": 8,
        "marginTop": 0,
        "marginRight": 0,
        "marginBottom": 10,
        "marginLeft": 0,
        "showIfKey": null
      },
      "content": [
        {
          "type": "paragraph",
          "attrs": { "textAlign": null, "showIfKey": null },
          "content": [{ "type": "text", "text": "Section text" }]
        }
      ]
    },
    { "type": "paragraph", "attrs": { "textAlign": null, "showIfKey": null } },
    { "type": "spacer", "attrs": { "height": 16, "showIfKey": null } },
    { "type": "paragraph", "attrs": { "textAlign": null, "showIfKey": null } },
    {
      "type": "paragraph",
      "attrs": { "textAlign": null, "showIfKey": null },
      "content": [{ "type": "text", "text": "/" }]
    }
  ]
}`;
