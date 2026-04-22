import { Recipe } from "@cooklang/cooklang-ts";

export type ParseResult =
	| { success: true; recipe: Recipe }
	| { success: false; error: string };

/**
 * Parse Cooklang source text into a Recipe object, wrapping any thrown
 * errors into a discriminated union so callers don't need try/catch.
 */
export function parseCooklang(source: string): ParseResult {
	try {
		const recipe = new Recipe(source);
		return { success: true, recipe };
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return { success: false, error: message };
	}
}
