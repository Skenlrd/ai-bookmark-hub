import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's bookmarks from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: bookmarks, error: bookmarksError } = await supabaseClient
      .from('bookmarks')
      .select('category, subcategory, title, created_at')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (bookmarksError || !bookmarks || bookmarks.length === 0) {
      return new Response(
        JSON.stringify({ 
          summary: "You haven't added any bookmarks in the last 30 days. Start saving your favorite links to see insights here!",
          totalBookmarks: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Analyze categories
    const categoryCount: Record<string, number> = {};
    bookmarks.forEach(b => {
      if (b.category) {
        categoryCount[b.category] = (categoryCount[b.category] || 0) + 1;
      }
    });

    const topCategories = Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([cat]) => cat);

    // Call AI for summary
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant that analyzes bookmark patterns and provides insightful, friendly summaries. Keep your response to 2-3 sentences.'
          },
          {
            role: 'user',
            content: `Analyze these bookmarks from the last 30 days and provide a brief, engaging summary of the user's interests and trends:

Total bookmarks: ${bookmarks.length}
Top categories: ${topCategories.join(', ')}
Recent bookmark titles: ${bookmarks.slice(0, 10).map(b => b.title).join(', ')}

Provide a friendly 2-3 sentence summary of their bookmark trends.`
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI gateway error:', response.status);
      return new Response(
        JSON.stringify({
          summary: `You've saved ${bookmarks.length} bookmarks this month, with a focus on ${topCategories.join(', ')}. Keep organizing your digital life!`,
          totalBookmarks: bookmarks.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiSummary = data.choices[0].message.content;

    return new Response(
      JSON.stringify({
        summary: aiSummary,
        totalBookmarks: bookmarks.length,
        topCategories,
        categoryBreakdown: categoryCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-summary:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});