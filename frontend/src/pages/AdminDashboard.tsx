import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';
import {
  Shield,
  UploadCloud,
  FileText,
  Trash2,
  Loader2,
  Database,
  Layers,
  ArrowLeft,
  RefreshCw,
  HardDrive,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DocumentItem {
  _id: string;
  filename: string;
  fileSize: number;
  chunkCount: number;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/documents');
      setDocuments(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load documents list');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileUpload = async (file: File) => {
    // 1. Validate file format
    const isValidFormat =
      file.type === 'application/pdf' ||
      file.type === 'text/plain' ||
      file.name.toLowerCase().endsWith('.pdf') ||
      file.name.toLowerCase().endsWith('.txt');

    if (!isValidFormat) {
      toast.error('Only .pdf and .txt files are allowed');
      return;
    }

    // 2. Validate file size (5MB limit)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error('File exceeds maximum 5MB size limit');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    const toastId = toast.loading(`Uploading and indexing "${file.name}"...`);

    try {
      const response = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(response.data.message || 'Document indexed successfully!', { id: toastId });
      fetchDocuments();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Upload failed';
      toast.error(msg, { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (doc: DocumentItem) => {
    if (!window.confirm(`Are you sure you want to delete "${doc.filename}"? This will permanently delete both MongoDB metadata and Pinecone vector chunks.`)) {
      return;
    }

    setDeletingId(doc._id);
    const toastId = toast.loading(`Deleting "${doc.filename}" and its vector indices...`);

    try {
      const response = await api.delete(`/documents/${doc._id}`);
      toast.success(response.data.message || 'Document deleted successfully', { id: toastId });
      setDocuments((prev) => prev.filter((d) => d._id !== doc._id));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Deletion failed';
      toast.error(msg, { id: toastId });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const totalChunks = documents.reduce((acc, doc) => acc + (doc.chunkCount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Return to Main Portal"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                <h1 className="font-['Outfit'] text-2xl sm:text-3xl font-bold text-white">
                  Admin Knowledge Base Dashboard
                </h1>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Manage uploaded college PDFs, parse text in-memory, and synchronize Pinecone vector chunks with Google Gemini
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchDocuments}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <div className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold uppercase">
              Admin: {user?.name}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase text-indigo-400 tracking-wider">
                Indexed Documents
              </span>
              <div className="font-['Outfit'] text-2xl font-bold text-white mt-0.5">
                {documents.length} Files
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase text-purple-400 tracking-wider">
                Total Vector Chunks
              </span>
              <div className="font-['Outfit'] text-2xl font-bold text-white mt-0.5">
                {totalChunks} Chunks
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase text-emerald-400 tracking-wider">
                RAG Pipeline Engine
              </span>
              <div className="font-['Outfit'] text-2xl font-bold text-white mt-0.5">
                Pinecone & Gemini
              </div>
            </div>
          </div>
        </div>

        {/* Upload Zone */}
        <div className="glass-panel p-8 rounded-3xl border border-slate-800">
          <h3 className="font-['Outfit'] text-lg font-bold text-white mb-2 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-indigo-400" />
            <span>Upload New Knowledge Document</span>
          </h3>
          <p className="text-xs text-slate-400 mb-6">
            Files are processed strictly in-memory using <code className="text-indigo-300">multer.memoryStorage()</code> and <code className="text-indigo-300">pdf-parse</code>, split into 1000-char chunks, and vectorized via Google Gemini API to Pinecone.
          </p>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
              dragActive
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt"
              id="admin-file-upload-input"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />

            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                {isUploading ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <UploadCloud className="w-8 h-8" />
                )}
              </div>

              <div>
                <span className="text-sm font-bold text-white">
                  {isUploading ? 'Processing & Vectorizing Document with Gemini...' : 'Click to select or drag and drop college document'}
                </span>
                <p className="text-xs text-slate-400 mt-1">
                  Supported formats: <strong className="text-slate-300">.pdf</strong> or <strong className="text-slate-300">.txt</strong> (Max size: 5MB)
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-slate-400 border border-slate-800 text-[11px]">
                <HardDrive className="w-3 h-3 text-indigo-400" />
                <span>Duplicate filenames will be safely rejected with 409 Conflict</span>
              </div>
            </div>
          </div>
        </div>

        {/* Documents List Table */}
        <div className="glass-panel p-8 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-['Outfit'] text-lg font-bold text-white">
                Uploaded Knowledge Base Documents
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Active source documents indexed in Pinecone and referenced during student queries
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {documents.length} Available
            </span>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              <span>Loading documents...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2 border border-slate-800 rounded-2xl bg-slate-950/40">
              <FileText className="w-10 h-10 mx-auto text-slate-600" />
              <div className="text-sm font-semibold text-white">No documents uploaded yet</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Upload your first college brochure, syllabus, or placement policy PDF above to train the RAG assistant.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="pb-3 px-4">Filename</th>
                    <th className="pb-3 px-4">Size</th>
                    <th className="pb-3 px-4">Vector Chunks</th>
                    <th className="pb-3 px-4">Uploaded By</th>
                    <th className="pb-3 px-4">Upload Date</th>
                    <th className="pb-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {documents.map((doc) => (
                    <tr key={doc._id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-4 px-4 font-semibold text-white flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="truncate max-w-xs">{doc.filename}</span>
                      </td>
                      <td className="py-4 px-4 text-slate-300 font-mono">
                        {formatBytes(doc.fileSize)}
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold font-mono">
                          {doc.chunkCount} chunks
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-400">
                        {doc.uploadedBy?.name || 'Administrator'}
                      </td>
                      <td className="py-4 px-4 text-slate-400">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleDelete(doc)}
                          disabled={deletingId === doc._id}
                          className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20 transition-colors disabled:opacity-50"
                          title="Cascading Delete (MongoDB + Pinecone)"
                        >
                          {deletingId === doc._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
