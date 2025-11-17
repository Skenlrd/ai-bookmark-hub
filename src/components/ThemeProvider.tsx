import { createContext, useContext, useEffect, useState } from "react";
import { supabase, ensureProfile } from "@/integrations/supabase/client";

type Theme = "light" | "dark";

type ThemeProviderProps = {
  children: React.ReactNode;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Load theme from user profile
    const loadTheme = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Make sure a profile exists to avoid 406/409s
        await ensureProfile();
        const { data: profile } = await supabase
          .from('profiles')
          .select('dark_mode')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profile) {
          setThemeState(profile.dark_mode ? "dark" : "light");
        }
      }
    };
    
    loadTheme();
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme, mounted]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    
    // Save to user profile
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ dark_mode: newTheme === "dark" })
        .eq('id', user.id);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};