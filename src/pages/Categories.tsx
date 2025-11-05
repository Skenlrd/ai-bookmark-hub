import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Navbar } from "@/components/Navbar";
import { BookmarkCard } from "@/components/BookmarkCard";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import { BookmarkSkeleton } from "@/components/BookmarkSkeleton";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Bookmark {
  id: string;
  title: string;
  url: string;
  description: string | null;
  favicon_url: string | null;
  category: string | null;
  subcategory: string | null;
  notes: string | null;
}

interface CategoryGroup {
  category: string;
  count: number;
  bookmarks: Bookmark[];
}

const Categories = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [openCategories, setOpenCategories] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchBookmarks(session.user.id);
      } else {
        navigate("/auth");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchBookmarks(session.user.id);
      } else {
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
      groupByCategory(data || []);
    }
    setLoading(false);
  };

  const groupByCategory = (bookmarksList: Bookmark[]) => {
    const groups: Record<string, Bookmark[]> = {};

    bookmarksList.forEach((bookmark) => {
      const category = bookmark.category || "Uncategorized";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(bookmark);
    });

    const categoryArray: CategoryGroup[] = Object.entries(groups).map(
      ([category, bookmarks]) => ({
        category,
        count: bookmarks.length,
        bookmarks,
      })
    );

    categoryArray.sort((a, b) => b.count - a.count);
    setCategoryGroups(categoryArray);
    
    // Open the first category by default
    if (categoryArray.length > 0) {
      setOpenCategories([categoryArray[0].category]);
    }
  };

  const filteredGroups = categoryGroups
    .map((group) => ({
      ...group,
      bookmarks: group.bookmarks.filter(
        (bookmark) =>
          bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bookmark.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bookmark.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bookmark.subcategory?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((group) => group.bookmarks.length > 0);

  const toggleCategory = (category: string) => {
    setOpenCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleBookmarkDeleted = () => {
    if (user) {
      fetchBookmarks(user.id);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-bold">Categories</h1>
            <p className="text-muted-foreground mt-2">
              Browse your bookmarks organized by AI-generated categories
            </p>
          </div>

          {/* Search */}
          {bookmarks.length > 0 && (
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search within categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          {/* Category Groups */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="h-6 w-48 bg-muted animate-pulse rounded" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : filteredGroups.length > 0 ? (
            <div className="space-y-4">
              {filteredGroups.map((group) => (
                <Collapsible
                  key={group.category}
                  open={openCategories.includes(group.category)}
                  onOpenChange={() => toggleCategory(group.category)}
                >
                  <Card>
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {openCategories.includes(group.category) ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div className="text-left">
                              <CardTitle className="text-2xl">{group.category}</CardTitle>
                              <CardDescription className="mt-1">
                                {group.count} {group.count === 1 ? "bookmark" : "bookmarks"}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-lg px-4 py-1">
                            {group.count}
                          </Badge>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                          {group.bookmarks.map((bookmark) => (
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
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <p className="text-xl text-muted-foreground">
                  {searchQuery
                    ? "No bookmarks found matching your search"
                    : "No bookmarks yet. Start adding some!"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Categories;