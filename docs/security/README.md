# Security Documentation

Comprehensive security architecture and compliance guide for the Kardon platform.

---

## Table of Contents

1. [Security Architecture](#security-architecture)
2. [Authentication](#authentication)
3. [Authorization](#authorization)
4. [Data Protection](#data-protection)
5. [GDPR Compliance](#gdpr-compliance)
6. [SOC 2 Compliance](#soc-2-compliance)
7. [Implementation Status](#implementation-status)
8. [Security Hardening](#security-hardening)

---

## Security Architecture

### Defense-in-Depth Model

```mermaid
graph TB
    subgraph "External Perimeter"
        FW[🛡️ Firewall<br/>Network Level]
        WAF[🌐 WAF<br/>Application Level<br/>OWASP ModSecurity]
        RATE[⚡ Rate Limiting<br/>DDoS Protection]
    end

    subgraph "Transport Layer"
        TLS[🔒 TLS 1.3<br/>Certificate Validation]
        HSTS[�.strict-transport<br/>Header Enforcement]
    end

    subgraph "Application Layer"
        AUTH[🔐 Authentication<br/>Multi-Factor]
        RBAC[👥 Role-Based Access<br/>Permission Checks]
        VAL[✅ Input Validation<br/>SQL Injection Protection]
        SAN[🧹 Output Sanitization<br/>XSS Prevention]
    end

    subgraph "Data Layer"
        ENC[🔒 Encryption at Rest<br/>AES-256]
        PII[🎭 PII Masking<br/>Data Classification]
        AUDIT[📜 Audit Logging<br/>Immutable Records]
    end

    subgraph "Infrastructure"
        SECRETS[🔑 Secret Management<br/>Vault/Env]
        NETPOL[🌐 Network Policies<br/>Service Isolation]
        BACKUP[💾 Encrypted Backups<br/>Offsite Storage]
    end

    FW --> WAF --> RATE --> TLS --> HSTS --> AUTH --> RBAC --> VAL --> SAN --> ENC --> PII --> AUDIT --> SECRETS --> NETPOL --> BACKUP
```

### Security Layers

| Layer              | Protection    | Implementation        |
| ------------------ | ------------- | --------------------- |
| **Network**        | Firewall, WAF | iptables, ModSecurity |
| **Transport**      | TLS 1.3       | Caddy, Let's Encrypt  |
| **Application**    | Auth, RBAC    | Django, Session/JWT   |
| **Data**           | Encryption    | PostgreSQL, MinIO     |
| **Infrastructure** | Secrets       | Docker, Kubernetes    |

---

## Authentication

### Supported Authentication Methods

```mermaid
graph LR
    subgraph "Authentication Methods"
        SESSION[🔑 Session-Based<br/>Django Sessions]
        OAUTH[🌐 OAuth 2.0<br/>Google, GitHub, GitLab]
        MAGIC[✨ Magic Link<br/>Email Authentication]
        SAML[🏢 SAML SSO<br/>Enterprise]
        LDAP[📧 LDAP/AD<br/>Corporate Directory]
        API[🔌 API Tokens<br/>Machine-to-Machine]
    end

    subgraph "MFA Options"
        TOTP[📱 TOTP<br/>Authenticator Apps]
        EMAIL[📧 Email OTP<br/>One-Time Codes]
        SMS[📲 SMS OTP<br/>Mobile Codes]
    end

    SESSION & OAUTH & MAGIC & SAML & LDAP & API --> MFA[TOTP<br/>Email<br/>SMS]
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as Auth Service
    participant S as Session Store
    participant D as Database
    participant M as MFA Service

    Note over U,A: Login Process
    U->>F: Enter Credentials
    F->>A: POST /auth/login/
    A->>D: Verify Credentials
    D-->>A: User Valid

    alt MFA Required
        A-->>F: MFA Required
        F->>U: Request MFA Code
        U->>F: Enter Code
        F->>M: Verify MFA
        M-->>F: Valid
    end

    A->>S: Create Session
    S-->>A: Session Token
    A->>A: Generate CSRF Token
    A-->>F: Set Cookies

    Note over U,F: Subsequent Requests
    U->>F: API Request
    F->>A: Request + Session + CSRF
    A->>S: Validate Session
    S-->>A: Valid
    A-->>F: Allow
```

### Session Security

```mermaid
flowchart TD
    A[Session Created] --> B[Set HTTPOnly Cookie]
    B --> C[Set Secure Flag]
    C --> D[Set SameSite=Strict]
    D --> E[Generate Session Token]
    E --> F[Store in Redis]
    F --> G[Set TTL 24h]

    G --> H[Session Validated]
    H --> I{Cookie Present?}
    I -->|No| J[401 Unauthorized]
    I -->|Yes| K[Validate Token]
    K --> L{Valid?}
    L -->|No| M[401 Unauthorized]
    L -->|Yes| N[Check CSRF]

    N --> O{CSRF Valid?}
    O -->|No| P[403 Forbidden]
    O -->|Yes| Q[Process Request]

    Q --> R[Session Activity]
    R --> S[Update Last Activity]
    S --> T[Refresh TTL]
```

---

## Authorization

### Role-Based Access Control (RBAC)

```mermaid
graph TB
    subgraph "Workspace Roles"
        OWNER[👑 Owner<br/>Full Control]
        ADMIN[⚙️ Admin<br/>Manage Settings]
        MEMBER[👥 Member<br/>Standard Access]
        VIEWER[👁️ Viewer<br/>Read-Only]
    end

    subgraph "Workspace Permissions"
        P1[✓ Create Issues]
        P2[✓ Manage Issues]
        P3[✓ Manage Members]
        P4[✓ Settings]
        P5[✓ Delete Workspace]
        P6[✓ Invite Users]
    end

    OWNER --> P1 & P2 & P3 & P4 & P5 & P6
    ADMIN --> P1 & P2 & P3 & P4 & P6
    MEMBER --> P1 & P2
    VIEWER --> P1 & P2
```

### Permission Matrix

| Permission             | Owner | Admin | Member | Viewer |
| ---------------------- | ----- | ----- | ------ | ------ |
| **View Workspace**     | ✓     | ✓     | ✓      | ✓      |
| **Create Issues**      | ✓     | ✓     | ✓      | ✓      |
| **Edit Issues**        | ✓     | ✓     | ✓      | ✗      |
| **Delete Issues**      | ✓     | ✓     | ✗      | ✗      |
| **Manage Members**     | ✓     | ✓     | ✗      | ✗      |
| **Invite Users**       | ✓     | ✓     | ✗      | ✗      |
| **Workspace Settings** | ✓     | ✓     | ✗      | ✗      |
| **Delete Workspace**   | ✓     | ✗     | ✗      | ✗      |

---

## Data Protection

### Encryption Standards

```mermaid
graph TB
    subgraph "Data in Transit"
        HTTPS[TLS 1.3<br/>All HTTPS Traffic]
        WSS[WebSocket Secure<br/>Real-Time Comm]
        SSH[SSH v2<br/>Server Access]
    end

    subgraph "Data at Rest"
        DB_ENC[🔒 PostgreSQL<br/>pgcrypto AES-256]
        FILE_ENC[🔒 MinIO<br/>SSE-S3 AES-256]
        BACKUP_ENC[🔒 GPG Encrypted<br/>Backups]
        CACHE_ENC[🔒 Redis Encrypted<br/>Sensitive Data]
    end

    subgraph "Key Management"
        KM[🔑 Master Key<br/>HSM/Dedicated]
        KEY_ROT[🔄 Key Rotation<br/>90 Days]
    end

    HTTPS & WSS & SSH --> DB_ENC & FILE_ENC & BACKUP_ENC & CACHE_ENC
    DB_ENC & FILE_ENC & BACKUP_ENC & CACHE_ENC --> KM
    KM --> KEY_ROT
```

### Encryption Details

| Data State    | Method            | Algorithm      | Key Size |
| ------------- | ----------------- | -------------- | -------- |
| **HTTPS/TLS** | TLS 1.3           | AES-256-GCM    | 256-bit  |
| **Database**  | pgcrypto          | AES-256        | 256-bit  |
| **Files**     | MinIO SSE         | AES-256-SSE-S3 | 256-bit  |
| **Backups**   | GPG               | AES-256        | 256-bit  |
| **Secrets**   | Django SECRET_KEY | PBKDF2         | 256-bit  |

---

## GDPR Compliance

### GDPR Architecture

```mermaid
graph TB
    subgraph "GDPR Requirements"
        CONSENT[📋 Consent Management]
        PORT[📤 Data Portability]
        ERASE[🗑️ Right to Erasure]
        RECT[✅ Right to Rectification]
        ACC[👁️ Right to Access]
        MIN[📦 Data Minimization]
        RET[⏱️ Retention Policies]
        AUDIT[📜 Audit Trail]
    end

    subgraph "Kardon Implementation"
        C1[Consent Banner<br/>Granular Options]
        C2[Export API<br/>JSON Format]
        C3[Delete User API<br/>Anonymization]
        C4[Profile Edit<br/>Self-Service]
        C5[Data Dashboard<br/>View All Data]
        C6[Schema Design<br/>Minimal Fields]
        C7[Cron Jobs<br/>Auto-Delete]
        C8[All Actions Logged<br/>Immutable]
    end

    CONSENT --> C1
    PORT --> C2
    ERASE --> C3
    RECT --> C4
    ACC --> C5
    MIN --> C6
    RET --> C7
    AUDIT --> C8
```

### GDPR Implementation Status

| GDPR Requirement                      | Status     | Implementation | Notes                      |
| ------------------------------------- | ---------- | -------------- | -------------------------- |
| **Lawful Basis**                      | ✅ Done    | Consent model  | Explicit consent required  |
| **Data Minimization**                 | ✅ Done    | Schema design  | Only collect needed data   |
| **Purpose Limitation**                | ✅ Done    | API design     | Clear data usage           |
| **Accuracy**                          | ⚠️ Partial | Self-service   | Manual verification needed |
| **Storage Limitation**                | ⚠️ Partial | Retention API  | Automated cleanup pending  |
| **Integrity & Confidentiality**       | ✅ Done    | Encryption     | AES-256 + TLS 1.3          |
| **Accountability**                    | ⚠️ Partial | Audit logs     | Full audit trail pending   |
| **Right to Access**                   | ✅ Done    | Export API     | Download all user data     |
| **Right to Rectification**            | ✅ Done    | Profile edit   | Self-service               |
| **Right to Erasure**                  | ✅ Done    | Delete API     | Anonymization              |
| **Right to Portability**              | ✅ Done    | Export API     | JSON format                |
| **Right to Object**                   | ❌ Pending | UI needed      | Add opt-out UI             |
| **Automated Decision-Making**         | ✅ N/A     | No profiling   | Not applicable             |
| **Data Protection Impact Assessment** | ❌ Pending | Documentation  | Required for enterprise    |
| **Data Protection Officer**           | ❌ Pending | Designation    | Required for enterprise    |
| **Breach Notification**               | ❌ Pending | Process needed | 72-hour requirement        |

### GDPR Compliance Guide

#### 1. Consent Management

```bash
# Configure consent settings
GDPR_MODE=true
CONSENT_REQUIRED=true
CONSENT_TYPES=essential,analytics,marketing

# User consent options
# - Essential: Required for service (always on)
# - Analytics: Usage tracking (optional)
# - Marketing: Promotional emails (optional)
```

#### 2. Data Export (Right to Access)

```bash
# User exports all their data
curl -X GET http://localhost:8000/api/v1/users/me/export \
  -H "Authorization: Bearer <token>"

# Response includes:
# - Profile data (JSON)
# - Activity history (JSON)
# - Created content (JSON)
# - Settings (JSON)
```

#### 3. Data Deletion (Right to Erasure)

```bash
# User requests deletion
curl -X DELETE http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer <token>"

# Deletion process:
# 1. Verify password/authentication
# 2. Export data for legal retention (90 days)
# 3. Anonymize user records
# 4. Delete from active databases
# 5. Queue background cleanup
```

#### 4. Data Retention Policies

```python
# Retention configuration
RETENTION_CONFIG = {
    "active_users": None,  # No limit
    "deleted_users": 2555,  # 7 years (legal)
    "session_logs": 90,     # 90 days
    "audit_logs": 2555,     # 7 years (compliance)
    "temporary_files": 7,   # 7 days
    "backups": 90,          # 90 days (rotation)
}
```

---

## SOC 2 Compliance

### SOC 2 Trust Services Criteria

```mermaid
graph TB
    subgraph "SOC 2 Trust Services Criteria"
        subgraph "Security"
            S1[🔐 Access Controls]
            S2[🛡️ System Monitoring]
            S3[🔒 Encryption]
            S4[🔑 Change Management]
        end

        subgraph "Availability"
            A1[⏱️ Uptime Monitoring]
            A2[💾 Backup & Recovery]
            A3[🔄 Failover]
            A4[📊 Performance Monitoring]
        end

        subgraph "Confidentiality"
            C1[📜 NDA Controls]
            C2[🔐 Encryption at Rest]
            C3[👥 Access Restrictions]
            C4[📋 Data Classification]
        end

        subgraph "Processing Integrity"
            P1[✅ Data Validation]
            P2[🧪 Quality Assurance]
            P3[📊 Error Monitoring]
            P4[🔄 Transaction Integrity]
        end

        subgraph "Privacy"
            P5[👤 Data Classification]
            P6[📋 Policy Enforcement]
            P7[🎯 Consent Management]
            P8[👁️ Access Controls]
        end
    end
```

### SOC 2 Implementation Status

| SOC 2 Control                     | Status     | Implementation             | Notes                    |
| --------------------------------- | ---------- | -------------------------- | ------------------------ |
| **CC1.1 - COSO Principle 1**      | ✅ Done    | Security policy documented | Annual review needed     |
| **CC1.2 - COSO Principle 2**      | ✅ Done    | Risk assessment            | Quarterly updates        |
| **CC2.1 - Communication**         | ✅ Done    | Security policies          | Available to users       |
| **CC3.1 - Risk Assessment**       | ✅ Done    | Annual assessment          | Documentation pending    |
| **CC3.2 - Threat Identification** | ✅ Done    | CVE monitoring             | Automated alerts         |
| **CC4.1 - Monitoring**            | ⚠️ Partial | Basic monitoring           | Enhanced SIEM needed     |
| **CC5.1 - Security Policies**     | ✅ Done    | Documented policies        | Annual review            |
| **CC5.2 - Access Management**     | ✅ Done    | RBAC implemented           | Quarterly review         |
| **CC5.3 - System Changes**        | ❌ Pending | Change management          | Process needed           |
| **CC6.1 - Logical Access**        | ✅ Done    | MFA available              | Enforced for admin       |
| **CC6.2 - User Authentication**   | ✅ Done    | Multiple methods           | Session + MFA            |
| **CC6.3 - Access Management**     | ✅ Done    | Provisioning process       | Manual process           |
| **CC7.1 - System Monitoring**     | ⚠️ Partial | Basic logging              | SIEM integration pending |
| **CC7.2 - Anomaly Detection**     | ❌ Pending | Not implemented            | Machine learning needed  |
| **CC8.1 - Change Management**     | ❌ Pending | Not implemented            | ITIL process needed      |
| **A1.1 - Availability Design**    | ✅ Done    | 99.9% SLA                  | Documentation            |
| **A1.2 - Backup & Recovery**      | ✅ Done    | Daily backups              | Tested quarterly         |
| **A1.3 - Incident Response**      | ⚠️ Partial | Basic response             | Playbooks needed         |
| **C1.1 - Confidentiality**        | ✅ Done    | Encryption                 | Data classified          |
| **C1.2 - Data Handling**          | ⚠️ Partial | Policies                   | Training needed          |
| **PI1.1 - Processing Integrity**  | ✅ Done    | Validation                 | Error handling           |
| **PI1.2 - Error Handling**        | ✅ Done    | Logging                    | Alerting pending         |
| **P1.1 - Privacy Notice**         | ✅ Done    | Privacy policy             | Available                |
| **P1.2 - Consent**                | ⚠️ Partial | GDPR mode                  | Enhanced consent UI      |

### SOC 2 Compliance Checklist

#### Security Controls

```mermaid
flowchart TD
    A[Security Controls] --> B[Access Management]
    B --> B1[✓ User provisioning]
    B --> B2[✓ Password policies]
    B --> B3[✓ MFA available]
    B --> B4[✓ Session management]

    A --> C[Change Management]
    C --> C1[✗ Code review process]
    C --> C2[✗ Deployment automation]
    C --> C3[✗ Change logging]

    A --> D[Risk Management]
    D --> D1[✓ Risk assessment]
    D --> D2[✓ Vulnerability scanning]
    D --> D3[✓ Penetration testing]
```

#### Availability Controls

```mermaid
flowchart TD
    A[Availability] --> B[Uptime Monitoring]
    B --> B1[✓ Health checks]
    B --> B2[✗ Uptime SLA tracking]
    B --> B3[✓ Alerting]

    A --> C[Backup & Recovery]
    C --> C1[✓ Daily backups]
    C --> C2[✓ Offsite storage]
    C --> C3[✓ Quarterly tests]

    A --> D[Disaster Recovery]
    D --> D1[✓ DR plan]
    D --> D2[✓ RTO documented]
    D --> D3[✗ Automated failover]
```

---

## Implementation Status

### Current Implementation Summary

| Category                    | Implemented | Partial | Pending |
| --------------------------- | ----------- | ------- | ------- |
| **Authentication**          | 85%         | 10%     | 5%      |
| **Authorization (RBAC)**    | 90%         | 5%      | 5%      |
| **Encryption**              | 95%         | 0%      | 5%      |
| **Audit Logging**           | 70%         | 20%     | 10%     |
| **GDPR Compliance**         | 60%         | 25%     | 15%     |
| **SOC 2 Compliance**        | 50%         | 25%     | 25%     |
| **Infrastructure Security** | 80%         | 10%     | 10%     |

### Roadmap for Full Compliance

```mermaid
gantt
    title Security Compliance Roadmap
    dateFormat  YYYY-MM-DD
    section GDPR
    Enhanced Consent UI     :gdpr1, 2026-03-01, 30d
    DPIA Documentation      :gdpr2, 2026-04-01, 45d
    DPO Designation         :gdpr3, 2026-05-01, 30d
    Breach Response Plan    :gdpr4, 2026-06-01, 30d

    section SOC 2
    SIEM Integration        :soc1, 2026-03-15, 60d
    Change Management       :soc2, 2026-04-01, 45d
    Automated Testing       :soc3, 2026-05-01, 30d
    Anomaly Detection       :soc4, 2026-06-01, 60d
```

---

## Security Hardening

### Production Checklist

```bash
# =============================================================================
# SECURITY HARDENING CHECKLIST
# =============================================================================

# 1. Change All Default Passwords
#    - PostgreSQL: POSTGRES_PASSWORD
#    - Redis: REDIS_PASSWORD
#    - RabbitMQ: RABBITMQ_PASSWORD
#    - MinIO: MINIO_ROOT_PASSWORD

# 2. Enable TLS/SSL
#    - Configure certificates in Caddy
#    - Force HTTPS redirect
#    - Enable HSTS

# 3. Configure Rate Limiting
#    - Anonymous: 30 requests/minute
#    - Authenticated: 100 requests/minute
#    - API: 1000 requests/minute

# 4. Enable Audit Logging
#    - All API calls logged
#    - Login attempts logged
#    - Data changes logged

# 5. Configure Backup Encryption
#    - GPG encrypt backups
#    - Store offsite
#    - Test quarterly

# 6. Enable MFA
#    - Admin accounts require MFA
#    - Optional for regular users

# 7. Network Security
#    - Firewall rules configured
#    - Only necessary ports exposed
#    - Internal services not exposed

# 8. Regular Updates
#    - Security patches applied
#    - Dependency updates
#    - Certificate renewal
```

### Environment Security Variables

```bash
# =============================================================================
# SECURITY SETTINGS (apps/api/.env)
# =============================================================================

# Session Security
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SAMESITE=Strict
SESSION_COOKIE_AGE=86400  # 24 hours

# Password Policy
AUTH_PASSWORD_MIN_LENGTH=12
AUTH_PASSWORD_REQUIRE_UPPERCASE=true
AUTH_PASSWORD_REQUIRE_LOWERCASE=true
AUTH_PASSWORD_REQUIRE_NUMBERS=true
AUTH_PASSWORD_REQUIRE_SPECIAL=true
AUTH_MAX_LOGIN_ATTEMPTS=5
AUTH_LOCKOUT_DURATION=900  # 15 minutes

# MFA Settings
MFA_ENABLED=true
MFA_REQUIRED_FOR_ADMIN=true
MFA_ISSUER_NAME=Kardon

# Audit Logging
AUDIT_LOG_ENABLED=true
AUDIT_LOG_RETENTION_DAYS=2555  # 7 years
AUDIT_LOG_IP_ADDRESS=true
AUDIT_LOG_USER_AGENT=true
```

---

## Additional Resources

- [Architecture Overview](../architecture/README.md)
- [Docker Deployment](../deployment/docker-compose/README.md)
- [AI Integration](../ai/README.md)

---

## Version History

| Version | Date     | Changes                        |
| ------- | -------- | ------------------------------ |
| 1.0     | Feb 2026 | Initial security documentation |
