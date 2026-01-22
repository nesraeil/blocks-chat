# Blocks AI Chat Application

Full-stack AI chat app with authentication, streaming, and tool-driven agent activity.

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup

```bash
# Server
cd server && npm install

# Client
cd ../client && npm install
```

Create a `.env` file in the server directory:
```bash
cd server
cp .env.example .env
# Then edit .env and add your OpenAI API key
```

### Running

```bash
# Terminal 1 - Backend (localhost:3001)
cd server && npm run dev

# Terminal 2 - Frontend (localhost:5173)
cd client && npm run dev
```

Then open http://localhost:5173 and login with any email.

---

## Architecture

### Stack

| Layer | Tech | Why I chose it |
|-------|------|----------------|
| Frontend | React + TypeScript + Vite | Type safety, fast dev server |
| Backend | Express + TypeScript | Lightweight, good SSE support |
| Database | SQLite (sql.js) | Zero config, portable, easy to swap to Postgres later |
| Streaming | SSE | Simpler than WebSockets for unidirectional data |
| LLM | OpenAI GPT-4.1 | Good tool calling support |

### System Overview

```
┌───────────────────────────────────────────────────────────────┐
│                       Frontend (React)                         │
├─────────────────┬─────────────────────────────────────────────┤
│     Sidebar     │              Chat Container                  │
│  - History      │  - Message List                              │
│  - New Chat     │  - Streaming Messages                        │
│  - User Info    │  - Inline Tool Events & Previews             │
└────────┬────────┴───────────────────┬─────────────────────────┘
         │                  REST + SSE                           │
         │                      ▼                                │
┌──────┴─────────────────────────────────────────────────────────┐
│                       Backend (Express)                         │
├─────────────┬─────────────────────────────┬────────────────────┤
│  Auth API   │        Chat API (SSE)       │  Conversations API │
└──────┬──────┴──────────────┬──────────────┴─────────┬──────────┘
       │                     ▼                        │
       │     ┌───────────────────────────────┐        │
       │     │      Brain (Orchestrator)     │        │
       │     │  - OpenAI Integration         │        │
       │     │  - Tool Management            │        │
       │     └───────────────┬───────────────┘        │
       │          ┌──────────┴──────────┐             │
       │          ▼                     ▼             │
       │   ┌─────────────┐      ┌─────────────┐       │
       │   │ create_page │      │analyze_data │       │
       │   └─────────────┘      └─────────────┘       │
       │                                              │
       └────────────────────┬─────────────────────────┘
                            ▼
                   ┌─────────────────┐
                   │  SQLite Database │
                   └─────────────────┘
```

### Three Pillars

1. **Prompt Engineering** - Tool definitions with descriptions and JSON Schema guide the LLM on when/how to use each tool
2. **Context Engineering** - Full conversation history is passed to the LLM for context
3. **Orchestration** - The "Brain" coordinates LLM calls, tool execution, and streaming

---

## Tool Interface

I went with a registry pattern so adding tools is just "implement interface, register, done":

```typescript
interface Tool {
    name: string;
    description: string;
    inputSchema: object;
    $run: (input, context) => Promise<Result>;
}
```

### Current Tools

**create_page** - Generates complete HTML pages (forms, dashboards, landing pages, etc.)

**analyze_data** - Takes CSV/JSON/numbers and produces insight reports with visualizations

---

## Streaming

SSE felt like the right choice here since we only need server→client streaming. The tricky part was that EventSource only supports GET, so I had to implement POST with a streaming response body and parse the SSE format manually on the client.

```typescript
type SSEEvent = 
    | { type: 'content_delta'; content: string }
    | { type: 'tool_call_started'; tool: string; input: object }
    | { type: 'tool_call_result'; tool: string; result: object }
    | { type: 'message_complete'; messageId: string }
    | { type: 'error'; message: string };
```

---

## Auth

Kept this minimal on purpose - email-only, token in localStorage. The schema already has the right structure for proper auth, so adding password hashing later is straightforward.

---

## Tradeoffs

| Simplified | Reason | Would add in V2 |
|------------|--------|-----------------|
| Email-only auth | Focus on core features | bcrypt + JWT refresh |
| SQLite | Zero config for demo | PostgreSQL |
| localStorage tokens | Simple | HttpOnly cookies |
| No message editing | Time constraint | CRUD operations |

---

## What I'd build next

**Soon:**
- Proper password auth with bcrypt
- Message editing/deletion
- Conversation search

**Later:**
- Multi-model support (Claude, Gemini)
- File uploads
- Code execution sandbox
- Collaborative conversations

---

## Project Structure

```
project/
├── server/
│   ├── src/
│   │   ├── index.ts       # Express entry
│   │   ├── config.ts      # Env config
│   │   ├── db/            # SQLite
│   │   ├── middleware/    # Auth
│   │   ├── routes/        # API routes
│   │   ├── brain/         # LLM orchestration
│   │   └── tools/         # Tool implementations
│   └── package.json
│
├── client/
│   ├── src/
│   │   ├── App.tsx        # Main component
│   │   ├── api/           # API client
│   │   ├── hooks/         # React hooks
│   │   ├── components/    # UI components
│   │   └── types/         # TypeScript types
│   └── package.json
│
└── README.md
```

---

## Testing it out

1. Login with any email
2. Click "New Chat" or just start typing
3. Try: "Create a landing page for my startup" (triggers create_page)
4. Try: "Analyze this data: Jan 50k, Feb 62k, Mar 71k" (triggers analyze_data)
5. Watch the tool events appear inline while streaming

---