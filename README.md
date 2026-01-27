# ReNovu

Self-hosted notification platform based on [Novu](https://novu.co) with all enterprise features unlocked.

## Features

- **All Tiers Unlocked** - UNLIMITED tier for all organizations
- **No Branding** - Novu branding removed by default
- **Multi-Channel** - Email, SMS, Push, In-App, Chat notifications
- **Inbox Component** - Embeddable React notification inbox
- **Workflow Engine** - Visual workflow builder with conditions and delays
- **50+ Providers** - Sendgrid, Twilio, FCM, Slack, and more

## Quick Start

```bash
# Clone the repository
git clone <your-repo-url> renovu
cd renovu

# Copy environment file
cp .env.example .env

# Start all services
docker compose up -d
```

## Access

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:3000 |
| API | http://localhost:3001 |
| WebSocket | http://localhost:3002 |

## Services

| Service | Description |
|---------|-------------|
| `api` | Core REST API server |
| `dashboard` | Web admin interface |
| `worker` | Background job processor |
| `ws` | WebSocket server for real-time updates |
| `mongodb` | Database |
| `redis` | Cache and queue |

## Configuration

Edit `.env` to customize:

```bash
# Security - CHANGE IN PRODUCTION
JWT_SECRET=your-secret-here
STORE_ENCRYPTION_KEY=32-character-key-here
NOVU_SECRET_KEY=your-secret-here

# Database
MONGO_USER=renovu
MONGO_PASSWORD=your-password

# Ports
DASHBOARD_PORT=3000
API_PORT=3001
WS_PORT=3002
```

## Project Structure

```
renovu/
├── apps/
│   ├── api/            # NestJS API server
│   ├── dashboard/      # React dashboard (Vite)
│   ├── worker/         # Background job processor
│   ├── ws/             # WebSocket server
│   ├── inbound-mail/   # Email parsing service
│   └── webhook/        # Webhook delivery service
├── docker/             # Dockerfiles
├── libs/               # Core libraries
│   ├── dal/            # Data access layer
│   └── application-generic/
├── packages/           # NPM packages
│   ├── shared/         # Shared types and utilities
│   ├── framework/      # Workflow framework
│   ├── js/             # JavaScript SDK
│   ├── react/          # React components
│   └── providers/      # Channel providers
└── docker-compose.yml
```

## Modifications from Novu

### Tier System
- All organizations get `UNLIMITED` tier automatically
- Feature limits unlocked in `packages/shared/src/consts/feature-tiers-constants.ts`
- No enterprise packages required

### Authentication
- Self-hosted authentication (no Clerk dependency)
- Auto-creates organization on first login
- JWT-based authentication

### Branding
- `removeNovuBranding: true` by default for new organizations
- Inbox component footer hidden

## Building from Source

```bash
# Build all services
docker compose build

# Build specific service
docker compose build api
docker compose build dashboard
```

## Development

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm start:api:dev
pnpm start:dashboard
pnpm start:worker
pnpm start:ws
```

## Providers

### Email
Sendgrid, Mailgun, SES, Postmark, SMTP, Mailjet, Mandrill, Brevo, MailerSend, Resend, SparkPost, Outlook 365

### SMS
Twilio, Plivo, SNS, Vonage, Telnyx, Termii, Gupshup, Clickatell, Infobip

### Push
FCM, Expo, APNS, OneSignal, Pushpad

### Chat
Slack, Discord, MS Teams, Mattermost

### In-App
Novu Inbox component (React)

## License

Based on Novu, licensed under MIT License.
