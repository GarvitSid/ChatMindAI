import { Response, NextFunction } from 'express';
import multer from 'multer';
import { DocumentModel } from '../models/Document.js';
import { RagService } from '../services/rag.service.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

// Configure multer memory storage with 5MB limit and format filter
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    const isTxt = file.mimetype === 'text/plain' || file.originalname.toLowerCase().endsWith('.txt');
    if (isPdf || isTxt) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .pdf and .txt files are allowed.'));
    }
  },
}).single('file');

export const getDocuments = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const documents = await DocumentModel.find()
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadDocument = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded. Please select a .pdf or .txt file.' });
      return;
    }

    const { originalname, size, buffer, mimetype } = req.file;

    // Check duplicate filename in MongoDB
    const existingDoc = await DocumentModel.findOne({ filename: originalname });
    if (existingDoc) {
      res.status(409).json({
        success: false,
        message: `A document with the filename "${originalname}" already exists. Please rename or delete the existing document.`,
      });
      return;
    }

    // Extract text strictly from memory buffer
    const rawText = await RagService.extractTextFromBuffer(buffer, mimetype, originalname);

    // Create preliminary document in MongoDB
    const newDoc = await DocumentModel.create({
      filename: originalname,
      fileSize: size,
      chunkCount: 0,
      uploadedBy: req.user!._id,
    });

    // Process chunks & Pinecone index
    const { chunkCount } = await RagService.processAndIndexDocument(
      newDoc._id.toString(),
      originalname,
      rawText
    );

    newDoc.chunkCount = chunkCount;
    await newDoc.save();

    res.status(201).json({
      success: true,
      message: `Document "${originalname}" uploaded and indexed successfully into ${chunkCount} chunks.`,
      data: newDoc,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const doc = await DocumentModel.findById(id);
    if (!doc) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    // Cascading deletion: Pinecone vector removal
    await RagService.deleteDocumentVectors(doc._id.toString(), doc.chunkCount, doc.filename);

    // Delete MongoDB document
    await DocumentModel.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: `Document "${doc.filename}" and its vector indices have been deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};
