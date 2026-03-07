# Rules Engine

Tadfuq.ai includes deterministic treasury rules:

1. Cash runway < 0 within 13 weeks → CRITICAL
2. Liquidity below 6 weeks burn → HIGH
3. Burn spike > 30% → MEDIUM
4. Revenue drop > 15% → HIGH
5. High volatility → LOW

Rules run:
- On-demand
- Or scheduled (every 6 hours)

LLM is not used in rule calculation.