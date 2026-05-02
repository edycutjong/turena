.PHONY: test test-fe test-be up down build logs prune clean nuke

# Run all tests with coverage for both frontend and backend
test: test-fe test-be

# Run frontend tests with coverage
test-fe:
	npm run test:coverage

# Run backend tests with coverage
test-be:
	cd backend && .venv/bin/pytest --cov

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
	docker container prune -f

nuke:
	docker system prune -f
