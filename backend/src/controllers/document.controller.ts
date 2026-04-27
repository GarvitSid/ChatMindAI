import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
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
      const err = new Error('Invalid file type. Only .pdf and .txt files are allowed.');
      (err as any).statusCode = 400;
      cb(err);
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

    // Check duplicate filename in MongoDB up-front
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

    // Pre-generate document ID for coordinated two-phase write
    const documentId = new mongoose.Types.ObjectId();

    // 1. Process & Index into Pinecone FIRST
    const { chunkCount } = await RagService.processAndIndexDocument(
      documentId.toString(),
      originalname,
      rawText
    );

    // 2. Persist to MongoDB SECOND
    let createdDoc;
    try {
      createdDoc = await DocumentModel.create({
        _id: documentId,
        filename: originalname,
        fileSize: size,
        chunkCount,
        uploadedBy: req.user!._id,
      });
    } catch (mongoErr: any) {
      // If MongoDB write fails (e.g. concurrent race condition with duplicate code 11000):
      // Rollback the vectors we just upserted to Pinecone!
      await RagService.deleteDocumentVectors(documentId.toString(), chunkCount, originalname);

      if (mongoErr && mongoErr.code === 11000) {
        res.status(409).json({
          success: false,
          message: `A document with the filename "${originalname}" already exists. Please rename or delete the existing document.`,
        });
        return;
      }
      throw mongoErr;
    }

    res.status(201).json({
      success: true,
      message: `Document "${originalname}" uploaded and indexed successfully into ${chunkCount} chunks.`,
      data: createdDoc,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Strict 24-hex validation prevents BSON CastError and 12-char false positives
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    const doc = await DocumentModel.findById(id);
    if (!doc) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    // Cascading deletion: Pinecone vector removal FIRST
    // If this throws IngestionError (502), next(error) produces a 502 response
    // and doc.deleteOne() is never called, keeping the MongoDB record intact for retry.
    await RagService.deleteDocumentVectors(doc._id.toString(), doc.chunkCount, doc.filename);

    // Delete MongoDB document SECOND using doc.deleteOne()
    await doc.deleteOne();

    res.status(200).json({
      success: true,
      message: `Document "${doc.filename}" and its vector indices have been deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};
