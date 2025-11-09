// supabase/functions/create-bookmark/index.ts

import { createClient } from 'npm:@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // This is needed for the browser to allow the request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Create a Supabase client.
    // Notice it uses Deno.env.get() - these variables are set in your Supabase project
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // 2. Get the currently logged-in user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()
    
    if (userError) throw userError
    if (!user) throw new Error("User not found")

    // 3. Get the bookmark data from the request
    const bookmark = await req.json()

    // 4. Insert the bookmark into the database
    const { error: insertError } = await supabaseClient
      .from('bookmarks')
      .insert({
        ...bookmark,
        user_id: user.id, // Ensure the user_id is set
      })

    if (insertError) throw insertError

    // 5. Return a success message
    return new Response(JSON.stringify({ message: "Bookmark created" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    // 6. Return an error message
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})