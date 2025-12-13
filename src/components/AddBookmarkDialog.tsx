import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { supabase, ensureProfile } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddBookmarkDialogProps {
  onBookmarkAdded: () => void;
}

export const AddBookmarkDialog = ({ onBookmarkAdded }: AddBookmarkDialogProps) => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const extractMetadata = async (urlString: string) => {
    try {
      const urlObj = new URL(urlString);
      const title = urlObj.hostname.replace("www.", "");
      const favicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
      
      return { title, favicon };
    } catch (error) {
      return { title: urlString, favicon: "" };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    setLoading(true);

    try {
      // Extract basic metadata
      const { title, favicon } = await extractMetadata(url);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to add bookmarks");
        return;
      }

      // Ensure user profile exists for FK constraint
      await ensureProfile();

      // Optionally call AI categorization
      const enableAI = import.meta.env.VITE_ENABLE_AI_CATEGORIZATION === 'true';
      let categorization: any = null;
      if (enableAI) {
        const { data, error: aiError } = await supabase.functions.invoke(
          'categorize-bookmark',
          { body: { url, title } }
        );
        if (aiError) {
          console.error("AI categorization error:", aiError);
        } else {
          categorization = data;
        }
      }

      // Insert bookmark with AI-generated data
      const { error: insertError } = await supabase
        .from('bookmarks')
        .insert({
          user_id: user.id,
          url: url.trim(),
          title: title,
          description: categorization?.description || "No description available",
          favicon_url: favicon,
          category: categorization?.category || "Uncategorized",
          subcategory: categorization?.subcategory || "General",
          notes: notes.trim() || null,
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        toast.error("Failed to save bookmark");
        return;
      }

      toast.success("Bookmark added successfully!");
      setUrl("");
      setNotes("");
      setOpen(false);
      onBookmarkAdded();
    } catch (error) {
      console.error("Error adding bookmark:", error);
      toast.error("An error occurred while adding the bookmark");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="rounded-full border border-white/20 bg-gradient-to-r from-[#F7C9D4]/80 via-[#C8E7F4]/80 to-[#CDE6C1]/80 text-[#1B1F3B] shadow-[0_0_12px_#F7C9D4] hover:shadow-[0_0_24px_#C8E7F4]"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add Bookmark
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl" style={{ fontFamily: 'Noto Sans JP, Inter, system-ui' }}>Add New Bookmark</DialogTitle>
          <DialogDescription>
            Enter a URL and let AI organize it for you
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any personal notes about this bookmark..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Bookmark"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};