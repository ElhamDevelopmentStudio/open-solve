# OpenSolve Operations Guide (Phase 18)

This folder documents every operational surface for the Docker-first rollout.

| File                    | Purpose                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `environments.md`       | Describes dev/staging/prod topology, parity rules, and which compose/fly specs to use. |
| `local-setup.md`        | Step-by-step local Docker workflow with Postgres, RabbitMQ, and MinIO.                 |
| `staging-deployment.md` | Docker host deployment guide pointing at managed DB/Rabbit.                            |
| `prod-deployment.md`    | Fly.io production playbook (with notes for self-managed Docker hosts).                 |
| `secrets.md`            | Source of truth for env vars + secret management recommendations.                      |
| `ci-cd.md`              | Explanation of `.github/workflows/ci-cd.yml`, required stages, and artifact outputs.   |
| `rollouts.md`           | Canary/blue-green guidance for compose stacks and Fly apps.                            |

All env files referenced here live under `ops/env/*.env`; compose specs live in `ops/docker/*.yml`. Update these docs whenever infrastructure changes.
