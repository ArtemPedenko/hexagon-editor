import type { NodeSpec } from 'prosemirror-model';

export interface SchemaDynamicModifierConfig {
	[nodeName: string]: { allowedAttrs?: readonly string[] };
}

/** Upstream schema modifier: declares additional nullable node attrs before `Schema` is created. */
export class SchemaDynamicModifier {
	readonly #config: SchemaDynamicModifierConfig;

	constructor(config: SchemaDynamicModifierConfig) {
		this.#config = config;
	}

	processNodeSpec(name: string, nodeSpec: NodeSpec): NodeSpec {
		const allowedAttrs = this.#config[name]?.allowedAttrs;
		if (allowedAttrs === undefined || allowedAttrs.length === 0) return nodeSpec;
		return {
			...nodeSpec,
			attrs: {
				...nodeSpec.attrs,
				...Object.fromEntries(allowedAttrs.map((attribute) => [attribute, { default: null }])),
			},
		};
	}
}
