#!/usr/bin/env python3
"""
Production entry point for Gunicorn
"""
from app import create_app

app = create_app()

if __name__ == "__main__":
    # This is for development only
    app.run(
        host=app.config.get("HOST", "0.0.0.0"),
        port=app.config.get("PORT", 5000),
        debug=app.config.get("DEBUG", False)
    )
