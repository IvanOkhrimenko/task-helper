import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';
import {
  AIProvider,
  AIMessage,
  AIProviderConfig,
  ToolDefinition,
  StreamChunk,
  ToolCall
} from './ai-provider.interface';

export class ClaudeProvider implements AIProvider {
  readonly name = 'claude';
  private client: Anthropic | null = null;

  private getClient(apiKey: string): Anthropic {
    if (!this.client) {
      this.client = new Anthropic({
        apiKey,
        fetch: fetch as unknown as typeof globalThis.fetch
      });
    }
    return this.client;
  }

  async chat(
    messages: AIMessage[],
    tools: ToolDefinition[],
    config: AIProviderConfig
  ): Promise<AIMessage> {
    const client = this.getClient(config.apiKey);

    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const conversationMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => this.toAnthropicMessage(m));

    const anthropicTools = tools.map(t => this.toAnthropicTool(t));

    const response = await client.messages.create({
      model: config.modelId,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      system: systemMessage,
      messages: conversationMessages,
      tools: anthropicTools.length > 0 ? anthropicTools : undefined
    });

    return this.fromAnthropicResponse(response);
  }

  async *streamChat(
    messages: AIMessage[],
    tools: ToolDefinition[],
    config: AIProviderConfig
  ): AsyncGenerator<StreamChunk> {
    const client = this.getClient(config.apiKey);

    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const conversationMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => this.toAnthropicMessage(m));

    const anthropicTools = tools.map(t => this.toAnthropicTool(t));

    const stream = await client.messages.stream({
      model: config.modelId,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      system: systemMessage,
      messages: conversationMessages,
      tools: anthropicTools.length > 0 ? anthropicTools : undefined
    });

    let currentToolCall: Partial<ToolCall> | null = null;
    let toolInputJson = '';

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        const block = event.content_block;
        if (block.type === 'tool_use') {
          currentToolCall = {
            id: block.id,
            name: block.name,
            arguments: {}
          };
          toolInputJson = '';
        }
      } else if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if (delta.type === 'text_delta') {
          yield { type: 'text', content: delta.text };
        } else if (delta.type === 'input_json_delta' && currentToolCall) {
          toolInputJson += delta.partial_json;
        }
      } else if (event.type === 'content_block_stop') {
        if (currentToolCall && currentToolCall.id && currentToolCall.name) {
          try {
            currentToolCall.arguments = toolInputJson ? JSON.parse(toolInputJson) : {};
          } catch {
            currentToolCall.arguments = {};
          }
          yield {
            type: 'tool_use',
            toolCall: currentToolCall as ToolCall
          };
          currentToolCall = null;
          toolInputJson = '';
        }
      } else if (event.type === 'message_stop') {
        yield { type: 'done' };
      }
    }
  }

  async validateConfig(config: Partial<AIProviderConfig>): Promise<boolean> {
    if (!config.apiKey) return false;

    try {
      const client = new Anthropic({
        apiKey: config.apiKey,
        fetch: fetch as unknown as typeof globalThis.fetch
      });
      // Make a minimal request to validate the API key
      await client.messages.create({
        model: config.modelId || 'claude-sonnet-4-20250514',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      });
      return true;
    } catch {
      return false;
    }
  }

  private toAnthropicMessage(message: AIMessage): Anthropic.MessageParam {
    if (message.role === 'tool') {
      return {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: message.toolCallId || '',
            content: message.content
          }
        ]
      };
    }

    if (message.role === 'assistant' && message.toolCalls?.length) {
      const content: Anthropic.ContentBlockParam[] = [];

      if (message.content) {
        content.push({ type: 'text', text: message.content });
      }

      for (const toolCall of message.toolCalls) {
        content.push({
          type: 'tool_use',
          id: toolCall.id,
          name: toolCall.name,
          input: toolCall.arguments
        });
      }

      return { role: 'assistant', content };
    }

    return {
      role: message.role as 'user' | 'assistant',
      content: message.content
    };
  }

  private toAnthropicTool(tool: ToolDefinition): Anthropic.Tool {
    return {
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object',
        properties: tool.parameters.properties,
        required: tool.parameters.required
      }
    };
  }

  private fromAnthropicResponse(response: Anthropic.Message): AIMessage {
    const toolCalls: ToolCall[] = [];
    let textContent = '';

    for (const block of response.content) {
      if (block.type === 'text') {
        textContent += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input as Record<string, unknown>
        });
      }
    }

    return {
      role: 'assistant',
      content: textContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined
    };
  }
}

// Export singleton instance
export const claudeProvider = new ClaudeProvider();
