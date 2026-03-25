import { Response, NextFunction } from 'express';
import { ChatSession } from '../models/ChatSession.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { RagService } from '../services/rag.service.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export const getSessions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessions = await ChatSession.find({ userId: req.user!._id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    next(error);
  }
};

export const createSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title } = req.body;
    const newSession = await ChatSession.create({
      userId: req.user!._id,
      title: title?.trim() || 'New Conversation',
    });

    res.status(201).json({
      success: true,
      data: newSession,
    });
  } catch (error) {
    next(error);
  }
};

export const getSessionById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const session = await ChatSession.findOne({ _id: id, userId: req.user!._id });
    if (!session) {
      res.status(404).json({ success: false, message: 'Chat session not found' });
      return;
    }

    const messages = await ChatMessage.find({ sessionId: session._id }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: {
        session,
        messages,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const askQuestion = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sessionId, message } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ success: false, message: 'Question message is required' });
      return;
    }

    let currentSession = null;

    if (sessionId) {
      currentSession = await ChatSession.findOne({ _id: sessionId, userId: req.user!._id });
    }

    // Auto-create session if not provided or not found
    if (!currentSession) {
      const generatedTitle = message.trim().slice(0, 40) + (message.length > 40 ? '...' : '');
      currentSession = await ChatSession.create({
        userId: req.user!._id,
        title: generatedTitle,
      });
    }

    // Persist user question
    const userMessage = await ChatMessage.create({
      sessionId: currentSession._id,
      role: 'user',
      content: message.trim(),
      sources: [],
    });

    // Execute RAG Pipeline with strict prompt
    const { answer, sources } = await RagService.answerQuestion(message.trim());

    // Persist AI response
    const aiMessage = await ChatMessage.create({
      sessionId: currentSession._id,
      role: 'ai',
      content: answer,
      sources,
    });

    res.status(200).json({
      success: true,
      data: {
        sessionId: currentSession._id,
        userMessage,
        aiMessage,
      },
    });
  } catch (error) {
    next(error);
  }
};
