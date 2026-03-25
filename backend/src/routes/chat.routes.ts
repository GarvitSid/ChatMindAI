import { Router } from 'express';
import { getSessions, createSession, getSessionById, askQuestion } from '../controllers/chat.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/sessions', getSessions);
router.post('/sessions', createSession);
router.get('/sessions/:id', getSessionById);
router.post('/ask', askQuestion);

export default router;
