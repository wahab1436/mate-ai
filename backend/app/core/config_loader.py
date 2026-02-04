import yaml
import os
from pathlib import Path
from typing import Dict, Any

def load_config(config_path: str = None) -> Dict[str, Any]:
    if config_path is None:
        config_path = Path(__file__).parent.parent.parent / "config.yaml"
    
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Configuration file not found: {config_path}")
    
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    # Override with environment variables
    env_mappings = {
        "HUGGINGFACE_API_KEY": ("huggingface", "api_key"),
        "DEBUG": ("app", "debug"),
        "HOST": ("server", "host"),
        "PORT": ("server", "port"),
    }
    
    for env_var, config_path in env_mappings.items():
        if env_var in os.environ:
            section, key = config_path
            if section in config and isinstance(config[section], dict):
                config[section][key] = os.environ[env_var]
    
    # Flatten config for Flask
    flask_config = {}
    for section, values in config.items():
        if isinstance(values, dict):
            for key, value in values.items():
                flask_config[f"{section.upper()}_{key.upper()}"] = value
        else:
            flask_config[section.upper()] = values
    
    return flask_config
