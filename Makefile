.PHONY: build run test docker-up docker-down migrate lint

build:
	go build -o bin/softgit ./cmd/server

run:
	go run ./cmd/server

test:
	go test ./...

docker-up:
	docker compose up -d --build

docker-down:
	docker compose down

docker-prod:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

migrate:
	# Migrations run automatically on startup

tidy:
	go mod tidy
