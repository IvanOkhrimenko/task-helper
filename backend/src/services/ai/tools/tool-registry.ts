import { PrismaClient } from '@prisma/client';
import { ToolDefinition } from '../providers/ai-provider.interface';

export interface ToolContext {
  userId: string;
  prisma: PrismaClient;
  conversationId: string;
}

export type ToolHandler = (
  args: Record<string, unknown>,
  context: ToolContext
) => Promise<unknown>;

interface RegisteredTool {
  definition: ToolDefinition;
  handler: ToolHandler;
}

class ToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();

  register(definition: ToolDefinition, handler: ToolHandler): void {
    this.tools.set(definition.name, { definition, handler });
  }

  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(t => t.definition);
  }

  getDefinition(name: string): ToolDefinition | undefined {
    return this.tools.get(name)?.definition;
  }

  async execute(
    name: string,
    args: Record<string, unknown>,
    context: ToolContext
  ): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return tool.handler(args, context);
  }

  requiresConfirmation(name: string): boolean {
    const tool = this.tools.get(name);
    return tool?.definition.requiresConfirmation ?? false;
  }

  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }
}

// Export singleton instance
export const toolRegistry = new ToolRegistry();
