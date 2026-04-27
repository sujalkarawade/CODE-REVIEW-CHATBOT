# 🤖 Code Review Chatbot

An AI-powered assistant that provides deep structural analysis, bug detection, and improvement suggestions for your codebase. Built with a bold, high-contrast **Brutalist Aesthetic** — no login required.

---

## ✨ Features

- **Bug Detection**: Identifies logical errors, security vulnerabilities, and performance bottlenecks with severity levels (Critical to Low).
- **Best Practice Suggestions**: Actionable insights on code style, modularity, and modern syntax.
- **Step-by-Step Explanations**: Breaks down complex functions into human-readable logic flows.
- **Follow-up Chat**: Ask specific questions about your code review in the side panel.
- **Review History**: Persistent storage of past reviews with quick stats and downloadable source files.
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
- **ORM**: Drizzle ORM
- **Database**: MySQL (via `mysql2`)
- **Storage**: AWS S3 (via Forge API)
- **Runtime**: Node.js

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- pnpm
- MySQL Database
- S3-compatible Storage (or Forge API access)

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
   DATABASE_URL=mysql://user:pass@localhost:3306/db
   BUILT_IN_FORGE_API_URL=...
   BUILT_IN_FORGE_API_KEY=...
   VITE_APP_ID=...
   ```

4. Initialize the database:
   ```bash
   npm run db:push
   ```

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
│   ├── routers/     # tRPC API definitions
│   └── db.ts        # Database queries
├── shared/          # Shared types & constants
├── drizzle/         # Database schema & migrations
└── public/          # Static assets
```

---

## 📄 License
Distributed under the MIT License.
