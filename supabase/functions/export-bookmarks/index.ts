import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { format } = await req.json(); // 'json' or 'csv'

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

    const { data: bookmarks, error: bookmarksError } = await supabaseClient
      .from('bookmarks')
      .select('title, url, category, subcategory, description, notes, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (bookmarksError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch bookmarks' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (format === 'csv') {
      // Generate CSV
      const headers = ['Title', 'URL', 'Category', 'Subcategory', 'Description', 'Notes', 'Created At'];
      const rows = bookmarks.map(b => [
        `"${(b.title || '').replace(/"/g, '""')}"`,
        `"${(b.url || '').replace(/"/g, '""')}"`,
        `"${(b.category || '').replace(/"/g, '""')}"`,
        `"${(b.subcategory || '').replace(/"/g, '""')}"`,
        `"${(b.description || '').replace(/"/g, '""')}"`,
        `"${(b.notes || '').replace(/"/g, '""')}"`,
        `"${b.created_at}"`
      ].join(','));
      
      const csv = [headers.join(','), ...rows].join('\n');

      return new Response(csv, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="smartmark-bookmarks-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    } else {
      // Generate JSON
      return new Response(JSON.stringify(bookmarks, null, 2), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="smartmark-bookmarks-${new Date().toISOString().split('T')[0]}.json"`
        }
      });
    }

  } catch (error) {
    console.error('Error in export-bookmarks:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});