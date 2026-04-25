import sys
# Prevents Python from writing .pyc or __pycache__ folders
sys.dont_write_bytecode = True

import webbrowser
from threading import Timer
from flask import Flask, render_template, request, jsonify
from config import config
from utils.chatbot import CodeReviewChatbot

app = Flask(__name__)

# Initialize the chatbot
chatbot = CodeReviewChatbot(
    api_key=config.OPENROUTER_API_KEY, 
    model=config.MODEL_NAME
)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/review", methods=["POST"])
def review_code():
    data = request.json
    code_content = data.get("code", "")
    
    if not code_content:
        return jsonify({"error": "No code provided"}), 400
        
    try:
        review_result = chatbot.review_code(code_content)
        return jsonify({"review": review_result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def open_browser():
    webbrowser.open_new("http://127.0.0.1:5000/")

def main():
    if not config.OPENROUTER_API_KEY:
        print("Error: OPENROUTER_API_KEY not found. Please set it in your .env file.")
        sys.exit(1)
        
    print("Starting Web Application...")
    print("If the browser doesn't open automatically, go to http://127.0.0.1:5000/")
    
    # Open browser automatically after a short delay
    Timer(1.5, open_browser).start()
    
    # Run the Flask app
    app.run(host="127.0.0.1", port=5000, debug=True, use_reloader=False)

if __name__ == "__main__":
    main()
