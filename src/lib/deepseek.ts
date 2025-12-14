export interface CategorizeResult {
  category: string;
  subcategory: string;
  description: string;
}

export async function categorizeWithDeepSeek(
  _url: string,
  _title: string
): Promise<CategorizeResult> {
  throw new Error(
    "DeepSeek categorization is disabled. Use the Supabase Edge Function 'groq-categorize' instead."
  );
}
