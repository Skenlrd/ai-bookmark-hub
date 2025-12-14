// @ts-nocheck
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "npm:@supabase/supabase-js";

type CategorizeResult = {
  category: string;
  subcategory: string;
  description: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Server not configured: missing Supabase env" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Server not configured: missing GROQ_API_KEY" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    const body = await req.json().catch(() => null);
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    const title = typeof body?.title === "string" ? body.title.trim() : "";

    if (!url || !title) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: url, title" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    const prompt = `Categorize this bookmark:
Title: ${title}
URL: ${url}

Respond ONLY with valid JSON in this exact format:
{
  "category": "Technology",
  "subcategory": "Web Development",
  "description": "Brief description"
}

Categories: Technology, Design, Business, Education, Entertainment, Productivity, Research, Uncategorized`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: `Groq API error: ${response.status}`, details: errText }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 502,
        },
      );
    }

    const data = await response.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";

    if (!content) {
      const fallback: CategorizeResult = {
        category: "Uncategorized",
        subcategory: "General",
        description: title,
      };

      return new Response(JSON.stringify(fallback), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      const fallback: CategorizeResult = {
        category: "Uncategorized",
        subcategory: "General",
        description: title,
      };

      return new Response(JSON.stringify(fallback), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const result: CategorizeResult = {
      category: typeof parsed?.category === "string" && parsed.category.trim()
        ? parsed.category.trim()
        : "Uncategorized",
      subcategory: typeof parsed?.subcategory === "string" && parsed.subcategory.trim()
        ? parsed.subcategory.trim()
        : "General",
      description: typeof parsed?.description === "string" && parsed.description.trim()
        ? parsed.description.trim()
        : title,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error?.message ?? error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
