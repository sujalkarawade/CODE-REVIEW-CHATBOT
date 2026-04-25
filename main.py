import argparse
import sys
from config import config
from utils.chatbot import CodeReviewChatbot

def main():
    """Main entry point for the AI Code Review tool."""
    print("--- AI Code Review Chatbot (Powered by OpenRouter) ---")
    
    if not config.OPENROUTER_API_KEY:
        print("Error: OPENROUTER_API_KEY not found. Please set it in your .env file.")
        sys.exit(1)

    # Initialize the chatbot
    chatbot = CodeReviewChatbot(
        api_key=config.OPENROUTER_API_KEY, 
        model=config.MODEL_NAME
    )
    
    # Set up CLI arguments
    parser = argparse.ArgumentParser(description="AI Code Review Chatbot")
    parser.add_argument("--file", type=str, help="Path to the source file to review")
    args = parser.parse_args()
    
    if args.file:
        print(f"Reading file: {args.file}...")
        try:
            with open(args.file, "r", encoding="utf-8") as f:
                code_content = f.read()
            
            print("Requesting review from AI...")
            review_result = chatbot.review_code(code_content)
            
            print("\n" + "="*30)
            print("REVIEW RESULTS")
            print("="*30)
            print(review_result)
            
        except Exception as e:
            print(f"Error: {e}")
    else:
        print("Usage: python main.py --file <path_to_file>")

if __name__ == "__main__":
    main()
