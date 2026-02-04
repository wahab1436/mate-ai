from flask import Flask
from flask_limiter import Limiter
import logging
import os

limiter = Limiter()

def create_app():
    app = Flask(__name__, 
                static_folder='../../frontend/static',
                template_folder='../../frontend/templates')
    
    # Load configuration
    from .core.config_loader import load_config
    config = load_config()
    app.config.from_mapping(config)
    
    # Setup logging
    from .utils.logger import setup_logger
    setup_logger(app)
    
    # Initialize rate limiter
    limiter.init_app(app)
    
    # Register blueprints
    from .api.chat_routes import chat_bp
    app.register_blueprint(chat_bp)
    
    # Add error handlers
    @app.errorhandler(404)
    def not_found(error):
        return {"error": "Endpoint not found", "status": 404}, 404
    
    @app.errorhandler(429)
    def ratelimit_handler(error):
        return {
            "error": "Rate limit exceeded. Please try again later.",
            "status": 429
        }, 429
    
    @app.errorhandler(500)
    def internal_error(error):
        app.logger.error(f"Internal server error: {error}")
        return {
            "error": "Internal server error. Please try again later.",
            "status": 500
        }, 500
    
    return app
