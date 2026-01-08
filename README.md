# Personal Multi-task LLM Assistant

A unified Single Page Application (SPA) designed to consolidate various conversational tools into one premium interface. Built with React, TypeScript, and Vite.

## Features

- **Unified Interface**: Access multiple specialized AI tools from a single sidebar with a glassmorphism design.
- **Silky Smooth Streaming**: Character-by-character text animation for a natural, typewriter-like reading experience.
- **Multi-modal Support**: Upload images, PDFs, and text files directly into the chat for advanced analysis and multi-modal conversations.
- **Persistent History**: All conversations, messages, and attachments are stored locally using IndexedDB. Use it across sessions without losing context.
- **Multi-Provider Support**: Switch seamlessly between **Google Gemini** and **OpenAI** (or compatible) providers with full multi-modal payload support.
- **Privacy First**: Data lives in your browser. API Keys are stored in local environment variables.
- **Specialized Apps**:
  - **随身翻译官 (Translator)**: Context-aware translation.
  - **措辞与关系顾问 (Wording Advisor)**: Advice on professional and personal communication.
  - **社交媒体表达器 (Social Media Expressor)**: Generate high-engagement posts.
  - **深度导读生成器 (Deep Reader)**: Summarize and analyze long texts.

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Styling**: Vanilla CSS (Variables, Dark/Light mode support)
- **State Management**: Custom React Hooks
- **Persistence**: `idb` (IndexedDB)
- **AI Integration**: `@google/genai` and `openai` SDKs

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- An API Key (Gemini or OpenAI)

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

### Configuration

1.  Copy the example environment file:
    ```bash
    cp .env.example .env
    ```
2.  Edit `.env` to configure your provider:

    **For Google Gemini (Default):**
    ```env
    VITE_LLM_PROVIDER=gemini
    VITE_LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta
    VITE_LLM_API_KEY=your_gemini_api_key
    VITE_LLM_MODEL=gemini-3-flash-preview
    ```

    **For OpenAI:**
    ```env
    VITE_LLM_PROVIDER=openai
    VITE_LLM_BASE_URL=https://api.openai.com/v1
    VITE_LLM_API_KEY=your_openai_api_key
    VITE_LLM_MODEL=gpt-4o
    ```

### Running Locally

Start the development server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production

```bash
npm run build
```

The output will be in the `dist` directory.

## License

MIT
