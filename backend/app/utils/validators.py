from typing import Optional, Tuple
import re

class InputValidator:
    @staticmethod
    def validate_message(message: str, max_length: int = 1000) -> Tuple[bool, Optional[str]]:
        """
        Validate user message
        Returns: (is_valid, error_message)
        """
        if not message or not isinstance(message, str):
            return False, "Message cannot be empty"
        
        message = message.strip()
        
        if len(message) > max_length:
            return False, f"Message exceeds maximum length of {max_length} characters"
        
        if len(message) < 1:
            return False, "Message is too short"
        
        # Check for excessive whitespace
        if re.match(r'^\s+$', message):
            return False, "Message contains only whitespace"
        
        # Basic profanity/safety check (can be expanded)
        blacklist = []
        for word in blacklist:
            if word.lower() in message.lower():
                return False, "Message contains prohibited content"
        
        return True, None
    
    @staticmethod
    def sanitize_output(text: str) -> str:
        """Sanitize AI response"""
        if not text:
            return ""
        
        # Remove excessive newlines
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # Trim whitespace
        text = text.strip()
        
        return text
