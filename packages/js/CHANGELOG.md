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

- **js:** add powered by link ([#7680](https://github.com/novuhq/novu/pull/7680))
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

- **dashboard,js:** Fix line breaks being ignored ([#7675](https://github.com/novuhq/novu/pull/7675))
- **js:** Await read action in Inbox ([#7653](https://github.com/novuhq/novu/pull/7653))
- **api:** duplicated subscribers created due to race condition ([#7646](https://github.com/novuhq/novu/pull/7646))
- **api-service:** add missing environment variable ([#7553](https://github.com/novuhq/novu/pull/7553))
- **api:** Fix failing API e2e tests ([78c385ec7](https://github.com/novuhq/novu/commit/78c385ec7))
- **api-service:** E2E improvements ([#7461](https://github.com/novuhq/novu/pull/7461))
- **novu:** automatically create indexes on startup ([#7431](https://github.com/novuhq/novu/pull/7431))
- **js:** Inbox DX fixes ([#7396](https://github.com/novuhq/novu/pull/7396))
- **api:** @novu/api -> @novu/api-service ([#7348](https://github.com/novuhq/novu/pull/7348))
- **js:** add missing on click event for dropdown tabs ([#7342](https://github.com/novuhq/novu/pull/7342))
- **js:** Remove @novu/shared dependency" ([#7206](https://github.com/novuhq/novu/pull/7206))
- **js:** Remove @novu/shared dependency ([#6906](https://github.com/novuhq/novu/pull/6906))

### ❤️ Thank You

- Aminul Islam @AminulBD
- Dima Grossman @scopsy
- GalTidhar @tatarco
- George Desipris @desiprisg
- George Djabarov @djabarovgeorge
- Lucky @L-U-C-K-Y
- Pasha
- Pawan Jain
- Paweł Tymczuk @LetItRock
- Sokratis Vidros @SokratisVidros


## 2.6.4 (2024-12-24)

### 🩹 Fixes

- **js:** add missing on click event for dropdown tabs ([#7342](https://github.com/novuhq/novu/pull/7342))
- **js:** Remove @novu/shared dependency" ([#7206](https://github.com/novuhq/novu/pull/7206))
- **js:** Remove @novu/shared dependency ([#6906](https://github.com/novuhq/novu/pull/6906))

### ❤️ Thank You

- Dima Grossman @scopsy
- GalTidhar @tatarco
- George Desipris @desiprisg
- George Djabarov @djabarovgeorge
- Pasha
- Pawan Jain
- Sokratis Vidros @SokratisVidros


## 2.6.3 (2024-11-26)

### 🚀 Features

- **dashboard:** Add test inbox for full E2E test journey ([#7117](https://github.com/novuhq/novu/pull/7117))
- **js:** Popover props ([#7112](https://github.com/novuhq/novu/pull/7112))
- **dashboard:** Codemirror liquid filter support ([#7122](https://github.com/novuhq/novu/pull/7122))
- **root:** add support chat app ID to environment variables in d… ([#7120](https://github.com/novuhq/novu/pull/7120))
- **root:** Add base Dockerfile for GHCR with Node.js and dependencies ([#7100](https://github.com/novuhq/novu/pull/7100))

### 🩹 Fixes

- **js:** Truncate workflow name and center empty notifications text ([#7123](https://github.com/novuhq/novu/pull/7123))
- **api:** Migrate subscriber global preferences before workflow preferences ([#7118](https://github.com/novuhq/novu/pull/7118))
- **api, dal, framework:** fix the uneven and unused dependencies ([#7103](https://github.com/novuhq/novu/pull/7103))

### 🧱 Updated Dependencies

- Updated @novu/client to 2.0.3

### ❤️  Thank You

- Biswajeet Das @BiswaViraj
- George Desipris @desiprisg
- Himanshu Garg @merrcury
- Richard Fontein @rifont

## 2.0.2 (2024-11-19)

### 🚀 Features

- **api:** Delete subscriber channel preference when updating global channel ([#6767](https://github.com/novuhq/novu/pull/6767))
- **framework:** CJS/ESM for framework ([#6707](https://github.com/novuhq/novu/pull/6707))
- **js:** Com 208 improve the dx of the novu on function to return the cleanup ([#6650](https://github.com/novuhq/novu/pull/6650))
- **js:** update icons and add backdrop-filter ([#6629](https://github.com/novuhq/novu/pull/6629))
- **js, react, shared:** user agents ([#6626](https://github.com/novuhq/novu/pull/6626))
- **js:** Com 229 update the in app preview component in the web app to ([#6600](https://github.com/novuhq/novu/pull/6600))
- **api, js, react:** Com 244 hide critical workflow preferences from inbox ([#6574](https://github.com/novuhq/novu/pull/6574))
- **js:** html comment powered by novu ([#6588](https://github.com/novuhq/novu/pull/6588))
- **js,react:** Export InboxContent component ([#6531](https://github.com/novuhq/novu/pull/6531))
- **js:** custom scrollbars ([#6560](https://github.com/novuhq/novu/pull/6560))
- **js,react:** Expose dark theme ([#6530](https://github.com/novuhq/novu/pull/6530))
- **js:** make tooltip smaller ([#6539](https://github.com/novuhq/novu/pull/6539))
- **js,react:** inbox allow filtering preferences by tags ([#6519](https://github.com/novuhq/novu/pull/6519))
- **js:** Add colorShadow variable to appearance ([#6526](https://github.com/novuhq/novu/pull/6526))
- **js:** Popover and collapse animations ([#6506](https://github.com/novuhq/novu/pull/6506))
- **js:** hide branding ([#6513](https://github.com/novuhq/novu/pull/6513))
- **api:** add option to remove Novu branding in the inbox ([#6498](https://github.com/novuhq/novu/pull/6498))
- **js:** Fix events sharing by replacing singleton with DI ([#6454](https://github.com/novuhq/novu/pull/6454))
- **js:** Allow markdown bold syntax for default notification ([#6495](https://github.com/novuhq/novu/pull/6495))
- **js:** hide properties from instances ([#6496](https://github.com/novuhq/novu/pull/6496))
- **react:** Introduce hooks ([#6419](https://github.com/novuhq/novu/pull/6419))
- **js,react:** inbox preferences cache ([#6400](https://github.com/novuhq/novu/pull/6400))
- **framework:** cta support with target ([#6394](https://github.com/novuhq/novu/pull/6394))
- **js:** Revise localization keys DX ([#6380](https://github.com/novuhq/novu/pull/6380))
- **js:** Dynamic localization keys and data-localization attribute ([#6383](https://github.com/novuhq/novu/pull/6383))
- **framework,js:** expose the data property on the in-app step and notification object ([#6391](https://github.com/novuhq/novu/pull/6391))
- **js:** Pixel perfect implementation ([#6360](https://github.com/novuhq/novu/pull/6360))
- **js:** Improve perceived loading state ([#6379](https://github.com/novuhq/novu/pull/6379))
- **js:** Com 159 disable updating preferences for critical worklows ([#6347](https://github.com/novuhq/novu/pull/6347))
- **js:** Include headers and tabs in separate components ([#6323](https://github.com/novuhq/novu/pull/6323))
- **js:** Use render props universally with a single argument ([#6341](https://github.com/novuhq/novu/pull/6341))
- **js:** Recalculate notification date each minute ([#6320](https://github.com/novuhq/novu/pull/6320))
- **js:** Add a bell emoji as separator for targetable classes ([#6297](https://github.com/novuhq/novu/pull/6297))
- **js:** inbox load css with the link element in header ([#6269](https://github.com/novuhq/novu/pull/6269))
- **react:** readme ([#6272](https://github.com/novuhq/novu/pull/6272))
- **js:** Com 123 implement the new notifications cta handler ([#6267](https://github.com/novuhq/novu/pull/6267))
- **js:** New notifications notice ([#6223](https://github.com/novuhq/novu/pull/6223))
- **js:** date formatting and absolute actions ([#6257](https://github.com/novuhq/novu/pull/6257))
- **js:** inbox sdk manage pagination state in cache ([#6206](https://github.com/novuhq/novu/pull/6206))
- **react:** Com 40 create the novureact package ([#6167](https://github.com/novuhq/novu/pull/6167))
- **js:** Com 111 refactor naming settings to preferences ([#6183](https://github.com/novuhq/novu/pull/6183))
- **js:** inbox tabs ([#6149](https://github.com/novuhq/novu/pull/6149))
- **js:** Introduce a Tooltip primitive ([#6189](https://github.com/novuhq/novu/pull/6189))
- **js:** inbox support multiple counts for the provided filters ([#6159](https://github.com/novuhq/novu/pull/6159))
- **js:** Default notification component ([#6163](https://github.com/novuhq/novu/pull/6163))
- **js:** Com 95 add preferences method to sdk and UI ([#6117](https://github.com/novuhq/novu/pull/6117))
- **js:** Improve style() functionality ([#6170](https://github.com/novuhq/novu/pull/6170))
- **js:** Implement the renderNotification prop ([#6125](https://github.com/novuhq/novu/pull/6125))
- **js:** inbox - single websocket connection across tabs ([#6099](https://github.com/novuhq/novu/pull/6099))
- **js:** Notification list ([#6002](https://github.com/novuhq/novu/pull/6002))
- **js:** Com 82 implement filters on sdk ([#6060](https://github.com/novuhq/novu/pull/6060))
- **js:** Button variants, asChild on Popover ([#6057](https://github.com/novuhq/novu/pull/6057))
- **js:** Auto apply generic appearance keys via style() ([#6041](https://github.com/novuhq/novu/pull/6041))
- **root:** Fix JS build and introduce playground applications ([#5988](https://github.com/novuhq/novu/pull/5988))
- **js:** Enforce appearance keys ([#5984](https://github.com/novuhq/novu/pull/5984))
- **js:** Create component renderer ([#5953](https://github.com/novuhq/novu/pull/5953))
- **js:** Introduce baseTheme prop and theme merging ([#5851](https://github.com/novuhq/novu/pull/5851))
- **js:** Flatten localization prop type ([#5858](https://github.com/novuhq/novu/pull/5858))
- **js:** Localization infra ([#5822](https://github.com/novuhq/novu/pull/5822))
- **js:** Scope variables under class of id ([#5820](https://github.com/novuhq/novu/pull/5820))
- **js:** Introduce UI ([#5746](https://github.com/novuhq/novu/pull/5746))
- **api:** inbox - the new get notifications endpoint ([#5792](https://github.com/novuhq/novu/pull/5792))
- **api:** the new inbox controller ([#5735](https://github.com/novuhq/novu/pull/5735))
- **js:** handling the web socket connection and events ([#5704](https://github.com/novuhq/novu/pull/5704))
- **js:** js sdk preferences ([#5701](https://github.com/novuhq/novu/pull/5701))
- **js:** js sdk feeds module ([#5688](https://github.com/novuhq/novu/pull/5688))
- **js:** lazy session initialization and interface fixes ([#5665](https://github.com/novuhq/novu/pull/5665))
- **js:** the base js sdk package scaffolding ([#5654](https://github.com/novuhq/novu/pull/5654))

### 🩹 Fixes

- **js:** build types ([#6732](https://github.com/novuhq/novu/pull/6732))
- **js:** Bypass cache during novu.notifications.list() ([#6690](https://github.com/novuhq/novu/pull/6690))
- **js:** Stabilize JS build process ([#6695](https://github.com/novuhq/novu/pull/6695))
- **js:** incorrect date ([#6641](https://github.com/novuhq/novu/pull/6641))
- **js:** Com 246 the notification mark as actions appears to be under the text content ([#6593](https://github.com/novuhq/novu/pull/6593))
- **root:** Build only public packages during preview deployments ([#6590](https://github.com/novuhq/novu/pull/6590))
- **js:** not allowed cursor when disabled ([#6565](https://github.com/novuhq/novu/pull/6565))
- **js:** add elements from basetheme ([#6558](https://github.com/novuhq/novu/pull/6558))
- **js:** css where ([#6550](https://github.com/novuhq/novu/pull/6550))
- **js:** preference row ([#6545](https://github.com/novuhq/novu/pull/6545))
- **js:** icon alignment ([#6538](https://github.com/novuhq/novu/pull/6538))
- **js:** Com 234 improve spacing for time and subject text in notifications ([#6534](https://github.com/novuhq/novu/pull/6534))
- **js:** add mising () ([#6524](https://github.com/novuhq/novu/pull/6524))
- **js:** Com 228 fix state persistence issue for global workflow preferences ([#6509](https://github.com/novuhq/novu/pull/6509))
- **js:** Fix notification skeleton padding and action wrap ([#6481](https://github.com/novuhq/novu/pull/6481))
- **js:** Don't render subject as bold ([#6505](https://github.com/novuhq/novu/pull/6505))
- **js:** fixed the optimistic update value for the complete and revert actions ([#6473](https://github.com/novuhq/novu/pull/6473))
- **js,react:** inbox support custom navigate function for the relative redirect urls ([#6444](https://github.com/novuhq/novu/pull/6444))
- **js:** Fix action blinking on default notification ([#6448](https://github.com/novuhq/novu/pull/6448))
- **js:** show the new messages pill when there are more than x notifications ([#6395](https://github.com/novuhq/novu/pull/6395))
- **js:** inbox notifications component gets remounting when render notification prop changes ([#6429](https://github.com/novuhq/novu/pull/6429))
- **api,js:** inbox api send workflow identifier ([#6402](https://github.com/novuhq/novu/pull/6402))
- **js,react:** inbox custom bell unread count not updating ([#6362](https://github.com/novuhq/novu/pull/6362))
- **js:** Add a minimum height to notification list ([#6298](https://github.com/novuhq/novu/pull/6298))
- **js:** call counts if tabs exists ([#6287](https://github.com/novuhq/novu/pull/6287))
- **js:** show loading when changing filters ([#6277](https://github.com/novuhq/novu/pull/6277))
- **js:** button padding and preferences response ([#6274](https://github.com/novuhq/novu/pull/6274))
- **js:** Set inbox width top level ([#6194](https://github.com/novuhq/novu/pull/6194))
- **js:** Fix checkmark for selected value and localize text ([#6104](https://github.com/novuhq/novu/pull/6104))
- **js:** Scope inbox notification status context ([#6080](https://github.com/novuhq/novu/pull/6080))
- **js:** Fix build types ([#6064](https://github.com/novuhq/novu/pull/6064))
- **js:** Popover focus trap and dismissal ([#6049](https://github.com/novuhq/novu/pull/6049))
- **js:** Fix portal default props ([#6000](https://github.com/novuhq/novu/pull/6000))
- **js:** Export NovuUI from ui directory only ([#5998](https://github.com/novuhq/novu/pull/5998))
- **js:** Use key prefix instead of id for alpha shades ([#5890](https://github.com/novuhq/novu/pull/5890))

### ❤️  Thank You

- Adam Chmara
- Biswajeet Das @BiswaViraj
- George Desipris @desiprisg
- Paweł Tymczuk @LetItRock
- Richard Fontein @rifont
- Sokratis Vidros @SokratisVidros