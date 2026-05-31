.PHONY: test test-fe test-be up down build logs prune clean nuke ci

# Run all tests with coverage for both frontend and backend
test: test-fe test-be test-contracts

# Run frontend tests with coverage
test-fe:
	npm run test:coverage

# Run backend tests with coverage
test-be:
	cd backend && .venv/bin/pytest --cov

# Run contracts tests
test-contracts:
	cd contracts && npx hardhat test

# Docker compose commands
up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

# Cleanup commands
prune:
	docker image prune -f

clean:
	@echo "Clean completed"

# ── Advanced Testing & Security ─────────────────────────────
ci:
	@echo "🚀 Running full CI pipeline locally..."
	npm run ci

e2e:
	@echo "🎭 Running Playwright E2E tests (demo mode)..."
	npx playwright test

lighthouse:
	@echo "🔦 Running Lighthouse CI audit..."
	npx lhci autorun

security-scan:
	@echo "=== NPM AUDIT ==="
	npm audit --audit-level=high || true
	@echo ""
	@echo "=== LICENSE CHECK ==="
	npx license-checker --production --failOn "GPL-3.0;AGPL-3.0" --summary || true
	docker container prune -f

nuke:
	docker system prune -f
