import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, ensureProfile } from "../integrations/supabase/client"; // Corrected path
import { User } from "@supabase/supabase-js";
import { Navbar } from "../components/Navbar"; // Corrected path
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, FileJson, Loader2 } from "lucide-react";
import { categorizeWithGroq } from "@/lib/groq";

interface BookmarkItem {
  title: string;
  url: string;
}

const Import = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalBookmarks, setTotalBookmarks] = useState(0);
  const [processedBookmarks, setProcessedBookmarks] = useState(0); // This will now track successful inserts

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate("/auth");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const parseBookmarksFile = async (file: File): Promise<BookmarkItem[]> => {
    const text = await file.text();
    const bookmarks: BookmarkItem[] = [];

    try {
      // Try parsing as JSON first
      const json = JSON.parse(text);
      
      // Chrome/Edge format
      const extractChrome = (node: any) => {
        if (node.type === "url" && node.url) {
          bookmarks.push({
            title: node.name || new URL(node.url).hostname,
            url: node.url,
          });
        }
        if (node.children) {
          node.children.forEach(extractChrome);
        }
      };

      if (json.roots) {
        // Chrome bookmarks
        Object.values(json.roots).forEach((root: any) => extractChrome(root));
      } else if (Array.isArray(json)) {
        // Simple JSON array
        json.forEach((item: any) => {
          if (item.url) {
            bookmarks.push({
              title: item.title || item.name || new URL(item.url).hostname,
              url: item.url,
            });
          }
        });
      }
    } catch {
      // Try parsing as HTML (Firefox/Safari)
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "text/html");
      const links = doc.querySelectorAll("a[href]");
      
      links.forEach((link) => {
        const href = link.getAttribute("href");
        if (href && href.startsWith("http")) {
          bookmarks.push({
            title: link.textContent || new URL(href).hostname,
            url: href,
          });
        }
      });
    }

    return bookmarks;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setImporting(true);
    setProgress(0);
    setProcessedBookmarks(0);
    let successfulImports = 0; // Create a separate counter for successful imports

    try {
      const bookmarks = await parseBookmarksFile(file);
      
      if (bookmarks.length === 0) {
        toast.error("No bookmarks found in file");
        setImporting(false);
        return;
      }

      setTotalBookmarks(bookmarks.length);
      toast.info(`Found ${bookmarks.length} bookmarks. Starting import...`);

      // Ensure user profile exists for FK constraint once per import
      await ensureProfile();

      // Import bookmarks
      for (let i = 0; i < bookmarks.length; i++) {
        const bookmark = bookmarks[i];

        try {
          // Optionally call AI categorization when enabled
          const enableAI = import.meta.env.VITE_ENABLE_AI_CATEGORIZATION === 'true';
          let categorization: any = null;
          if (enableAI) {
            try {
              categorization = await categorizeWithGroq(bookmark.url, bookmark.title);
              // Groq has good rate limits, but add small delay anyway
              await new Promise(resolve => setTimeout(resolve, 200));
            } catch (aiError) {
              console.error("AI categorization error:", aiError);
              // Continue without categorization if it fails
            }
          }

          // Extract favicon
          const urlObj = new URL(bookmark.url);
          const favicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;

          // Insert bookmark
          const { error: insertError } = await supabase.from('bookmarks').insert({
            user_id: user.id,
            url: bookmark.url,
            title: bookmark.title,
            description: categorization?.description || bookmark.title,
            favicon_url: favicon,
            category: categorization?.category || "Uncategorized",
            subcategory: categorization?.subcategory || "General",
          });

          if (insertError) {
            // If insert fails (e.g., RLS, foreign key), throw error to be caught
            throw insertError;
          }

          // This code only runs if the insert was SUCCESSFUL
          successfulImports++; 
          setProcessedBookmarks(successfulImports); // Update UI with successful count

        } catch (error) {
          console.error(`Failed to import ${bookmark.url}:`, error);
          // This will log the error to the browser console and continue to the next bookmark
        }
        
        // Update progress bar regardless of individual success/failure
        setProgress(((i + 1) / bookmarks.length) * 100);

        // Small delay to avoid rate limiting
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // Use the successfulImports counter for the final message
      if (successfulImports > 0) {
        toast.success(`Successfully imported ${successfulImports} bookmarks!`);
        setTimeout(() => navigate("/dashboard"), 2000);
      } else {
        toast.error("Import failed. All bookmarks encountered an error. Please check the browser console.");
      }
      
    } catch (error) {
      console.error("Import error:", error);
      toast.error("A critical error occurred during import.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-bold">Import Bookmarks</h1>
            <p className="text-muted-foreground mt-2">
              Upload your browser bookmarks and let AI organize them
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Upload Bookmarks File</CardTitle>
              <CardDescription>
                Supports Chrome, Firefox, Safari, and Edge bookmark exports (JSON or HTML)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="file-upload"
                  className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors ${
                    importing ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {importing ? (
                      <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                    ) : (
                      <>
                        <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="mb-2 text-sm text-muted-foreground">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          JSON or HTML bookmark files
                        </p>
                      </>
                    )}
                  </div>
                  <Input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".json,.html,.htm"
                    onChange={handleFileUpload}
                    disabled={importing}
                  />
                </label>
              </div>

              {importing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Importing bookmarks... {processedBookmarks} / {totalBookmarks}
                    </span>
                    <span className="font-medium">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-medium">How to export your bookmarks:</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground">Chrome/Edge:</p>
                    <p>Settings → Bookmarks → Bookmark Manager → ⋮ → Export bookmarks</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Firefox:</p>
                    <p>Bookmarks → Manage Bookmarks → Import and Backup → Export Bookmarks to HTML</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Safari:</p>
                    <p>File → Export Bookmarks</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <FileJson className="h-5 w-5 text-primary mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">AI-Powered Organization</p>
                  <p className="text-sm text-muted-foreground">
                    Each bookmark will be automatically categorized and described using AI. This may
                    take a few minutes for large imports.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Import;