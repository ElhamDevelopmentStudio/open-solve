.PHONY: help up down restart logs ps build reset

help:
	@printf "OpenSolve local development\\n\\n"
	@printf "  make up       Build and start the full local stack\\n"
	@printf "  make down     Stop local containers\\n"
	@printf "  make restart  Restart local containers\\n"
	@printf "  make logs     Tail local stack logs\\n"
	@printf "  make ps       Show local stack status\\n"
	@printf "  make build    Build app and worker images\\n"
	@printf "  make reset    Stop containers and remove local volumes\\n"
	@printf "\\nOverride env with: OPENSOLVE_ENV_FILE=./ops/env/dev.local.env make up\\n"

up:
	docker compose up --build

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

ps:
	docker compose ps

build:
	docker compose build web worker

reset:
	docker compose down --volumes --remove-orphans
