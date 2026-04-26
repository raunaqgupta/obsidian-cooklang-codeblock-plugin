import { Plugin } from "obsidian";
import { renderCooklangBlock } from "./renderer";

/**
 * Cooklang Recipe plugin.
 *
 * Registers a Markdown code block processor that renders fenced blocks
 * tagged with the `cooklang` (or `cook`) language as a formatted recipe
 * card inline with the note's rendered preview.
 */
export default class CooklangRecipePlugin extends Plugin {
	onload(): void {
		this.registerMarkdownCodeBlockProcessor(
			"cooklang",
			renderCooklangBlock,
		);
		this.registerMarkdownCodeBlockProcessor("cook", renderCooklangBlock);
	}
}
