/// <reference types="expo/types" />

// NOTE: This file should not be edited and should be in your git ignore
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_SUPABASE_URL: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
    EXPO_PUBLIC_GEMINI_API_KEY: string;
    EXPO_PUBLIC_RPPG_API_URL: string;
  }
}
