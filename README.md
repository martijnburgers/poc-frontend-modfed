# CLA Monitor Demo

This folder contains the local Docker Compose runtime configuration for the CLA
Monitor BPM stack. The demo uses separate images for the three project
boundaries:

- `cla-monitor-bpm-backend:latest` from `src/bpm/backend`
- `cla-monitor-bpm-frontend:latest` from `src/bpm/frontend`
- `cla-monitor-labor-agreements:latest` from `src/modules/labor-agreements`

The labor-agreements module image contains the CLA workflow executable and the
tool binaries. The BPM backend registers the module runtime in the BPM database
when seeding the demo, then runs the module through Docker; it does not copy the
tools into the BPM server image.

Runtime data is stored in `demo/data` through the `/data` volume mapping.
The Compose file references image tags only; it does not build the images.

The demo can be run two ways:

- **Docker Compose** (default) — `demo/docker-compose.yml` starts the backend,
  frontend, and an Aspire dashboard for telemetry.
- **.NET Aspire AppHost** — `demo/aspire/Demo.slnx` hosts the same
  backend and frontend containers through a .NET Aspire orchestrator. See
  [`aspire/README.md`](aspire/README.md).

Component image docs:

- [BPM backend](../src/bpm/backend/README.md#docker)
- [BPM frontend](../src/bpm/frontend/README.md#docker-image)
- [Labor agreements module](../src/modules/labor-agreements/README.md)

## Prerequisites

- Docker with Docker Compose v2
- The sibling `flowstack` repo at `../flowstack` from the project root, or set
  `FLOWSTACK_CONTEXT` to its path when building images. The Go modules use
  local replace directives for FlowStack.

## Make Targets

From the repository root:

```bash
make -C demo help
```

The Makefile handles image builds, environment file creation, Compose startup,
logs, and reset. Override image tags or paths with environment variables, for
example:

```bash
make -C demo build FLOWSTACK_CONTEXT=/path/to/flowstack
make -C demo start BPM_BACKEND_IMAGE=registry.example/bpm-backend:demo
```

## Build Images

From the repository root:

```bash
make -C demo build
```

## Start The Demo

From the repository root:

```bash
make -C demo up
```

Open:

```text
http://localhost:8080
```

On first startup the backend migrates the SQLite database in `demo/data`,
seeds the CLA Monitor workflow, and dispatches CLA workflow runs by starting
`cla-monitor-labor-agreements:latest` with Docker. The demo backend startup
script is part of the BPM backend image as `bpm-demo-entrypoint`. The backend
mounts the Docker socket and uses `--volumes-from` so module containers see the
same `/data` mapping as the BPM backend.

## Database Seeding

Seeding is automatic. On every backend startup the `bpm-demo-entrypoint`
script (`src/bpm/backend/scripts/demo-entrypoint.sh`) runs:

1. `bpm migrate --config /etc/bpm/config.json` — creates/updates the SQLite
   schema at `/data/bpm.db`.
2. `bpm seed --config /etc/bpm/config.json --runtime docker --module-image
   cla-monitor-labor-agreements:latest` — seeds the CLA Workflow and
   registers the module runtime.
3. A `sqlite3` update patches `workflow_versions.metadata_snapshot` and
   `schedules.default_inputs` with provider/model inputs derived from
   `DEMO_WORKFLOW_*`, `AZURE_OPENAI_*`, and `OLLAMA_URL` environment
   variables.

Re-run seeding in an existing stack without wiping data:

```bash
docker compose -f demo/docker-compose.yml exec bpm-backend \
  bpm migrate --config /etc/bpm/config.json

docker compose -f demo/docker-compose.yml exec bpm-backend \
  bpm seed --config /etc/bpm/config.json \
           --runtime docker \
           --module-image cla-monitor-labor-agreements:latest
```

Full reset (wipes `demo/data`; the entrypoint re-seeds on the next `up`):

```bash
make -C demo reset
make -C demo up
```

## Frontend → Backend Networking

The frontend image ships with an `nginx.conf` that proxies `/api/*`,
`/health`, and `/ready` to `http://localhost:9090`. That only works when the
frontend and backend share a network namespace, which is not the case in
either the Docker Compose stack or the Aspire AppHost.

To fix this without rebuilding the image, the Compose stack bind-mounts
`demo/nginx.conf` over `/etc/nginx/nginx.conf` in the frontend container:

```yaml
bpm-frontend:
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf:ro
```

The override proxies to `http://bpm-backend:9090`, which resolves via the
Compose network. The Aspire AppHost applies the same override
(`demo/aspire/Demo.AppHost/nginx.conf`).

## .NET Aspire AppHost

An equivalent orchestration lives under `demo/aspire/`. It declares only the
`bpm-backend` and `bpm-frontend` containers (Aspire bundles its own
dashboard). Requires the .NET 10 SDK.

```bash
dotnet run --project demo/aspire/Demo.AppHost
```

The AppHost pins container names so `bpm-backend` is resolvable from
`bpm-frontend` over the Aspire container network, and mounts the same
nginx override described above. See [`aspire/README.md`](aspire/README.md)
for details.

## LLM Configuration

The workflow needs an LLM provider when it reaches analysis/evaluation steps.
Create a local env file from the example, then start Compose with it:

```bash
make -C demo env
make -C demo up
```

Set `DEMO_WORKFLOW_PROVIDER`, `DEMO_WORKFLOW_MODEL`, and the matching provider
environment variables in `demo/.env`. Secret values are passed to the module
container as environment variables; they are not stored in the module runtime
registration. For local Ollama:

```env
DEMO_WORKFLOW_PROVIDER=ollama
DEMO_WORKFLOW_MODEL=gpt-oss:20b
OLLAMA_URL=http://host.docker.internal:11434
```

## Data And Reset

Persistent files are written to:

```text
demo/data
```

To reset the demo database and workflow output:

```bash
make -C demo reset
```
# poc-frontend-modfed
