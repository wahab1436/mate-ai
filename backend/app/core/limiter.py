from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

def setup_limiter(app):
    """Configure rate limiting"""
    limiter = Limiter(
        get_remote_address,
        app=app,
        default_limits=[app.config.get("RATE_LIMITING_DEFAULT", "10 per minute")],
        storage_uri=app.config.get("RATE_LIMITING_STORAGE_URI", "memory://"),
        strategy="fixed-window",
        enabled=app.config.get("RATE_LIMITING_ENABLED", True)
    )
    return limiter
