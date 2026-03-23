import mongoose, { Document as MongooseDoc, Schema } from 'mongoose';

export interface IDocument extends MongooseDoc {
  _id: mongoose.Types.ObjectId;
  filename: string;
  fileSize: number;
  chunkCount: number;
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    filename: {
      type: String,
      required: [true, 'Filename is required'],
      unique: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    chunkCount: {
      type: Number,
      default: 0,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const DocumentModel = mongoose.model<IDocument>('Document', DocumentSchema);
