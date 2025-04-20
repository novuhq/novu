## 2.6.6 (2025-02-25)

### 🚀 Features

- **api-service:** system limits & update pricing pages ([#7718](https://github.com/novuhq/novu/pull/7718))
- **root:** add no only github action ([#7692](https://github.com/novuhq/novu/pull/7692))

### 🩹 Fixes

- **root:** unhandled promise reject and undefined ff kind ([#7732](https://github.com/novuhq/novu/pull/7732))
- **api-service:** remove only on e2e ([#7691](https://github.com/novuhq/novu/pull/7691))

### 🧱 Updated Dependencies

- Updated @novu/shared to 2.6.6
- Updated @novu/stateless to 2.6.6

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
- **api-service:** refactor issue error messages ([#7359](https://github.com/novuhq/novu/pull/7359))
- **api:** add query parser ([#7267](https://github.com/novuhq/novu/pull/7267))
- **api:** Nv 5033 additional removal cycle found unneeded elements ([#7283](https://github.com/novuhq/novu/pull/7283))
- **api:** Nv 4966 e2e testing happy path - messages ([#7248](https://github.com/novuhq/novu/pull/7248))
- **api:** add external id api to onesignal Based on #6976 ([#7270](https://github.com/novuhq/novu/pull/7270), [#6976](https://github.com/novuhq/novu/issues/6976))
- **dashboard:** Implement email step editor & mini preview ([#7129](https://github.com/novuhq/novu/pull/7129))
- **api:** converted bulk trigger to use SDK ([#7166](https://github.com/novuhq/novu/pull/7166))
- **application-generic:** add SUBSCRIBER_WIDGET_JWT_EXPIRATION_TIME env variable ([#7105](https://github.com/novuhq/novu/pull/7105))

### 🩹 Fixes

- **dashboard:** change sendinblue to brevo ([#7668](https://github.com/novuhq/novu/pull/7668))
- **js:** Await read action in Inbox ([#7653](https://github.com/novuhq/novu/pull/7653))
- **api:** duplicated subscribers created due to race condition ([#7646](https://github.com/novuhq/novu/pull/7646))
- **api-service:** add missing environment variable ([#7553](https://github.com/novuhq/novu/pull/7553))
- **api-service:** set check field as false by default ([#7469](https://github.com/novuhq/novu/pull/7469))
- **api:** Fix failing API e2e tests ([78c385ec7](https://github.com/novuhq/novu/commit/78c385ec7))
- **api-service:** E2E improvements ([#7461](https://github.com/novuhq/novu/pull/7461))
- **novu:** automatically create indexes on startup ([#7431](https://github.com/novuhq/novu/pull/7431))
- **api:** @novu/api -> @novu/api-service ([#7348](https://github.com/novuhq/novu/pull/7348))
- **api:** fix onesignal ios_badgeCount and ios_badgeType typos ([#7273](https://github.com/novuhq/novu/pull/7273))

### 🧱 Updated Dependencies

- Updated @novu/shared to 2.6.5
- Updated @novu/stateless to 2.6.5

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
- Updated @novu/stateless to 2.0.3

### ❤️ Thank You

- Dima Grossman @scopsy
- GalTidhar @tatarco
- George Desipris @desiprisg
- George Djabarov @djabarovgeorge
- Lucky @L-U-C-K-Y
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
- Updated @novu/stateless to 2.0.2

### ❤️  Thank You

- George Desipris @desiprisg
- Himanshu Garg @merrcury
- Richard Fontein @rifont

## 2.0.2 (2024-11-19)

### 🚀 Features

- **root:** release 2.0.1 for all major packages ([#6925](https://github.com/novuhq/novu/pull/6925))
- **api:** add usage of bridge provider options in send message usecases a… ([#6062](https://github.com/novuhq/novu/pull/6062))
- **framework:** add generic support for providers ([#6021](https://github.com/novuhq/novu/pull/6021))
- **providers:** Mobishastra sms provider ([#5648](https://github.com/novuhq/novu/pull/5648))

### 🩹 Fixes

- **root:** Build only public packages during preview deployments ([#6590](https://github.com/novuhq/novu/pull/6590))
- fcm error for spec files ([76f4f7680](https://github.com/novuhq/novu/commit/76f4f7680))
- **worker:** multi case method for fcm ([#6405](https://github.com/novuhq/novu/pull/6405))
- **providers:** add sendername field in mailgun config ([#6364](https://github.com/novuhq/novu/pull/6364))
- **framework:** so passthrough body is not casing transformed ([#6305](https://github.com/novuhq/novu/pull/6305))
- **echo:** Use dist for Echo artifacts ([#5590](https://github.com/novuhq/novu/pull/5590))

### ❤️  Thank You

- Amin Mahfouz
- David Söderberg @davidsoderberg
- Dima Grossman
- Himanshu Garg
- Pawan Jain
- Richard Fontein @rifont
- Sokratis Vidros @SokratisVidros