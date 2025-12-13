interface CategorizeResult {
  category: string;
  subcategory: string;
  description: string;
}

export async function categorizeWithOpenRouter(
  url: string,
  title: string
): Promise<CategorizeResult> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error("OpenRouter API key not configured");
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

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "AI Bookmark Hub",
      },
      body: JSON.stringify({
        model: "openrouter/auto", // Auto-selects the best available free model
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenRouter API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    if (!content) {
      console.error("Empty response from OpenRouter:", data);
      throw new Error("Empty response from OpenRouter API");
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Could not extract JSON. Raw response:", content);
      // Return default if can't parse
      return {
        category: "Uncategorized",
        subcategory: "General",
        description: title,
      };
    }

    const result = JSON.parse(jsonMatch[0]);
    return {
      category: result.category || "Uncategorized",
      subcategory: result.subcategory || "General",
      description: result.description || title,
    };
  } catch (error) {
    console.error("OpenRouter categorization error:", error);
    throw error;
  }
}
