import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Navbar } from "@/components/Navbar";
import { AddBookmarkDialog } from "@/components/AddBookmarkDialog";
import { BookmarkCard } from "@/components/BookmarkCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download } from "lucide-react";
  return (
    <div className="min-h-screen" style={{
      background: "radial-gradient(1200px 600px at 10% -10%, #C8E7F4 0%, transparent 60%), radial-gradient(1200px 800px at 110% 10%, #F7C9D4 0%, transparent 60%), linear-gradient(180deg, #1B1F3B 0%, #101326 100%)"
    }}>
  DropdownMenu,
  DropdownMenuContent,
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl md:text-4xl text-white/90" style={{ fontFamily: 'Press Start 2P, system-ui' }}>
                保存 — My Bookmarks
              </h1>
              <p className="text-white/70" style={{ fontFamily: 'Noto Sans JP, Inter, system-ui' }}>
                {bookmarks.length} {bookmarks.length === 1 ? "bookmark" : "bookmarks"} saved
              </p>
  favicon_url: string | null;
            <div className="flex gap-2">
  subcategory: string | null;
  notes: string | null;
  created_at: string;
                    <Button className="rounded-full border border-white/20 bg-gradient-to-r from-[#C8E7F4]/80 to-[#F7C9D4]/80 text-[#1B1F3B] hover:shadow-[0_0_20px_#C8E7F4]">
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
  const [user, setUser] = useState<User | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [filteredBookmarks, setFilteredBookmarks] = useState<Bookmark[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchBookmarks(session.user.id);
      } else {
        navigate("/auth");
      }
      setLoading(false);
    });
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/70" />
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
                className="pl-12 h-12 rounded-full bg-white/20 text-white placeholder:text-white/70 border border-white/20 backdrop-blur-xl focus-visible:ring-0 focus-visible:border-white/40"
        fetchBookmarks(session.user.id);
      } else {
        setUser(null);
        navigate("/auth");
      }
    });
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchBookmarks = async (userId: string) => {
    const { data, error } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching bookmarks:", error);
      toast.error("Failed to load bookmarks");
    } else {
      setBookmarks(data || []);
              <p className="text-xl text-white/70 mb-6" style={{ fontFamily: 'Noto Sans JP, Inter, system-ui' }}>
    }
  };

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredBookmarks(bookmarks);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = bookmarks.filter(
        (bookmark) =>
          bookmark.title.toLowerCase().includes(query) ||
          bookmark.description?.toLowerCase().includes(query) ||
          bookmark.category?.toLowerCase().includes(query) ||
          bookmark.subcategory?.toLowerCase().includes(query) ||
          bookmark.url.toLowerCase().includes(query)
      );
      setFilteredBookmarks(filtered);
    }
  }, [searchQuery, bookmarks]);

  const handleBookmarkAdded = () => {
    if (user) {
      fetchBookmarks(user.id);
    }
  };

  const handleBookmarkDeleted = () => {
    if (user) {
      fetchBookmarks(user.id);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    const { data, error } = await supabase.functions.invoke('export-bookmarks', {
      body: { format }
    });

    if (error) {
      toast.error("Failed to export bookmarks");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold">My Bookmarks</h1>
              <p className="text-muted-foreground mt-2">
                {bookmarks.length} {bookmarks.length === 1 ? "bookmark" : "bookmarks"} saved
              </p>
            </div>
            <div className="flex gap-2">
              {bookmarks.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleExport('json')}>
                      Export as JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('csv')}>
                      Export as CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <AddBookmarkDialog onBookmarkAdded={handleBookmarkAdded} />
            </div>
          </div>

          {/* Search */}
          {bookmarks.length > 0 && (
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search bookmarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          {/* Bookmarks Grid */}
          {filteredBookmarks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBookmarks.map((bookmark) => (
                <BookmarkCard
                  key={bookmark.id}
                  {...bookmark}
                  description={bookmark.description || undefined}
                  favicon_url={bookmark.favicon_url || undefined}
                  category={bookmark.category || undefined}
                  subcategory={bookmark.subcategory || undefined}
                  notes={bookmark.notes || undefined}
                  onDelete={handleBookmarkDeleted}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-xl text-muted-foreground mb-6">
                {searchQuery ? "No bookmarks found matching your search" : "No bookmarks yet"}
              </p>
              {!searchQuery && (
                <AddBookmarkDialog onBookmarkAdded={handleBookmarkAdded} />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;