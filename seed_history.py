"""Seed realistic customer history directly into Hindsight.

Run only against a local/dev Hindsight bank. The seed data is real Hindsight
memory, not frontend fixture data.
"""

import asyncio
import logging
import sys

from config import load_config
from providers.factory import get_history_provider

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed_history")

SAMPLE_CUSTOMERS = [
    {
        "customer_id": "alex_chen",
        "records": [
            "Customer reported intermittent 504 Gateway Timeouts on the EU-Central-1 API gateway during peak traffic. Environment: Kubernetes v1.28 cluster with Envoy ingress proxy using a 30 second timeout.",
            "Customer increased the Envoy upstream idle timeout to 60 seconds and enabled TCP keepalive. Error rates dropped from 4.2 percent to 0.1 percent, but occasional latency spikes remain during Friday batch synchronization jobs.",
            "Customer asked about Enterprise VPC Peering options to reduce public transit and batch synchronization jitter.",
        ],
    },
    {
        "customer_id": "priya_patel",
        "records": [
            "Customer reported webhook delivery failures for Shopify order cancellation events. The webhook endpoint returned HTTP 422 Unprocessable Entity.",
            "Customer resolved the Shopify webhook schema mismatch with payload transformation middleware and verified HMAC signature validation for order cancellation webhooks.",
        ],
    },
    {
        "customer_id": "marcus_vance",
        "records": [
            "Customer encountered a SAML 2.0 single sign-on certificate expiration warning with Okta. ACS URL configuration was checked and validated.",
            "Customer rotated the X.509 SAML signing certificate and verified just-in-time user provisioning and group role mappings for the engineering team.",
        ],
    },
]


async def seed() -> None:
    config = load_config()
    provider = get_history_provider(config)
    logger.info("Checking Hindsight at %s", config.hindsight_base_url)
    if not await provider.healthcheck():
        logger.error("Hindsight is not reachable. Nothing was seeded.")
        sys.exit(1)

    total_records = 0
    for customer in SAMPLE_CUSTOMERS:
        cid = customer["customer_id"]
        logger.info("Seeding Hindsight bank: %s", cid)
        for record in customer["records"]:
            await provider.retain(customer_id=cid, content=record, context="seeded_customer_support_history")
            total_records += 1
    logger.info("Seed complete: %d real Hindsight records submitted.", total_records)


if __name__ == "__main__":
    asyncio.run(seed())
