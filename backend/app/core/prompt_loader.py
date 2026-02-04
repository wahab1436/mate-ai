from pathlib import Path
from typing import Dict

class PromptLoader:
    def __init__(self, config: Dict):
        self.config = config
        self.prompts = {}
        self.load_all_prompts()
    
    def load_all_prompts(self):
        """Load all prompt files from configuration"""
        base_path = Path(__file__).parent.parent.parent
        
        prompt_files = {
            'system': self.config.get('PROMPTS_SYSTEM_PATH'),
            'style': self.config.get('PROMPTS_STYLE_PATH'),
            'safety': self.config.get('PROMPTS_SAFETY_PATH')
        }
        
        for name, relative_path in prompt_files.items():
            if relative_path:
                full_path = base_path / relative_path
                try:
                    with open(full_path, 'r', encoding='utf-8') as f:
                        self.prompts[name] = f.read().strip()
                except FileNotFoundError:
                    self.prompts[name] = f"Prompt file not found: {relative_path}"
                except Exception as e:
                    self.prompts[name] = f"Error loading prompt: {str(e)}"
    
    def get_system_prompt(self) -> str:
        return self.prompts.get('system', '')
    
    def get_style_prompt(self) -> str:
        return self.prompts.get('style', '')
    
    def get_safety_prompt(self) -> str:
        return self.prompts.get('safety', '')
    
    def construct_full_prompt(self, user_message: str) -> str:
        """Construct complete prompt from all components"""
        system = self.get_system_prompt()
        style = self.get_style_prompt()
        safety = self.get_safety_prompt()
        
        prompt = f"""{system}

{style}

{safety}

Current conversation:
User: {user_message}
Assistant: """
        
        return prompt.strip()
