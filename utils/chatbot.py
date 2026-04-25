import requests

class CodeReviewChatbot:
    """Handles communication with OpenRouter for code analysis."""
    
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model
        self.url = "https://openrouter.ai/api/v1/chat/completions"
        
    def review_code(self, code: str) -> str:
        """
        Sends code snippet to OpenRouter and returns senior-level review feedback.
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a senior software engineer and security auditor. "
                        "Review the following code for: \n"
                        "1. Logic bugs\n"
                        "2. Security vulnerabilities\n"
                        "3. Performance optimizations\n"
                        "4. Readability and best practices.\n"
                        "Provide concise, actionable feedback."
                    )
                },
                {
                    "role": "user",
                    "content": f"Review this code:\n\n{code}"
                }
            ]
        }
        
        try:
            response = requests.post(self.url, headers=headers, json=payload)
            response.raise_for_status() # Raise an exception for HTTP errors
            data = response.json()
            return data["choices"][0]["message"]["content"]
        except Exception as e:
            return f"API Error: {str(e)}"
