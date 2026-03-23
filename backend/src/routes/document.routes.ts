import { Router } from 'express';
import { getDocuments, uploadDocument, deleteDocument, uploadMiddleware } from '../controllers/document.controller.js';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// Section 10: Protected - Admin Only
router.use(authenticate, requireAdmin);

router.get('/', getDocuments);
router.post('/upload', uploadMiddleware, uploadDocument);
router.delete('/:id', deleteDocument);

export default router;
