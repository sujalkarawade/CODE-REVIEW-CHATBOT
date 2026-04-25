from openai import OpenAI

class CodeReviewChatbot:
    """Handles communication with OpenRouter for code analysis."""
    
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model
        # OpenRouter uses the OpenAI-compatible SDK
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=self.api_key,
        )
        
    def review_code(self, code: str) -> str:
        """
        Sends code snippet to OpenRouter and returns senior-level review feedback.
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
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
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"API Error: {str(e)}"
