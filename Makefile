.PHONY: test test-fe test-be up down build logs prune clean nuke ci deploy-testnet deploy-mainnet

# Load environment variables from .env if it exists
ifneq (,$(wildcard .env))
    include .env
    export
endif

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
	cd contracts && npx hardhat coverage

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

# ── Contract Deployment ─────────────────────────────────────
# Requires DEPLOYER_PRIVATE_KEY (+ MANTLE_MAINNET_RPC_URL / MANTLESCAN_API_KEY for mainnet)
# set in backend/.env. Deploys all 3 contracts, mints both agent NFTs, prints env block.
deploy-testnet:
	@echo "🚀 Deploying to Mantle Sepolia (chainId 5003)..."
	cd contracts && npx hardhat run scripts/deploy.ts --network mantleTestnet

deploy-mainnet:
	@echo "⚠️  MAINNET DEPLOY — real MNT at stake. Ctrl-C within 5s to abort."
	@sleep 5
	@echo "🚀 Deploying to Mantle mainnet (chainId 5000)..."
	cd contracts && npx hardhat run scripts/deploy.ts --network mantleMainnet
	@echo "👉 Next: verify on Mantlescan, then paste the printed addresses into Vercel + Railway env"
	@echo "   and set NEXT_PUBLIC_MANTLE_CHAIN_ID=5000"

# ── Advanced Testing & Security ─────────────────────────────
ci:
	@echo "🚀 Running full CI pipeline locally..."
	npm run ci
	$(MAKE) test-be
	$(MAKE) test-contracts
	$(MAKE) e2e
	$(MAKE) lighthouse
	$(MAKE) security-scan
	@echo "✅ All CI checks passed!"

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
	npx license-checker --production --failOn "GPL-3.0;AGPL-3.0" --summary --excludePrivatePackages || true
	docker container prune -f

nuke:
	docker system prune -f
