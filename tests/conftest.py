import os

# — Test environment
# WHY: config.load_config() now fails fast when provider/model/Hindsight URL are
# unset, and app.py loads config at import time. These are inert placeholders so
# the suite can import the app; every test stubs the real providers.
os.environ.setdefault("LLM_PROVIDER", "groq")
os.environ.setdefault("LLM_MODEL", "test-model")
os.environ.setdefault("HINDSIGHT_BASE_URL", "https://hindsight.test")
