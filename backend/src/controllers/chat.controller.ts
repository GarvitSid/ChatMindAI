import { Response, NextFunction } from 'express';
import { ChatSession } from '../models/ChatSession.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { RagService } from '../services/rag.service.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { RAG_CONFIG } from '../config/rag.config.js';

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

    // 1. Validate question presence and length bounds
    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ success: false, message: 'Question message is required' });
      return;
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length > RAG_CONFIG.maxQuestionLength) {
      res.status(400).json({
        success: false,
        message: `Question exceeds maximum allowed length of ${RAG_CONFIG.maxQuestionLength} characters`,
      });
      return;
    }

    // 2. Early session validation BEFORE running RAG (prevents burning embedding API quota on invalid sessions)
    let currentSession = null;
    if (sessionId) {
      if (!/^[0-9a-fA-F]{24}$/.test(sessionId)) {
        res.status(404).json({ success: false, message: 'Chat session not found' });
        return;
      }
      currentSession = await ChatSession.findOne({ _id: sessionId, userId: req.user!._id });
      if (!currentSession) {
        res.status(404).json({ success: false, message: 'Chat session not found' });
        return;
      }
    }

    // 3. Execute RAG Pipeline FIRST: query embedding, threshold gate, and Gemini generation
    // If this throws (e.g. 502), execution jumps straight to next(error) leaving 0 messages in MongoDB
    const { answer, sources } = await RagService.answerQuestion(trimmedMessage);

    // 4. Persist messages SECOND: only after answer generation succeeds
    if (!currentSession) {
      const generatedTitle = trimmedMessage.slice(0, 40) + (trimmedMessage.length > 40 ? '...' : '');
      currentSession = await ChatSession.create({
        userId: req.user!._id,
        title: generatedTitle,
      });
    }

    // Single batch write with explicit timestamp offsets for deterministic ordering
    const now = Date.now();
    const [userMessage, aiMessage] = await ChatMessage.insertMany(
      [
        {
          sessionId: currentSession._id,
          role: 'user',
          content: trimmedMessage,
          sources: [],
          createdAt: new Date(now),
        },
        {
          sessionId: currentSession._id,
          role: 'ai',
          content: answer,
          sources,
          createdAt: new Date(now + 10),
        },
      ],
      { ordered: true }
    );

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
