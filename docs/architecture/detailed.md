# Detailed Architecture

In-depth component breakdown and data flow diagrams for the Kardon platform.

---

## Table of Contents

1. [API Architecture](#api-architecture)
2. [Real-Time Architecture](#real-time-architecture)
3. [Data Models](#data-models)
4. [Authentication Flow](#authentication-flow)
5. [Task Queue System](#task-queue-system)
6. [File Storage Architecture](#file-storage-architecture)
7. [AI Integration Architecture](#ai-integration-architecture)

---

## API Architecture

### REST API Structure

```mermaid
graph TB
    subgraph "Django REST Framework"
        subgraph "API Endpoints"
            AUTH[🔐 Authentication<br/>Login, Register, OAuth]
            WORK[👥 Workspaces<br/>Workspace CRUD]
            ISS[📋 Issues<br/>Issues, Comments, Labels]
            PRJ[📁 Projects<br/>Projects, Members]
            MOD[📦 Modules<br/>Modules, Sprints]
            PGS[📄 Pages<br/>Pages, Rich Text]
            FIL[📎 Files<br/>Attachments, Assets]
            NOT[🔔 Notifications<br/>In-App, Email]
            WEB[🪝 Webhooks<br/>Outgoing Webhooks]
            AI[🧠 AI Assistant<br/>Chat, Suggestions]
        end

        subgraph "Middleware"
            THROTTLE[⚡ Rate Limiting<br/>30 req/min anon<br/>100 req/min auth]
            CORS[🌐 CORS<br/>Cross-Origin]
            CSRF[🛡️ CSRF<br/>Cross-Site Request]
            AUTHM[🔑 Authentication<br/>Session/JWT]
            VAL[✅ Validation<br/>DRF Serializers]
        end

        subgraph "Database Layer"
            MODELS[(Django ORM<br/>Models)]
            MIGRATIONS[(Migrations)]
        end
    end

    AUTH & WORK & ISS & PRJ & MOD & PGS & FIL & NOT & WEB & AI --> THROTTLE
    THROTTLE --> CORS & CSRF & AUTHM & VAL
    VAL --> MODELS
```

### API Endpoints Reference

```mermaid
graph LR
    subgraph "API v1 Structure"
        API[/api/v1/]

        subgraph "Users"
            USR[/users/]
            ME[/users/me/]
        end

        subgraph "Workspaces"
            WS[/workspaces/]
            WSMEM[/workspaces/{slug}/members/]
            WSSET[/workspaces/{slug}/settings/]
        end

        subgraph "Projects"
            PRJ[/workspaces/{slug}/projects/]
            PRJMEM[/workspaces/{slug}/projects/{id}/members/]
        end

        subgraph "Issues"
            ISS[/workspaces/{slug}/issues/]
            ISSCOM[/workspaces/{slug}/issues/{id}/comments/]
            ISSLAB[/workspaces/{slug}/labels/]
            ISSSTA[/workspaces/{slug}/states/]
        end

        subgraph "Modules & Cycles"
            MOD[/workspaces/{slug}/modules/]
            CYC[/workspaces/{slug}/cycles/]
        end

        subgraph "Pages"
            PGS[/workspaces/{slug}/pages/]
            PGSCOL[/workspaces/{slug}/pages/{id}/collaborators/]
        end

        subgraph "Files"
            FIL[/workspaces/{slug}/assets/]
            FILUP[/workspaces/{slug}/assets/upload/]
        end

        subgraph "AI"
            AI[/workspaces/{slug}/ai-assistant/]
            AIREP[/workspaces/{slug}/rephrase-grammar/]
        end
    end

    API --> USR & ME & WS & PRJ & ISS & MOD & CYC & PGS & FIL & AI
```

### API Request/Response Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant P as Proxy
    participant A as API
    participant R as Redis
    participant D as Database
    participant W as Worker

    C->>P: GET /api/v1/workspaces/{slug}/issues
    P->>P: Rate Limiting Check
    P->>P: CORS Validation

    P->>A: Forward Request
    A->>R: Check Cache (Cache-Key: issues:{slug}:list)

    alt Cache Hit
        R-->>A: Cached Response
        A-->>C: 200 OK (X-Cache: HIT)
    else Cache Miss
        A->>A: Validate Request Parameters
        A->>D: SELECT * FROM issues WHERE workspace_id = ?
        D-->>A: Issue Data
        A->>A: Serialize Response
        A->>R: Set Cache (TTL: 60s)
        A-->>C: 200 OK (X-Cache: MISS)
    end

    Note over C,A: Background Tasks
    alt Expensive Operation
        A->>W: Queue Task (Celery)
        W-->>A: Task ID
        A-->>C: 202 Accepted + Task ID
    end
```

---

## Real-Time Architecture

### WebSocket Collaboration

```mermaid
graph TB
    subgraph "Real-Time Stack"
        subgraph "Client Side"
            WS[🔌 WebSocket Client<br/>Yjs Provider]
            COLLAB[📝 Collaborative Editor<br/>TipTap + Yjs]
            PRESENCE[👥 User Presence<br/>Cursors, Avatars]
            EVENTS[📡 Event Listeners<br/>State Updates]
        end

        subgraph "Server Side"
            HOCUS[Hocuspocus Server<br/>WebSocket Handler]
            YJS[Y.js CRDT<br/>Conflict Resolution]
            SYNC[📊 Document Sync<br/>State Vector Sync]
            AUTH[🔐 Connection Auth<br/>Token Validation]
        end

        subgraph "Storage"
            RC[(Redis<br/>Document Storage)]
            DB[(PostgreSQL<br/>Persistence)]
        end
    end

    WS --> HOCUS
    HOCUS --> YJS
    YJS --> SYNC
    HOCUS --> AUTH
    HOCUS --> RC & DB
    WS --> COLLAB & PRESENCE & EVENTS
```

### Document Sync Process

```mermaid
sequenceDiagram
    participant E1 as Editor 1
    participant H as Hocuspocus
    participant Y as Y.js CRDT
    participant E2 as Editor 2
    participant R as Redis

    Note over E1,H: Connection Phase
    E1->>H: WebSocket Connect (Auth Token)
    H->>H: Validate Token
    H->>R: Load Document State
    R-->>H: Current State
    H->>E1: Sync Complete

    Note over E1,H: Edit Phase
    E1->>H: User types "Hello"
    H->>Y: Apply Update (Y.js)
    Y->>Y: Merge with Existing State
    H->>R: Persist State
    H->>E2: Broadcast Update
    E2->>E2: Update View

    Note over E1,E2: Conflict Resolution
    E1->>H: Delete "Hello"
    H->>Y: Apply Delete
    H->>E2: Delete Applied
```

### Collaborative Editing Flow

```mermaid
flowchart TD
    A[User Edits Document] --> B[Local Change]
    B --> C{Y.js Update}

    C -->|Single User| D[Apply Locally]
    C -->|Multiple Users| E[Merge Changes]

    E --> F{CRDT Algorithm}
    F -->|Conflict| G[Last-Write-Wins]
    F -->|Merge| H[Union Operation]

    D & G & H --> I[Sync to Server]
    I --> J[Hocuspocus Server]
    J --> K[Persist to Redis]
    K --> L[Broadcast to Other Clients]
    L --> M[Other Clients Update]
```

---

## Data Models

### Core Database Schema

```mermaid
erDiagram
    USER ||--o{ WORKSPACE_MEMBER : belongs
    USER ||--o{ ISSUE_ASSIGNEE : assigned
    WORKSPACE ||--o{ WORKSPACE_MEMBER : has
    WORKSPACE ||--o{ PROJECT : contains
    WORKSPACE ||--o{ ISSUE : contains
    WORKSPACE ||--o{ PAGE : contains
    PROJECT ||--o{ MODULE : contains
    PROJECT ||--o{ ISSUE : contains
    PROJECT ||--o{ CYCLE : contains
    MODULE ||--o{ ISSUE : categorized
    CYCLE ||--o{ ISSUE : scheduled
    ISSUE ||--o{ COMMENT : has
    ISSUE ||--o{ LABEL : tagged
    ISSUE ||--o{ ISSUE_ASSIGNEE : assigned

    USER {
        uuid id PK
        string email
        string name
        string avatar
        timestamp created_at
    }

    WORKSPACE {
        uuid id PK
        string name
        string slug
        text description
        uuid owner_id FK
        boolean is_public
    }

    PROJECT {
        uuid id PK
        string name
        string key
        uuid workspace_id FK
        uuid lead_id FK
    }

    ISSUE {
        uuid id PK
        string title
        text description
        uuid project_id FK
        uuid workspace_id FK
        uuid created_by FK
        uuid state_id FK
        int priority
    }
```

### Data Relationships

```mermaid
graph TB
    subgraph "User Hierarchy"
        USR[👤 Users] --> TE[👥 Teams]
        TE --> ORG[🏢 Organizations]
        ORG --> WS[👥 Workspaces]
    end

    subgraph "Project Hierarchy"
        WS --> PRO[📁 Projects]
        PRO --> MOD[📦 Modules]
        MOD --> ISS[📋 Issues]
    end

    subgraph "Time-Based"
        PRO --> CYC[🔄 Cycles/Sprints]
        CYC --> ISS
    end

    subgraph "Content"
        WS --> PGS[📄 Pages]
        PGS --> ATT[📎 Attachments]
    end
```

---

## Authentication Flow

### Session-Based Authentication

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant S as Session Store
    participant D as Database

    Note over U,F: Login Flow
    U->>F: Enter Credentials
    F->>A: POST /api/v1/sign-in/
    A->>A: Validate Credentials
    A->>D: Verify User
    D-->>A: User Found

    alt Valid Credentials
        A->>S: Create Session (HTTPOnly, Secure)
        S-->>A: Session ID
        A->>A: Generate CSRF Token
        A-->>F: Set-Cookie: sessionid=XXX<br/>Set-Cookie: csrftoken=YYY

        F->>F: Store Session
        F-->>U: Login Success
    else Invalid
        A-->>F: 401 Unauthorized
        F-->>U: Show Error
    end

    Note over U,F: Authenticated Request
    U->>F: Action (Create Issue)
    F->>A: POST /api/v1/workspaces/{slug}/issues/<br/>Cookie: sessionid=XXX<br/>X-CSRFToken: YYY
    A->>S: Validate Session
    S-->>A: Session Valid
    A->>A: Validate CSRF
    A->>D: Create Issue
    D-->>A: Issue Created
    A-->>F: 201 Created
    F-->>U: Issue Created
```

### OAuth 2.0 Flow

```mermaid
flowchart TD
    A[User Clicks "Login with Google"] --> B[Redirect to Google OAuth]
    B --> C[User Grants Permission]
    C --> D[Google Returns Code]
    D --> E[Kardon Exchange Code]
    E --> F[Get Access Token]
    F --> G[Get User Info]
    G --> H[Create/Update User]
    H --> I[Create Session]
    I --> J[Login Complete]
```

---

## Task Queue System

### Celery Architecture

```mermaid
graph TB
    subgraph "Task Producers"
        API[Django API<br/>Enqueue Tasks]
        WEB[Web App<br/>Enqueue Tasks]
    end

    subgraph "Message Broker"
        MQ[📬 RabbitMQ<br/>Task Queue]
    end

    subgraph "Workers"
        WORKER1[👷 Worker 1<br/>General Tasks]
        WORKER2[👷 Worker 2<br/>Email Tasks]
        WORKER3[👷 Worker 3<br/>AI Tasks]
    end

    subgraph "Result Backend"
        RB[(Redis<br/>Task Results)]
    end

    API & WEB --> MQ
    MQ --> WORKER1 & WORKER2 & WORKER3
    WORKER1 & WORKER2 & WORKER3 --> RB
```

### Task Flow

```mermaid
flowchart TD
    A[API Receives Request] --> B{Async Task?}

    B -->|Yes| C[Enqueue Task<br/>Celery]
    B -->|No| D[Process Synchronously]

    C --> E[Return 202 + Task ID]
    E --> F[Client Polls Task Status]

    D --> G[Execute Task]
    G --> H[Return Result]

    C --> I[Worker Picks Task]
    I --> J[Execute Task]
    J --> K[Store Result<br/>Redis]
    K --> L[Update Task Status]

    L --> F

    subgraph "Retry Logic"
        J --> M{Failed?}
        M -->|Yes| N[Retry Count < Max?]
        N -->|Yes| O[Backoff Delay]
        O --> I
        N -->|No| P[Mark as Failed]
        P --> Q[Send Notification]
    end
```

---

## File Storage Architecture

### MinIO/S3 Integration

```mermaid
graph TB
    subgraph "Upload Flow"
        U[User] --> F[Frontend]
        F --> A[API]
        A --> V[Validate File<br/>Type, Size, Virus]
        V --> G[Generate Presigned URL]
        G --> F[Return URL]
        F --> S3[Direct Upload<br/>MinIO/S3]
    end

    subgraph "Download Flow"
        U --> F2[Frontend]
        F2 --> A2[API]
        A2 --> G2[Validate Permission]
        G2 --> H[Generate Presigned URL]
        H --> F2[Return URL]
        F2 --> S3[Direct Download]
    end

    subgraph "Storage Structure"
        S3 --> BKT[(Bucket: kardon-uploads)]
        BKT --> WS[/workspaces/{id}/]
        BKT --> USR[/users/{id}/]
        BKT --> TMP[/tmp/]
    end
```

### File Processing Pipeline

```mermaid
flowchart LR
    A[📁 Raw Upload] --> B[🧹 Virus Scan]
    B --> C{Clean?}
    C -->|Yes| D[📦 Process<br/>Image Resize<br/>PDF Render]
    C -->|No| E[❌ Quarantine]
    D --> F[📍 Store Metadata<br/>PostgreSQL]
    F --> G[💾 Store File<br/>MinIO]
    G --> H[✅ Return URL]
```

---

## AI Integration Architecture

### AI Orchestrator

```mermaid
graph TB
    subgraph "Kardon AI Layer"
        ORCH[🎯 AI Orchestrator<br/>Model Routing]
        COST[💰 Cost Tracker]
        CACHE[⚡ Response Cache]
    end

    subgraph "Request Processing"
        REQ[API Request] --> RO[Route Request]
        RO --> VAL[Validate Input]
        VAL --> CACHE

        CACHE -->|Cache Hit| RESP[Return Cached]
        CACHE -->|Cache Miss| ORCH
    end

    subgraph "Model Selection"
        ORCH --> SELECT[Select Best Model]
        SELECT --> COSTCHK[Cost Check]
        COSTCHK --> RETRY[Retry Logic]
    end

    subgraph "Enterprise Models"
        ORCH --> CLAUDE[Claude Opus 4.6]
        ORCH --> GPT[GPT-5.3-Codex]
    end

    subgraph "Cost-Effective Models"
        ORCH --> KIMI[Kimi 2.5]
        ORCH --> MINIMAX[MiniMax 2.1]
        ORCH --> GLM[GLM 4.7]
    end

    CLAUDE & GPT & KIMI & MINIMAX & GLM --> RESP2[Generate Response]
    RESP2 --> CACHE
    RESP2 --> COST
    RESP --> COST
```

### AI Request Routing

```mermaid
flowchart TD
    A[AI Request] --> B{Request Type?}

    B -->|Code Generation| C[Require Coding?]
    C -->|High Complexity| D[Claude Opus 4.6]
    C -->|Medium Complexity| E[GPT-5.3-Codex]
    C -->|Budget Conscious| F[MiniMax 2.1]

    B -->|General Chat| G{Budget?}
    G -->|Unlimited| H[Claude Opus 4.6]
    G -->|Moderate| I[Kimi 2.5]
    G -->|Strict| J[GLM 4.7]

    B -->|Agent Task| K[Multi-step?]
    K -->|Yes| L[Claude Opus 4.6<br/>Agent Swarm]
    K -->|No| M[GPT-5.3-Codex]

    D & E & F & H & I & J & L & M --> N[Call AI API]
    N --> O[Parse Response]
    O --> P[Update Cost Log]
    P --> Q[Return to User]
```

---

## Next Steps

- **[Security Documentation](../security/README.md)** - Security implementation details
- **[AI Integration Guide](../ai/README.md)** - AI model integration
- **[Deployment Guide](../deployment/docker-compose/README.md)** - Production deployment

---

## Version History

| Version | Date     | Changes                       |
| ------- | -------- | ----------------------------- |
| 1.0     | Feb 2026 | Initial detailed architecture |
