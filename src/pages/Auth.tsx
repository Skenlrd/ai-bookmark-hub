import { Auth as SupabaseAuth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Bookmark } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
              <Bookmark className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold">SmartMark</h1>
            <p className="text-lg text-muted-foreground mt-2">
              AI-powered bookmark management
            </p>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-xl p-8 border">
          <SupabaseAuth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: "hsl(211 100% 50%)",
                    brandAccent: "hsl(211 100% 45%)",
                  },
                  radii: {
                    borderRadiusButton: "0.75rem",
                    buttonBorderRadius: "0.75rem",
                    inputBorderRadius: "0.75rem",
                  },
                },
              },
              className: {
                container: "space-y-4",
                button: "font-medium",
                input: "font-normal",
              },
            }}
            providers={["google"]}
            redirectTo={`${window.location.origin}/dashboard`}
          />
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Sign up or sign in to start organizing your bookmarks
        </p>
      </div>
    </div>
  );
};

export default Auth;