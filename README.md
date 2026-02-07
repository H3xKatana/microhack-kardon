# Kardon - Microhack Project

**Enterprise-grade, self-hosted project management with state-of-the-art AI integration**

Built for the Microhack hackathon - because your data deserves better than the cloud.

## 🛡️ Security-First Design

Kardon is built with security as the foundation, not an afterthought:

### Authentication & Access Control

- **Multi-Factor Authentication Ready** - Password policies with Django's built-in validators
- **Session Security** - HTTPOnly, Secure, and SameSite cookies
- **CSRF Protection** - Built-in Django CSRF middleware
- **OAuth Integration** - Google, GitHub, GitLab, Gitea sign-in
- **Magic Link Authentication** - Passwordless login option
- **Role-Based Access Control** - Workspace-level permissions

### Zero Trust Architecture Support

#### Cloudflare Access Integration

Deploy Kardon behind Cloudflare Access for enterprise-grade Zero Trust security:

```bash
# Enable Cloudflare Access authentication
PROXY_AUTH_ENABLED=1
PROXY_AUTH_MODE=cloudflare
CF_ACCESS_TEAM_DOMAIN=your-team.cloudflareaccess.com
CF_ACCESS_AUDIENCE_TAG=your-audience-tag
```

**Features:**

- JWT validation from Cloudflare Access
- Automatic user provisioning
- Identity provider agnostic (works with Okta, Azure AD, Google Workspace, etc.)
- Per-application access policies
- Device posture checks

#### Authelia (Self-Hosted Zero Trust)

Run your own Zero Trust proxy with Authelia:

```bash
# Enable Authelia header authentication
PROXY_AUTH_ENABLED=1
PROXY_AUTH_MODE=authelia
PROXY_AUTH_USER_HEADER=Remote-User
PROXY_AUTH_EMAIL_HEADER=Remote-Email
PROXY_AUTH_NAME_HEADER=Remote-Name
PROXY_AUTH_AUTO_CREATE=1
```

**Features:**

- Two-factor authentication (TOTP, WebAuthn)
- Single Sign-On (SSO) for all apps
- Access control rules
- Session management
- Self-hosted = full control

#### Generic Proxy Authentication

Works with any forward-auth proxy:

```bash
PROXY_AUTH_ENABLED=1
PROXY_AUTH_MODE=generic
PROXY_AUTH_USER_HEADER=X-Forwarded-User
PROXY_AUTH_EMAIL_HEADER=X-Forwarded-Email
```

**Compatible With:**

- Traefik ForwardAuth
- NGINX auth_request
- Caddy forwardauth
- OAuth2 Proxy
- Vouch Proxy
- Any RFC-compliant proxy

### Data Protection

- **Encrypted Storage** - PBKDF2 password hashing with SHA-256
- **TLS/SSL Support** - Redis SSL, Email TLS/SSL options
- **Secure File Storage** - MinIO with access controls
- **Request Logging** - Complete audit trail via middleware
- **Rate Limiting** - 30 req/min for anonymous, configurable for API

### Self-Hosted = You Own Your Data

- **No Vendor Lock-in** - Run entirely on your infrastructure
- **Full Database Control** - PostgreSQL with read replica support
- **Local File Storage** - MinIO or your own S3-compatible storage
- **Network Isolation** - Docker Compose setup, no external dependencies required

## 🤖 AI Integration - Cost-Effective & Powerful

### Supported LLM Providers

Currently integrated with major providers via OpenAI-compatible API:

**Western Providers:**

- **OpenAI** - GPT-4, GPT-4o, GPT-4o-mini, GPT-3.5-turbo, o1-series
- **Anthropic** - Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku
- **Google** - Gemini Pro, Gemini 1.5 Pro

**Cost-Effective Chinese Models** (via API-compatible endpoints):

- **Kimi 2.5** (Moonshot AI) - High-performance, cost-effective
- **MiniMax 2.1** - Strong reasoning capabilities
- **GLM 4.7** (Zhipu AI) - Open-source friendly

_Note: Chinese models can be integrated via their OpenAI-compatible API endpoints. Configuration examples available in docs._

### Why These Models?

| Model           | Context     | Cost vs GPT-4 | Best For                   |
| --------------- | ----------- | ------------- | -------------------------- |
| **Kimi 2.5**    | 256K tokens | ~70% cheaper  | Long documents, analysis   |
| **MiniMax 2.1** | 200K tokens | ~65% cheaper  | Reasoning, coding          |
| **GLM 4.7**     | 128K tokens | ~60% cheaper  | General tasks, open-source |

### AI Features

- **Galileo AI Assistant** - Built into rich text editor
- **Workspace Orchestration** - Natural language project management
- **Smart Suggestions** - Issue creation, project setup via AI
- **Document Generation** - Meeting notes, specifications

## 📋 Compliance Ready

Kardon is designed with compliance frameworks in mind:

### ✅ GDPR (General Data Protection Regulation)

- **Data Minimization** - Only collect necessary user data
- **Right to Access** - Users can export their data
- **Right to Erasure** - Account deletion supported
- **Secure by Design** - Encryption, secure cookies, session management
- **Audit Trail** - Complete request logging

### ✅ Law 18-07 (Algeria - Personal Data Protection)

- **Consent Management** - Explicit user consent for data processing
- **Data Localization** - Self-hosted = data stays in your jurisdiction
- **Security Measures** - Technical and organizational security controls
- **Breach Notification** - Logging infrastructure ready

### ✅ SOC 2 Type II Foundations

- **Security** - Authentication, authorization, encryption
- **Availability** - Health checks, monitoring middleware
- **Processing Integrity** - Request validation, error handling
- **Confidentiality** - Data encryption in transit and at rest
- **Privacy** - User data controls, access restrictions

_Note: While Kardon implements the technical controls required for these frameworks, formal certification requires additional audit processes._

## 🚀 Quick Start

```bash
# Clone and setup
git clone https://github.com/H3xKatana/microhack-kardon.git
cd microhack-kardon

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
cp apps/api/.env.example apps/api/.env

# Start infrastructure (PostgreSQL, Redis, RabbitMQ, MinIO)
docker compose -f docker-compose-local.yml up -d

# Run database migrations
cd apps/api && python manage.py migrate && cd ../..

# Start development
pnpm dev
```

## 🏗️ Architecture

### With Zero Trust Proxy

```
┌──────────────────────────────────────────────────────────────┐
│                    Zero Trust Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Cloudflare │  │   Authelia   │  │   Traefik    │       │
│  │   Access     │  │   (Self)     │  │   ForwardAuth│       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
└─────────┼─────────────────┼─────────────────┼────────────────┘
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────┐
│                     Kardon Platform                          │
├───────────────────────────┼──────────────────────────────────┤
│  Web (3000)  │  Space (3002)  │ Admin (3001) │ Live (3100)  │
└───────────────────────────┴──────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────┐
│  PostgreSQL  │  Redis (Valkey)  │  MinIO  │  RabbitMQ       │
└───────────────────────────┴──────────────────────────────────┘
```

## 🔐 Security Configuration

### Zero Trust Setup Examples

#### Cloudflare Access + Kardon

```yaml
# docker-compose.yml
services:
  kardon-api:
    environment:
      - PROXY_AUTH_ENABLED=1
      - PROXY_AUTH_MODE=cloudflare
      - CF_ACCESS_TEAM_DOMAIN=yourteam.cloudflareaccess.com
      - CF_ACCESS_AUDIENCE_TAG=xxxxxxxxxxxxxxxx
```

#### Authelia + Kardon

```yaml
# authelia/configuration.yml
access_control:
  rules:
    - domain: kardon.yourdomain.com
      policy: two_factor
      subject:
        - group:developers

# docker-compose.yml
services:
  kardon-api:
    environment:
      - PROXY_AUTH_ENABLED=1
      - PROXY_AUTH_MODE=authelia
      - PROXY_AUTH_AUTO_CREATE=1
```

#### Traefik + ForwardAuth

```yaml
# docker-compose.yml
services:
  traefik:
    labels:
      - "traefik.http.routers.kardon.middlewares=forwardauth"
      - "traefik.http.middlewares.forwardauth.forwardauth.address=http://authelia:9091/api/verify?rd=https://auth.yourdomain.com/"

  kardon-api:
    environment:
      - PROXY_AUTH_ENABLED=1
      - PROXY_AUTH_MODE=generic
      - PROXY_AUTH_USER_HEADER=X-Forwarded-User
```

### AI Configuration

```bash
# apps/api/.env

# OpenAI
LLM_API_KEY=sk-...
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini

# Anthropic
LLM_API_KEY=sk-ant-...
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-sonnet-20240229

# Gemini
LLM_API_KEY=...
LLM_PROVIDER=gemini
LLM_MODEL=gemini-pro

# Kimi (via OpenAI-compatible API)
LLM_PROVIDER=openai
LLM_API_KEY=kimi-api-key
LLM_MODEL=kimi-k2.5
OPENAI_API_BASE=https://api.moonshot.cn/v1

# MiniMax
LLM_PROVIDER=openai
LLM_API_KEY=minimax-api-key
LLM_MODEL=minimax-m2.1
OPENAI_API_BASE=https://api.minimax.chat/v1

# GLM
LLM_PROVIDER=openai
LLM_API_KEY=glm-api-key
LLM_MODEL=glm-4.7
OPENAI_API_BASE=https://open.bigmodel.cn/api/paas/v4
```

### Authentication Options

```bash
# OAuth Providers
ENABLE_GOOGLE_OAUTH=1
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

ENABLE_GITHUB_OAUTH=1
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Magic Link
ENABLE_MAGIC_LINK_LOGIN=1

# Zero Trust
PROXY_AUTH_ENABLED=1
PROXY_AUTH_MODE=authelia|cloudflare|generic
```

## 📊 Feature Comparison

| Feature             | Kardon + Zero Trust    | SaaS Competitors   |
| ------------------- | ---------------------- | ------------------ |
| **Data Ownership**  | ✅ Full control        | ❌ Vendor cloud    |
| **AI Cost**         | ✅ Pay per use         | ❌ Expensive plans |
| **Chinese Models**  | ✅ Kimi, MiniMax, GLM  | ❌ Limited support |
| **Zero Trust**      | ✅ Cloudflare/Authelia | ⚠️ Enterprise only |
| **Self-Hosted SSO** | ✅ Authelia, Keycloak  | ❌ Cloud only      |
| **GDPR Compliance** | ✅ Ready               | ⚠️ Depends         |
| **SOC 2**           | ✅ Foundations         | ⚠️ Varies          |
| **Custom Domain**   | ✅ Free                | ❌ Enterprise only |
| **Audit Logs**      | ✅ Full control        | ❌ Limited access  |

## 🛠️ Development

```bash
# Available commands
pnpm dev          # Start all apps
pnpm build        # Production build
pnpm check        # Lint + type check
pnpm fix          # Fix formatting

# Individual apps
cd apps/web && pnpm dev      # Port 3000
cd apps/api && python manage.py runserver  # Port 8000
cd apps/live && pnpm dev     # Port 3100
```

## 📚 Documentation

- [Docker Setup](docs/deployment/docker-compose/README.md)
- [Architecture](docs/architecture/README.md)
- [AI Configuration](docs/ai/README.md)
- [Zero Trust Setup](docs/security/zero-trust.md)

## 🎯 Perfect For

- **Privacy-conscious teams** - Keep data in-house
- **Security-focused orgs** - Zero Trust architecture
- **Cost-sensitive organizations** - Avoid SaaS markups
- **Regulated industries** - GDPR, Law 18-07 compliance
- **AI-heavy workflows** - Use best models for the job
- **Developers** - Open source, customizable

## 🏆 Microhack Submission

**Zero Trust + AI + Self-Hosted = The Future of Project Management**

Built in 48 hours with:

- Enterprise-grade security
- Cost-effective AI integration
- Full compliance readiness
- Zero Trust architecture support

## 📄 License

MIT License - Built for Microhack hackathon

**Your data. Your infrastructure. Your AI. Your security.**
