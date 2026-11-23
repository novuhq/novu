import type { z } from "zod";
import type { payloadPropertySchema } from "./workflow-schemas";

/**
 * Edits a workflow payload JSON Schema from flat property descriptors
 * (`order.total`, `type: "number"`). Parents created for a dotted path are
 * closed. A `type: "object"` leaf stays open, matching `create_workflow`,
 * so a declared object still accepts its keys. This never infers properties
 * from step content: callers declare them explicitly.
 */

export type PayloadProperty = z.infer<typeof payloadPropertySchema>;

type SchemaNode = {
	type?: string;
	properties?: Record<string, SchemaNode>;
	required?: string[];
	[key: string]: unknown;
};

const PAYLOAD_VARIABLE_PREFIX = "payload.";

/**
 * A property path relative to the trigger payload. Step content reads a
 * property as `{{payload.order.total}}`, so callers also name it
 * `payload.order.total`: that prefix is the variable namespace, not a nested
 * `payload` object. Only one prefix is stripped, so a top-level property that
 * is itself named `payload` is `payload.payload`.
 */
export function toPayloadPropertyPath(name: string): string {
	return name.startsWith(PAYLOAD_VARIABLE_PREFIX)
		? name.slice(PAYLOAD_VARIABLE_PREFIX.length)
		: name;
}

export function createEmptyPayloadSchema(): SchemaNode {
	return { additionalProperties: false, properties: {}, required: [], type: "object" };
}

export function hasPayloadProperties(schema: SchemaNode): boolean {
	return Object.keys(schema.properties ?? {}).length > 0;
}

function leafNode(property: PayloadProperty): SchemaNode {
	switch (property.type) {
		case "enum":
			return { enum: property.enumValues, type: "string" };
		case "object":
			return { properties: {}, required: [], type: "object" };
		case "array": {
			if (property.arrayItemsType !== "object") {
				return { items: { type: property.arrayItemsType }, type: "array" };
			}

			const items: SchemaNode = { properties: {}, required: [], type: "object" };
			for (const item of property.arrayItemProperties ?? []) {
				addPath(items, item.name.split("."), { type: item.type }, true);
			}

			return { items, type: "array" };
		}
		default:
			return { type: property.type };
	}
}

function addPath(root: SchemaNode, path: string[], leaf: SchemaNode, isRequired: boolean): void {
	let node = root;
	for (const segment of path.slice(0, -1)) {
		node.properties ??= {};
		if (node.properties[segment]?.type !== "object") {
			node.properties[segment] = createEmptyPayloadSchema();
			node.required ??= [];
			if (!node.required.includes(segment)) node.required.push(segment);
		}
		node = node.properties[segment];
	}

	const name = path[path.length - 1];
	node.properties ??= {};
	const existing = node.properties[name];
	if (!(existing?.type === "object" && leaf.type === "object")) node.properties[name] = leaf;

	const required = (node.required ?? []).filter((entry) => entry !== name);
	node.required = isRequired ? [...required, name] : required;
}

export function addPayloadProperty(schema: SchemaNode, property: PayloadProperty): void {
	addPath(
		schema,
		toPayloadPropertyPath(property.name).split("."),
		leafNode(property),
		property.isRequired !== false,
	);
}

export function removePayloadProperty(schema: SchemaNode, propertyPath: string): void {
	const path = toPayloadPropertyPath(propertyPath).split(".");
	let node: SchemaNode | undefined = schema;
	for (const segment of path.slice(0, -1)) {
		node = node?.properties?.[segment];
		if (node?.type !== "object") return;
	}

	const name = path[path.length - 1];
	if (!node?.properties) return;
	delete node.properties[name];
	if (node.required) node.required = node.required.filter((entry) => entry !== name);
}
