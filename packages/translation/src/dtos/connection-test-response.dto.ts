import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response DTO for connection test endpoint
 *
 * Tests the OpenAI API connection using the organization's configured API key.
 * Performs a minimal API call to verify the key is valid and has access.
 *
 * @example Success Response
 * ```json
 * {
 *   "success": true,
 *   "message": "Connection successful",
 *   "model": "gpt-4o-mini",
 *   "latencyMs": 245
 * }
 * ```
 *
 * @example Failure Response
 * ```json
 * {
 *   "success": false,
 *   "message": "Invalid API key",
 *   "error": "Incorrect API key provided"
 * }
 * ```
 */
export class ConnectionTestResponseDto {
  /**
   * Whether the connection test was successful
   */
  @ApiProperty({
    description: 'Whether the connection test succeeded',
    example: true,
  })
  success: boolean;

  /**
   * Human-readable status message
   */
  @ApiProperty({
    description: 'Status message describing the result',
    example: 'Connection successful',
  })
  message: string;

  /**
   * The model that was tested (if successful)
   */
  @ApiPropertyOptional({
    description: 'OpenAI model used for the test',
    example: 'gpt-4o-mini',
  })
  model?: string;

  /**
   * Latency of the test request in milliseconds
   */
  @ApiPropertyOptional({
    description: 'Response latency in milliseconds',
    example: 245,
  })
  latencyMs?: number;

  /**
   * Error details if the test failed
   */
  @ApiPropertyOptional({
    description: 'Error details if the test failed',
    example: 'Incorrect API key provided',
  })
  error?: string;
}
