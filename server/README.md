# Aperture Server

This is the secure backend for Aperture. It handles LLM requests to prevent API key leakage.

## Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` and add your API Key:
   ```env
   LLM_API_KEY=your_actual_key_starting_with_sk-...
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm run dev
   ```

## API

- `POST /api/chat/openai`
- `POST /api/chat/gemini`
