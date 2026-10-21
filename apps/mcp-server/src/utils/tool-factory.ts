import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiResponse, TriggerWorkflowRequest } from "../types";
import { NovuApiUtils } from "./api";
import type { ToolAccessors } from "./tool-accessors";
import { ValidationUtils } from "./validation";

export interface ToolContext {
	token: string;
	apiUrl: string;
	environmentId?: string;
	idempotencyKey?: string;
}

const idempotencyKeySchema = z
	.string()
	.optional()
	.describe("Optional idempotency key for the request");

interface ToolConfig<T extends z.ZodObject<z.ZodRawShape>> {
	name: string;
	description: string;
	schema: T;
	handler: (input: z.infer<T>, context: ToolContext) => Promise<ApiResponse>;
}

interface ApiRequestConfig {
	method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
	endpoint: string;
	body?: unknown;
	successMessage: string;
	identifier?: string;
	customHeaders?: Record<string, string>;
	formatSuccess?: (data: unknown) => string;
	formatError?: (status: number, errorText: string, identifier?: string) => string;
}

/**
 * Optional environment selector exposed on every tool. Forwarded to the Novu
 * API as the `Novu-Environment-Id` header for OAuth sessions only — they are
 * organization-bound and default to the Development environment. Legacy API
 * keys are already bound to a single environment, so the header is never sent
 * for them (see `NovuApiUtils.prepareHeaders`).
 */
export const environmentIdSchema = z
	.string()
	.optional()
	.describe(
		"Optional Novu environment ID (_id from get_environments) to run this request against. Only applies to OAuth sessions, which default to the Development environment — pass a different environment ID to target it (e.g. Production). Ignored for environment-bound API keys.",
	);

export class ToolFactory {
	/**
	 * Create a standardized MCP tool with common error handling and validation
	 */
	static createTool<T extends z.ZodObject<z.ZodRawShape>>(
		server: McpServer,
		{ getToken, getApiUrl }: ToolAccessors,
		config: ToolConfig<T>,
	) {
		const schemaWithEnvironment = config.schema.extend({
			environmentId: environmentIdSchema,
			idempotencyKey: idempotencyKeySchema,
		});

		server.tool(
			config.name,
			config.description,
			schemaWithEnvironment.shape,
			async (rawInput) => {
				const authError = ValidationUtils.validateToken(getToken());
				if (authError) {
					return authError;
				}

				const parsed = schemaWithEnvironment.parse(rawInput) as z.infer<T> & {
					environmentId?: string;
					idempotencyKey?: string;
				};
				const { environmentId, idempotencyKey, ...toolInput } = parsed;

				try {
					return await config.handler(toolInput as z.infer<T>, {
						apiUrl: getApiUrl(),
						environmentId,
						idempotencyKey,
						token: getToken()!,
					});
				} catch (error) {
					console.error(`Error in ${config.name}:`, error);
					return {
						content: [
							{
								text: `Error: Failed to execute ${config.name}. ${error instanceof Error ? error.message : "Unknown error"}`,
								type: "text" as const,
							},
						],
					};
				}
			},
		);
	}

	/**
	 * Create a simple API request handler with standardized error handling
	 */
	static async makeApiRequest(
		context: ToolContext,
		requestConfig: ApiRequestConfig,
		idempotencyKey?: string,
	): Promise<ApiResponse> {
		const url = `${context.apiUrl}${requestConfig.endpoint}`;

		console.log(
			`Making ${requestConfig.method} request to ${requestConfig.endpoint}${requestConfig.identifier ? ` for ${requestConfig.identifier}` : ""}`,
		);

		const headers = {
			...NovuApiUtils.prepareHeaders(context.token, {
				environmentId: context.environmentId,
				idempotencyKey,
			}),
			...requestConfig.customHeaders,
		};

		const response = await fetch(url, {
			headers,
			method: requestConfig.method,
			...(requestConfig.body !== undefined && {
				body: JSON.stringify(requestConfig.body),
			}),
		});

		// Handle special case for DELETE operations that return 204
		if (requestConfig.method === "DELETE" && response.status === 204) {
			const message = requestConfig.identifier
				? `Successfully ${requestConfig.successMessage} ${requestConfig.identifier}`
				: `Successfully ${requestConfig.successMessage}`;

			console.log(message);
			return {
				content: [
					{
						text: message,
						type: "text" as const,
					},
				],
			};
		}

		if (!response.ok) {
			if (requestConfig.formatError) {
				const errorText = await response.text();
				console.error("Novu API Error:", response.status, errorText);

				return {
					content: [
						{
							text: requestConfig.formatError(
								response.status,
								errorText,
								requestConfig.identifier,
							),
							type: "text" as const,
						},
					],
				};
			}

			return NovuApiUtils.handleApiResponse(
				response,
				requestConfig.successMessage,
				requestConfig.identifier,
			);
		}

		const data = await response.json();
		const message = requestConfig.formatSuccess
			? requestConfig.formatSuccess(data)
			: requestConfig.identifier
				? `Successfully ${requestConfig.successMessage} ${requestConfig.identifier}`
				: `Successfully ${requestConfig.successMessage}`;

		console.log(message);

		return {
			content: [
				{
					text: requestConfig.formatSuccess
						? message
						: `${message}:\n\n${JSON.stringify(data, null, 2)}`,
					type: "text" as const,
				},
			],
		};
	}

	/**
	 * Create a simple GET tool
	 */
	static createGetTool(
		server: McpServer,
		accessors: ToolAccessors,
		name: string,
		description: string,
		endpoint: string,
		successMessage: string,
		schema?: z.ZodObject<z.ZodRawShape>,
	) {
		ToolFactory.createTool(server, accessors, {
			description,
			handler: async (_input, context) => {
				return ToolFactory.makeApiRequest(
					context,
					{
						endpoint,
						method: "GET",
						successMessage,
					},
					context.idempotencyKey,
				);
			},
			name,
			schema: schema ?? z.object({}),
		});
	}

	/**
	 * Create a GET tool that builds query parameters into the endpoint.
	 */
	static createQueryGetTool<T extends z.ZodObject<z.ZodRawShape>>(
		server: McpServer,
		accessors: ToolAccessors,
		name: string,
		description: string,
		successMessage: string,
		schema: T,
		options: {
			buildEndpoint: (input: z.infer<T>) => string;
			formatSuccess?: (data: unknown, input: z.infer<T>, endpoint: string) => string;
			formatError?: (status: number, errorText: string, identifier?: string) => string;
			getIdentifier?: (input: z.infer<T>) => string | undefined;
			validate?: (input: z.infer<T>) => ApiResponse | null;
		},
	) {
		ToolFactory.createTool(server, accessors, {
			description,
			handler: async (input, context) => {
				const validationError = options.validate?.(input);
				if (validationError) {
					return validationError;
				}

				const endpoint = options.buildEndpoint(input);
				return ToolFactory.makeApiRequest(
					context,
					{
						endpoint,
						formatError: options.formatError,
						formatSuccess: options.formatSuccess
							? (data) => options.formatSuccess!(data, input, endpoint)
							: undefined,
						identifier: options.getIdentifier?.(input),
						method: "GET",
						successMessage,
					},
					context.idempotencyKey,
				);
			},
			name,
			schema,
		});
	}

	/**
	 * Create a tool for getting a specific resource by ID
	 */
	static createGetByIdTool(
		server: McpServer,
		accessors: ToolAccessors,
		name: string,
		description: string,
		endpointTemplate: string,
		successMessage: string,
		idParamName = "id",
		idDescription = "The ID to retrieve",
		formatSuccess?: (data: unknown, id: string) => string,
		formatError?: (status: number, errorText: string, identifier?: string) => string,
	) {
		ToolFactory.createTool(server, accessors, {
			description,
			handler: async (input, context) => {
				const idValue = input[idParamName] as string;
				const endpoint = endpointTemplate.replace("{id}", idValue);
				return ToolFactory.makeApiRequest(
					context,
					{
						endpoint,
						formatError,
						formatSuccess: formatSuccess
							? (data) => formatSuccess(data, idValue)
							: undefined,
						identifier: idValue,
						method: "GET",
						successMessage,
					},
					context.idempotencyKey,
				);
			},
			name,
			schema: z.object({
				[idParamName]: z.string().describe(idDescription),
			}),
		});
	}

	/**
	 * Create a DELETE tool
	 */
	static createDeleteTool(
		server: McpServer,
		accessors: ToolAccessors,
		name: string,
		description: string,
		endpointTemplate: string,
		successMessage: string,
		idParamName = "id",
		idDescription = "The ID to delete",
	) {
		ToolFactory.createTool(server, accessors, {
			description,
			handler: async (input, context) => {
				const idValue = input[idParamName] as string;
				const endpoint = endpointTemplate.replace("{id}", idValue);
				return ToolFactory.makeApiRequest(
					context,
					{
						endpoint,
						identifier: idValue,
						method: "DELETE",
						successMessage,
					},
					context.idempotencyKey,
				);
			},
			name,
			schema: z.object({
				[idParamName]: z.string().describe(idDescription),
			}),
		});
	}

	/**
	 * Special handler for trigger workflow which has custom logic
	 */
	static async handleTriggerWorkflow(
		input: {
			workflowName: string;
			subscriberId: string;
			payload: Record<string, unknown>;
			overrides?: Record<string, { integrationIdentifier: string }>;
			idempotencyKey?: string;
		},
		context: ToolContext,
	): Promise<ApiResponse> {
		console.log(
			`Triggering workflow "${input.workflowName}" for subscriber "${input.subscriberId}"`,
		);

		const requestBody: TriggerWorkflowRequest = {
			name: input.workflowName,
			payload: input.payload,
			to: [{ subscriberId: input.subscriberId }],
			...(input.overrides && { overrides: input.overrides }),
		};

		return ToolFactory.makeApiRequest(
			context,
			{
				body: requestBody,
				endpoint: "/v1/events/trigger",
				formatSuccess: (data) =>
					`Successfully triggered workflow "${input.workflowName}" for subscriber "${input.subscriberId}":\n\n${JSON.stringify(data, null, 2)}`,
				identifier: input.workflowName,
				method: "POST",
				successMessage: `triggered workflow "${input.workflowName}" for subscriber "${input.subscriberId}"`,
			},
			input.idempotencyKey,
		);
	}
}
