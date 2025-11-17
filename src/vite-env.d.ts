/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_ENABLE_AI_CATEGORIZATION?: string;
  // You can add other VITE_ variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}