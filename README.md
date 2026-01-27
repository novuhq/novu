[//]: # (<p align="center">)

[//]: # (  <img src="https://raw.githubusercontent.com/novuhq/novu/next/apps/dashboard/public/images/novu-logo-light-bg.svg" width="200" alt="ReNovu Logo">)

[//]: # (</p>)

<h1 align="center">ReNovu</h1>

<p align="center">
  <strong>Re</strong>verse-Engineered <strong>Novu</strong> — Self-hosted notifications with enterprise features unlocked
</p>

<p align="center">
  <em>Like <a href="https://github.com/ReVanced">ReVanced</a> for YouTube, but for <a href="https://novu.co">Novu</a> notifications</em>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#whats-unlocked">What's Unlocked</a> •
  <a href="#roadmap">Roadmap</a> •
  <a href="#providers">Providers</a>
</p>

---

## Why ReNovu?

Novu is an excellent open-source notification infrastructure, but many features are locked behind enterprise tiers. **ReNovu** reverse-engineers these restrictions to give self-hosters the full experience:

| Feature | Novu Free | Novu Enterprise | ReNovu |
|---------|:---------:|:---------------:|:------:|
| Unlimited workflows | Limited | Yes | **Yes** |
| Custom layouts | Limited | Yes | **Yes** |
| Remove branding | No | Yes | **Yes** |
| Multi-org support | No | Yes | **Yes** |
| Priority support | No | Yes | Community |
| AI Translation | No | Yes | **Planned** |

## Quick Start

```bash
# Clone
git clone https://github.com/atlonxp/renovu.git
cd renovu

# Configure
cp .env.example .env

# Launch
docker compose up -d
```

**That's it.** Open [http://localhost:4000](http://localhost:4000) and start sending notifications.

## Access Points

| Service | URL | Description |
|---------|-----|-------------|
| Dashboard | [localhost:4000](http://localhost:4000) | Web admin interface |
| API | [localhost:3001](http://localhost:3001) | REST API & OpenAPI docs |
| WebSocket | [localhost:3002](http://localhost:3002) | Real-time updates |

## What's Unlocked

### Tier System
All organizations automatically receive **UNLIMITED** tier:
- Unlimited workflows and notification templates
- Unlimited team members
- Unlimited API calls
- All premium features enabled

### Branding Freedom
- "Powered by Novu" banners removed
- Inbox component footer hidden
- Full white-label capability

### Self-Hosted Auth
- No Clerk dependency
- JWT-based authentication
- Auto-organization creation on first login

## Roadmap

ReNovu is actively reverse-engineering locked enterprise features:

| Feature | Status | Implementation |
|---------|--------|----------------|
| Unlimited Tier | **Done** | Modified tier assignment |
| Remove Branding | **Done** | Auto-enabled for self-hosted |
| AI Translation | **Planned** | OpenAI GPT-4o integration |
| Custom Providers | Exploring | Community contributions |

### AI Translation (Coming Soon)

Novu's enterprise translation feature uses proprietary AI. ReNovu will implement this using:
- **OpenAI GPT-4o** for high-quality translations
- **Configurable providers** (OpenAI, Anthropic, local LLMs)
- **13+ languages** support

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        ReNovu Stack                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │   API    │  │  Worker  │  │    WS    │   │
│  │  :4000   │  │  :3001   │  │  :3004   │  │  :3002   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │             │             │          │
│       └─────────────┴──────┬──────┴─────────────┘          │
│                            │                                │
│              ┌─────────────┴─────────────┐                 │
│              │                           │                  │
│         ┌────┴────┐               ┌──────┴──────┐          │
│         │ MongoDB │               │    Redis    │          │
│         │  :27017 │               │    :6379    │          │
│         └─────────┘               └─────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

Edit `.env` for your environment:

```bash
# Security (CHANGE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key
STORE_ENCRYPTION_KEY=32-character-encryption-key!!
NOVU_SECRET_KEY=your-novu-secret-key

# Database
MONGO_USER=renovu
MONGO_PASSWORD=secure-password

# URLs (update for production)
API_ROOT_URL=http://localhost:3001
FRONT_BASE_URL=http://localhost:4000
```

## Providers

ReNovu supports 50+ notification providers out of the box:

<details>
<summary><strong>Email Providers</strong></summary>

- Sendgrid
- Mailgun
- Amazon SES
- Postmark
- SMTP (any)
- Mailjet
- Mandrill
- Brevo (Sendinblue)
- MailerSend
- Resend
- SparkPost
- Outlook 365

</details>

<details>
<summary><strong>SMS Providers</strong></summary>

- Twilio
- Plivo
- Amazon SNS
- Vonage (Nexmo)
- Telnyx
- Termii
- Gupshup
- Clickatell
- Infobip

</details>

<details>
<summary><strong>Push Providers</strong></summary>

- Firebase Cloud Messaging (FCM)
- Expo
- Apple Push Notification Service (APNS)
- OneSignal
- Pushpad

</details>

<details>
<summary><strong>Chat Providers</strong></summary>

- Slack
- Discord
- Microsoft Teams
- Mattermost

</details>

## Development

```bash
# Install dependencies
pnpm install

# Start dev servers
pnpm start:api:dev      # API on :3001
pnpm start:dashboard    # Dashboard on :4000
pnpm start:worker       # Background worker
pnpm start:ws           # WebSocket server
```

### Build from Source

```bash
# Build all images
docker compose build

# Build specific service
docker compose build api
docker compose build dashboard
```

## Project Structure

```
renovu/
├── apps/
│   ├── api/              # NestJS REST API
│   ├── dashboard/        # React admin dashboard
│   ├── worker/           # Background job processor
│   ├── ws/               # WebSocket server
│   ├── inbound-mail/     # Inbound email processor
│   └── webhook/          # Webhook delivery service
├── libs/
│   ├── dal/              # Data access layer
│   └── application-generic/
├── packages/
│   ├── shared/           # Shared types & constants
│   ├── framework/        # Workflow framework
│   ├── js/               # JavaScript SDK
│   ├── react/            # React components (Inbox)
│   └── providers/        # Channel provider implementations
├── docker/               # Dockerfiles
└── docker-compose.yml
```

## Contributing

ReNovu is community-driven. We welcome contributions for:

- Reverse-engineering additional enterprise features
- Adding new notification providers
- Improving documentation
- Bug fixes and optimizations

## Disclaimer

ReNovu is an independent project that modifies Novu for self-hosted use. It is not affiliated with, endorsed by, or supported by Novu Co. Use at your own discretion.

## License

Based on [Novu](https://github.com/novuhq/novu), licensed under MIT License.

---

<p align="center">
  <strong>ReNovu</strong> — Your notifications, your infrastructure, your rules.
</p>
