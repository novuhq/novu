---
sidebar_position: 11
---

# Layouts

Novu allows the creation of layouts - a specific html design or structure to wrap content of email notifications.
Layouts can be manipulated and assigned to new and existing templates within the Novu platform,
allowing users to create, manage, and assign these layouts to templates, so they can be reused to structure the appearance of notifications sent through the platform.

By default, a novu layout will be created and assigned as the organisation's default layout. At any time, you can choose any of your layouts as the default for your organisation.
All new email templates will be assigned the default layout unless assigned a different one through the email editor.

## Manage Layouts

You can find and manage your organisation's layouts in `Brand -> Layouts`

   <div align="center">
     <picture>
       <source media="(prefers-color-scheme: dark)" srcset="/img/platform/layouts/dark-manage-layouts.png"/>
       <img src="/img/platform/layouts/light-manage-layouts.png" width="1280" alt="Logo"/>
     </picture>
   </div>

## Create and Edit Layouts

You can create new or edit existing layouts through the layout editor.

- You can create any html code to structure your layout.
- Set a layout as default for your organisation. Notice there could only be one default layout at a time.
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

## Assign Layout to template

To assign, choose a layout through the email editor.
You can preview your layout combined with your email content through the `Preview` tab.

   <div align="center">
     <picture>
       <source media="(prefers-color-scheme: dark)" srcset="/img/platform/layouts/dark-assign-layout.png"/>
       <img src="/img/platform/layouts/light-assign-layout.png" width="680" alt="Logo"/>
     </picture>
   </div>
