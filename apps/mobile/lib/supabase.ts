import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // Without a storage adapter the session is held in memory only, so every
        // app restart would create a brand new anonymous user.
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        // Only the web build can carry an auth callback in the URL.
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null;
