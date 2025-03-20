## 2.6.6 (2025-02-25)

### 🚀 Features

- **api-service:** system limits & update pricing pages ([#7718](https://github.com/novuhq/novu/pull/7718))
- **root:** add no only github action ([#7692](https://github.com/novuhq/novu/pull/7692))

### 🩹 Fixes

- **root:** unhandled promise reject and undefined ff kind ([#7732](https://github.com/novuhq/novu/pull/7732))
- **api-service:** remove only on e2e ([#7691](https://github.com/novuhq/novu/pull/7691))

### 🧱 Updated Dependencies

- Updated @novu/client to 2.6.6
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

- Updated @novu/client to 2.6.5
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

- Updated @novu/client to 2.0.4
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

- Updated @novu/client to 2.0.3
- Updated @novu/shared to 2.1.4

### ❤️  Thank You

- George Desipris @desiprisg
- Himanshu Garg @merrcury
- Richard Fontein @rifont

## 2.0.2 (2024-11-19)

### 🚀 Features

- **root:** release 2.0.1 for all major packages ([#6925](https://github.com/novuhq/novu/pull/6925))
- **headless:** update after pr comment ([79cf7e920](https://github.com/novuhq/novu/commit/79cf7e920))
- **headless:** add remove notifications method ([aa9f323ea](https://github.com/novuhq/novu/commit/aa9f323ea))
- remove submodule from monorepo pnpm workspace ([b4932fa6a](https://github.com/novuhq/novu/commit/b4932fa6a))
- export types/interfaces from headless servive ([081faadf1](https://github.com/novuhq/novu/commit/081faadf1))
- prefernce methods in node sdk and headless ([f4117347d](https://github.com/novuhq/novu/commit/f4117347d))
- get global preferences ([e3c002a3e](https://github.com/novuhq/novu/commit/e3c002a3e))
- add global preference method to node sdk ([45fa09729](https://github.com/novuhq/novu/commit/45fa09729))
- tests ([6889a86ce](https://github.com/novuhq/novu/commit/6889a86ce))
- implemented it on sdks and headless ([2002b3f79](https://github.com/novuhq/novu/commit/2002b3f79))
- **types:** create enum for the web socket events ([527b44e56](https://github.com/novuhq/novu/commit/527b44e56))
- **headless:** add listen to notification_received in headless service ([adc15e811](https://github.com/novuhq/novu/commit/adc15e811))
- exported types from the headless package, and updated the docs ([c945d3253](https://github.com/novuhq/novu/commit/c945d3253))
- Added new method for removeAllNotifications ([8b6e148c9](https://github.com/novuhq/novu/commit/8b6e148c9))
- Add markNotificationsAsSeen ([95fc7487f](https://github.com/novuhq/novu/commit/95fc7487f))
- add pagination support with limit ([a0dbc5251](https://github.com/novuhq/novu/commit/a0dbc5251))
- speed up eslint parser timing ([#3250](https://github.com/novuhq/novu/pull/3250))
- add unread count change listener ([0fa7654de](https://github.com/novuhq/novu/commit/0fa7654de))
- added tests ([3dbb7063f](https://github.com/novuhq/novu/commit/3dbb7063f))
- added few more methods and refactor types ([f9b29af40](https://github.com/novuhq/novu/commit/f9b29af40))
- remove un need org id on initialize session ([8efcceacd](https://github.com/novuhq/novu/commit/8efcceacd))
- remove un need org id on initialize session ([1fd916f5b](https://github.com/novuhq/novu/commit/1fd916f5b))
- add remove notification to headless lib ([3b3b46a08](https://github.com/novuhq/novu/commit/3b3b46a08))
- **headless:** headless package with a notification center business logic and socket management ([27c1bf886](https://github.com/novuhq/novu/commit/27c1bf886))

### 🩹 Fixes

- **root:** Build only public packages during preview deployments ([#6590](https://github.com/novuhq/novu/pull/6590))
- **headless:** dont refetch notifications ([#6290](https://github.com/novuhq/novu/pull/6290))
- **echo:** Use dist for Echo artifacts ([#5590](https://github.com/novuhq/novu/pull/5590))
- updated test cases for headless service ([9edc7496f](https://github.com/novuhq/novu/commit/9edc7496f))
- headless api client remove/refetch query scenarios ([e668827a0](https://github.com/novuhq/novu/commit/e668827a0))
- merge conflicts ([ea2a0f471](https://github.com/novuhq/novu/commit/ea2a0f471))
- package vulnerabilities ([0e496d6d2](https://github.com/novuhq/novu/commit/0e496d6d2))
- localhost binding ([5a261f847](https://github.com/novuhq/novu/commit/5a261f847))
- run prettier for heeadless.service ([577338d93](https://github.com/novuhq/novu/commit/577338d93))
- tests ([8f6601a55](https://github.com/novuhq/novu/commit/8f6601a55))
- tests ([f400cb425](https://github.com/novuhq/novu/commit/f400cb425))
- updated the types and onsuccess method ([11ac4c4ab](https://github.com/novuhq/novu/commit/11ac4c4ab))
- **deps:** update dependency socket.io-client to v4.6.1 ([117756264](https://github.com/novuhq/novu/commit/117756264))
- **ws|webhook:** socket versions match ([1c72a8a35](https://github.com/novuhq/novu/commit/1c72a8a35))
- **infra:** resolve some deepsource javascript issues ([368733676](https://github.com/novuhq/novu/commit/368733676))

### ❤️  Thank You

- ainouzgali
- Biswajeet Das @BiswaViraj
- David Söderberg
- Dima Afanasiev
- Dima Grossman @scopsy
- Gosha
- Himanshu Garg @merrcury
- Ivan STEPANIAN @iv-stpn
- p-fernandez
- Paweł
- praxter11
- Richard Fontein @rifont
- Sokratis Vidros @SokratisVidros
- Vishnu Kumar V @vichustephen