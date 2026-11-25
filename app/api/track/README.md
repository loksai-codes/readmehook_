# POST /api/track
Allow-listed event → identity from `rh_vid` cookie → rate-limit → Flagsmith event + Redis HINCRBY/SADD → flush after response. See FR-7.3.
