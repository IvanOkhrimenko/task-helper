import { PrismaClient, ChatRole, ActionStatus } from '@prisma/client';
import { AIMessage } from './providers/ai-provider.interface';

export class ConversationService {
  constructor(private prisma: PrismaClient) {}

  async createConversation(userId: string, title?: string) {
    return this.prisma.chatConversation.create({
      data: {
        userId,
        title: title || 'New conversation'
      }
    });
  }

  async getConversation(conversationId: string, userId: string) {
    return this.prisma.chatConversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  }

  async getUserConversations(userId: string, limit = 20) {
    return this.prisma.chatConversation.findMany({
      where: { userId, isActive: true },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, role: true, createdAt: true }
        },
        _count: { select: { messages: true } }
      }
    });
  }

  async deleteConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: { id: conversationId, userId }
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    await this.prisma.chatConversation.delete({
      where: { id: conversationId }
    });
  }

  async addMessage(
    conversationId: string,
    role: ChatRole,
    content: string,
    options?: {
      toolCalls?: any[];
      toolCallId?: string;
      tokenCount?: number;
      processingMs?: number;
    }
  ) {
    const message = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        role,
        content,
        toolCalls: options?.toolCalls ? options.toolCalls : undefined,
        toolCallId: options?.toolCallId || undefined,
        tokenCount: options?.tokenCount,
        processingMs: options?.processingMs
      }
    });

    // Update conversation's updatedAt
    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    // Auto-generate title from first user message
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
      include: { messages: { take: 1, orderBy: { createdAt: 'asc' } } }
    });

    if (conversation?.title === 'New conversation' && role === 'USER') {
      const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
      await this.prisma.chatConversation.update({
        where: { id: conversationId },
        data: { title }
      });
    }

    return message;
  }

  async getMessages(conversationId: string): Promise<AIMessage[]> {
    const messages = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' }
    });

    // Process messages to properly group tool results
    // Claude API requires tool_result messages to come right after assistant message with tool_use
    // and consecutive tool_results should be grouped into one message
    const result: AIMessage[] = [];
    let pendingToolResults: { toolCallId: string; content: string }[] = [];
    let lastAssistantToolUseIds: Set<string> = new Set();

    for (const m of messages) {
      if (m.role === 'TOOL') {
        // Collect tool results
        if (m.toolCallId && lastAssistantToolUseIds.has(m.toolCallId)) {
          pendingToolResults.push({
            toolCallId: m.toolCallId,
            content: m.content
          });
        }
        // Skip tool results that don't match - they're orphaned
      } else {
        // Flush pending tool results before non-tool message
        if (pendingToolResults.length > 0) {
          // If only one tool result, add as single tool message
          // If multiple, they'll be combined by the provider
          for (const tr of pendingToolResults) {
            result.push({
              role: 'tool',
              content: tr.content,
              toolCallId: tr.toolCallId
            });
          }
          pendingToolResults = [];
          lastAssistantToolUseIds.clear();
        }

        // Add the message
        const aiMessage: AIMessage = {
          role: m.role.toLowerCase() as 'user' | 'assistant' | 'system',
          content: m.content,
          toolCalls: m.toolCalls as any[] | undefined,
          toolCallId: m.toolCallId || undefined
        };

        // Track tool_use IDs from assistant messages
        if (m.role === 'ASSISTANT' && m.toolCalls) {
          lastAssistantToolUseIds.clear();
          const toolCalls = m.toolCalls as any[];
          for (const tc of toolCalls) {
            if (tc.id) {
              lastAssistantToolUseIds.add(tc.id);
            }
          }
        }

        result.push(aiMessage);
      }
    }

    // Flush any remaining tool results
    if (pendingToolResults.length > 0) {
      for (const tr of pendingToolResults) {
        result.push({
          role: 'tool',
          content: tr.content,
          toolCallId: tr.toolCallId
        });
      }
    }

    return result;
  }

  // Pending Actions
  async createPendingAction(
    conversationId: string,
    messageId: string,
    toolName: string,
    toolArgs: any,
    toolCallId?: string  // Store the original Claude tool_use_id
  ) {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 min expiry

    return this.prisma.chatPendingAction.create({
      data: {
        conversationId,
        messageId,
        toolName,
        toolArgs,
        toolCallId,  // Store for later use when executing
        expiresAt
      }
    });
  }

  async getPendingAction(actionId: string, conversationId: string) {
    return this.prisma.chatPendingAction.findFirst({
      where: {
        id: actionId,
        conversationId,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      }
    });
  }

  async getPendingActions(conversationId: string) {
    return this.prisma.chatPendingAction.findMany({
      where: {
        conversationId,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async resolveAction(actionId: string, status: 'APPROVED' | 'REJECTED') {
    return this.prisma.chatPendingAction.update({
      where: { id: actionId },
      data: {
        status: status as ActionStatus,
        resolvedAt: new Date()
      }
    });
  }

  async expireOldActions() {
    await this.prisma.chatPendingAction.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: new Date() }
      },
      data: {
        status: 'EXPIRED'
      }
    });
  }
}
