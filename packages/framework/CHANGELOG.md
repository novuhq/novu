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
- **dashboard:** Digest liquid helper and popover handler ([#7439](https://github.com/novuhq/novu/pull/7439))
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
- **framework:** Remove @novu/shared dependency temporarily ([#7337](https://github.com/novuhq/novu/pull/7337))

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


## 2.5.3 (2024-12-24)

### 🩹 Fixes

- **framework:** Remove @novu/shared dependency temporarily ([#7337](https://github.com/novuhq/novu/pull/7337))

### ❤️ Thank You

- GalTidhar @tatarco
- George Desipris @desiprisg
- George Djabarov @djabarovgeorge
- Pawan Jain
- Sokratis Vidros @SokratisVidros


## 2.5.2 (2024-11-26)

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

- **framework:** Expose `Workflow` resource type in public API ([#6983](https://github.com/novuhq/novu/pull/6983))
- **api:** Fix previous steps ([#6905](https://github.com/novuhq/novu/pull/6905))
- **api:** Billing alerts on usage emails ([#6883](https://github.com/novuhq/novu/pull/6883))
- **framework:** Support Next.js 15 with Turbopack dev server ([#6894](https://github.com/novuhq/novu/pull/6894))
- **api:** Add Error Handling 2XX issues ([#6884](https://github.com/novuhq/novu/pull/6884))
- **framework:** Add support for specifying mock results ([#6878](https://github.com/novuhq/novu/pull/6878))
- **framework:** CJS/ESM for framework ([#6707](https://github.com/novuhq/novu/pull/6707))
- **api:** Add preview endpoint ([#6648](https://github.com/novuhq/novu/pull/6648))
- **framework, web, application-generic:** Propagate Bridge server errors to Bridge client ([#6726](https://github.com/novuhq/novu/pull/6726))
- **framework, api, web, application-generic:** Add `name` and `description` to Framework workflow options ([#6708](https://github.com/novuhq/novu/pull/6708))
- **framework:** Add NestJS `serve` handler ([#6654](https://github.com/novuhq/novu/pull/6654))
- **framework:** Add `disableOutputSanitization` flag for channel step definitions ([#6521](https://github.com/novuhq/novu/pull/6521))
- **api:** create step-schemas module ([#6482](https://github.com/novuhq/novu/pull/6482))
- **shared, web, application-generic:** Create util for building preferences ([#6503](https://github.com/novuhq/novu/pull/6503))
- **framework:** Change framework capitalization: in_app -> inApp ([#6477](https://github.com/novuhq/novu/pull/6477))
- **framework:** cta support with target ([#6394](https://github.com/novuhq/novu/pull/6394))
- **framework:** Add `preferences` to `workflow` builder ([#6326](https://github.com/novuhq/novu/pull/6326))
- **framework,js:** expose the data property on the in-app step and notification object ([#6391](https://github.com/novuhq/novu/pull/6391))
- **novui, web, framework:** Step control autocomplete ([#6330](https://github.com/novuhq/novu/pull/6330))
- **api:** add usage of bridge provider options in send message usecases a… ([#6062](https://github.com/novuhq/novu/pull/6062))
- **framework:** Add new Inbox properties to `step.inApp` schema ([#6075](https://github.com/novuhq/novu/pull/6075))
- **framework, api, worker, application-generic, dal:** Support workflow tags in Framework ([#6195](https://github.com/novuhq/novu/pull/6195))
- **web,novui:** initial implementation of var autocomplete in controls ([#6097](https://github.com/novuhq/novu/pull/6097))
- **framework:** add sanitize html to step output ([#6082](https://github.com/novuhq/novu/pull/6082))
- **framework:** add lambda handler ([#6053](https://github.com/novuhq/novu/pull/6053))
- **framework:** add first five schemas for providers ([#6039](https://github.com/novuhq/novu/pull/6039))
- **framework:** add generic support for providers ([#6021](https://github.com/novuhq/novu/pull/6021))
- Enhance Vercel env handling and add test cases ([#5942](https://github.com/novuhq/novu/pull/5942))
- **framework:** Add trigger capability to defined workflows ([#5877](https://github.com/novuhq/novu/pull/5877))
- **web:** add controls to the preview ([#5884](https://github.com/novuhq/novu/pull/5884))
- **framework:** add trigger action ([#5839](https://github.com/novuhq/novu/pull/5839))
- **framework:** update novu framework headers ([#5837](https://github.com/novuhq/novu/pull/5837))
- **framework:** Set `strictAuthentication` to false when `process.env.NODE_ENV==='development'` ([#5813](https://github.com/novuhq/novu/pull/5813))
- **framework:** Add cron expression helper type ([#5811](https://github.com/novuhq/novu/pull/5811))
- **framework:** Add Zod support ([#5806](https://github.com/novuhq/novu/pull/5806))
- **framework:** add auto deterministic preview for required payload variables ([#5743](https://github.com/novuhq/novu/pull/5743))
- **framework,worker:** add digest parity ([#5765](https://github.com/novuhq/novu/pull/5765))
- **framework:** allow compiling for preview mode ([1e2403286](https://github.com/novuhq/novu/commit/1e2403286))

### 🩹 Fixes

- **framework:** Ensure missing schemas return unknown record type ([#6912](https://github.com/novuhq/novu/pull/6912))
- **framework:** Prevent adding duplicate workflows ([#6913](https://github.com/novuhq/novu/pull/6913))
- **framework:** Stop validating controls for non previewed step ([#6876](https://github.com/novuhq/novu/pull/6876))
- **framework:** Polish secretKey and apiUrl resolution ([#6819](https://github.com/novuhq/novu/pull/6819))
- **framework:** Explicitly exit workflow evaluation early after evaluating specified `stepId` ([#6808](https://github.com/novuhq/novu/pull/6808))
- **framework:** Resolve CJS issues this time with json-schema-faker ([#6766](https://github.com/novuhq/novu/pull/6766))
- **framework:** Experiement with importing json-schema-faker ([#6762](https://github.com/novuhq/novu/pull/6762))
- **framework:** Specify `zod-to-json-schema` as a dependency ([#6741](https://github.com/novuhq/novu/pull/6741))
- **framework:** Support json values in LiquidJS templates ([#6714](https://github.com/novuhq/novu/pull/6714))
- **framework:** Default to health action ([#6634](https://github.com/novuhq/novu/pull/6634))
- **root:** Build only public packages during preview deployments ([#6590](https://github.com/novuhq/novu/pull/6590))
- **framework,dal:** fix the default redirect behaviour, support absolute and relative paths ([#6443](https://github.com/novuhq/novu/pull/6443))
- **framework, node:** Make the `payload` property optional during trigger ([#6384](https://github.com/novuhq/novu/pull/6384))
- **framework:** Stop requiring default properties to be specified in outputs ([#6373](https://github.com/novuhq/novu/pull/6373))
- **framework:** Ensure steps after skipped steps are executed ([#6371](https://github.com/novuhq/novu/pull/6371))
- **framework:** add locale to subscriber ([#6165](https://github.com/novuhq/novu/pull/6165))
- **framework:** remove pnpm install enforcement ([#6215](https://github.com/novuhq/novu/pull/6215))
- **framework:** Remove only failing validation properties and simplify Slack schema ([#6160](https://github.com/novuhq/novu/pull/6160))
- **framework:** Make step channel output sanitization more permissive ([#6106](https://github.com/novuhq/novu/pull/6106))
- **framework:** twilio schema in framework ([#6065](https://github.com/novuhq/novu/pull/6065))
- **framework:** Add `OPTIONS` endpoint for Sveltekit, improve `serve` typedoc ([#5971](https://github.com/novuhq/novu/pull/5971))
- **framework:** Remove compile time secret key check ([#5932](https://github.com/novuhq/novu/pull/5932))
- **framework:** Add missing `peerDependencies` and fix dynamic imports ([#5883](https://github.com/novuhq/novu/pull/5883))
- **framework:** fetch bad request response ([#5881](https://github.com/novuhq/novu/pull/5881))
- add ability to specify api url ([c0ff212f4](https://github.com/novuhq/novu/commit/c0ff212f4))
- **framework:** add json parse ([#5853](https://github.com/novuhq/novu/pull/5853))
- update version of framework release ([7b2e41cd6](https://github.com/novuhq/novu/commit/7b2e41cd6))

### 🔥 Performance

- **framework:** Replace all computed property keys with static declarations ([#6926](https://github.com/novuhq/novu/pull/6926))

### ❤️  Thank You

- Biswajeet Das @BiswaViraj
- David Söderberg @davidsoderberg
- Denis Kralj @denis-kralj-novu
- Dima Grossman @scopsy
- Gali Ainouz Baum
- GalTidhar @tatarco
- George Djabarov @djabarovgeorge
- Joel Anton
- Lucky @L-U-C-K-Y
- Paweł Tymczuk @LetItRock
- Richard Fontein @rifont
- Sokratis Vidros @SokratisVidros