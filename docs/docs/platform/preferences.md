---
sidebar_position: 5
---

# Subscriber Preferences

Novu provides a way to store user preferences in the subscribers data model.
This allows subscribers to specify and manage their preferences, without your intervention. Customizing preferences has become the standard expected behavior for people and Novu can take the technical burden of managing preferences off of you.

## Managing subscriber preferences defaults

When creating a new notification template on the Web platform, you can specify default preferences for the subscribers. They will be used unless the subscriber will override them by his own custom preference.

This will allow you to create sensible defaults but still provide the user with the ability to override them. During the creation of the template select the checkboxes for the channels you want to be enabled by default. All channels are `on` unless specified otherwise.

## Exclude notifications from preferences

In some cases, you don't want the subscriber to be able to unsubscribe from mandatory notifications such as: Account Verification, Password Reset, etc...

In those cases you will be able to mark a template as **Critical**, this will hide it from the subscriber preferences page.

## Preferences in the Notifications Component

The Notifications component will show the user the available preferences, he will be able to modify on the channel level. Critical templates will be excluded from the list.

![User preference in the component](/img/user-preference.png)

:::info

Only channels with a matched step will be returned from the API. In case no channel content was found, the API will return an empty array.

:::
