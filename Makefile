# StillHere developer shortcuts
# ================================
# Fast: deterministic regression stack (63 tests, milliseconds).
# Slow: gltest wasm smoke — skipped gracefully when the SDK / network is
#       missing (see tests/test_gltest_wasm.py for the skip conditions).
# Deploy: production build + Vercel prod deploy.
# ================================

.PHONY: help fast slow test build deploy deliverables-check clean

help:
	@echo "make fast                — deterministic regression tests (default CI tier)"
	@echo "make slow                — gltest wasm smoke against localnet / studionet"
	@echo "make test                — fast + slow"
	@echo "make build               — vite production build"
	@echo "make deploy              — vercel deploy --prod"
	@echo "make deliverables-check  — hard char-count on deliverables/text/*.txt"
	@echo "make clean               — remove build artifacts"

fast:
	pytest -m fast -q

slow:
	pytest -m slow -q

test: fast slow

build:
	npm run build

deploy: build
	vercel deploy --prod --yes

deliverables-check:
	@python3 scripts/deliverables_check.py

clean:
	rm -rf dist node_modules/.vite
