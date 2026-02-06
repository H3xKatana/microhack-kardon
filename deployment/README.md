# Kardon Platform Deployment

Kubernetes manifests and documentation for deploying the Kardon platform.

## Prerequisites

- Kubernetes cluster (1.28+)
- kubectl configured
- Kustomize (kubectl kustomize or standalone)
- Cert-manager (for TLS certificates)
- Traefik or NGINX Ingress Controller

## Quick Start

### 1. Install Prerequisites

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.4/cert-manager.yaml

# Install ingress controller (Traefik example)
helm repo add traefik https://traefik.github.io/charts
helm install traefik traefik/traefik -n traefik --create-namespace
```

### 2. Apply Base Manifests

```bash
# Apply to development
kubectl apply -k deployment/k8s/overlays/dev

# Or apply to production
kubectl apply -k deployment/k8s/overlays/prod
```

### 3. Verify Deployment

```bash
# Check pods
kubectl get pods -n kardon
kubectl get pods -n kardon-infra

# Check services
kubectl get svc -n kardon
kubectl get svc -n kardon-infra

# Check ingress
kubectl get ingress -n kardon
```

## Project Structure

```
deployment/
├── docs/
│   └── ARCHITECTURE.md          # Complete architecture documentation
├── k8s/
│   ├── base/
│   │   ├── 00-namespace.yaml    # Namespace definitions
│   │   ├── 01-configmap.yaml    # Base configuration
│   │   ├── 02-secrets.yaml      # Base secrets template
│   │   ├── kustomization.yaml   # Base Kustomize config
│   │   └── services/
│   │       ├── web.yaml         # Frontend web service
│   │       ├── admin.yaml       # Admin dashboard
│   │       ├── space.yaml       # Collaboration spaces
│   │       ├── api.yaml         # Core API
│   │       ├── worker.yaml      # Background worker
│   │       ├── beat-worker.yaml # Celery beat scheduler
│   │       ├── migrator.yaml    # Database migrations
│   │       ├── live.yaml        # Real-time features
│   │       ├── proxy.yaml       # Reverse proxy
│   │       └── infra/
│   │           ├── postgresql.yaml
│   │           ├── redis.yaml
│   │           ├── rabbitmq.yaml
│   │           └── minio.yaml
│   └── overlays/
│       ├── dev/
│       │   ├── kustomization.yaml
│       │   └── namespace-dev.yaml
│       └── prod/
│           ├── kustomization.yaml
│           ├── namespace-prod.yaml
│           └── app-config.yaml
└── README.md
```

## Environment Configuration

### Development

Development environment uses minimal resources:

- 1 replica per service
- Development image tags
- Reduced resource limits
- Debug mode enabled

### Production

Production environment uses:

- 2-3 replicas per service
- Production image tags (main/latest)
- Full resource limits
- HPA enabled for autoscaling
- TLS certificates required

## Customization

### Update Image Tags

Edit `kustomization.yaml` in the appropriate overlay:

```yaml
images:
  - name: ghcr.io/h3xkatana/microhack-kardon/web
    newTag: v1.2.0 # Your version tag
```

### Add Environment Variables

Edit `01-configmap.yaml` or create overlay-specific configmaps.

### Configure Secrets

Generate secrets using external secrets manager or:

```bash
kubectl create secret generic kardon-secrets \
  --from-literal=POSTGRES_PASSWORD=your-password \
  --namespace=kardon
```

## Troubleshooting

### Check Logs

```bash
kubectl logs -f deployment/api -n kardon
```

### Port Forward for Testing

```bash
# API
kubectl port-forward svc/api 8000:8000 -n kardon

# Database
kubectl port-forward svc/kardon-db 5432:5432 -n kardon-infra
```

### Check Events

```bash
kubectl get events -n kardon --sort-by='.lastTimestamp'
```

## CI/CD Integration

### GitHub Actions Deployment

Example workflow step for production deployment:

```yaml
- name: Deploy to Kubernetes
  run: |
    kubectl apply -k deployment/k8s/overlays/prod
    kubectl rollout status deployment/api -n kardon-prod
```

### Image Update Workflow

1. CI builds and pushes images with git SHA tags
2. Manifests reference specific tags
3. `kubectl apply -k` pulls new images
4. Rolling update triggers automatically

## Security Considerations

- All containers run as non-root
- Secrets managed via Kubernetes Secrets
- Network policies restrict traffic
- TLS enforced via Ingress
- Regular vulnerability scanning (Trivy)

## Monitoring

### Prometheus Metrics

All services expose Prometheus metrics on port 8000/3000.

### Health Checks

Each deployment includes:

- Liveness probe: `/health`
- Readiness probe: `/ready`

## Support

For issues or questions:

- Check ARCHITECTURE.md for detailed documentation
- Review application logs in Kubernetes
- Check GitHub Issues for known problems
