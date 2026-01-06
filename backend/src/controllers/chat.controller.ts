import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { AIChatService } from '../services/ai/ai-chat.service';

// Stream message with SSE
export async function streamMessage(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { conversationId, message } = req.body;

  if (!conversationId || !message) {
    res.status(400).json({ error: 'conversationId and message are required' });
    return;
  }

  // Verify conversation belongs to user
  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, userId: req.userId }
  });

  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const chatService = new AIChatService(prisma);

  try {
    for await (const chunk of chatService.streamMessage(req.userId!, conversationId, message)) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
    res.write('data: [DONE]\n\n');
  } catch (error: any) {
    console.error('Chat stream error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
  } finally {
    res.end();
  }
}

// Non-streaming message (fallback)
export async function sendMessage(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { conversationId, message } = req.body;

  if (!conversationId || !message) {
    res.status(400).json({ error: 'conversationId and message are required' });
    return;
  }

  // Verify conversation belongs to user
  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, userId: req.userId }
  });

  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  try {
    const chatService = new AIChatService(prisma);
    const result = await chatService.processMessage(req.userId!, conversationId, message);
    res.json(result);
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Get conversations list
export async function getConversations(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const limit = parseInt(req.query.limit as string) || 20;

  try {
    const chatService = new AIChatService(prisma);
    const conversations = await chatService.conversation.getUserConversations(req.userId!, limit);

    res.json({
      conversations: conversations.map(c => ({
        id: c.id,
        title: c.title,
        messageCount: c._count.messages,
        lastMessage: c.messages[0] || null,
        updatedAt: c.updatedAt
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Create new conversation
export async function createConversation(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { title } = req.body;

  try {
    const chatService = new AIChatService(prisma);
    const conversation = await chatService.conversation.createConversation(req.userId!, title);
    res.status(201).json(conversation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Get conversation with messages
export async function getConversation(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const chatService = new AIChatService(prisma);
    const conversation = await chatService.conversation.getConversation(id, req.userId!);

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    // Get pending actions for this conversation
    const pendingActions = await chatService.conversation.getPendingActions(id);

    res.json({
      ...conversation,
      pendingActions: pendingActions.map(a => ({
        id: a.id,
        toolName: a.toolName,
        toolArgs: a.toolArgs,
        expiresAt: a.expiresAt
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Delete conversation
export async function deleteConversation(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const chatService = new AIChatService(prisma);
    await chatService.conversation.deleteConversation(id, req.userId!);
    res.status(204).send();
  } catch (error: any) {
    if (error.message === 'Conversation not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

// Approve pending action
export async function approveAction(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;
  const { conversationId } = req.body;

  if (!conversationId) {
    res.status(400).json({ error: 'conversationId is required' });
    return;
  }

  // Verify conversation belongs to user
  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, userId: req.userId }
  });

  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  try {
    const chatService = new AIChatService(prisma);
    const result = await chatService.executeApprovedAction(req.userId!, conversationId, id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Reject pending action
export async function rejectAction(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;
  const { conversationId } = req.body;

  if (!conversationId) {
    res.status(400).json({ error: 'conversationId is required' });
    return;
  }

  // Verify conversation belongs to user
  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, userId: req.userId }
  });

  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  try {
    const chatService = new AIChatService(prisma);
    await chatService.rejectAction(id, conversationId);
    res.json({ success: true, message: 'Action rejected' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Get chat settings (public - limited info, no API keys)
export async function getChatSettings(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');

  try {
    const chatService = new AIChatService(prisma);
    const settings = await chatService.getSettings();

    res.json({
      provider: settings.provider,
      modelId: settings.modelId,
      maxTokens: settings.maxTokens,
      temperature: settings.temperature,
      isActive: settings.isActive
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Get chat settings for admin (includes masked API keys)
export async function getSettingsForAdmin(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');

  try {
    const chatService = new AIChatService(prisma);
    const settings = await chatService.getSettings();

    // Mask API keys - show only last 4 characters
    const maskApiKey = (key: string | null): string | null => {
      if (!key) return null;
      if (key.length <= 8) return '****';
      return '****' + key.slice(-4);
    };

    res.json({
      provider: settings.provider,
      modelId: settings.modelId,
      maxTokens: settings.maxTokens,
      temperature: settings.temperature,
      isActive: settings.isActive,
      claudeApiKey: maskApiKey(settings.claudeApiKey),
      openaiApiKey: maskApiKey(settings.openaiApiKey),
      hasClaudeKey: !!settings.claudeApiKey,
      hasOpenaiKey: !!settings.openaiApiKey,
      updatedAt: settings.updatedAt
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Update chat settings (admin only)
export async function updateChatSettings(req: AuthRequest, res: Response): Promise<void> {
  const prisma: PrismaClient = req.app.get('prisma');
  const { provider, modelId, maxTokens, temperature, claudeApiKey, openaiApiKey, isActive } = req.body;

  try {
    const chatService = new AIChatService(prisma);
    const settings = await chatService.updateSettings({
      provider,
      modelId,
      maxTokens,
      temperature,
      claudeApiKey,
      openaiApiKey,
      isActive
    });

    // Mask API keys in response
    const maskApiKey = (key: string | null): string | null => {
      if (!key) return null;
      if (key.length <= 8) return '****';
      return '****' + key.slice(-4);
    };

    res.json({
      provider: settings.provider,
      modelId: settings.modelId,
      maxTokens: settings.maxTokens,
      temperature: settings.temperature,
      isActive: settings.isActive,
      claudeApiKey: maskApiKey(settings.claudeApiKey),
      openaiApiKey: maskApiKey(settings.openaiApiKey),
      hasClaudeKey: !!settings.claudeApiKey,
      hasOpenaiKey: !!settings.openaiApiKey,
      updatedAt: settings.updatedAt
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
