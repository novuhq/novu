.PHONY: start

start:
	@if command -v docker >/dev/null 2>&1; then \
		echo "Starting mock server with Docker..."; \
		docker build -t mockserver . && \
		docker run -i -p 18080:18080 -t --rm mockserver; \
	elif command -v go >/dev/null 2>&1; then \
		echo "Docker not found. Starting mock server with Go..."; \
		go run .; \
	else \
		echo "Neither Docker nor Go found. To run the mock server:"; \
		echo "\nOption 1 - Using Docker:"; \
		echo "  docker build -t mockserver ."; \
		echo "  docker run -i -p 18080:18080 -t --rm mockserver"; \
		echo "\nOption 2 - Using Go:"; \
		echo "  go run ."; \
	fi
