import { ExternalLink, Trash2 } from "lucide-react";
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

  return (
    <Card className="group hover:shadow-lg transition-all duration-200">
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
              <CardTitle className="text-lg leading-tight line-clamp-2">
                {title}
              </CardTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                {category && (
                  <Badge variant="secondary" className="text-xs">
                    {category}
                  </Badge>
                )}
                {subcategory && (
                  <Badge variant="outline" className="text-xs">
                    {subcategory}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
        {description && (
          <CardDescription className="text-sm line-clamp-2">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {notes && (
            <p className="text-sm text-muted-foreground italic border-l-2 border-primary pl-3">
              {notes}
            </p>
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-sm text-primary hover:underline"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            <span className="truncate">{url}</span>
          </a>
        </div>
      </CardContent>
    </Card>
  );
};