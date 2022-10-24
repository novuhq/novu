---
sidebar_position: 1
---

# Introduction

Novu is an open-source notification infrastructure, built for engineering teams to help them build rich product notification experiences without constantly reinventing the wheel.

## Why?

Developing a notification layer is something we often do when designing a new application. It usually starts the same, sending just a simple email, and after a while, you'll find yourself managing hundreds of notifications across multiple channels. Novu’s goal is to help developers create meaningful, transactional communication between the product and its users. All with an easy-to-use API and outstanding developer experience.

## Unified API

Today, users tend to receive communication across multiple providers. [Sendgrid](https://sendgrid.com/) for Email, [Twilio](https://www.twilio.com/) for SMS, Mailchimp, Push, Web-Push, and Chat messaging (Slack, etc...). The main reason behind this is that users expect to customize the communication channels to fit their needs and goals. This forces developers to manage all of those APIs across the codebase.

As developers, we tend to create abstractions, but following the growing number of integrations, channels of communication that are sent become a burden on the team and are usually implemented only on an as just-make-it-work-mode.

Novu provides a single API to manage all your customer communication. Do you need to add a new provider? Consider switching your email provider. When SendGrid goes down, do you fall back to mailgun? Don't worry, we've got you covered!

## Community Driven

When we just started, we felt the frustration of reinventing the wheel of notification infrastructure is a unique problem that not a lot of developers have experienced. After a couple of conversations with fellow engineers, we decided to open-source the initial seed of Novu. Oh boy, how wrong we were. Thousands of developers from around the world reached out to tell us their stories of building such systems in-house.

Building Novu is not an act of an individual, it’s a collaborative work of many. Join us in building the future of notification experiences.
