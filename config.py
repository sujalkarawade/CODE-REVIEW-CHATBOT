import os
from dotenv import load_dotenv

# Load environment variables from a .env file if it exists
load_dotenv()

class Config:
    """Configuration class for the AI Code Review Chatbot."""
    # OpenRouter API key
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
    
    # Model name to use (e.g., 'openai/gpt-3.5-turbo', 'anthropic/claude-3-haiku')
    MODEL_NAME = os.getenv("MODEL_NAME", "nvidia/nemotron-3-super-120b-a12b:free")
    
    # App Settings
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"

config = Config()
