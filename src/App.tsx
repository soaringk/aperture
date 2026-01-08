import { useEffect } from 'react';
import { Layout } from '@/components/Layout';

function App() {
  useEffect(() => {
    if (import.meta.env.VITE_LLM_API_KEY) {
      console.warn('SECURITY WARNING: VITE_LLM_API_KEY detected in frontend environment. Please move this to server/.env as LLM_API_KEY and remove it from frontend .env file.');
    }
  }, []);

  return (
    <Layout />
  )
}

export default App
