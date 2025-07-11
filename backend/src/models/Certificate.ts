import mongoose, { Schema, Document } from 'mongoose';
import { Certificate as ICertificate } from '../types';

export interface CertificateDocument extends Omit<ICertificate, 'id'>, Document {
  _id: string;
}

const CertificateSchema = new Schema<CertificateDocument>({
  projectId: {
    type: String,
    required: true,
    ref: 'Project'
  },
  batchId: {
    type: String,
    required: true,
    ref: 'Batch'
  },
  certificateId: {
    type: String,
    required: true,
    trim: true
  },
  filename: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'issued', 'failed'],
    default: 'pending'
  },
  recipientName: {
    type: String,
    trim: true
  },
  recipientEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  issuedPdfPath: {
    type: String
  },
  qrCodeData: {
    type: String
  },
  verificationUrl: {
    type: String
  },
  errorMessage: {
    type: String
  },
  processingStartedAt: {
    type: String
  },
  processingCompletedAt: {
    type: String
  },
  createdAt: {
    type: String,
    default: () => new Date().toISOString()
  },
  updatedAt: {
    type: String,
    default: () => new Date().toISOString()
  }
}, {
  timestamps: false,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      delete (ret as any)._id;
      delete (ret as any).__v;
      return ret;
    }
  }
});

CertificateSchema.pre('save', function(this: CertificateDocument) {
  this.updatedAt = new Date().toISOString();
  
  // Set processing timestamps based on status changes
  if (this.isModified('status')) {
    if (this.status === 'in-progress' && !this.processingStartedAt) {
      this.processingStartedAt = new Date().toISOString();
    } else if ((this.status === 'issued' || this.status === 'failed') && !this.processingCompletedAt) {
      this.processingCompletedAt = new Date().toISOString();
    }
  }
});

// Indexes for performance and real-time queries
CertificateSchema.index({ projectId: 1 });
CertificateSchema.index({ batchId: 1 });
CertificateSchema.index({ status: 1 });
CertificateSchema.index({ certificateId: 1 });
CertificateSchema.index({ createdAt: -1 });
CertificateSchema.index({ projectId: 1, status: 1 }); // Compound index for dashboard queries

export const CertificateModel = mongoose.model<CertificateDocument>('Certificate', CertificateSchema); 