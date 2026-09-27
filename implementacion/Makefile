.PHONY: doctor smoke-env test-env test test-unit test-policies test-bundles demo reference
doctor:
	bash scripts/check-environment.sh

smoke-env:
	bash scripts/smoke-environment.sh

test-env:
	node --test tests/environment/probe.test.mjs tests/environment/config.test.mjs

test-unit:
	node --test services/quotes-node/test/*.test.js tests/unit/*.test.mjs

test-policies:
	python3 -m unittest discover -s tests/policies -p 'test_*.py'
	python3 tests/policies/run_rego.py
	python3 tests/policies/run_kyverno.py
	bash scripts/check-policies.sh

test-bundles:
	bash tests/integration/bundle-crypto.sh

test: test-env test-unit test-policies test-bundles

demo:
	bash scripts/demo.sh local

reference:
	bash scripts/demo.sh local reference
