from flask import Blueprint, request, jsonify, current_app
from flask_limiter import limiter
from app.core.prompt_loader import PromptLoader
from app.services.hf_service import HuggingFaceService
from app.utils.validators import InputValidator
import logging
import time

chat_bp = Blueprint('chat', __name__)
logger = logging.getLogger(__name__)

# Global instances (initialized in before_request)
prompt_loader = None
hf_service = None
validator = InputValidator()

@chat_bp.before_app_request
def initialize_services():
    """Initialize services on first request"""
    global prompt_loader, hf_service
    if prompt_loader is None:
        prompt_loader = PromptLoader(current_app.config)
    if hf_service is None:
        hf_service = HuggingFaceService(current_app.config)

@chat_bp.route('/api/chat', methods=['POST'])
@limiter.limit("10 per minute")
def chat():
    """
    Main chat endpoint
    Accepts JSON: {"message": "user message"}
    Returns JSON: {"response": "AI response", "status": "success/error"}
    """
    start_time = time.time()
    
    try:
        # Validate request
        if not request.is_json:
            return jsonify({
                "error": "Request must be JSON",
                "status": "error"
            }), 400
        
        data = request.get_json()
        user_message = data.get('message', '').strip()
        
        # Input validation
        is_valid, error_msg = validator.validate_message(
            user_message,
            max_length=current_app.config.get('SECURITY_MAX_INPUT_LENGTH', 1000)
        )
        
        if not is_valid:
            logger.warning(f"Invalid input: {error_msg}")
            return jsonify({
                "error": error_msg,
                "status": "error"
            }), 400
        
        # Construct prompt
        prompt = prompt_loader.construct_full_prompt(user_message)
        
        # Call Hugging Face API
        logger.info(f"Processing message: {user_message[:50]}...")
        api_result = hf_service.generate_response(prompt)
        
        processing_time = time.time() - start_time
        
        if api_result['success']:
            # Sanitize response
            sanitized_response = validator.sanitize_output(api_result['response'])
            
            logger.info(f"Request processed in {processing_time:.2f}s")
            
            return jsonify({
                "response": sanitized_response,
                "status": "success",
                "processing_time": round(processing_time, 2),
                "tokens_used": api_result.get('tokens_used', 0)
            }), 200
        else:
            logger.error(f"API call failed: {api_result.get('error')}")
            
            return jsonify({
                "error": "I'm experiencing technical difficulties. Please try again shortly.",
                "status": "error",
                "processing_time": round(processing_time, 2)
            }), 500
            
    except Exception as e:
        logger.exception(f"Unexpected error in chat endpoint: {str(e)}")
        
        return jsonify({
            "error": "An unexpected error occurred. Please try again.",
            "status": "error"
        }), 500

@chat_bp.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "Mate.AI",
        "version": current_app.config.get('APP_VERSION', '1.0.0')
    }), 200

@chat_bp.route('/api/config', methods=['GET'])
def get_config():
    """Get non-sensitive configuration (for frontend)"""
    return jsonify({
        "app_name": current_app.config.get('APP_NAME', 'Mate.AI'),
        "version": current_app.config.get('APP_VERSION', '1.0.0'),
        "max_input_length": current_app.config.get('SECURITY_MAX_INPUT_LENGTH', 1000),
        "scope": "General conversational assistance only"
    }), 200
