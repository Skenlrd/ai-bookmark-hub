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
    const { bookmarkId } = await req.json();

    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user from auth
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's Notion settings
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('notion_token, notion_database_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.notion_token || !profile?.notion_database_id) {
      return new Response(
        JSON.stringify({ error: 'Notion not configured. Please add your Notion token and database ID in settings.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get bookmark data
    const { data: bookmark, error: bookmarkError } = await supabaseClient
      .from('bookmarks')
      .select('*')
      .eq('id', bookmarkId)
      .eq('user_id', user.id)
      .single();

    if (bookmarkError || !bookmark) {
      return new Response(
        JSON.stringify({ error: 'Bookmark not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sync to Notion
    const notionResponse = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${profile.notion_token}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: { database_id: profile.notion_database_id },
        properties: {
          Title: {
            title: [{ text: { content: bookmark.title } }]
          },
          URL: {
            url: bookmark.url
          },
          Category: {
            select: bookmark.category ? { name: bookmark.category } : null
          },
          Subcategory: {
            select: bookmark.subcategory ? { name: bookmark.subcategory } : null
          },
          Description: {
            rich_text: [{ text: { content: bookmark.description || '' } }]
          },
          Notes: {
            rich_text: [{ text: { content: bookmark.notes || '' } }]
          }
        }
      })
    });

    if (!notionResponse.ok) {
      const errorText = await notionResponse.text();
      console.error('Notion API error:', notionResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to sync to Notion. Please check your token and database ID.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const notionData = await notionResponse.json();
    console.log('Successfully synced to Notion:', notionData.id);

    return new Response(
      JSON.stringify({ success: true, notionPageId: notionData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in notion-sync:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});