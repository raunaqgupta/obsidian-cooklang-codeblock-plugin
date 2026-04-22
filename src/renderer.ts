import {
	Cookware,
	Ingredient,
	Metadata,
	Step,
	Timer,
} from "@cooklang/cooklang-ts";
import { MarkdownPostProcessorContext } from "obsidian";
import { parseCooklang } from "./parser";

/**
 * Obsidian code block processor for `cooklang` blocks.
 * Parses the source and renders a formatted recipe card into `el`.
 */
export function renderCooklangBlock(
	source: string,
	el: HTMLElement,
	_ctx: MarkdownPostProcessorContext,
): void {
	el.empty();

	const result = parseCooklang(source);
	if (!result.success) {
		renderError(el, result.error, source);
		return;
	}

	const recipe = result.recipe;
	const container = el.createDiv({ cls: "cooklang-recipe" });

	renderMetadata(container, recipe.metadata);
	container.createEl("hr");
	renderIngredients(container, recipe.ingredients);
	renderCookware(container, recipe.cookwares);
	renderSteps(container, recipe.steps);
}

function renderMetadata(parent: HTMLElement, metadata: Metadata): void {
	const keys = Object.keys(metadata);
	if (keys.length === 0) return;

	const section = parent.createDiv({ cls: "cooklang-metadata" });

	// Render title prominently if present
	const titleKey = keys.find((k) => k.toLowerCase() === "title");
	if (titleKey) {
		section.createEl("h3", {
			cls: "cooklang-title",
			text: metadata[titleKey],
		});
	}

	const list = section.createEl("dl", { cls: "cooklang-meta-list" });
	for (const key of keys) {
		if (key.toLowerCase() === "title") continue;
		const item = list.createDiv({ cls: "cooklang-meta-item" });
		item.createEl("dt", { cls: "cooklang-meta-key", text: key });
		item.createEl("dd", {
			cls: "cooklang-meta-value",
			text: metadata[key],
		});
	}
}

function renderIngredients(
	parent: HTMLElement,
	ingredients: Ingredient[],
): void {
	if (ingredients.length === 0) return;

	const section = parent.createDiv({ cls: "cooklang-ingredients" });
	section.createEl("h4", { text: "Ingredients" });

	const merged = mergeIngredients(ingredients);
	const ul = section.createEl("ul");
	for (const ing of merged) {
		const li = ul.createEl("li", { cls: "cooklang-ingredient-item" });
		const qty = formatQuantity(ing.quantity, ing.units);
		if (qty) {
			li.createSpan({ cls: "cooklang-quantity", text: qty });
			li.appendText(" ");
		}
		li.createSpan({ cls: "cooklang-ingredient-name", text: ing.name });
	}
}

function renderCookware(parent: HTMLElement, cookwares: Cookware[]): void {
	if (cookwares.length === 0) return;

	const section = parent.createDiv({ cls: "cooklang-cookware" });
	section.createEl("h4", { text: "Cookware" });

	const seen = new Set<string>();
	const ul = section.createEl("ul");
	for (const cw of cookwares) {
		const key = cw.name.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		const li = ul.createEl("li", { cls: "cooklang-cookware-item" });
		const qty = formatQuantity(cw.quantity, "");
		if (qty) {
			li.createSpan({ cls: "cooklang-quantity", text: qty });
			li.appendText(" ");
		}
		li.createSpan({ cls: "cooklang-cookware-name", text: cw.name });
	}
}

function renderSteps(parent: HTMLElement, steps: Step[]): void {
	if (steps.length === 0) return;

	const section = parent.createDiv({ cls: "cooklang-steps" });
	section.createEl("h4", { text: "Method" });

	const ol = section.createEl("ol");
	for (const step of steps) {
		const li = ol.createEl("li", { cls: "cooklang-step" });
		for (const token of step) {
			renderToken(li, token);
		}
	}
}

function renderToken(
	parent: HTMLElement,
	token: Ingredient | Cookware | Timer | { type: "text"; value: string },
): void {
	switch (token.type) {
		case "ingredient": {
			const qty = formatQuantity(token.quantity, token.units);
			const span = parent.createSpan({
				cls: "cooklang-inline-ingredient",
				text: token.name,
			});
			if (qty) span.setAttr("title", qty);
			break;
		}
		case "cookware": {
			parent.createSpan({
				cls: "cooklang-inline-cookware",
				text: token.name,
			});
			break;
		}
		case "timer": {
			const label =
				formatQuantity(token.quantity, token.units) ||
				token.name ||
				"timer";
			parent.createSpan({
				cls: "cooklang-inline-timer",
				text: label,
			});
			break;
		}
		case "text": {
			parent.appendText(token.value);
			break;
		}
	}
}

function renderError(
	parent: HTMLElement,
	message: string,
	source: string,
): void {
	const box = parent.createDiv({ cls: "cooklang-error" });
	const header = box.createDiv({ cls: "cooklang-error-header" });
	header.createSpan({ cls: "cooklang-error-icon", text: "⚠" });
	header.createSpan({
		cls: "cooklang-error-message",
		text: `Cooklang parse error: ${message}`,
	});
	box.createEl("pre", { cls: "cooklang-error-source", text: source });
}

/**
 * Collapse repeated ingredient mentions into one entry per name,
 * summing quantities when units match and they are numeric.
 */
function mergeIngredients(ingredients: Ingredient[]): Ingredient[] {
	const byKey = new Map<string, Ingredient>();
	const order: string[] = [];

	for (const ing of ingredients) {
		const key = `${ing.name.toLowerCase()}|${ing.units}`;
		const existing = byKey.get(key);
		if (!existing) {
			byKey.set(key, { ...ing });
			order.push(key);
			continue;
		}
		if (
			typeof existing.quantity === "number" &&
			typeof ing.quantity === "number"
		) {
			existing.quantity = existing.quantity + ing.quantity;
		} else if (
			existing.quantity === "" ||
			existing.quantity === undefined
		) {
			existing.quantity = ing.quantity;
		}
		// Otherwise keep the first value — we don't try to concatenate
		// textual quantities like "a pinch" + "a pinch".
	}

	return order.map((k) => byKey.get(k) as Ingredient);
}

function formatQuantity(
	quantity: string | number | undefined,
	units: string | undefined,
): string {
	if (quantity === undefined || quantity === "" || quantity === 0) {
		return units ? units : "";
	}
	const qtyStr =
		typeof quantity === "number" ? formatNumber(quantity) : quantity;
	return units ? `${qtyStr} ${units}` : qtyStr;
}

function formatNumber(n: number): string {
	if (Number.isInteger(n)) return n.toString();
	// Show up to 2 decimal places, trim trailing zeros
	return n.toFixed(2).replace(/\.?0+$/, "");
}
