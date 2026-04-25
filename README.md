# AI Code Review Studio 🚀

AI Code Review Studio is a professional, web-based tool designed to automate code reviews using state-of-the-art Large Language Models (LLMs). Powered by OpenRouter and the Nemotron-120B model, it provides instant feedback on code quality, identifying potential bugs and suggesting modern performance improvements.

![Project Preview](https://via.placeholder.com/800x450.png?text=AI+Code+Review+Studio+Interface)

## ✨ Features

- **Automated Bug Detection**: Real-time analysis of code snippets to find logical errors and vulnerabilities.
- **Optimization Suggestions**: Provides concise advice on how to make your code more efficient and readable.
- **Elegant Web UI**: A high-end, dark-themed user interface built with Flask and Vanilla CSS.
- **Secure Configuration**: Built-in support for environment variables and secure `.gitignore` patterns.
- **Fast Integration**: Connects to OpenRouter's vast ecosystem of models (defaults to NVIDIA's Nemotron-3 Super 120B).

## 🛠️ Technologies Used

- **Backend**: Python, Flask
- **AI Integration**: OpenRouter API
- **Frontend**: HTML5, Vanilla CSS, JavaScript
- **Environment Management**: `python-dotenv`
- **Networking**: `requests`

## 📂 Project Structure

```text
CODE-REVIEW-CHATBOT/
├── static/                # CSS and frontend assets
├── templates/             # HTML templates for Flask
├── utils/
│   └── chatbot.py         # AI logic and API interaction
├── main.py                # Main Flask application entry point
├── config.py              # Configuration & Environment loading
├── .env.example           # Template for environment variables
├── .gitignore             # Git ignore rules
└── requirements.txt       # Python dependencies
```

## 🚀 Getting Started

### Prerequisites

- Python 3.8+
- An [OpenRouter API Key](https://openrouter.ai/keys)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/sujalkarawade/CODE-REVIEW-CHATBOT.git
   cd CODE-REVIEW-CHATBOT
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory and add your API key:
   ```env
   OPENROUTER_API_KEY=your_key_here
   MODEL_NAME=nvidia/nemotron-3-super-120b-a12b:free
   DEBUG=True
   ```

4. **Run the application**:
   ```bash
   python main.py
   ```

5. **Open in browser**:
   Navigate to `http://127.0.0.1:5000/` if it doesn't open automatically.

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request if you have ideas for new features or improvements.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
