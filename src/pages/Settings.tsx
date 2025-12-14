import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Copy, RefreshCw, Trash2, Wand2 } from "lucide-react";

const Settings = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [notionToken, setNotionToken] = useState("");
  const [notionDatabaseId, setNotionDatabaseId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dangerWorking, setDangerWorking] = useState(false);
  const [recatWorking, setRecatWorking] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadSettings(session.user.id);
      } else {
        navigate("/auth");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadSettings(session.user.id);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadSettings = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("notion_token, notion_database_id, api_key")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error loading settings:", error);
    } else if (data) {
      setNotionToken(data.notion_token || "");
      setNotionDatabaseId(data.notion_database_id || "");
      setApiKey(data.api_key || "");
    }
    setLoading(false);
  };

  const handleSaveNotion = async () => {
    if (!user) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        notion_token: notionToken.trim() || null,
        notion_database_id: notionDatabaseId.trim() || null,
      })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to save Notion settings");
    } else {
      toast.success("Notion settings saved successfully");
    }
    setSaving(false);
  };

  const handleGenerateApiKey = async () => {
    if (!user) return;

    setSaving(true);
    const { data, error } = await supabase.rpc("generate_api_key");

    if (error) {
      toast.error("Failed to generate API key");
      setSaving(false);
      return;
    }

    const newApiKey = data as string;
    
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ api_key: newApiKey })
      .eq("id", user.id);

    if (updateError) {
      toast.error("Failed to save API key");
    } else {
      setApiKey(newApiKey);
      toast.success("API key generated successfully");
    }
    setSaving(false);
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    toast.success("API key copied to clipboard");
  };

  const handleDeleteAllBookmarks = async () => {
    if (!user) return;
    const confirm = window.confirm("This will permanently delete ALL your bookmarks. Continue?");
    if (!confirm) return;

    setDangerWorking(true);
    const { error } = await supabase.from('bookmarks').delete().eq('user_id', user.id);
    if (error) {
      toast.error("Failed to delete bookmarks");
    } else {
      toast.success("All bookmarks deleted");
    }
    setDangerWorking(false);
  };

  const handleRecategorize = async () => {
    if (!user) return;
    const enableAI = import.meta.env.VITE_ENABLE_AI_CATEGORIZATION === 'true';
    if (!enableAI) {
      toast.error("Enable VITE_ENABLE_AI_CATEGORIZATION=true and deploy the function first");
      return;
    }

    setRecatWorking(true);
    // Fetch uncategorized in batches
    const { data: items, error } = await supabase
      .from('bookmarks')
      .select('id, url, title, description, category, subcategory')
      .eq('user_id', user.id)
      .or('category.is.null,category.eq.Uncategorized')
      .limit(2000);

    if (error) {
      toast.error("Failed to load bookmarks for recategorization");
      setRecatWorking(false);
      return;
    }

    let updated = 0;
    for (const b of items || []) {
      try {
        const { data, error: aiError } = await supabase.functions.invoke('groq-categorize', {
          body: { url: b.url, title: b.title }
        });
        if (!aiError && data) {
          await supabase
            .from('bookmarks')
            .update({
              category: data.category || 'Uncategorized',
              subcategory: data.subcategory || 'General',
              description: data.description || b.description || b.title,
            })
            .eq('id', b.id);
          updated++;
        }
      } catch (_) {}
      // tiny delay to avoid rate limits
      await new Promise(r => setTimeout(r, 60));
    }

    toast.success(`Re-categorized ${updated} bookmark(s)`);
    setRecatWorking(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar user={user} />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-2">
              Manage your account and integrations
            </p>
          </div>

          {/* Notion Integration */}
          <Card>
            <CardHeader>
              <CardTitle>Notion Integration</CardTitle>
              <CardDescription>
                Connect your Notion workspace to automatically sync bookmarks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notion-token">Notion Integration Token</Label>
                <Input
                  id="notion-token"
                  type="password"
                  placeholder="secret_..."
                  value={notionToken}
                  onChange={(e) => setNotionToken(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Create an integration at{" "}
                  <a
                    href="https://www.notion.so/my-integrations"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    notion.so/my-integrations
                  </a>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notion-database">Notion Database ID</Label>
                <Input
                  id="notion-database"
                  placeholder="32-character database ID"
                  value={notionDatabaseId}
                  onChange={(e) => setNotionDatabaseId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Find it in your Notion database URL after the workspace name
                </p>
              </div>

              <Button onClick={handleSaveNotion} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Notion Settings"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* API Key */}
          <Card>
            <CardHeader>
              <CardTitle>API Access</CardTitle>
              <CardDescription>
                Generate an API key for browser extensions and third-party apps
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {apiKey ? (
                <div className="space-y-2">
                  <Label>Your API Key</Label>
                  <div className="flex gap-2">
                    <Input value={apiKey} readOnly className="font-mono text-sm" />
                    <Button variant="outline" size="icon" onClick={copyApiKey}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-destructive">
                    Keep this key secret! It provides full access to your bookmarks.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No API key generated yet
                </p>
              )}

              <Button onClick={handleGenerateApiKey} disabled={saving} variant="outline">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {apiKey ? "Regenerate" : "Generate"} API Key
                  </>
                )}
              </Button>

              {apiKey && (
                <div className="mt-4 p-4 border rounded-lg space-y-2">
                  <p className="text-sm font-medium">API Endpoint</p>
                  <code className="text-xs bg-muted p-2 rounded block">
                    POST {import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-bookmark
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">
                    Include header: <code>x-api-key: {"{your-api-key}"}</code>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle>Danger Zone</CardTitle>
              <CardDescription>
                Destructive actions. Proceed with caution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button variant="destructive" onClick={handleDeleteAllBookmarks} disabled={dangerWorking}>
                  {dangerWorking ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete All My Bookmarks
                    </>
                  )}
                </Button>

                <Button variant="outline" onClick={handleRecategorize} disabled={recatWorking}>
                  {recatWorking ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Re-categorizing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Re-categorize Uncategorized
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                To enable AI categorization, set <code>VITE_ENABLE_AI_CATEGORIZATION=true</code> in your .env and deploy
                the <code>groq-categorize</code> function with the <code>GROQ_API_KEY</code> secret set in Supabase.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Settings;