DB_URL := postgres://vinamar:vinamar@localhost:5432/vinamar
PROD_HOST := vps.hkdev.cz
PROD_DIR := /opt/vinamar
GIT_SHA := $(shell git rev-parse --short HEAD)

.DEFAULT_GOAL := help

.PHONY: help up down build restart logs ps db test test-api test-web e2e-api e2e-web lint migrate seed deploy-prod ssh-prod

help: ## Vypíše dostupné targety
	@awk 'BEGIN {FS = ":.*## "} /^[a-zA-Z0-9_-]+:.*## / {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

up: ## Spustí lokální stack (docker compose up -d --build)
	docker compose up -d --build

down: ## Zastaví lokální stack
	docker compose down

build: ## Postaví lokální image
	docker compose build

restart: ## Restartuje lokální služby
	docker compose restart

logs: ## Sleduje logy lokálního stacku
	docker compose logs -f --tail=100

ps: ## Stav lokálních služeb
	docker compose ps

db: ## Spustí jen databázi
	docker compose up -d db

test: test-api test-web ## Všechny testy (api + web)

test-api: db ## API unit testy (jest)
	cd api && DATABASE_URL=$(DB_URL) npm test

test-web: ## Web unit testy (vitest)
	cd web && npm test

e2e-api: db ## API e2e testy
	cd api && DATABASE_URL=$(DB_URL) npm run test:e2e

e2e-web: ## Web e2e testy (playwright, proti běžící aplikaci)
	cd web && npm run e2e

lint: ## ESLint api (onion dependency rule)
	cd api && npm run lint

migrate: db ## Spustí DB migrace lokálně
	cd api && DATABASE_URL=$(DB_URL) npm run migrate up

seed: db ## Naplní lokální DB seed daty
	cd api && DATABASE_URL=$(DB_URL) npm run seed

deploy-prod: ## Build produkčních image (amd64), nahrání na VPS a compose up
	docker build --platform linux/amd64 --target production \
		-t vinamar/api:latest -t vinamar/api:$(GIT_SHA) api
	docker build --platform linux/amd64 --target production \
		--build-arg NEXT_PUBLIC_API_URL=/api \
		-t vinamar/web:latest -t vinamar/web:$(GIT_SHA) web
	docker save vinamar/api:latest vinamar/api:$(GIT_SHA) \
		vinamar/web:latest vinamar/web:$(GIT_SHA) \
		| gzip | ssh $(PROD_HOST) 'gunzip | docker load'
	ssh $(PROD_HOST) 'cd $(PROD_DIR) && docker compose up -d'
	ssh $(PROD_HOST) 'cd $(PROD_DIR) && docker compose ps'

ssh-prod: ## SSH na produkční VPS
	ssh $(PROD_HOST)
