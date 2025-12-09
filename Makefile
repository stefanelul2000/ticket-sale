# Makefile for common development tasks
DOCKER_COMPOSE_DIR := docker
IMAGE_NAME ?= ghcr.io/stefanelul2000/ticket-sale:dev-latest

.PHONY: dev build-image down shell test smoke-test logs

.PHONY: cleanup

# Start dev compose with override
dev: build-image
	cd $(DOCKER_COMPOSE_DIR) && docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --build

# Build the dev image
build-image:
	docker build -f $(DOCKER_COMPOSE_DIR)/Dockerfile -t $(IMAGE_NAME) .

# Run interactive shell in app container
shell:
	cd $(DOCKER_COMPOSE_DIR) && docker compose exec app sh

# Run tests in the app container
test:
	cd $(DOCKER_COMPOSE_DIR) && docker compose exec app sh -c "cd /var/www/html && composer test || php artisan test"

# Stop containers
down:
	cd $(DOCKER_COMPOSE_DIR) && docker compose down --remove-orphans

# Tail logs for containers
logs:
	cd $(DOCKER_COMPOSE_DIR) && docker compose logs -f

# Remove named volumes (backend_vendor, frontend_node_modules)
reset-volumes:
	docker volume ls -q | grep backend_vendor 2>/dev/null | xargs -r docker volume rm || true
	docker volume ls -q | grep frontend_node_modules 2>/dev/null | xargs -r docker volume rm || true

cleanup:
	./scripts/teardown-dev.sh

# Replicate CI smoke test locally (uses bare run instead of compose)
smoke-test:
	./scripts/smoke-test-local.sh

# Install git hooks for the current repository (installs hook to block sensitive files)
install-hooks:
	./scripts/install-hooks.sh

# Convenience: rebuild and run tests
rebuild-test: build-image dev test
