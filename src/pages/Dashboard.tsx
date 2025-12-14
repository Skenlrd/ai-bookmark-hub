import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Navbar } from "@/components/Navbar";
import { AddBookmarkDialog } from "@/components/AddBookmarkDialog";
import { BookmarkCard } from "@/components/BookmarkCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { categorizeWithGroq } from "@/lib/groq";
import type { Tables } from "@/integrations/supabase/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Bookmark = Tables<"bookmarks">;

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [filteredBookmarks, setFilteredBookmarks] = useState<Bookmark[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [categorizingAll, setCategorizingAll] = useState(false);
  const [categorizingProgress, setCategorizingProgress] = useState(0);
  const [selectedBookmarks, setSelectedBookmarks] = useState<Set<string>>(new Set());

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

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchBookmarks(session.user.id);
      } else {
        setUser(null);
        navigate("/auth");
      }
    });

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
      setFilteredBookmarks(data || []);
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

  const handleSelectAll = () => {
    if (selectedBookmarks.size === filteredBookmarks.length) {
      setSelectedBookmarks(new Set());
    } else {
      setSelectedBookmarks(new Set(filteredBookmarks.map(b => b.id)));
    }
  };

  const handleSelectBookmark = (id: string) => {
    const newSelected = new Set(selectedBookmarks);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedBookmarks(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedBookmarks.size === 0) {
      toast.error("No bookmarks selected");
      return;
    }

    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .in('id', Array.from(selectedBookmarks));

    if (error) {
      toast.error("Failed to delete bookmarks");
    } else {
      toast.success(`Deleted ${selectedBookmarks.size} bookmarks`);
      setSelectedBookmarks(new Set());
      handleBookmarkDeleted();
    }
  };

  const categorizeAllUncategorized = async () => {
    const uncategorized = bookmarks.filter(b => !b.category || b.category === "Uncategorized");
    
    if (uncategorized.length === 0) {
      toast.info("All bookmarks are already categorized!");
      return;
    }

    setCategorizingAll(true);
    setCategorizingProgress(0);
    let successCount = 0;

    for (let i = 0; i < uncategorized.length; i++) {
      const bookmark = uncategorized[i];
      
      try {
        const result = await categorizeWithGroq(bookmark.url, bookmark.title);
        
        // Add delay to respect rate limits (200ms is enough for Groq)
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const { error } = await supabase
          .from('bookmarks')
          .update({
            category: result.category,
            subcategory: result.subcategory,
            description: result.description,
          })
          .eq('id', bookmark.id);

        if (!error) {
          successCount++;
        }
        
        // Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to categorize ${bookmark.title}:`, error);
      }

      setCategorizingProgress(((i + 1) / uncategorized.length) * 100);
    }

    setCategorizingAll(false);
    setCategorizingProgress(0);
    
    if (successCount > 0) {
      toast.success(`Categorized ${successCount} bookmarks!`);
      if (user) {
        fetchBookmarks(user.id);
      }
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
                <>
                  <Button 
                    onClick={categorizeAllUncategorized}
                    disabled={categorizingAll}
                    variant="outline"
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    {categorizingAll ? `Categorizing... ${Math.round(categorizingProgress)}%` : "Categorize All"}
                  </Button>
                  <Button 
                    onClick={handleSelectAll}
                    variant={selectedBookmarks.size > 0 ? "default" : "outline"}
                  >
                    {selectedBookmarks.size > 0 ? `Selected ${selectedBookmarks.size}` : "Select All"}
                  </Button>
                  {selectedBookmarks.size > 0 && (
                    <Button 
                      onClick={handleDeleteSelected}
                      variant="destructive"
                    >
                      Delete ({selectedBookmarks.size})
                    </Button>
                  )}
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
                </>
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
                  isSelected={selectedBookmarks.has(bookmark.id)}
                  onSelect={handleSelectBookmark}
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
