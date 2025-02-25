## 2.6.6 (2025-02-25)

### 🚀 Features

- **api-service:** system limits & update pricing pages ([#7718](https://github.com/novuhq/novu/pull/7718))
- **root:** add no only github action ([#7692](https://github.com/novuhq/novu/pull/7692))

### 🩹 Fixes

- **root:** unhandled promise reject and undefined ff kind ([#7732](https://github.com/novuhq/novu/pull/7732))
- **api-service:** remove only on e2e ([#7691](https://github.com/novuhq/novu/pull/7691))

### 🧱 Updated Dependencies

- Updated @novu/shared to 2.6.6

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

### 🧱 Updated Dependencies

- Updated @novu/shared to 2.6.5

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


## 2.0.4 (2024-12-24)

### 🧱 Updated Dependencies

- Updated @novu/shared to 2.1.5

### ❤️ Thank You

- GalTidhar @tatarco
- George Desipris @desiprisg
- George Djabarov @djabarovgeorge
- Pawan Jain


## 2.0.3 (2024-11-26)

### 🚀 Features

- **dashboard:** Codemirror liquid filter support ([#7122](https://github.com/novuhq/novu/pull/7122))
- **root:** add support chat app ID to environment variables in d… ([#7120](https://github.com/novuhq/novu/pull/7120))
- **root:** Add base Dockerfile for GHCR with Node.js and dependencies ([#7100](https://github.com/novuhq/novu/pull/7100))

### 🩹 Fixes

- **api:** Migrate subscriber global preferences before workflow preferences ([#7118](https://github.com/novuhq/novu/pull/7118))
- **api, dal, framework:** fix the uneven and unused dependencies ([#7103](https://github.com/novuhq/novu/pull/7103))

### 🧱 Updated Dependencies

- Updated @novu/shared to 2.1.4

### ❤️  Thank You

- George Desipris @desiprisg
- Himanshu Garg @merrcury
- Richard Fontein @rifont

## 2.0.2 (2024-11-19)

### 🚀 Features

- **root:** release 2.0.1 for all major packages ([#6925](https://github.com/novuhq/novu/pull/6925))
- **api:** the new inbox controller ([#5735](https://github.com/novuhq/novu/pull/5735))
- **js:** handling the web socket connection and events ([#5704](https://github.com/novuhq/novu/pull/5704))
- **js:** js sdk preferences ([#5701](https://github.com/novuhq/novu/pull/5701))
- **js:** js sdk feeds module ([#5688](https://github.com/novuhq/novu/pull/5688))
- **js:** lazy session initialization and interface fixes ([#5665](https://github.com/novuhq/novu/pull/5665))
- **client:** add novu user agent ([#5671](https://github.com/novuhq/novu/pull/5671))
- **headless:** add remove notifications method ([aa9f323ea](https://github.com/novuhq/novu/commit/aa9f323ea))
- remove submodule from monorepo pnpm workspace ([b4932fa6a](https://github.com/novuhq/novu/commit/b4932fa6a))
- widget controller and hook ([3c686a621](https://github.com/novuhq/novu/commit/3c686a621))
- implemented it on sdks and headless ([2002b3f79](https://github.com/novuhq/novu/commit/2002b3f79))
- add tags for workflow ([a13d7c938](https://github.com/novuhq/novu/commit/a13d7c938))
- **node,client:** allow filtering notifications feed by custom data from payload ([43038bd34](https://github.com/novuhq/novu/commit/43038bd34))
- add custom data to notification template and allow filtering by it the preference ([83cb406da](https://github.com/novuhq/novu/commit/83cb406da))
- add remove all messgaes ([c0f888c27](https://github.com/novuhq/novu/commit/c0f888c27))
- add remove all messages function in nc ([799ae684e](https://github.com/novuhq/novu/commit/799ae684e))
- remove deprecated client functions ([53a8bcecd](https://github.com/novuhq/novu/commit/53a8bcecd))
- add pagination support with limit ([a0dbc5251](https://github.com/novuhq/novu/commit/a0dbc5251))
- speed up eslint parser timing ([#3250](https://github.com/novuhq/novu/pull/3250))
- add unread and markalllasseen api ([58fc6d1a7](https://github.com/novuhq/novu/commit/58fc6d1a7))
- Refactored exisitng mark all as seen and combined it to markAllMessages As ([ade1176db](https://github.com/novuhq/novu/commit/ade1176db))
- **infra:** upgrade axios version to latest ([761b62377](https://github.com/novuhq/novu/commit/761b62377))
- **wip:** adding dropdown menu with remove message and read unread action ([27139abe7](https://github.com/novuhq/novu/commit/27139abe7))
- **notification-center:** export the notification center as a web component ([baad09d42](https://github.com/novuhq/novu/commit/baad09d42))
- remove use of deprecated api endpoint ([1cf049329](https://github.com/novuhq/novu/commit/1cf049329))
- add support for mark all as seen with stores ([b90be7a87](https://github.com/novuhq/novu/commit/b90be7a87))
- wip add support on seen and read ([6faf00540](https://github.com/novuhq/novu/commit/6faf00540))
- add get tab count ([c178063be](https://github.com/novuhq/novu/commit/c178063be))
- add mark message as read ([96697ac7d](https://github.com/novuhq/novu/commit/96697ac7d))

### 🩹 Fixes

- **root:** Build only public packages during preview deployments ([#6590](https://github.com/novuhq/novu/pull/6590))
- **client:** handle empty or no content responses ([#6561](https://github.com/novuhq/novu/pull/6561))
- **echo:** Use dist for Echo artifacts ([#5590](https://github.com/novuhq/novu/pull/5590))
- **client:** fix remove messages payload ([ed16e8151](https://github.com/novuhq/novu/commit/ed16e8151))
- merge conflicts ([ea2a0f471](https://github.com/novuhq/novu/commit/ea2a0f471))
- after pr comments ([cb2bdc9e8](https://github.com/novuhq/novu/commit/cb2bdc9e8))
- **deps:** update dependency axios to v1.3.3 ([a34de5075](https://github.com/novuhq/novu/commit/a34de5075))
- template-literals non-string type bug fix ([1ec33ad60](https://github.com/novuhq/novu/commit/1ec33ad60))
- mark typo ([b98d9e450](https://github.com/novuhq/novu/commit/b98d9e450))

### ❤️  Thank You

- abhinav
- ainouzgali
- Biswajeet Das @BiswaViraj
- David Söderberg
- Dima Grossman @scopsy
- Gosha
- Himanshu Garg @merrcury
- p-fernandez
- Pawan Jain
- Paweł
- Paweł Tymczuk @LetItRock
- praxter11
- Richard Fontein @rifont
- Sokratis Vidros @SokratisVidros