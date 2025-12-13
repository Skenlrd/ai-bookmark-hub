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
    <nav className="sticky top-0 z-50 border-b border-white/20 bg-white/10 backdrop-blur-2xl">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-gradient-to-br from-[#C8E7F4]/60 to-[#F7C9D4]/60 shadow-[0_0_20px_#C8E7F4]/40">
                <Bookmark className="h-5 w-5 text-[#1B1F3B]" />
              </div>
              <span className="text-2xl font-semibold hidden sm:inline text-white/90">SmartMark</span>
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
                        "flex items-center gap-2 text-white/90 hover:text-white",
                        isActive && "bg-white/10 border border-white/20"
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