import { ExternalLink, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BookmarkCardProps {
  id: string;
  title: string;
  url: string;
  description?: string;
  favicon_url?: string;
  category?: string;
  subcategory?: string;
  notes?: string;
  onDelete: () => void;
}

export const BookmarkCard = ({
  id,
  title,
  url,
  description,
  favicon_url,
  category,
  subcategory,
  notes,
  onDelete,
}: BookmarkCardProps) => {
  const [syncing, setSyncing] = useState(false);

  const handleDelete = async () => {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Failed to delete bookmark");
    } else {
      toast.success("Bookmark deleted");
      onDelete();
    }
  };

  const handleNotionSync = async () => {
    setSyncing(true);
    const { error } = await supabase.functions.invoke('notion-sync', {
      body: { bookmarkId: id }
    });

    if (error) {
      toast.error(error.message || "Failed to sync to Notion");
    } else {
      toast.success("Synced to Notion successfully!");
    }
    setSyncing(false);
  };

  return (
    <Card className="group transition-all duration-300 bg-white/12 backdrop-blur-xl border border-white/20 rounded-2xl hover:shadow-[0_0_24px_#C8E7F4] hover:border-white/30">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            {favicon_url && (
              <img 
                src={favicon_url} 
                alt="" 
                className="h-8 w-8 rounded-lg flex-shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg leading-tight line-clamp-2 text-white/95">
                {title}
              </CardTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                {category && (
                  <Badge variant="secondary" className="text-xs bg-white/20 text-white border border-white/20">
                    {category}
                  </Badge>
                )}
                {subcategory && (
                  <Badge variant="outline" className="text-xs bg-transparent text-white/80 border-white/30">
                    {subcategory}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNotionSync}
              disabled={syncing}
              title="Sync to Notion"
              className="text-white/80 hover:text-white"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              className="text-white/80 hover:text-white"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
        {description && (
          <CardDescription className="text-sm line-clamp-2 text-white/80">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {notes && (
            <p className="text-sm text-white/80 italic border-l-2 border-white/30 pl-3">
              {notes}
            </p>
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-sm text-[#C8E7F4] hover:underline"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            <span className="truncate">{url}</span>
          </a>
        </div>
      </CardContent>
    </Card>
  );
};