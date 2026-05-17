/**
 * Supabase client.
 *
 * Uses the publishable (anon) key. Row Level Security policies in the
 * database enforce that users can only read/write their own rows.
 */

import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // We avoid throwing here so the app still renders during early dev.
  // Screens that hit the network will fail loudly when actually used.
  console.warn(
    "[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local",
  );
}

// 在 web 靜態渲染時 Expo 會在 Node 執行此模組，Node 沒有 window；
// AsyncStorage 的 web 實作會呼叫 window.localStorage 而 crash。
// React Native 與瀏覽器都有 window，因此這個判斷只會在「伺服器端」關閉持久化。
const isServer = typeof window === "undefined";

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "", {
  auth: {
    storage: isServer ? undefined : AsyncStorage,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: false,
  },
});
