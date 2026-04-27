# 🤖 Code Review Chatbot

An AI-powered assistant that provides deep structural analysis, bug detection, and improvement suggestions for your codebase. Built with a bold, high-contrast **Brutalist Aesthetic** — no login, no database, no storage required.

---

## ✨ Features

- **Bug Detection**: Identifies logical errors, security vulnerabilities, and performance bottlenecks with severity levels (Critical to Low).
- **Best Practice Suggestions**: Actionable insights on code style, modularity, and modern syntax.
- **Step-by-Step Explanations**: Breaks down complex functions into human-readable logic flows.
- **Follow-up Chat**: Ask specific questions about your code review in the side panel.
- **Session History**: Browse all reviews from the current session.
- **Language Aware**: Supports `.py`, `.js`, `.ts`, `.java`, `.cpp`, `.go`, `.rs`, and more.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS 4 + Radix UI
- **Routing**: Wouter
- **Animations**: Framer Motion
- **Data Fetching**: tRPC + TanStack Query

### Backend
- **Server**: Express.js
- **API**: tRPC (end-to-end type safety)
- **AI**: OpenRouter API (Gemini 2.5 Flash)
- **Runtime**: Node.js

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd code-review-chatbot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables — create a `.env` file in the root:
   ```env
   OPENROUTER_API_KEY=your_openrouter_api_key
   ```
   Get a free API key at [openrouter.ai](https://openrouter.ai).

---

## 🏃 Usage

### Development
```bash
npm run dev
```

### Build & Production
```bash
npm run build
npm start
```

### Testing
```bash
npm run test
```

---

## 📂 Project Structure

```
├── client/          # React 19 frontend (Vite)
├── server/          # Express + tRPC backend
│   ├── _core/       # Server config & middleware
│   └── routers/     # tRPC API definitions
├── shared/          # Shared types & constants
└── public/          # Static assets
```

> Reviews and chat history are stored in-memory and reset on server restart.

---

## 📄 License
Distributed under the MIT License.
