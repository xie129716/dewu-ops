/**
 * Extract JSON from text, handling markdown code fences and trailing commas.
 * Returns the parsed object or null on failure.
 */
export function parseJSON(text) {
  try {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = (jsonMatch ? jsonMatch[1].trim() : text.trim())
      .replace(/,\s*([}\]])/g, '$1'); // fix trailing commas
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}
