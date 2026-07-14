## v2.19.0 (2026-07-13)

### 🚀 Features

- **novu:** first-class LangChain support in npx novu connect fixes NV-8243 ([#11888](https://github.com/novuhq/novu/pull/11888))
- **providers:** add Webex Messaging OAuth support fixes NV-8272 ([#11633](https://github.com/novuhq/novu/pull/11633))
- **framework:** support AI SDK v7 in @novu/framework/ai-sdk fixes NV-8222 ([#11860](https://github.com/novuhq/novu/pull/11860))
- **dashboard:** replace legacy local studio with Local environment mode fixes NV-8242 ([#11847](https://github.com/novuhq/novu/pull/11847))
- **novu:** AI SDK connect template + existing-project reconcile fixes NV-8223 ([#11846](https://github.com/novuhq/novu/pull/11846))
- **cli:** add --version flag to the CLI ([#11817](https://github.com/novuhq/novu/pull/11817))
- **dashboard:** email agent whats-next guide and simplified setup fixes NV-8115 ([#11706](https://github.com/novuhq/novu/pull/11706))
- **novu:** align connect runtime picker with dashboard onboarding fixes NV-8135 ([#11682](https://github.com/novuhq/novu/pull/11682))
- **dashboard:** improve agent onboarding setup UX and CLI auth fixes NV-8125 ([#11655](https://github.com/novuhq/novu/pull/11655))
- **api-service,js,react:** Telegram subscriber-link SDK + shared linking module fixes NV-8095 ([#11619](https://github.com/novuhq/novu/pull/11619))
- **root:** sort selected items to top in agent creation multi-select fixes NV-8076 ([#11601](https://github.com/novuhq/novu/pull/11601))
- **root:** add Chat SDK brain to novu connect fixes NV-8067 ([#11595](https://github.com/novuhq/novu/pull/11595))
- **novu:** default connect to dashboard OAuth, add --keyless flag fixes NV-8048 ([#11566](https://github.com/novuhq/novu/pull/11566))
- **novu:** surface keyless claim link in connect onboarding flow fixes NV-8036 ([#11530](https://github.com/novuhq/novu/pull/11530))
- **novu,dashboard,shared:** connect --login and dashboard onboarding auth signal fixes NV-8020 ([#11523](https://github.com/novuhq/novu/pull/11523))
- **novu:** secure setup links for Slack/Telegram secrets fixes NV-8008 ([#11506](https://github.com/novuhq/novu/pull/11506))
- **novu:** telegram QR PNG handoff and --ci channel guard fixes NV-8007 ([#11505](https://github.com/novuhq/novu/pull/11505))
- **novu:** agent-optimized connect --help fixes NV-8007 ([#11504](https://github.com/novuhq/novu/pull/11504))

### 🩹 Fixes

- **root:** bump vitest devDependency range to ^4.1.0 to close advisories fixes NV-8196 ([#11785](https://github.com/novuhq/novu/pull/11785))
- **root:** resolve high esbuild vulnerability fixes NV-8040 ([#11554](https://github.com/novuhq/novu/pull/11554))
- **novu:** fall back to dashboard auth when keyless AI limit is hit fixes NV-8027 ([#11537](https://github.com/novuhq/novu/pull/11537))
- **novu:** restore in-terminal token entry for interactive connect fixes NV-8026 ([#11536](https://github.com/novuhq/novu/pull/11536))
- rc ([d19deca4f5](https://github.com/novuhq/novu/commit/d19deca4f5))
- **novu:** harden keyless session bootstrap and CI handoff events ([#11489](https://github.com/novuhq/novu/pull/11489))
- **novu:** fallback to dashboard auth when keyless demo limits are hit fixes NV-7993 ([#11484](https://github.com/novuhq/novu/pull/11484))

### ❤️ Thank You

- Adam Chmara @ChmaraX
- Andrew @andrewk2929
- Dima Grossman @scopsy
- George Djabarov @djabarovgeorge
- Paweł Tymczuk @LetItRock
- Rahul Jain

## 2.8.0 (2026-03-27)

### 🚀 Features

- **novu:** email step resolver init & publish commands fixes NV-7094 ([#9989](https://github.com/novuhq/novu/pull/9989))
- **novu:** step controls passthrough to CF step resolver fixes NV-7124 ([#10075](https://github.com/novuhq/novu/pull/10075))
- **novu:** option to publish specific steps within workflow fixes NV-7129 ([#10081](https://github.com/novuhq/novu/pull/10081))
- **novu:** email publish - prevent publishing directly to prod fixes NV-7158 ([#10109](https://github.com/novuhq/novu/pull/10109))
- **novu,dashboard:** streamline React Email onboarding DX fixes NV-7183 ([#10153](https://github.com/novuhq/novu/pull/10153))
- **novu,dashboard:** react email publishing & visual improvements fixes NV-7184 ([#10156](https://github.com/novuhq/novu/pull/10156))
- **novu,dashboard:** interactive react email template selector in CLI fixes NV-7185 ([#10159](https://github.com/novuhq/novu/pull/10159))
- **novu,dashboard:** step resolver workflowId is implicit from generated folder fixes NV-7190 ([#10164](https://github.com/novuhq/novu/pull/10164))
- **novu:** email publish - auto-install @novu/framework as devDependency ([#10165](https://github.com/novuhq/novu/pull/10165))
- **novu:** improve email publish CLI output DX ([#10166](https://github.com/novuhq/novu/pull/10166))
- **novu,framework:** align step resolver handlers with framework steps fixes NV-7235 ([#10286](https://github.com/novuhq/novu/pull/10286))
- **api-service,dashboard,novu:** extend step resolver to all steps fixes NV-7187 ([#10271](https://github.com/novuhq/novu/pull/10271))
- **api-service,dashboard,novu:** add code step plan limits fixes NV-7271 ([#10416](https://github.com/novuhq/novu/pull/10416))

### 🩹 Fixes

- **novu:** update init step id ([#10001](https://github.com/novuhq/novu/pull/10001))
- **novu,enterprise:** use workflowId/stepId key for global routing uniqueness ([#10094](https://github.com/novuhq/novu/pull/10094))
- **novu:** pass steps to step resolver fixes NV-7191 ([#10171](https://github.com/novuhq/novu/pull/10171))
- **novu,dashboard:** step resolver generated defaults; stale preview fixes NV-7236 ([#10319](https://github.com/novuhq/novu/pull/10319))
- **novu:** use @babel/parser instead of typescript for email template discovery fixes NV-7252 ([#10351](https://github.com/novuhq/novu/pull/10351))
- **novu:** resolve zod bundling error and adapt step scaffolding to project setup fixes NV-7257 ([#10352](https://github.com/novuhq/novu/pull/10352))
- **novu:** log reused step file path and add file column to publish summary fixes NV-7256 ([#10353](https://github.com/novuhq/novu/pull/10353))
- **novu:** replace typescript with @babel/parser in step-discovery ([#10418](https://github.com/novuhq/novu/pull/10418))

### 🧱 Updated Dependencies

- Updated @novu/framework to 2.10.0

### ❤️ Thank You

- Adam Chmara @ChmaraX
- Dima Grossman @scopsy
- George Djabarov @djabarovgeorge
- Pawan Jain
- Paweł Tymczuk @LetItRock

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
- **novu:** Add `--studio-host` option on dev server ([#7211](https://github.com/novuhq/novu/pull/7211))
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
- **novu:** Respect .env values for API URL and SECRET_KEY ([#7279](https://github.com/novuhq/novu/pull/7279))

### 🧱 Updated Dependencies

- Updated @novu/shared to 2.6.5

### ❤️ Thank You

- Aminul Islam @AminulBD
- Arthur M @4rthem
- Dima Grossman @scopsy
- GalTidhar @tatarco
- George Desipris @desiprisg
- George Djabarov @djabarovgeorge
- Lucky @L-U-C-K-Y
- Pawan Jain
- Paweł Tymczuk @LetItRock
- Sokratis Vidros @SokratisVidros


## 2.2.2 (2024-12-24)

### 🚀 Features

- **novu:** Add `--studio-host` option on dev server ([#7211](https://github.com/novuhq/novu/pull/7211))

### 🩹 Fixes

- **novu:** Respect .env values for API URL and SECRET_KEY ([#7279](https://github.com/novuhq/novu/pull/7279))

### 🧱 Updated Dependencies

- Updated @novu/shared to 2.1.5

### ❤️ Thank You

- Arthur M @4rthem
- GalTidhar @tatarco
- George Desipris @desiprisg
- George Djabarov @djabarovgeorge
- Pawan Jain
- Sokratis Vidros @SokratisVidros


## 2.2.1 (2024-11-26)

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

- **novu:** Add `--headless` flag to prevent automatic browser open with `npx novu dev` command ([#7016](https://github.com/novuhq/novu/pull/7016))
- **novu:** update novu init landing page ([#6805](https://github.com/novuhq/novu/pull/6805))

### 🩹 Fixes

- **root:** add novu cli flags and remove magicbell ([#6779](https://github.com/novuhq/novu/pull/6779))

### ❤️  Thank You

- Dima Grossman @scopsy
- Pawan Jain
- Richard Fontein @rifont