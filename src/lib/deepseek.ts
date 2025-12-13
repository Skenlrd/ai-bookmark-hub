export interface CategorizeResult {
  category: string;
  subcategory: string;
  description: string;
}

export async function categorizeWithDeepSeek(url: string, title: string): Promise<CategorizeResult> {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    throw new Error('DeepSeek API key not configured');
  }

  const prompt = `Analyze this bookmark and categorize it.

Title: ${title}
URL: ${url}

Return ONLY valid JSON (no markdown, no extra text) with exactly this structure:
{
  "category": "Technology|Design|Business|Education|Entertainment|Productivity|Research|Other",
  "subcategory": "a short subcategory name",
  "description": "brief one-line description of the content"
}

Categories:
- Technology: programming, software, tools, tech news
- Design: UI/UX, graphics, design tools, creative content
- Business: startups, marketing, sales, business tools
- Education: learning, tutorials, courses, educational content
- Entertainment: movies, games, music, entertainment
- Productivity: task management, note-taking, workflows
- Research: academic papers, research, data analysis
- Other: anything that doesn't fit above

Respond with ONLY the JSON object, no other text.`;

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`DeepSeek API error: ${response.status} - ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No content in DeepSeek response');
  }

  try {
    // Remove markdown code blocks if present
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }
    
    const result = JSON.parse(jsonStr);
    
    return {
      category: result.category || 'Other',
      subcategory: result.subcategory || 'General',
      description: result.description || title,
    };
  } catch (error) {
    console.error('Failed to parse DeepSeek response:', content, error);
    throw new Error('Failed to parse AI response');
  }
}
