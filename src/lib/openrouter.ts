interface CategorizeResult {
  category: string;
  subcategory: string;
  description: string;
}

export async function categorizeWithOpenRouter(
  _url: string,
  _title: string
): Promise<CategorizeResult> {
  throw new Error(
    "OpenRouter categorization is disabled. Use the Supabase Edge Function 'groq-categorize' instead."
  );
}
