# Kardon Platform Architecture Documentation

## 5 W + How Framework

---

## WHO

### Development Team

- **Primary Maintainers**: Development team responsible for microhack-kardon platform
- **Target Users**:
  - End users accessing collaborative platform features
  - Administrators managing platform resources
  - Developers extending platform capabilities

### Stakeholders

- **Platform Operators**: DevOps team managing deployment and monitoring
- **Security Team**: Responsible for vulnerability management and compliance
- **Business Users**: End consumers of the collaborative platform services

---

## WHAT

### Platform Overview

Kardon is a microservices-based collaborative platform consisting of:

**Application Services (9 services)**
| Service | Purpose | Technology |
|---------|---------|------------|
| `web` | Frontend web application | Node.js/Next.js |
| `admin` | Admin dashboard | Node.js/Next.js |
| `space` | Collaboration spaces | Node.js/Next.js |
| `api` | Core API gateway | Python/Django |
| `worker` | Background job processor | Python/Django |
| `beat-worker` | Scheduled task worker | Python/Django Celery |
| `migrator` | Database migrations | Python/Django |
| `live` | Real-time features | Node.js |
| `proxy` | Reverse proxy/gateway | Traefik/Caddy |

**Infrastructure Services (5 services)**
| Service | Purpose | Technology |
|---------|---------|------------|
| `kardon-db` | Primary database | PostgreSQL 15.7 |
| `kardon-redis` | Caching & sessions | Valkey 7.2 |
| `kardon-mq` | Message queue | RabbitMQ 3.13 |
| `kardon-minio` | Object storage | MinIO |

---

## WHEN

### Deployment Timeline

- **Initial Deployment**: Upon merge to main branch
- **Update Frequency**: On-demand deployments from feature branches
- **Maintenance Windows**: Non-disruptive rolling updates during business hours

### Runtime Schedule

- **Service Availability**: 24/7 production environment
- **Batch Jobs**: Scheduled via Celery Beat (beat-worker)
- **Migrations**: Manual trigger during maintenance windows

### Key Lifecycle Events

1. **Build Phase**: Docker images built on CI trigger
2. **Scan Phase**: Security scanning via Trivy
3. **Push Phase**: Images pushed to GitHub Container Registry
4. **Deploy Phase**: Kubernetes manifests applied

---

## WHERE

### Deployment Environments

| Environment | Cluster             | Namespace     | Purpose             |
| ----------- | ------------------- | ------------- | ------------------- |
| `dev`       | Development cluster | `kardon-dev`  | Development testing |
| `prod`      | Production cluster  | `kardon-prod` | Live production     |

### Cloud/Cluster Locations

- **Container Registry**: GitHub Container Registry (ghcr.io)
- **Cluster**: Self-managed Kubernetes or managed service (EKS/GKE/AKS)
- **Regions**: Configurable via K8s cluster configuration

### Service Distribution

- **Frontend Services**: web, admin, space, live → Public facing
- **Backend Services**: api, worker, beat-worker → Internal mesh
- **Infrastructure**: db, redis, mq, minio → Cluster-local only

---

## WHY

### Architectural Decisions

#### 1. Microservices Architecture

**Why**: Enable independent scaling, deployment, and technology selection for each component
**Rationale**: Different services have varying load patterns and resource requirements

#### 2. Containerization with Docker

**Why**: Ensure consistency across environments and enable portable deployments
**Benefits**:

- Environment parity (dev/prod)
- Simplified dependency management
- Isolated service dependencies

#### 3. Kubernetes Orchestration

**Why**: Automated deployment, scaling, and management of containerized applications
**Benefits**:

- Self-healing infrastructure
- Horizontal pod autoscaling
- Rolling zero-downtime deployments
- Resource isolation and quotas

#### 4. Trivy Security Scanning

**Why**: Automated vulnerability detection before deployment
**Purpose**:

- Catch HIGH/CRITICAL vulnerabilities early
- Compliance and security governance
- Artifact tracking for audit purposes

#### 5. GitHub Container Registry

**Why**: Private, integrated container image storage
**Benefits**:

- Tight integration with GitHub Actions
- Access control via GitHub permissions
- No external registry dependencies

---

## HOW

### Deployment Pipeline

#### 1. Build Process

```bash
# Docker build with BuildKit
docker buildx build \
  --build-arg DOCKER_BUILDKIT=1 \
  --cache-from type=gha \
  --cache-to type=gha,mode=max \
  --push \
  ghcr.io/org/repo/service:tag
```

#### 2. Security Scanning

```bash
# Trivy vulnerability scan
trivy image \
  --severity CRITICAL,HIGH \
  --exit-code 1 \
  ghcr.io/org/repo/service:tag
```

#### 3. Kubernetes Deployment

```bash
# Apply manifests with Kustomize
kubectl apply -k deployment/k8s/overlays/prod
```

### Kubernetes Architecture

#### Namespace Structure

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kardon-{env}
  labels:
    app: kardon
    env: { env }
```

#### Service Deployment Pattern

Each service follows this pattern:

1. **Deployment**: Pod specification with containers
2. **Service**: ClusterIP or LoadBalancer for internal/external access
3. **HorizontalPodAutoscaler**: Automatic scaling based on metrics
4. **PodDisruptionBudget**: Ensure availability during updates

#### Data Persistence

| Data Type  | Storage Class              | Backup Strategy |
| ---------- | -------------------------- | --------------- |
| PostgreSQL | Persistent Volume          | Daily snapshots |
| Redis      | In-memory (no persistence) | N/A             |
| RabbitMQ   | Persistent Volume          | Queue mirroring |
| MinIO      | S3-compatible storage      | Replication     |

### Networking Architecture

```mermaid
graph TD
    User[End User] -->|HTTPS| CDN[CDN]
    CDN -->|HTTP| Proxy[proxy:443]
    Proxy -->|HTTP| Web[web:80]
    Proxy -->|HTTP| Admin[admin:80]
    Proxy -->|HTTP| Space[space:80]
    Proxy -->|HTTP| Live[live:80]
    Web -->|HTTP| Api[api:8000]
    Admin -->|HTTP| Api
    Space -->|HTTP| Api
    Live -->|HTTP| Api
    Api -->|TCP| DB[kardon-db:5432]
    Api -->|TCP| Redis[kardon-redis:6379]
    Api -->|TCP| MQ[kardon-mq:5672]
    Api -->|HTTP| MinIO[kardon-minio:9000]
    Worker -->|TCP| DB
    Worker -->|TCP| Redis
    Worker -->|TCP| MQ
```

### Configuration Management

#### Environment Variables

- **App Config**: `.env` files per service
- **Secrets**: Kubernetes Secrets or external secrets manager
- **ConfigMaps**: Non-sensitive configuration

#### Example Secret Structure

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: kardon-secrets
type: Opaque
stringData:
  DATABASE_URL: postgresql://user:pass@host:5432/db
  REDIS_URL: redis://:pass@host:6379
  AWS_ACCESS_KEY_ID: xxx
  AWS_SECRET_ACCESS_KEY: xxx
```

### Monitoring & Observability

#### Key Metrics

- **Request Rate**: Requests per second per service
- **Error Rate**: HTTP 5xx ratio
- **Latency**: P50, P95, P99 response times
- **Resource Usage**: CPU, memory, network I/O

#### Logging Strategy

- **Application Logs**: JSON format to stdout
- **Aggregation**: Fluent Bit → Elasticsearch/Loki
- **Retention**: 30 days hot, 90 days cold

#### Health Checks

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
```

### Security Architecture

#### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress: []
```

#### Container Security

- **Non-root user**: All containers run as non-root
- **Read-only filesystem**: Root filesystem is read-only
- **No privilege escalation**: `allowPrivilegeEscalation: false`
- **Seccomp profiles**: Restrict system calls

### Disaster Recovery

#### Backup Strategy

- **Database**: Daily pg_dump with 30-day retention
- **RabbitMQ**: Queue mirroring across nodes
- **MinIO**: Built-in replication

#### Recovery Procedures

1. **Database Restore**: Point-in-time recovery available
2. **Service Recovery**: Kubernetes self-healing
3. **Cluster Recovery**: Infrastructure as Code (Terraform)

---

## Component Details

### Frontend Services (web, admin, space, live)

**Technology Stack**

- Framework: Next.js / React
- Language: TypeScript
- Package Manager: pnpm

**Resource Requirements**

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

**Scaling**

- Replicas: 2 minimum, auto-scale to 10
- Max CPU: 70% threshold for scaling

### Backend Services (api, worker, beat-worker, migrator)

**Technology Stack**

- Framework: Django / Django REST Framework
- Language: Python 3.11+
- Task Queue: Celery with RabbitMQ

**Resource Requirements**

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "2Gi"
    cpu: "1000m"
```

**Scaling**

- api: 3 minimum, auto-scale based on request queue
- worker: Horizontal scaling based on queue depth
- beat-worker: 1 replica (scheduled tasks)
- migrator: Manual scaling (job-based)

### Infrastructure Services

#### PostgreSQL (kardon-db)

```yaml
spec:
  resources:
    requests:
      memory: "1Gi"
      cpu: "500m"
    limits:
      memory: "4Gi"
      cpu: "2000m"
  storage: 50Gi
```

#### RabbitMQ (kardon-mq)

```yaml
spec:
  resources:
    requests:
      memory: "512Mi"
      cpu: "250m"
    limits:
      memory: "2Gi"
      cpu: "1000m"
```

#### Valkey/Redis (kardon-redis)

```yaml
spec:
  resources:
    requests:
      memory: "256Mi"
      cpu: "100m"
    limits:
      memory: "1Gi"
      cpu: "500m"
```

#### MinIO (kardon-minio)

```yaml
spec:
  resources:
    requests:
      memory: "256Mi"
      cpu: "100m"
    limits:
      memory: "1Gi"
      cpu: "500m"
```

---

## Quick Reference

### File Structure

```
deployment/
├── docs/
│   └── ARCHITECTURE.md
├── k8s/
│   ├── base/
│   │   ├── namespace.yaml
│   │   ├── configmap.yaml
│   │   └── secrets.yaml
│   ├── services/
│   │   ├── web/
│   │   ├── admin/
│   │   ├── space/
│   │   ├── api/
│   │   ├── worker/
│   │   ├── beat-worker/
│   │   ├── migrator/
│   │   ├── live/
│   │   └── proxy/
│   └── overlays/
│       ├── dev/
│       │   └── kustomization.yaml
│       └── prod/
│           └── kustomization.yaml
└── README.md
```

### Deployment Commands

```bash
# Deploy to dev
kubectl apply -k deployment/k8s/overlays/dev

# Deploy to prod
kubectl apply -k deployment/k8s/overlays/prod

# Check status
kubectl get pods -n kardon-dev
kubectl get pods -n kardon-prod

# View logs
kubectl logs -f -n kardon-prod deployment/api
```
