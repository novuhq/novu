## 2.6.6 (2025-02-25)

### 🚀 Features

- **api-service:** system limits & update pricing pages ([#7718](https://github.com/novuhq/novu/pull/7718))
- **root:** add no only github action ([#7692](https://github.com/novuhq/novu/pull/7692))

### 🩹 Fixes

- **root:** unhandled promise reject and undefined ff kind ([#7732](https://github.com/novuhq/novu/pull/7732))
- **api-service:** remove only on e2e ([#7691](https://github.com/novuhq/novu/pull/7691))

### ❤️ Thank You

- GalTidhar @tatarco
- George Djabarov @djabarovgeorge


## 2.6.5 (2025-02-07)

### 🚀 Features

- Update README.md ([bb63172dd](https://github.com/novuhq/novu/commit/bb63172dd))
- **readme:** Update README.md ([955cbeab0](https://github.com/novuhq/novu/commit/955cbeab0))
- quick start updates readme ([88b3b6628](https://github.com/novuhq/novu/commit/88b3b6628))
- **readme:** update readme ([e5ea61812](https://github.com/novuhq/novu/commit/e5ea61812))
- **api-service:** add internal sdk ([#7599](https://github.com/novuhq/novu/pull/7599))
- **dashboard:** step conditions editor ui ([#7502](https://github.com/novuhq/novu/pull/7502))
- **api:** add query parser ([#7267](https://github.com/novuhq/novu/pull/7267))
- **api:** Nv 5033 additional removal cycle found unneeded elements ([#7283](https://github.com/novuhq/novu/pull/7283))
- **api:** Nv 4966 e2e testing happy path - messages ([#7248](https://github.com/novuhq/novu/pull/7248))
- **dashboard:** Implement email step editor & mini preview ([#7129](https://github.com/novuhq/novu/pull/7129))
- **api:** converted bulk trigger to use SDK ([#7166](https://github.com/novuhq/novu/pull/7166))
- **application-generic:** add SUBSCRIBER_WIDGET_JWT_EXPIRATION_TIME env variable ([#7105](https://github.com/novuhq/novu/pull/7105))

### 🩹 Fixes

- **js:** Await read action in Inbox ([#7653](https://github.com/novuhq/novu/pull/7653))
- **api:** duplicated subscribers created due to race condition ([#7646](https://github.com/novuhq/novu/pull/7646))
- **api-service:** add missing environment variable ([#7553](https://github.com/novuhq/novu/pull/7553))
- **api:** Fix failing API e2e tests ([78c385ec7](https://github.com/novuhq/novu/commit/78c385ec7))
- **api-service:** E2E improvements ([#7461](https://github.com/novuhq/novu/pull/7461))
- **novu:** automatically create indexes on startup ([#7431](https://github.com/novuhq/novu/pull/7431))
- **api:** @novu/api -> @novu/api-service ([#7348](https://github.com/novuhq/novu/pull/7348))

### ❤️ Thank You

- Aminul Islam @AminulBD
- Dima Grossman @scopsy
- GalTidhar @tatarco
- George Desipris @desiprisg
- George Djabarov @djabarovgeorge
- Lucky @L-U-C-K-Y
- Pawan Jain
- Paweł Tymczuk @LetItRock
- Sokratis Vidros @SokratisVidros


## 2.0.3 (2024-12-24)

### 🚀 Features

- **api:** add query parser ([#7267](https://github.com/novuhq/novu/pull/7267))
- **api:** Nv 5033 additional removal cycle found unneeded elements ([#7283](https://github.com/novuhq/novu/pull/7283))
- **api:** Nv 4966 e2e testing happy path - messages ([#7248](https://github.com/novuhq/novu/pull/7248))
- **dashboard:** Implement email step editor & mini preview ([#7129](https://github.com/novuhq/novu/pull/7129))
- **api:** converted bulk trigger to use SDK ([#7166](https://github.com/novuhq/novu/pull/7166))
- **application-generic:** add SUBSCRIBER_WIDGET_JWT_EXPIRATION_TIME env variable ([#7105](https://github.com/novuhq/novu/pull/7105))

### 🩹 Fixes

- **api:** @novu/api -> @novu/api-service ([#7348](https://github.com/novuhq/novu/pull/7348))

### ❤️ Thank You

- GalTidhar @tatarco
- George Desipris @desiprisg
- George Djabarov @djabarovgeorge
- Pawan Jain

## 2.0.2 (2024-11-19)

### 🚀 Features

- **root:** release 2.0.1 for all major packages ([#6925](https://github.com/novuhq/novu/pull/6925))
- **api:** add usage of bridge provider options in send message usecases a… ([#6062](https://github.com/novuhq/novu/pull/6062))
- **providers:** Add Whatsapp business as provider ([#5232](https://github.com/novuhq/novu/pull/5232))
- Add customData overrides for sms and fix gupshup provider ([#5118](https://github.com/novuhq/novu/pull/5118))
- Add customData overrides for sms and fix gupshup provider ([#5118](https://github.com/novuhq/novu/pull/5118))
- add support for cid ([c1237f6af](https://github.com/novuhq/novu/commit/c1237f6af))
- remove submodule from monorepo pnpm workspace ([b4932fa6a](https://github.com/novuhq/novu/commit/b4932fa6a))
- add custom data in email overrides ([32948fcf1](https://github.com/novuhq/novu/commit/32948fcf1))
- add ip pool override ([f8a4597b6](https://github.com/novuhq/novu/commit/f8a4597b6))
- add ip pool override ([390e10c02](https://github.com/novuhq/novu/commit/390e10c02))
- refactor template preference logic ([6de8efe48](https://github.com/novuhq/novu/commit/6de8efe48))
- speed up eslint parser timing ([#3250](https://github.com/novuhq/novu/pull/3250))
- implementation of the email webhook provider ([48569d927](https://github.com/novuhq/novu/commit/48569d927))
- add webhook parser for ses provider ([698a6dcdd](https://github.com/novuhq/novu/commit/698a6dcdd))
- **fcm:** Add extra options for FCM provider ([84d7c03af](https://github.com/novuhq/novu/commit/84d7c03af))
- Add fcmOptions to Firebase provider ([2b8b646e5](https://github.com/novuhq/novu/commit/2b8b646e5))
- enable channel specification on a subscriber ([c226ed411](https://github.com/novuhq/novu/commit/c226ed411))
- **infra:** upgrade axios version to latest ([761b62377](https://github.com/novuhq/novu/commit/761b62377))
- add overrides for email providers ([1b7c3a993](https://github.com/novuhq/novu/commit/1b7c3a993))
- added android and apns properties to fcm message overrides ([f00d00c96](https://github.com/novuhq/novu/commit/f00d00c96))
- **wip:** add reply callback support ([78245cde1](https://github.com/novuhq/novu/commit/78245cde1))
- add new sms status ([fb8b6367d](https://github.com/novuhq/novu/commit/fb8b6367d))
- add ses email info doc ([378712e51](https://github.com/novuhq/novu/commit/378712e51))
- add fcm data messages ([49dadde00](https://github.com/novuhq/novu/commit/49dadde00))
- Abstract content engine to allow extension / replacement ([ff320686e](https://github.com/novuhq/novu/commit/ff320686e))
- add so webhook statuses is mapped to detail statuses ([eaa69e54a](https://github.com/novuhq/novu/commit/eaa69e54a))
- Added storagePath variable to attachments that is used to store attachment at specified location ([adf1a352d](https://github.com/novuhq/novu/commit/adf1a352d))
- map provider specific events to supported event types only ([34e2f1a13](https://github.com/novuhq/novu/commit/34e2f1a13))
- Add webhook parser for Sendinblue ([24f066e30](https://github.com/novuhq/novu/commit/24f066e30))
- **webhook-parser-postmark:** add status types spam complained and subscription changed ([f250c0b64](https://github.com/novuhq/novu/commit/f250c0b64))
- Add webhook parser for twilio provider ([5b87900d1](https://github.com/novuhq/novu/commit/5b87900d1))
- Add interface to prepare for webhook feature ([42e0d45d1](https://github.com/novuhq/novu/commit/42e0d45d1))
- add interface for email webhook event body ([956668bf1](https://github.com/novuhq/novu/commit/956668bf1))
- Updated the UI to show alert on err, updated the response structure from the check integration ([2f2138f4e](https://github.com/novuhq/novu/commit/2f2138f4e))
- mapped sendgrid specific error codes while provider integration check ([b42531d0c](https://github.com/novuhq/novu/commit/b42531d0c))
- updated the consumers of IEmailProvider to be inline with the changes in IEmailProvider interface ([61db3f381](https://github.com/novuhq/novu/commit/61db3f381))
- add webhook endpoint for email providers ([e3d6a5b53](https://github.com/novuhq/novu/commit/e3d6a5b53))
- expo provider ([5d331c6b7](https://github.com/novuhq/novu/commit/5d331c6b7))
- add rebuild command ([290af830e](https://github.com/novuhq/novu/commit/290af830e))
- add so a text template can be provided for emails text version ([f8ef3571c](https://github.com/novuhq/novu/commit/f8ef3571c))
- add overrides ([c6aa77450](https://github.com/novuhq/novu/commit/c6aa77450))
- add push category + fcm base ([162936c00](https://github.com/novuhq/novu/commit/162936c00))
- support for nested payload in node and stateless packages ([6a880532e](https://github.com/novuhq/novu/commit/6a880532e))

### 🩹 Fixes

- **root:** add novu cli flags and remove magicbell ([#6779](https://github.com/novuhq/novu/pull/6779))
- **root:** Build only public packages during preview deployments ([#6590](https://github.com/novuhq/novu/pull/6590))
- **@novu/stateless:** Update README.md ([b4de84160](https://github.com/novuhq/novu/commit/b4de84160))
- add custom header support for resend, brevo and sendgrid ([#5343](https://github.com/novuhq/novu/pull/5343))
- sendername and subject override for email providers ([9e88c86d3](https://github.com/novuhq/novu/commit/9e88c86d3))
- senderName and subject override for email providers ([#4903](https://github.com/novuhq/novu/pull/4903))
- merge conflicts ([ea2a0f471](https://github.com/novuhq/novu/commit/ea2a0f471))
- change custom data type and add test in node sdk ([31b561b26](https://github.com/novuhq/novu/commit/31b561b26))
- change custom data type and add test in node sdk ([6ac126c3d](https://github.com/novuhq/novu/commit/6ac126c3d))
- change docs url ([b51124d55](https://github.com/novuhq/novu/commit/b51124d55))
- **worker:** fixed the fcm data message issue with payload messed with additional data ([a98492f27](https://github.com/novuhq/novu/commit/a98492f27))
- remove unnecessary change ([b9cfa6cd0](https://github.com/novuhq/novu/commit/b9cfa6cd0))
- **deps:** update dependency axios to v1.3.3 ([a34de5075](https://github.com/novuhq/novu/commit/a34de5075))
- after pr comments ([36bd694b7](https://github.com/novuhq/novu/commit/36bd694b7))
- remove emailjs references in docs ([a4ad6a2c4](https://github.com/novuhq/novu/commit/a4ad6a2c4))
- PR comments ([0d0db0d63](https://github.com/novuhq/novu/commit/0d0db0d63))
- remove strict null checks ([8fba5da59](https://github.com/novuhq/novu/commit/8fba5da59))
- add notification with optional data ([ef00b6cbe](https://github.com/novuhq/novu/commit/ef00b6cbe))
- missing initialisation for content engine ([6468710f5](https://github.com/novuhq/novu/commit/6468710f5))
- Update typo for queued status ([17f8eca64](https://github.com/novuhq/novu/commit/17f8eca64))
- so message identifier is saved from send method ([a26ffc8a0](https://github.com/novuhq/novu/commit/a26ffc8a0))
- sendgrid providers parse event body method ([4e6d2cc2b](https://github.com/novuhq/novu/commit/4e6d2cc2b))
- rename direct to chat ([728940d03](https://github.com/novuhq/novu/commit/728940d03))
- so fcm provider use newest api for firebase ([8c30377dd](https://github.com/novuhq/novu/commit/8c30377dd))
- allow text template to be undefined ([d3b6501d5](https://github.com/novuhq/novu/commit/d3b6501d5))
- docs and other fixes ([3919887ad](https://github.com/novuhq/novu/commit/3919887ad))
- override to optional prop ([52abdee11](https://github.com/novuhq/novu/commit/52abdee11))
- add stricter push notification payload typing ([7ab166f3a](https://github.com/novuhq/novu/commit/7ab166f3a))

### ❤️  Thank You

- ainouzgali
- Biswajeet Das
- chavda-bhavik
- David Söderberg @davidsoderberg
- davidsoderberg
- Dima Grossman
- emhng
- gitstart
- Gosha
- Himanshu Garg
- Jimmy Lucidarme
- kristofdetroch
- Mohammed Cherfaoui
- p-fernandez
- Pawan Jain
- Paweł
- Peep van Puijenbroek
- praxter11
- psteinroe
- raikasdev
- Richard Nemeth
- Roni Äikäs
- Santosh Bhandari
- ShaneMaglangit
- Sokratis Vidros @SokratisVidros
- Thanh Pham
- Tomas Castro
- Vitor Gomes @vitoorgomes

# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.2.5](https://github.com/novuhq/novu/compare/v0.2.4...v0.2.5) (2021-11-05)

**Note:** Version bump only for package @novu/node

## [0.2.4](https://github.com/novuhq/novu/compare/v0.2.3...v0.2.4) (2021-10-30)

**Note:** Version bump only for package @novu/node

## [0.2.3](https://github.com/novuhq/lib/compare/v0.2.2...v0.2.3) (2021-10-20)

**Note:** Version bump only for package @novu/node

## [0.2.2](https://github.com/novuhq/lib/compare/v0.1.4...v0.2.2) (2021-10-20)

**Note:** Version bump only for package @novu/node

## [0.2.1](https://github.com/novuhq/lib/compare/v0.1.4...v0.2.1) (2021-10-20)

**Note:** Version bump only for package @novu/node

# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.1.4](https://github.com/novuhq/lib/compare/v0.1.3...v0.1.4) (2021-09-29)

### [0.1.3](https://github.com/novuhq/lib/compare/v0.1.1...v0.1.3) (2021-09-29)

### [0.1.1](https://github.com/novuhq/lib/compare/v0.0.4...v0.1.1) (2021-09-09)

### [0.0.4](https://github.com/novuhq/lib/compare/v0.0.2...v0.0.4) (2021-09-09)

### [0.0.2](https://github.com/novuhq/lib/compare/v1.0.1...v0.0.2) (2021-09-02)

### 1.0.1 (2021-09-02)
