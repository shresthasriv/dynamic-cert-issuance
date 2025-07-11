import mongoose, { Schema, Document } from 'mongoose';
import { Batch as IBatch } from '../types';

export interface BatchDocument extends Omit<IBatch, 'id'>, Document {
  _id: string;
}

const BatchSchema = new Schema<BatchDocument>({
  projectId: {
    type: String,
    required: true,
    ref: 'Project'
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  totalCertificates: {
    type: Number,
    required: true,
    min: 1,
    max: 250
  },
  processedCertificates: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  zipFilePath: {
    type: String
  },
  excelFilePath: {
    type: String
  },
  validationResults: {
    isValid: Boolean,
    totalEntries: Number,
    validRecords: Number,
    invalidRecords: Number,
    estimatedProcessingTime: Number,
    errors: [String]
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

BatchSchema.pre('save', function(this: BatchDocument) {
  this.updatedAt = new Date().toISOString();
});

// Indexes for performance
BatchSchema.index({ projectId: 1 });
BatchSchema.index({ status: 1 });
BatchSchema.index({ createdAt: -1 });

export const BatchModel = mongoose.model<BatchDocument>('Batch', BatchSchema); 