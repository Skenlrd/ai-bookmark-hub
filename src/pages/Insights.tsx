import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface CategoryData {
  name: string;
  value: number;
  [key: string]: string | number;
}

const COLORS = ["#007AFF", "#34C759", "#FF9500", "#FF3B30", "#AF52DE", "#5856D6", "#FF2D55", "#64D2FF"];

const Insights = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState("");
  const [totalBookmarks, setTotalBookmarks] = useState(0);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [subcategoryData, setSubcategoryData] = useState<CategoryData[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchInsights(session.user.id);
      } else {
        navigate("/auth");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchInsights(session.user.id);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchInsights = async (userId: string) => {
    try {
      // Fetch bookmarks
      const { data: bookmarks, error: bookmarksError } = await supabase
        .from("bookmarks")
        .select("category, subcategory")
        .eq("user_id", userId);

      if (bookmarksError) throw bookmarksError;

      setTotalBookmarks(bookmarks?.length || 0);

      // Analyze categories
      const categoryCount: Record<string, number> = {};
      const subcategoryCount: Record<string, number> = {};

      bookmarks?.forEach((b) => {
        if (b.category) {
          categoryCount[b.category] = (categoryCount[b.category] || 0) + 1;
        }
        if (b.subcategory) {
          subcategoryCount[b.subcategory] = (subcategoryCount[b.subcategory] || 0) + 1;
        }
      });

      const categoryArray = Object.entries(categoryCount)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      const subcategoryArray = Object.entries(subcategoryCount)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      setCategoryData(categoryArray);
      setSubcategoryData(subcategoryArray);

      // Fetch AI summary
      const { data: summaryData, error: summaryError } = await supabase.functions.invoke(
        "ai-summary"
      );

      if (summaryError) {
        console.error("AI summary error:", summaryError);
        setAiSummary("Unable to generate insights at this time.");
      } else {
        setAiSummary(summaryData.summary);
      }
    } catch (error) {
      console.error("Error fetching insights:", error);
      toast.error("Failed to load insights");
    } finally {
      setLoading(false);
    }
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
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-bold">Insights</h1>
            <p className="text-muted-foreground mt-2">
              AI-powered analysis of your bookmark collection
            </p>
          </div>

          {/* AI Summary */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>AI Summary</CardTitle>
              </div>
              <CardDescription>Your bookmark trends this month</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-lg leading-relaxed">{aiSummary}</p>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Bookmarks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">{totalBookmarks}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">{categoryData.length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Top Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold truncate">
                  {categoryData[0]?.name || "None"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {categoryData[0]?.value || 0} bookmarks
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Category Distribution</CardTitle>
                <CardDescription>Breakdown of bookmarks by category</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-12">
                    No data available yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Top Subcategories */}
            <Card>
              <CardHeader>
                <CardTitle>Top Subcategories</CardTitle>
                <CardDescription>Most popular subcategories</CardDescription>
              </CardHeader>
              <CardContent>
                {subcategoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={subcategoryData} layout="vertical">
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#007AFF" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-12">
                    No data available yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Insights;