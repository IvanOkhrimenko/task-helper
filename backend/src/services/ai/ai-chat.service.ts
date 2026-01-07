import { PrismaClient } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { claudeProvider } from './providers/claude.provider';
import {
  AIProvider,
  AIMessage,
  AIProviderConfig,
  StreamChunk,
  ToolCall
} from './providers/ai-provider.interface';
import { toolRegistry, ToolContext } from './tools/tool-registry';

// Register all tools
import { registerAnalyticsTools } from './tools/analytics.tools';
import { registerTaskTools } from './tools/task.tools';
import { registerInvoiceTools } from './tools/invoice.tools';
import { registerReminderTools } from './tools/reminder.tools';
import { registerEmailTemplateTools } from './tools/email-template.tools';

// Initialize tools
registerAnalyticsTools();
registerTaskTools();
registerInvoiceTools();
registerReminderTools();
registerEmailTemplateTools();

const SYSTEM_PROMPT = `You are a helpful AI assistant for Daylium, a task and invoice management application.
You help users manage their invoices, tasks, and reminders through natural conversation.

LANGUAGE RULE:
- ALWAYS respond in the SAME LANGUAGE the user writes to you
- If user writes in Ukrainian - respond in Ukrainian
- If user writes in English - respond in English
- If user writes in Polish - respond in Polish
- And so on for any language

CRITICAL DATA RULES:
1. You can ONLY work with data that exists in the user's system. NEVER make up or guess client names, task names, or any other data.
2. BEFORE any action (creating invoices, reminders, etc.), you MUST first call the appropriate tool to fetch user's existing data:
   - For invoices: ALWAYS call "listTasks" first to see available clients/companies
   - For reminders: ALWAYS call "listReminders" first to see existing reminders
3. If user has MULTIPLE clients/tasks and doesn't specify which one, you MUST:
   - List all available options from the tool results
   - Ask user to choose which one they want
   - NEVER proceed with the first one or make a guess
4. If user has NO clients/tasks, inform them they need to create one first in the app.
5. NEVER invent data like "John Doe" or any placeholder names - only use actual data from tool results.

INVOICE CREATION - MANDATORY STEPS:
Before creating an invoice, you MUST gather ALL required information:
1. First call listTasks to get available clients
2. If multiple clients - ASK user which one
3. ASK user for the billing period (month/year) if not specified
4. ASK user how many hours they worked (MANDATORY - never assume!)
5. Confirm the hourly rate from task data (or ask if they want to change it)
6. Show a summary BEFORE creating:
   "**Invoice Summary:**
   - Client: ClientName
   - Period: January 2025
   - Hours: 160h
   - Rate: $50/hr
   - Total: **$8,000.00**

   Should I create this invoice?"
7. Only create invoice AFTER user confirms all details

RESPONSE FORMAT RULES:
- NEVER show raw JSON to the user
- Format tool results into human-readable text
- When a tool returns a "formattedResponse" field, USE IT EXACTLY AS PROVIDED - it contains properly formatted markdown with links
- For invoice creation: the tool returns a ready-to-use "formattedResponse" with the invoice link - just output that text directly
- Use markdown formatting: **bold** for important values, bullet points for lists
- ALWAYS include clickable links using format: [Link text](/path) - these MUST be in markdown format to be clickable

Available capabilities:
- Create and manage invoices for EXISTING clients only
- Track tasks and update their details
- Set up reminders with various schedules
- Provide analytics on earnings, hours worked, and client activity
- Generate custom email templates for invoice emails (formal, casual, brief, or detailed styles)
- Answer questions about app features

Guidelines:
- Be concise and helpful
- For financial queries, always specify the currency from the task data
- When dates are ambiguous (e.g., "September"), assume the current year unless specified
- Format numbers nicely (e.g., $8,800.00 instead of 8800)
- Use tool results to provide accurate, data-driven responses
- ALWAYS show task details (hours, rate, currency) when asking for confirmation
- If user says just "create invoice" without details - you MUST ask about client, period, and hours

Current date: ${new Date().toISOString().split('T')[0]}
`;

export class AIChatService {
  private conversationService: ConversationService;
  private provider: AIProvider;
  private config: AIProviderConfig | null = null;

  constructor(private prisma: PrismaClient) {
    this.conversationService = new ConversationService(prisma);
    this.provider = claudeProvider;
  }

  // Load config from DB, falling back to environment variables
  private async loadConfig(): Promise<AIProviderConfig> {
    if (this.config) return this.config;

    const settings = await this.getSettings();

    // Priority: DB settings > env variables > defaults
    this.config = {
      apiKey: settings.claudeApiKey || process.env.ANTHROPIC_API_KEY || '',
      modelId: settings.modelId || process.env.AI_MODEL_ID || 'claude-sonnet-4-20250514',
      maxTokens: settings.maxTokens || parseInt(process.env.AI_MAX_TOKENS || '4096'),
      temperature: settings.temperature || parseFloat(process.env.AI_TEMPERATURE || '0.7')
    };

    return this.config;
  }

  // Invalidate config cache when settings change
  public invalidateConfigCache(): void {
    this.config = null;
  }

  get conversation() {
    return this.conversationService;
  }

  async processMessage(
    userId: string,
    conversationId: string,
    userMessage: string
  ): Promise<{ response: string; pendingActions: any[] }> {
    // Save user message
    await this.conversationService.addMessage(conversationId, 'USER', userMessage);

    // Build messages array with system prompt
    const messages: AIMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(await this.conversationService.getMessages(conversationId))
    ];

    const tools = toolRegistry.getDefinitions();
    const toolContext: ToolContext = { userId, prisma: this.prisma, conversationId };
    const config = await this.loadConfig();

    let response = await this.provider.chat(messages, tools, config);
    const pendingActions: any[] = [];

    // Handle tool calls
    while (response.toolCalls && response.toolCalls.length > 0) {
      // Save assistant's tool call message
      await this.conversationService.addMessage(
        conversationId,
        'ASSISTANT',
        response.content,
        { toolCalls: response.toolCalls }
      );

      // Process each tool call
      for (const toolCall of response.toolCalls) {
        const requiresConfirmation = toolRegistry.requiresConfirmation(toolCall.name);

        if (requiresConfirmation) {
          // Create pending action with original tool_use_id
          const action = await this.conversationService.createPendingAction(
            conversationId,
            '', // Will be updated with actual message ID
            toolCall.name,
            toolCall.arguments,
            toolCall.id  // Store Claude's tool_use_id
          );
          pendingActions.push({
            id: action.id,
            toolName: toolCall.name,
            toolArgs: toolCall.arguments
          });

          // Add tool result indicating confirmation needed
          await this.conversationService.addMessage(
            conversationId,
            'TOOL',
            JSON.stringify({
              status: 'pending_confirmation',
              message: 'This action requires user confirmation before execution.'
            }),
            { toolCallId: toolCall.id }
          );
        } else {
          // Execute tool immediately
          try {
            const result = await toolRegistry.execute(toolCall.name, toolCall.arguments, toolContext);
            await this.conversationService.addMessage(
              conversationId,
              'TOOL',
              JSON.stringify(result),
              { toolCallId: toolCall.id }
            );
          } catch (error: any) {
            await this.conversationService.addMessage(
              conversationId,
              'TOOL',
              JSON.stringify({ error: error.message }),
              { toolCallId: toolCall.id }
            );
          }
        }
      }

      // Get updated messages and continue conversation
      messages.length = 0;
      messages.push(
        { role: 'system', content: SYSTEM_PROMPT },
        ...(await this.conversationService.getMessages(conversationId))
      );

      response = await this.provider.chat(messages, tools, config);
    }

    // Save final assistant response
    await this.conversationService.addMessage(conversationId, 'ASSISTANT', response.content);

    return {
      response: response.content,
      pendingActions
    };
  }

  async *streamMessage(
    userId: string,
    conversationId: string,
    userMessage: string
  ): AsyncGenerator<StreamChunk & { pendingAction?: any }> {
    // Save user message
    await this.conversationService.addMessage(conversationId, 'USER', userMessage);

    const tools = toolRegistry.getDefinitions();
    const toolContext: ToolContext = { userId, prisma: this.prisma, conversationId };
    const config = await this.loadConfig();

    // Loop to handle tool calls that may require continuation
    let continueConversation = true;
    let iteration = 0;
    const MAX_ITERATIONS = 5; // Prevent infinite loops

    while (continueConversation && iteration < MAX_ITERATIONS) {
      iteration++;
      continueConversation = false;

      // Build messages array fresh each iteration
      const messages: AIMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...(await this.conversationService.getMessages(conversationId))
      ];

      let fullResponse = '';
      const toolCalls: ToolCall[] = [];
      const toolResults: { toolCallId: string; result: string }[] = [];
      let hasPendingActions = false;

      // Stream the response
      for await (const chunk of this.provider.streamChat(messages, tools, config)) {
        if (chunk.type === 'text') {
          fullResponse += chunk.content || '';
          yield chunk;
        } else if (chunk.type === 'tool_use' && chunk.toolCall) {
          toolCalls.push(chunk.toolCall);

          const requiresConfirmation = toolRegistry.requiresConfirmation(chunk.toolCall.name);

          if (requiresConfirmation) {
            hasPendingActions = true;

            // Enrich tool arguments with human-readable data
            const enrichedArgs = await this.enrichToolArgs(
              chunk.toolCall.name,
              chunk.toolCall.arguments,
              userId
            );

            // Create pending action with original tool_use_id
            const action = await this.conversationService.createPendingAction(
              conversationId,
              '',
              chunk.toolCall.name,
              chunk.toolCall.arguments,
              chunk.toolCall.id  // Store Claude's tool_use_id
            );

            yield {
              type: 'tool_use',
              toolCall: chunk.toolCall,
              pendingAction: {
                id: action.id,
                toolName: chunk.toolCall.name,
                toolArgs: enrichedArgs,
                requiresConfirmation: true
              }
            };
          } else {
            // Execute tool immediately
            try {
              const result = await toolRegistry.execute(
                chunk.toolCall.name,
                chunk.toolCall.arguments,
                toolContext
              );

              // Store tool result (will save after assistant message)
              toolResults.push({
                toolCallId: chunk.toolCall.id,
                result: JSON.stringify(result)
              });

              yield {
                type: 'tool_result',
                content: JSON.stringify(result)
              };
            } catch (error: any) {
              toolResults.push({
                toolCallId: chunk.toolCall.id,
                result: JSON.stringify({ error: error.message })
              });
              yield {
                type: 'error',
                error: error.message
              };
            }
          }
        } else if (chunk.type === 'done') {
          // First save the assistant message with tool calls
          if (fullResponse || toolCalls.length > 0) {
            await this.conversationService.addMessage(
              conversationId,
              'ASSISTANT',
              fullResponse,
              { toolCalls: toolCalls.length > 0 ? toolCalls : undefined }
            );
          }

          // Then save tool results (so they come after assistant message with tool_use)
          for (const tr of toolResults) {
            await this.conversationService.addMessage(
              conversationId,
              'TOOL',
              tr.result,
              { toolCallId: tr.toolCallId }
            );
          }

          // If we executed tools and didn't have pending actions, continue to get final response
          if (toolResults.length > 0 && !hasPendingActions) {
            continueConversation = true;
          }
        } else if (chunk.type === 'error') {
          yield chunk;
        }
      }
    }

    // Final done signal
    yield { type: 'done' };
  }

  async executeApprovedAction(
    userId: string,
    conversationId: string,
    actionId: string
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    const action = await this.conversationService.getPendingAction(actionId, conversationId);

    if (!action) {
      return { success: false, error: 'Action not found or expired' };
    }

    const toolContext: ToolContext = { userId, prisma: this.prisma, conversationId };

    try {
      const result = await toolRegistry.execute(
        action.toolName,
        action.toolArgs as Record<string, unknown>,
        toolContext
      );

      await this.conversationService.resolveAction(actionId, 'APPROVED');

      // Add tool result message with correct Claude tool_use_id
      await this.conversationService.addMessage(
        conversationId,
        'TOOL',
        JSON.stringify(result),
        { toolCallId: action.toolCallId || action.id }  // Use original Claude ID if available
      );

      return { success: true, result };
    } catch (error: any) {
      await this.conversationService.resolveAction(actionId, 'REJECTED');
      return { success: false, error: error.message };
    }
  }

  async rejectAction(actionId: string, conversationId: string): Promise<void> {
    const action = await this.conversationService.getPendingAction(actionId, conversationId);
    if (action) {
      await this.conversationService.resolveAction(actionId, 'REJECTED');
    }
  }

  // Enrich tool arguments with human-readable data
  private async enrichToolArgs(
    toolName: string,
    args: Record<string, unknown>,
    userId: string
  ): Promise<Record<string, unknown>> {
    const enriched = { ...args };
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    if (toolName === 'createInvoice') {
      // Enrich with task/client info
      if (args.taskId) {
        const task = await this.prisma.task.findUnique({
          where: { id: args.taskId as string },
          select: {
            clientName: true,
            name: true,
            hourlyRate: true,
            hoursWorked: true,
            currency: true
          }
        });

        if (task) {
          delete enriched.taskId; // Remove technical ID
          enriched.client = task.clientName || task.name;

          const hours = args.hoursWorked !== undefined
            ? args.hoursWorked as number
            : (task.hoursWorked ? Number(task.hoursWorked) : 0);

          const rate = args.hourlyRate !== undefined
            ? args.hourlyRate as number
            : (task.hourlyRate ? Number(task.hourlyRate) : 0);

          enriched.hours = `${hours}h`;
          enriched.rate = `${task.currency} ${rate}/hr`;
          enriched.total = `${task.currency} ${(hours * rate).toLocaleString()}`;

          // Remove technical fields
          delete enriched.hoursWorked;
          delete enriched.hourlyRate;
        }
      }

      // Format month/year nicely
      if (args.month !== undefined && args.year !== undefined) {
        const month = args.month as number;
        const year = args.year as number;
        enriched.period = `${monthNames[month]} ${year}`;
        delete enriched.month;
        delete enriched.year;
      }
    }

    return enriched;
  }

  // Settings management
  async getSettings() {
    let settings = await this.prisma.aIChatSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.aIChatSettings.create({
        data: {}
      });
    }
    return settings;
  }

  async updateSettings(data: {
    provider?: string;
    modelId?: string;
    maxTokens?: number;
    temperature?: number;
    claudeApiKey?: string;
    openaiApiKey?: string;
    isActive?: boolean;
  }) {
    const settings = await this.getSettings();

    // Only update API keys if provided (non-empty string)
    const updateData: any = {};

    if (data.provider !== undefined) updateData.provider = data.provider;
    if (data.modelId !== undefined) updateData.modelId = data.modelId;
    if (data.maxTokens !== undefined) updateData.maxTokens = data.maxTokens;
    if (data.temperature !== undefined) updateData.temperature = data.temperature;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // API keys - only update if explicitly provided
    if (data.claudeApiKey !== undefined && data.claudeApiKey !== '') {
      updateData.claudeApiKey = data.claudeApiKey;
    }
    if (data.openaiApiKey !== undefined && data.openaiApiKey !== '') {
      updateData.openaiApiKey = data.openaiApiKey;
    }

    const updated = await this.prisma.aIChatSettings.update({
      where: { id: settings.id },
      data: updateData
    });

    // Invalidate config cache so next request uses new settings
    this.invalidateConfigCache();

    return updated;
  }
}
