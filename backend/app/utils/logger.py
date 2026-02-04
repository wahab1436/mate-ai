import logging
import os
from pathlib import Path
from logging.handlers import RotatingFileHandler

def setup_logger(app):
    """Configure application logging"""
    
    # Create logs directory if it doesn't exist
    log_dir = Path(__file__).parent.parent.parent / "logs"
    log_dir.mkdir(exist_ok=True)
    
    # Get log configuration from app config
    log_level = getattr(logging, app.config.get('LOGGING_LEVEL', 'INFO'))
    log_format = app.config.get('LOGGING_FORMAT', 
                                '%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    log_file = app.config.get('LOGGING_FILE', 'logs/mateai.log')
    
    # Remove existing handlers
    for handler in logging.root.handlers[:]:
        logging.root.removeHandler(handler)
    
    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format=log_format,
        handlers=[
            RotatingFileHandler(
                filename=log_file,
                maxBytes=10485760,  # 10MB
                backupCount=5
            ),
            logging.StreamHandler()  # Also log to console
        ]
    )
    
    # Set Flask app logger
    app.logger.handlers = logging.root.handlers
    app.logger.setLevel(log_level)
    
    # Suppress verbose logs from dependencies
    logging.getLogger('werkzeug').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)
