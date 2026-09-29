import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

const STORAGE_KEY = 'pantry-and-me:theme-preference';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ColorScheme = 'light' | 'dark';

interface ThemeContextValue {
  /** What the user chose in Settings. */
  preference: ThemePreference;
  /** Resolved scheme used by the UI. */
  colorScheme: ColorScheme;
  setPreference: (preference: ThemePreference) => Promise<void>;
  ready: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setPreference = useCallback(async (next: ThemePreference) => {
    setPreferenceState(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const colorScheme: ColorScheme = useMemo(() => {
    if (preference === 'light' || preference === 'dark') return preference;
    return systemScheme === 'dark' ? 'dark' : 'light';
  }, [preference, systemScheme]);

  const value = useMemo(
    () => ({
      preference,
      colorScheme,
      setPreference,
      ready,
    }),
    [colorScheme, preference, ready, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePreference(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useThemePreference must be used inside a ThemePreferenceProvider.');
  }

  return context;
}

/** Resolved light/dark scheme for styling. Falls back to light outside the provider. */
export function useResolvedColorScheme(): ColorScheme {
  const context = useContext(ThemeContext);
  const systemScheme = useSystemColorScheme();

  if (context) return context.colorScheme;
  return systemScheme === 'dark' ? 'dark' : 'light';
}
