import { Button } from "@/components/ui/button";
import { Bookmark, Upload, Grid3x3, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { ProfileDropdown } from "./ProfileDropdown";
import { cn } from "@/lib/utils";

interface NavbarProps {
  user?: {
    email?: string;
    user_metadata?: {
      avatar_url?: string;
      full_name?: string;
    };
  } | null;
}

export const Navbar = ({ user }: NavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: Grid3x3 },
    { path: "/categories", label: "Categories", icon: Bookmark },
    { path: "/import", label: "Import", icon: Upload },
    { path: "/insights", label: "Insights", icon: BarChart3 },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-gradient-to-br from-primary/20 to-accent/20">
                <Bookmark className="h-5 w-5 text-primary" />
              </div>
              <span className="text-2xl font-semibold hidden sm:inline">SmartMark</span>
            </button>

            {user && (
              <div className="hidden md:flex items-center space-x-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Button
                      key={item.path}
                      variant="ghost"
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "flex items-center gap-2",
                        isActive && "bg-accent text-accent-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
          
          {user && <ProfileDropdown user={user} />}
        </div>
      </div>
    </nav>
  );
};