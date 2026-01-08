import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const requiredVars = ['VITE_LLM_API_KEY', 'VITE_LLM_PROVIDER', 'VITE_LLM_MODEL'];
  const missing = requiredVars.filter(key => !env[key]);

  if (missing.length > 0) {
    console.error(`\n\x1b[31m[ERROR] Missing required environment variables: ${missing.join(', ')}\x1b[0m`);
    console.error(`\x1b[33mPlease set them in your .env file before starting the app.\x1b[0m\n`);
    process.exit(1);
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    }
  }
})
