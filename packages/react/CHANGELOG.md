## v3.9.3 (2025-09-03)

This was a version bump only for @novu/react to align it with other projects, there were no code changes.

## v3.9.2 (2025-09-03)

### 🚀 Features

- **js,react,api-service:** inbox allow filtering preferences by workflow criticality fixes NV-6577 ([#9011](https://github.com/novuhq/novu/pull/9011))

### 🩹 Fixes

- **js,react:** re-export types for the react-native package; fix partysocket event target polyfill fixes NV-6448 ([#9036](https://github.com/novuhq/novu/pull/9036))

### ❤️ Thank You

- Paweł Tymczuk @LetItRock

## v3.9.1 (2025-08-27)

### 🚀 Features

- **js,react,nextjs:** inbox appearance keys as a callback with the context prop fixes NV-6447 ([#8983](https://github.com/novuhq/novu/pull/8983))
- **js,react:** inbox render props for avatar, default and custom actions fixes NV-6535 ([#8977](https://github.com/novuhq/novu/pull/8977))
- **js,react,api-service,ws:** support severity in inbox components and hooks fixes NV-6470 ([#8913](https://github.com/novuhq/novu/pull/8913))

### ❤️ Thank You

- Paweł Tymczuk @LetItRock

## v3.8.1 (2025-08-13)

### 🚀 Features

- **js,react:** useNotifications hook realtime updates fixes NV-5502 ([#8892](https://github.com/novuhq/novu/pull/8892))

### 🩹 Fixes

- **root:** nx release publish issue for syntax error fixes NV-6506 ([#8922](https://github.com/novuhq/novu/pull/8922))
- **react:** stale filters in closures fixes NV-6479 ([#8893](https://github.com/novuhq/novu/pull/8893))

### ❤️ Thank You

- Adam Chmara @ChmaraX
- Himanshu Garg @merrcury

## v3.7.0 (2025-07-22)

### 🚀 Features

- **react,js,api-service:** Add seen status and behaviour to inbox component fixes NV-6179 ([#8704](https://github.com/novuhq/novu/pull/8704))
- **worker,js,react:** subscriber timezone aware delivery fixes NV-6239 ([#8674](https://github.com/novuhq/novu/pull/8674))
- **react,js,nextjs,react-native:** create new inbox session on subscriber change ([#8417](https://github.com/novuhq/novu/pull/8417))
- **root:** create keyless environment ([#8276](https://github.com/novuhq/novu/pull/8276))
- **api-service:** add data attribute filtering for inbox notifications ([#8338](https://github.com/novuhq/novu/pull/8338))

### 🩹 Fixes

- **root:** bring back eslint and web app build ([#8505](https://github.com/novuhq/novu/pull/8505))
- version bump react packages ([62ff7ee154](https://github.com/novuhq/novu/commit/62ff7ee154))
- novu react rc 4 release ([b737df7335](https://github.com/novuhq/novu/commit/b737df7335))

### ❤️ Thank You

- Dima Grossman @scopsy
- George Djabarov @djabarovgeorge
- Paweł Tymczuk @LetItRock

## v3.4.0 (2025-05-16)

### 🚀 Features

- **js,react:** inbox preference grouping ([#8310](https://github.com/novuhq/novu/pull/8310))
- **js,react:** inbox and styles under the shadow root ([#8262](https://github.com/novuhq/novu/pull/8262))

### 🩹 Fixes

- **react:** inbox hydration issue for shadow root detector ([#8321](https://github.com/novuhq/novu/pull/8321))

### ❤️ Thank You

- Paweł Tymczuk @LetItRock

# v3.3.1 (2025-05-07)

### 🧱 Updated Dependencies

- Updated @novu/js to 3.3.1

### ❤️ Thank You

- Adam Chmara @ChmaraX

## v3.3.0 (2025-05-07)

### 🚀 Features

- **js,react:** add snooze functionality ([#8230](https://github.com/novuhq/novu/pull/8230))
- **repo:** Polish changelogs for packages ([a932bd38e4](https://github.com/novuhq/novu/commit/a932bd38e4))

### 🧱 Updated Dependencies

- Updated @novu/js to 3.3.0

### ❤️ Thank You

- Adam Chmara @ChmaraX
- George Desipris @desiprisg
- Paweł Tymczuk @LetItRock

## v3.2.0 (2025-04-30)

### 🚀 Features

- **react:** upsert firstName, lastName, and email on session init ([#8142](https://github.com/novuhq/novu/pull/8142))

### ❤️ Thank You

- George Djabarov @djabarovgeorge

## v3.1.0 (2025-04-11)

### 🩹 Fixes

- **react:** apiUrl prop passing to novu/js ([#8104](https://github.com/novuhq/novu/pull/8104))

### 🧱 Updated Dependencies

- Updated @novu/js to 3.1.0

### ❤️ Thank You

- Dima Grossman @scopsy
- Sokratis Vidros @SokratisVidros

## v3.0.3 (2025-03-31)

### 🚀 Features

- **react,nextjs:** better dist folders structure and tsup config improvements ([#7914](https://github.com/novuhq/novu/pull/7914))
- **js,react:** inbox subject, body render props ([#7886](https://github.com/novuhq/novu/pull/7886))
- **js:** Inbox retheme ([#7759](https://github.com/novuhq/novu/pull/7759))
- **api-service:** system limits & update pricing pages ([#7718](https://github.com/novuhq/novu/pull/7718))
- **root:** add no only github action ([#7692](https://github.com/novuhq/novu/pull/7692))

### 🩹 Fixes

- **api-service:** Remove lock from cached entity 2nd try ([#7979](https://github.com/novuhq/novu/pull/7979))
- **root:** simplify service dependencies in docker-compose.yml ([#7993](https://github.com/novuhq/novu/pull/7993))
- **root:** Stop updating lock-file when releasing new packages ([2107336ae2](https://github.com/novuhq/novu/commit/2107336ae2))
- **api-service:** remove-lock-from-cached-entity ([#7923](https://github.com/novuhq/novu/pull/7923))
- **root:** add NEW_RELIC_ENABLED to docker community ([#7943](https://github.com/novuhq/novu/pull/7943))
- **root:** remove healthcheck option in docker-compose.yml ([#7929](https://github.com/novuhq/novu/pull/7929))
- **react,nextjs:** Add use-client to exports ([#7934](https://github.com/novuhq/novu/pull/7934))
- **react:** use counts hooks used with not existing tags ([#7933](https://github.com/novuhq/novu/pull/7933))
- **api-service:** Remove redlock ([#7845](https://github.com/novuhq/novu/pull/7845))
- **api-service:** fix idices not created in mongo-test ([#7857](https://github.com/novuhq/novu/pull/7857))
- **root:** unhandled promise reject and undefined ff kind ([#7732](https://github.com/novuhq/novu/pull/7732))
- **api-service:** remove only on e2e ([#7691](https://github.com/novuhq/novu/pull/7691))

### ❤️ Thank You

- Aaron Ritter @Aaron-Ritter
- GalTidhar @tatarco
- George Desipris @desiprisg
- George Djabarov @djabarovgeorge
- Himanshu Garg @merrcury
- Pawan Jain
- Paweł Tymczuk @LetItRock
- Sokratis Vidros @SokratisVidros

## 3.0.1 (2025-03-24)

### 🩹 Fixes

- **react,nextjs:** Add use-client to exports ([#7934](https://github.com/novuhq/novu/pull/7934))
- **react:** use counts hooks used with not existing tags ([#7933](https://github.com/novuhq/novu/pull/7933))

### 🧱 Updated Dependencies

- Updated @novu/js to 3.0.1

### ❤️ Thank You

- Aaron Ritter @Aaron-Ritter
- GalTidhar @tatarco
- George Desipris @desiprisg
- Pawan Jain
- Paweł Tymczuk @LetItRock
- Sokratis Vidros @SokratisVidros

# 3.0.0 (2025-03-17)

### 🚀 Features

- **react,nextjs:** better dist folders structure and tsup config improvements ([#7914](https://github.com/novuhq/novu/pull/7914))
- **js,react:** inbox subject, body render props ([#7886](https://github.com/novuhq/novu/pull/7886))
- **js:** Inbox retheme ([#7759](https://github.com/novuhq/novu/pull/7759))

### 🧱 Updated Dependencies

- Updated @novu/js to 3.0.0

### ❤️ Thank You

- GalTidhar @tatarco
- George Desipris @desiprisg
- Paweł Tymczuk @LetItRock

## 2.6.6 (2025-02-25)

### 🚀 Features

- **api-service:** system limits & update pricing pages ([#7718](https://github.com/novuhq/novu/pull/7718))
- **root:** add no only github action ([#7692](https://github.com/novuhq/novu/pull/7692))

### 🩹 Fixes

- **root:** unhandled promise reject and undefined ff kind ([#7732](https://github.com/novuhq/novu/pull/7732))
- **api-service:** remove only on e2e ([#7691](https://github.com/novuhq/novu/pull/7691))

### 🧱 Updated Dependencies

- Updated @novu/js to 2.6.6

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

- Updated @novu/js to 2.6.5

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

## 2.6.3 (2024-12-24)

### 🧱 Updated Dependencies

- Updated @novu/js to 2.6.4

### ❤️ Thank You

- GalTidhar @tatarco
- George Desipris @desiprisg
- George Djabarov @djabarovgeorge
- Pawan Jain

## 2.6.2 (2024-11-26)

### 🚀 Features

- **js:** Popover props ([#7112](https://github.com/novuhq/novu/pull/7112))
- **dashboard:** Codemirror liquid filter support ([#7122](https://github.com/novuhq/novu/pull/7122))
- **root:** add support chat app ID to environment variables in d… ([#7120](https://github.com/novuhq/novu/pull/7120))
- **root:** Add base Dockerfile for GHCR with Node.js and dependencies ([#7100](https://github.com/novuhq/novu/pull/7100))

### 🩹 Fixes

- **api:** Migrate subscriber global preferences before workflow preferences ([#7118](https://github.com/novuhq/novu/pull/7118))
- **api, dal, framework:** fix the uneven and unused dependencies ([#7103](https://github.com/novuhq/novu/pull/7103))

### 🧱 Updated Dependencies

- Updated @novu/js to 2.6.3

### ❤️ Thank You

- Biswajeet Das @BiswaViraj
- George Desipris @desiprisg
- Himanshu Garg @merrcury
- Richard Fontein @rifont

## 2.0.2 (2024-11-19)

### 🚀 Features

- **framework:** CJS/ESM for framework ([#6707](https://github.com/novuhq/novu/pull/6707))
- **js:** Com 145 introduce novunextjs ([#6647](https://github.com/novuhq/novu/pull/6647))
- **js:** Com 208 improve the dx of the novu on function to return the cleanup ([#6650](https://github.com/novuhq/novu/pull/6650))
- **react-native:** Add a react native npm package for hooks ([#6556](https://github.com/novuhq/novu/pull/6556))
- **js, react, shared:** user agents ([#6626](https://github.com/novuhq/novu/pull/6626))
- **js,react:** Export InboxContent component ([#6531](https://github.com/novuhq/novu/pull/6531))
- **js,react:** Expose dark theme ([#6530](https://github.com/novuhq/novu/pull/6530))
- **js,react:** inbox allow filtering preferences by tags ([#6519](https://github.com/novuhq/novu/pull/6519))
- **react:** Introduce hooks ([#6419](https://github.com/novuhq/novu/pull/6419))
- **js:** Include headers and tabs in separate components ([#6323](https://github.com/novuhq/novu/pull/6323))
- **js:** Use render props universally with a single argument ([#6341](https://github.com/novuhq/novu/pull/6341))
- **react:** readme ([#6272](https://github.com/novuhq/novu/pull/6272))
- **react:** Com 40 create the novureact package ([#6167](https://github.com/novuhq/novu/pull/6167))

### 🩹 Fixes

- **root:** Build only public packages during preview deployments ([#6590](https://github.com/novuhq/novu/pull/6590))
- **react:** remove InboxChild and DefaultInbox exports ([#6566](https://github.com/novuhq/novu/pull/6566))
- **js,react:** inbox support custom navigate function for the relative redirect urls ([#6444](https://github.com/novuhq/novu/pull/6444))
- **js,react:** inbox custom bell unread count not updating ([#6362](https://github.com/novuhq/novu/pull/6362))
- **react:** fixed the sourcemaps ([485861181](https://github.com/novuhq/novu/commit/485861181))

### ❤️ Thank You

- Biswajeet Das
- Dima Grossman
- George Desipris @desiprisg
- Paweł
- Paweł Tymczuk @LetItRock
- Sokratis Vidros @SokratisVidros
