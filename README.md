# Code Review Chatbot

An AI-powered code review tool built with vanilla JavaScript, CSS, and Express. Upload or paste your code and get instant analysis — bugs, suggestions, and a plain-English explanation. Then chat with the AI about your code.

## Features

- **Upload or paste code** — supports 20+ languages
- **AI analysis** — detects bugs with severity levels, improvement suggestions, and a code explanation
- **Chat** — ask follow-up questions about your code
- **Review history** — browse all past reviews in the current session
- **Syntax highlighting** — powered by highlight.js
- **Fast** — uses Groq's `llama-3.1-8b-instant`, one of the fastest free LLMs available

## Tech Stack

| Layer    | Tech                        |
|----------|-----------------------------|
| Frontend | Vanilla JS, Plain CSS, Vite |
| Backend  | Node.js, Express            |
| AI       | Groq API (llama-3.1-8b-instant) |

## Getting Started

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd code-review-chatbot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root:

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
PORT=3000
```

Get a free API key at [console.groq.com](https://console.groq.com).

### 4. Run the app

```bash
node server/index.js
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
├── client/
│   ├── index.html
│   ├── style.css
│   ├── main.js
│   └── pages/
│       ├── home.js       # Upload / paste code
│       ├── review.js     # Analysis results + chat
│       └── history.js    # Past reviews
│
├── server/
│   ├── index.js          # Express + Vite middleware
│   ├── env.js            # Environment config
│   ├── llm.js            # Groq API wrapper
│   └── routes/
│       └── codeReview.js # REST API endpoints
│
├── .env                  # API keys (not committed)
├── vite.config.js
└── package.json
```

## API Endpoints

| Method | Endpoint                    | Description              |
|--------|-----------------------------|--------------------------|
| POST   | `/api/reviews`              | Upload and analyze code  |
| GET    | `/api/reviews`              | Get all review history   |
| GET    | `/api/reviews/:id`          | Get a specific review    |
| POST   | `/api/reviews/:id/chat`     | Send a chat message      |
| GET    | `/api/reviews/:id/chat`     | Get chat history         |

## Supported Languages

Python, JavaScript, TypeScript, Java, C, C++, C#, Ruby, Go, Rust, PHP, Swift, Kotlin, Bash, SQL, HTML, CSS, JSON, XML, YAML

## Notes

- Reviews are stored in memory and reset when the server restarts
- Files larger than 8,000 characters are truncated before analysis
