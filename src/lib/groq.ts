import { supabase } from "@/integrations/supabase/client";

interface CategorizeResult {
  category: string;
  subcategory: string;
  description: string;
}

export async function categorizeWithGroq(
  url: string,
  title: string
): Promise<CategorizeResult> {
  try {
    const { data, error } = await supabase.functions.invoke("groq-categorize", {
      body: { url, title },
    });

    if (error) {
      throw new Error(error.message || "Failed to categorize bookmark");
    }

    return {
      category: data?.category || "Uncategorized",
      subcategory: data?.subcategory || "General",
      description: data?.description || title,
    };
  } catch (error) {
    console.error("Groq categorization error:", error);
    throw error;
  }
}
