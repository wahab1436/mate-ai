import requests
import time
from typing import Optional, Dict, Any
import logging

class HuggingFaceService:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.api_key = config.get("HUGGINGFACE_API_KEY")
        self.model = config.get("HUGGINGFACE_MODEL", "google/flan-t5-large")
        self.api_url = f"{config.get('HUGGINGFACE_API_URL')}/{self.model}"
        self.max_length = config.get("HUGGINGFACE_MAX_LENGTH", 512)
        self.temperature = config.get("HUGGINGFACE_TEMPERATURE", 0.7)
        self.timeout = config.get("HUGGINGFACE_TIMEOUT", 30)
        self.max_retries = config.get("SECURITY_MAX_RETRIES", 3)
        self.logger = logging.getLogger(__name__)
        
        if not self.api_key:
            self.logger.warning("HUGGINGFACE_API_KEY not set. API calls will fail.")
    
    def generate_response(self, prompt: str) -> Dict[str, Any]:
        """
        Generate response using Hugging Face Inference API
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_length": self.max_length,
                "temperature": self.temperature,
                "do_sample": True,
                "return_full_text": False
            },
            "options": {
                "use_cache": True,
                "wait_for_model": True
            }
        }
        
        for attempt in range(self.max_retries):
            try:
                self.logger.info(f"Sending request to Hugging Face API (attempt {attempt + 1})")
                
                response = requests.post(
                    self.api_url,
                    headers=headers,
                    json=payload,
                    timeout=self.timeout
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if isinstance(result, list) and len(result) > 0:
                        generated_text = result[0].get('generated_text', '')
                        return {
                            "success": True,
                            "response": generated_text,
                            "tokens_used": len(generated_text.split())
                        }
                    else:
                        return {
                            "success": False,
                            "error": "Invalid response format from API"
                        }
                
                elif response.status_code == 503:
                    # Model is loading, wait and retry
                    self.logger.warning(f"Model loading, waiting 10 seconds (attempt {attempt + 1})")
                    time.sleep(10)
                    continue
                
                else:
                    error_msg = f"API error: {response.status_code} - {response.text}"
                    self.logger.error(error_msg)
                    return {
                        "success": False,
                        "error": f"API request failed with status {response.status_code}"
                    }
                    
            except requests.exceptions.Timeout:
                self.logger.error(f"Request timeout (attempt {attempt + 1})")
                if attempt == self.max_retries - 1:
                    return {
                        "success": False,
                        "error": "Request timeout. Please try again."
                    }
                time.sleep(2)
                
            except requests.exceptions.RequestException as e:
                self.logger.error(f"Request exception: {str(e)}")
                return {
                    "success": False,
                    "error": "Connection error. Please check your network."
                }
        
        return {
            "success": False,
            "error": "Max retries exceeded. Please try again later."
        }
