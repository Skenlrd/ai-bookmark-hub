export interface CategorizeResult {
  category: string;
  subcategory: string;
  description: string;
}

// Rate limiting with delay to avoid quota exceeded errors
let lastRequestTime = 0;
const MIN_DELAY_MS = 2000; // 2 second delay between requests

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_DELAY_MS) {
    await new Promise(resolve => 
      setTimeout(resolve, MIN_DELAY_MS - timeSinceLastRequest)
    );
  }
  lastRequestTime = Date.now();
}

export async function categorizeWithGemini(
  url: string,
  title: string
): Promise<CategorizeResult> {
  // Apply rate limiting
  await rateLimit();

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a bookmark categorization assistant. Given a URL and title, categorize it and provide a description.

URL: ${url}
Title: ${title}

Respond ONLY with a valid JSON object in this exact format (no markdown, no code blocks, just raw JSON):
{
  "category": "Main Category",
  "subcategory": "Specific Subcategory", 
  "description": "Brief 1-2 sentence description"
}

Use one of these main categories: Technology, Design, Business, Education, Entertainment, Productivity, Research, or Uncategorized.`,
              },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error("Gemini API error:", error);
    throw new Error(
      `Gemini API error: ${response.status} - ${error?.error?.message || "Unknown error"}`
    );
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error("No response from Gemini API");
  }

  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse JSON from Gemini response");
  }

  const result = JSON.parse(jsonMatch[0]) as CategorizeResult;
  return result;
}
