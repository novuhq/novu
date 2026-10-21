/** Shared getters passed into every tool registration module. */
export type ToolAccessors = {
	getToken: () => string | null;
	getApiUrl: () => string;
};
