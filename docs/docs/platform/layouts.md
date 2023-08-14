---
sidebar_position: 11
---

# Layouts

Novu allows the creation of layouts - a specific HTML design or structure to wrap content of email notifications.
Layouts can be manipulated and assigned to new or existing workflows within the Novu platform,
allowing users to create, manage, and assign these layouts to workflows, so they can be reused to structure the appearance of notifications sent through the platform.

By default, Novu will create a default layout and assign it as the organization's default layout. At any time, you can choose any of your layouts as the default for your organization.
All new email templates will be assigned the default layout unless assigned a different one through the email editor.

## Manage Layouts

You can find and manage your organization's layouts in `Brand -> Layouts`

   <div align="center">
     <picture>
       <source media="(prefers-color-scheme: dark)" srcset="/img/platform/layouts/dark-manage-layouts.png"/>
       <img src="/img/platform/layouts/light-manage-layouts.png" width="1280" alt="Logo"/>
     </picture>
   </div>

## Create and Edit Layouts

You can create new or edit existing layouts through the layout editor.

- You can create any html code to structure your layout.
- Set a layout as default for your organization. Notice there could only be one default layout at a time.
- Manage layout variables - set default values or required variables.

   <div align="center">
     <picture>
       <source media="(prefers-color-scheme: dark)" srcset="/img/platform/layouts/dark-create-layout.png"/>
       <img src="/img/platform/layouts/light-create-layout.png" width="1280" alt="Logo"/>
     </picture>
   </div>

:::info

Layout content must include `{{{body}}}`, to indicate where the email editor content will be injected inside the layout.

:::

## Assign layout to workflow

To assign, choose a layout through the email editor.
You can preview your layout combined with your email content through the `Preview` tab.

   <div align="center">
     <picture>
       <source media="(prefers-color-scheme: dark)" srcset="/img/platform/layouts/dark-assign-layout.png"/>
       <img src="/img/platform/layouts/light-assign-layout.png" width="680" alt="Logo"/>
     </picture>
   </div>

## Override layout on trigger

To override your assigned layout during a trigger event use the `layoutIdentifier` property, the layout specified will be used for all emails in the context of that trigger event.

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_API_KEY>');

novu.trigger('workflow-identifier', {
  to: {
    subscriberId: '...',
  },
  payload: {
    attachments: [
      {
        file: fs.readFileSync(__dirname + '/data/test.jpeg'),
        name: 'test.jpeg',
        mime: 'image/jpg',
      },
    ],
  },
  overrides: {
    layoutIdentifier: 'your-layout-identifier',
  },
});
```

## Using SDK

Novu SDK supports all layout functionalities:

### Create a new layout

A new layout can be created with name, identifier, description, content, variables and an <code>isDefault</code> flag. Here, content param is html content with custom variables.

```typescript
const name: string = 'layout-name';
const identifier: string = 'layout-unique-identifier';
const description: string =
  'The description of the layout that will help other users to understand the goal it was created'; // Optional.
const content: string = '<EMAIL_LAYOUT>';
const variables: ITemplateVariable[] = []; // Optional. Will handle the placeholder variables inserted in the email layout (content).
const isDefault: boolean = true; // Optional. All layouts are created as non default if not stated otherwise.

const { _id: layoutId } = await novu.layouts.create({
  name,
  identifier,
  description,
  content,
  variables,
  isDefault,
});
```

```typescript
interface ITemplateVariable {
  type: TemplateVariableTypeEnum;
  name: string;
  required?: boolean;
  defaultValue?: string | boolean;
}

enum TemplateVariableTypeEnum {
  STRING = 'String',
  ARRAY = 'Array',
  BOOLEAN = 'Boolean',
}
```

### Update existing layout

When updating a layout, all properties are optional and the SDK will only update the ones passed.

```typescript
const layoutId: LayoutId = '<LAYOUT_ID>'; // The unique identifier of the layout.

const updatedLayout = await novu.layouts.update(layoutId, {
  name,
  identifier,
  description,
  content,
  variables,
  isDefault,
});
```

### Set default layout

When executing this, the existing default layout in the environment will be automatically set as non default and the chosen layout will be set as default. This action is non reversible.

```typescript
const layoutId: LayoutId = '<LAYOUT_ID>'; // The unique identifier of the layout to be set as default.

await novu.layouts.setDefault(layoutId);
```

### Delete an existing layout

Layouts can also be deleted. The condition to be able to delete a layout is that it is not a default layout and is not assigned in any existing workflow.

```typescript
const layoutId: LayoutId = '<LAYOUT_ID>'; // The unique identifier of the layout to be deleted.

await novu.layouts.delete(layoutId);
```

### Get a layout

Find a layout by layoutId

```typescript
const layoutId: LayoutId = '<LAYOUT_ID>'; // The unique identifier of the layout to be found.

const layout = await novu.layouts.get(layoutId);
```

### List all layouts

List paginated layouts

```typescript
const page: number = 0; // Pagination value of the page for the results. First page will be page = 0.
const pageSize: number = 100; // Optional. Pagination value of the amount of layouts per page to return.
const sortBy: string = 'createdAt'; // Optional. Property to order the list of the layouts. So far only `createdAt` is supported.
const orderBy: OrderDirectionEnum = -1; // Optional. Direction of the sorting by the property chosen in `sortBy`. Ascendent order is represented by 1 and descendent order is represented by -1.

const layouts = await novu.layouts.list({
  page,
  pageSize,
  sortBy,
  orderBy,
});
```

:::info

Checkout API reference for layouts methods [here](https://docs.novu.co/api/layout-creation/)
