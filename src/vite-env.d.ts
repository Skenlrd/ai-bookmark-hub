/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // You can add other VITE_ variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}