import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import * as XLSX from 'xlsx';
import { BatchModel, BatchDocument } from '../models/Batch';
import { CertificateModel } from '../models/Certificate';
import { Batch, Certificate, ValidationResults, BatchBreakdown } from '../types';

export class BatchService {
  // Configuration constants
  private static readonly MAX_CERTIFICATES = parseInt(process.env.MAX_CERTIFICATES || '250');
  private static readonly BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '50');
  private static readonly PROCESSING_TIME_PER_CERT = 0.1; // minutes per certificate

  /**
   * Process uploaded ZIP file and create batch with validation
   */
  static async processZipFile(projectId: string, zipFilePath: string): Promise<Batch> {
    try {
      // Extract ZIP contents
      const extractPath = path.dirname(zipFilePath);
      const extractedDir = path.join(extractPath, 'extracted');
      
      // Create extraction directory
      if (!fs.existsSync(extractedDir)) {
        fs.mkdirSync(extractedDir, { recursive: true });
      }

      const zip = new AdmZip(zipFilePath);
      zip.extractAllTo(extractedDir, true);

      // Find Excel file and PDFs
      const files = fs.readdirSync(extractedDir);
      const excelFile = files.find(file => 
        file.toLowerCase().endsWith('.xlsx') || file.toLowerCase().endsWith('.xls')
      );

      if (!excelFile) {
        throw new Error('No Excel file found in ZIP. Please include a certificate mapping file.');
      }

      const excelFilePath = path.join(extractedDir, excelFile);
      const pdfFiles = files.filter(file => 
        file.toLowerCase().endsWith('.pdf')
      );

      // Parse Excel file and validate
      const validationResults = await this.validateBatchFiles(excelFilePath, pdfFiles);

      // Create batch record
      const batch = new BatchModel({
        projectId,
        name: `Batch ${new Date().toLocaleDateString()}`,
        totalCertificates: validationResults.totalEntries,
        zipFilePath: path.relative(path.join(__dirname, '../../../'), zipFilePath),
        excelFilePath: excelFile, // Store just the filename, not the full extracted path
        validationResults,
        status: validationResults.isValid ? 'pending' : 'failed'
      });

      const savedBatch = await batch.save();

      // If validation passed, create certificate records
      if (validationResults.isValid) {
        await this.createCertificateRecords(savedBatch._id.toString(), projectId, excelFilePath);
      }

      // Clean up extracted files (but keep the original ZIP)
      if (fs.existsSync(extractedDir)) {
        fs.rmSync(extractedDir, { recursive: true, force: true });
      }

      return this.transformDocument(savedBatch.toObject());
    } catch (error) {
      console.error('Error processing ZIP file:', error);
      
      // Clean up on error
      const extractedDir = path.join(path.dirname(zipFilePath), 'extracted');
      if (fs.existsSync(extractedDir)) {
        fs.rmSync(extractedDir, { recursive: true, force: true });
      }
      
      throw error;
    }
  }

  /**
   * Validate Excel file against PDF files in ZIP
   */
  private static async validateBatchFiles(
    excelFilePath: string, 
    pdfFiles: string[]
  ): Promise<ValidationResults> {
    const errors: string[] = [];
    const missingPdfs: string[] = [];
    const extraPdfs: string[] = [];

    try {
      // Read Excel file
      const workbook = XLSX.readFile(excelFilePath);
      const sheetName = workbook.SheetNames[0];
      
      if (!sheetName) {
        errors.push('Excel file has no worksheets');
        return this.createFailedValidation(errors);
      }

      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      if (!data.length) {
        errors.push('Excel file is empty');
        return this.createFailedValidation(errors);
      }

      // Validate Excel structure
      const firstRow = data[0] as any;
      const requiredColumns = ['certificateId', 'filename'];
      const missingColumns = requiredColumns.filter(col => 
        !Object.keys(firstRow).some(key => 
          key.toLowerCase().includes(col.toLowerCase())
        )
      );

      if (missingColumns.length > 0) {
        errors.push(`Excel file missing required columns: ${missingColumns.join(', ')}`);
        return this.createFailedValidation(errors);
      }

      // Extract certificate data
      const certificates: Array<{certificateId: string, filename: string}> = [];
      const seenIds = new Set<string>();
      const seenFilenames = new Set<string>();

      for (let i = 0; i < data.length; i++) {
        const row = data[i] as any;
        
        // Find certificate ID and filename columns (case insensitive)
        const certIdKey = Object.keys(row).find(key => 
          key.toLowerCase().includes('certificateid') || key.toLowerCase().includes('certificate_id')
        );
        const filenameKey = Object.keys(row).find(key => 
          key.toLowerCase().includes('filename') || key.toLowerCase().includes('file_name')
        );

        if (!certIdKey || !filenameKey) {
          errors.push(`Row ${i + 2}: Missing certificate ID or filename`);
          continue;
        }

        const certificateId = String(row[certIdKey]).trim();
        const filename = String(row[filenameKey]).trim();

        if (!certificateId || !filename) {
          errors.push(`Row ${i + 2}: Empty certificate ID or filename`);
          continue;
        }

        // Check for duplicates
        if (seenIds.has(certificateId)) {
          errors.push(`Row ${i + 2}: Duplicate certificate ID: ${certificateId}`);
          continue;
        }

        if (seenFilenames.has(filename)) {
          errors.push(`Row ${i + 2}: Duplicate filename: ${filename}`);
          continue;
        }

        seenIds.add(certificateId);
        seenFilenames.add(filename);
        certificates.push({ certificateId, filename });
      }

      // Check if total exceeds limit
      if (certificates.length > this.MAX_CERTIFICATES) {
        errors.push(`Too many certificates: ${certificates.length}. Maximum allowed: ${this.MAX_CERTIFICATES}`);
      }

      // Check PDF file matches
      const pdfFileSet = new Set(pdfFiles);
      const excelFilenames = new Set(certificates.map(c => c.filename));

      // Find missing PDFs (in Excel but not in ZIP)
      certificates.forEach(cert => {
        if (!pdfFileSet.has(cert.filename)) {
          missingPdfs.push(cert.filename);
        }
      });

      // Find extra PDFs (in ZIP but not in Excel)
      pdfFiles.forEach(pdfFile => {
        if (!excelFilenames.has(pdfFile)) {
          extraPdfs.push(pdfFile);
        }
      });

      if (missingPdfs.length > 0) {
        errors.push(`Missing PDF files: ${missingPdfs.slice(0, 5).join(', ')}${missingPdfs.length > 5 ? '...' : ''}`);
      }

      if (extraPdfs.length > 0) {
        errors.push(`Extra PDF files not in Excel: ${extraPdfs.slice(0, 5).join(', ')}${extraPdfs.length > 5 ? '...' : ''}`);
      }

      const isValid = errors.length === 0 && missingPdfs.length === 0;
      const validRecords = certificates.length - missingPdfs.length;
      const estimatedTime = Math.ceil(validRecords * this.PROCESSING_TIME_PER_CERT);
      const batchBreakdown = this.calculateBatchBreakdown(validRecords);

      return {
        isValid,
        totalEntries: certificates.length,
        validRecords,
        invalidRecords: certificates.length - validRecords,
        estimatedProcessingTime: estimatedTime,
        errors,
        missingPdfs,
        extraPdfs,
        batchBreakdown
      };

    } catch (error) {
      console.error('Error validating Excel file:', error);
      errors.push(`Failed to read Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return this.createFailedValidation(errors);
    }
  }

  /**
   * Create failed validation result
   */
  private static createFailedValidation(errors: string[]): ValidationResults {
    return {
      isValid: false,
      totalEntries: 0,
      validRecords: 0,
      invalidRecords: 0,
      estimatedProcessingTime: 0,
      errors,
      missingPdfs: [],
      extraPdfs: [],
      batchBreakdown: []
    };
  }

  /**
   * Calculate how to break down certificates into processing batches
   */
  private static calculateBatchBreakdown(totalCerts: number): BatchBreakdown[] {
    const batches: BatchBreakdown[] = [];
    let remaining = totalCerts;
    let batchNumber = 1;

    while (remaining > 0) {
      const batchSize = Math.min(remaining, this.BATCH_SIZE);
      const estimatedTime = Math.ceil(batchSize * this.PROCESSING_TIME_PER_CERT);
      
      batches.push({
        batchNumber,
        certificateCount: batchSize,
        estimatedTime
      });

      remaining -= batchSize;
      batchNumber++;
    }

    return batches;
  }

  /**
   * Create certificate records from Excel data
   */
  private static async createCertificateRecords(
    batchId: string, 
    projectId: string, 
    excelFilePath: string
  ): Promise<void> {
    try {
      // Re-read Excel file to create certificate records
      const workbook = XLSX.readFile(excelFilePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const certificates: any[] = [];

      for (const row of data) {
        const rowData = row as any;
        
        // Find column keys (case insensitive)
        const certIdKey = Object.keys(rowData).find(key => 
          key.toLowerCase().includes('certificateid') || key.toLowerCase().includes('certificate_id')
        );
        const filenameKey = Object.keys(rowData).find(key => 
          key.toLowerCase().includes('filename') || key.toLowerCase().includes('file_name')
        );
        const nameKey = Object.keys(rowData).find(key => 
          key.toLowerCase().includes('name') || key.toLowerCase().includes('recipient')
        );
        const emailKey = Object.keys(rowData).find(key => 
          key.toLowerCase().includes('email')
        );

        if (!certIdKey || !filenameKey) continue;

        const certificateId = String(rowData[certIdKey]).trim();
        const filename = String(rowData[filenameKey]).trim();
        const recipientName = nameKey ? String(rowData[nameKey]).trim() : undefined;
        const recipientEmail = emailKey ? String(rowData[emailKey]).trim() : undefined;

        if (!certificateId || !filename) continue;

        certificates.push({
          projectId,
          batchId,
          certificateId,
          filename,
          recipientName,
          recipientEmail,
          status: 'pending'
        });
      }

      // Bulk insert certificate records
      if (certificates.length > 0) {
        await CertificateModel.insertMany(certificates);
      }

    } catch (error) {
      console.error('Error creating certificate records:', error);
      throw new Error('Failed to create certificate records');
    }
  }

  /**
   * Get all batches for a project
   */
  static async getBatchesByProject(projectId: string): Promise<Batch[]> {
    try {
      const batches = await BatchModel.find({ projectId }).sort({ createdAt: -1 }).lean();
      return batches.map(this.transformDocument);
    } catch (error) {
      console.error('Error fetching batches:', error);
      throw new Error('Failed to fetch batches');
    }
  }

  /**
   * Get batch by ID
   */
  static async getBatchById(batchId: string): Promise<Batch | null> {
    try {
      const batch = await BatchModel.findById(batchId).lean();
      return batch ? this.transformDocument(batch) : null;
    } catch (error) {
      console.error('Error fetching batch:', error);
      throw new Error('Failed to fetch batch');
    }
  }

  /**
   * Transform MongoDB document to Batch interface
   */
  private static transformDocument(doc: any): Batch {
    return {
      id: doc._id.toString(),
      projectId: doc.projectId,
      name: doc.name,
      totalCertificates: doc.totalCertificates,
      processedCertificates: doc.processedCertificates,
      status: doc.status,
      zipFilePath: doc.zipFilePath,
      excelFilePath: doc.excelFilePath,
      validationResults: doc.validationResults,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }
} 