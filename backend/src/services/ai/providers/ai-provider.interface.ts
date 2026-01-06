// AI Provider abstraction interface
// Allows switching between different AI providers (Claude, OpenAI, etc.)

export interface AIMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  result: unknown;
  isError?: boolean;
}

export interface StreamChunk {
  type: 'text' | 'tool_use' | 'tool_result' | 'done' | 'error';
  content?: string;
  toolCall?: ToolCall;
  error?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ParameterSchema>;
    required: string[];
  };
  requiresConfirmation?: boolean;
}

export interface ParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: ParameterSchema;
  format?: string;
}

export interface AIProviderConfig {
  apiKey: string;
  modelId: string;
  maxTokens: number;
  temperature: number;
}

export interface AIProvider {
  readonly name: string;

  // Non-streaming chat completion
  chat(
    messages: AIMessage[],
    tools: ToolDefinition[],
    config: AIProviderConfig
  ): Promise<AIMessage>;

  // Streaming chat completion
  streamChat(
    messages: AIMessage[],
    tools: ToolDefinition[],
    config: AIProviderConfig
  ): AsyncGenerator<StreamChunk>;

  // Validate provider configuration
  validateConfig(config: Partial<AIProviderConfig>): Promise<boolean>;
}
