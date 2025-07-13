import { CertificateModel, CertificateDocument } from '../models/Certificate';
import { BatchModel } from '../models/Batch';
import { ProjectModel } from '../models/Project';
import { Certificate } from '../types';
import { EventEmitter } from 'events';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import fs from 'fs/promises';
import path from 'path';

export class CertificateIssuanceService extends EventEmitter {
  private static instance: CertificateIssuanceService;
  private processingBatches = new Map<string, boolean>();
  
  static getInstance(): CertificateIssuanceService {
    if (!CertificateIssuanceService.instance) {
      CertificateIssuanceService.instance = new CertificateIssuanceService();
    }
    return CertificateIssuanceService.instance;
  }

  /**
   * Begins processing a batch of certificates.
   */
  async startBatchProcessing(batchId: string): Promise<void> {
    if (this.processingBatches.get(batchId)) {
      throw new Error('Batch is already being processed');
    }

    this.processingBatches.set(batchId, true);

    try {
      // Update batch status to processing
      await BatchModel.findByIdAndUpdate(batchId, {
        status: 'processing',
        updatedAt: new Date()
      });

      // Get all pending certificates for this batch
      const certificates = await CertificateModel.find({
        batchId,
        status: 'pending'
      });

      this.emit('batchStarted', { batchId, totalCertificates: certificates.length });

      // Process certificates one by one with an artificial delay
      // to simulate a real-world processing queue.
      for (const cert of certificates) {
        await this.processCertificate(cert);
        
        const delay = Math.random() * 1500 + 500;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Update batch status to completed
      await BatchModel.findByIdAndUpdate(batchId, {
        status: 'completed',
        processedCertificates: certificates.length,
        updatedAt: new Date()
      });

      this.emit('batchCompleted', { batchId });

    } catch (error) {
      console.error('Error processing batch:', error);
      
      // Update batch status to failed
      await BatchModel.findByIdAndUpdate(batchId, {
        status: 'failed',
        updatedAt: new Date()
      });

      this.emit('batchFailed', { batchId, error });
    } finally {
      this.processingBatches.delete(batchId);
    }
  }

  /**
   * Processes a single certificate by generating a QR code
   * and embedding it into the recipient's PDF.
   */
  private async processCertificate(certificate: CertificateDocument): Promise<void> {
    try {
      // Update status to in-progress
      await CertificateModel.findByIdAndUpdate(certificate._id, {
        status: 'in-progress',
        processingStartedAt: new Date(),
        updatedAt: new Date()
      });

      this.emit('certificateStarted', {
        certificateId: certificate._id.toString(),
        batchId: certificate.batchId
      });


      const verificationUrl = `https://verify.example.com?id=${certificate.certificateId}`;

      const issuedPdfPath = await this.embedQrCodeInPdf(certificate, verificationUrl);
      const qrCodeData = await QRCode.toDataURL(verificationUrl);

      await CertificateModel.findByIdAndUpdate(certificate._id, {
        status: 'issued',
        qrCodeData,
        verificationUrl,
        issuedPdfPath,
        processingCompletedAt: new Date(),
        updatedAt: new Date()
      });

      this.emit('certificateCompleted', {
        certificateId: certificate._id.toString(),
        batchId: certificate.batchId,
        status: 'issued'
      });

    } catch (error) {
      console.error('Error processing certificate:', error);
      
      await CertificateModel.findByIdAndUpdate(certificate._id, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        processingCompletedAt: new Date(),
        updatedAt: new Date()
      });

      this.emit('certificateCompleted', {
        certificateId: certificate._id.toString(),
        batchId: certificate.batchId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Embeds a QR code into a PDF certificate.
   */
  private async embedQrCodeInPdf(certificate: CertificateDocument, verificationUrl: string): Promise<string> {
    const project = await ProjectModel.findById(certificate.projectId);
    if (!project || !project.qrCoordinates) {
      throw new Error('Project or QR coordinates not found');
    }

    const batch = await BatchModel.findById(certificate.batchId);
    if (!batch || !batch.zipFilePath) {
      throw new Error('Batch or zip file path not found');
    }

    const zipNameWithoutExt = path.basename(batch.zipFilePath, path.extname(batch.zipFilePath));

    // Construct path to the original PDF inside the extracted batch folder
    const originalPdfPath = path.join(
      __dirname,
      '../../../uploads/projects',
      project.id,
      'batches',
      zipNameWithoutExt,
      certificate.filename
    );
    
    // Create a directory to store the final, issued PDF
    const issuedDir = path.join(
      __dirname,
      '../../../uploads/projects',
      project.id,
      'issued',
      batch.id
    );
    await fs.mkdir(issuedDir, { recursive: true });
    
    const issuedPdfPath = path.join(issuedDir, certificate.filename);

    try {
      await fs.access(originalPdfPath);
    } catch (e) {
      throw new Error(`Original PDF '${certificate.filename}' not found in the uploaded ZIP file.`);
    }

    const pdfBytes = await fs.readFile(originalPdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPages()[0];

    const qrCodeImageBytes = await QRCode.toBuffer(verificationUrl, {
      type: 'png',
      width: 100,
      margin: 1,
      errorCorrectionLevel: 'H'
    });

    const qrCodeImage = await pdfDoc.embedPng(qrCodeImageBytes);

    const { x, y } = project.qrCoordinates;
    const { width, height } = page.getSize();

    // Convert percentage-based coordinates to absolute PDF points
    const qrX = (x / 100) * width;
    const qrY = (y / 100) * height;

    page.drawImage(qrCodeImage, {
      x: qrX,
      y: qrY,
      width: 50,
      height: 50,
    });

    const finalPdfBytes = await pdfDoc.save();
    await fs.writeFile(issuedPdfPath, finalPdfBytes);

    return path.relative(path.join(__dirname, '../../../'), issuedPdfPath);
  }

  /**
   * Retries a failed certificate.
   */
  async retryCertificate(certificateId: string): Promise<void> {
    const certificate = await CertificateModel.findById(certificateId);
    
    if (!certificate) {
      throw new Error('Certificate not found');
    }

    // Reset certificate to process it again
    await CertificateModel.findByIdAndUpdate(certificateId, {
      status: 'pending',
      errorMessage: undefined,
      processingStartedAt: undefined,
      processingCompletedAt: undefined,
      updatedAt: new Date()
    });

    setTimeout(() => {
      this.processCertificate(certificate).catch(err => {
        console.error(`[ProcessCertificate] Error from retry timeout for cert ${certificate.id}:`, err);
      });
    }, 1000);
  }

  /**
   * Reissues a certificate, regardless of its current status.
   */
  async reissueCertificate(certificateId: string): Promise<void> {
    const certificate = await CertificateModel.findById(certificateId);
    
    if (!certificate) {
      throw new Error('Certificate not found');
    }

    // Reset certificate to process it again
    await CertificateModel.findByIdAndUpdate(certificateId, {
      status: 'pending',
      errorMessage: undefined,
      processingStartedAt: undefined,
      processingCompletedAt: undefined,
      updatedAt: new Date()
    });

    setTimeout(() => {
      this.processCertificate(certificate).catch(err => {
        console.error(`[ProcessCertificate] Error from reissue timeout for cert ${certificate.id}:`, err);
      });
    }, 1000);
  }

  /**
   * Updates an issued certificate's timestamp to mark it as republished.
   */
  async republishCertificate(certificateId: string): Promise<void> {
    const certificate = await CertificateModel.findById(certificateId);
    
    if (!certificate) {
      throw new Error('Certificate not found');
    }

    if (certificate.status !== 'issued') {
      throw new Error('Can only republish issued certificates');
    }

    await CertificateModel.findByIdAndUpdate(certificateId, {
      updatedAt: new Date(),
      verificationUrl: `https://verify.example.com?id=${certificate.certificateId}&t=${Date.now()}`
    });

    this.emit('certificateRepublished', {
      certificateId: certificate._id.toString(),
      batchId: certificate.batchId
    });
  }

  /**
   * Processes a single certificate that is in 'pending' status.
   */
  async processPendingCertificate(certificateId: string): Promise<void> {
    const certificate = await CertificateModel.findById(certificateId);
    
    if (!certificate) {
      throw new Error('Certificate not found');
    }

    if (certificate.status !== 'pending') {
      throw new Error('Certificate must be in pending status to process');
    }

    await this.processCertificate(certificate);
  }

  /**
   * Retries a list of failed certificates in bulk.
   */
  async bulkRetryCertificates(certificateIds: string[]): Promise<void> {
    const certificates = await CertificateModel.find({
      _id: { $in: certificateIds },
      status: 'failed'
    });

    if (certificates.length === 0) {
      throw new Error('No failed certificates found to retry');
    }

    for (const cert of certificates) {
      await this.retryCertificate(cert.id);
    }
  }

  /**
   * Reissues a set of certificates in bulk.
   */
  async bulkReissueCertificates(certificateIds: string[]): Promise<void> {
    const certificates = await CertificateModel.find({ _id: { $in: certificateIds } });

    if (certificates.length === 0) {
      throw new Error('No certificates found to reissue');
    }

    for (const cert of certificates) {
      await this.reissueCertificate(cert.id);
    }
  }

  /**
   * Gets a single certificate by its ID.
   */
  async getCertificateById(certificateId: string): Promise<Certificate | null> {
    try {
      const certificate = await CertificateModel.findById(certificateId).lean();
      return certificate ? this.transformCertificateDocument(certificate) : null;
    } catch (error) {
      console.error('Error getting certificate by ID:', error);
      throw error;
    }
  }

  /**
   * Retrieves the processing status and certificate counts for a batch.
   */
  async getBatchStatus(batchId: string) {
    const batch = await BatchModel.findById(batchId);
    const certificates = await CertificateModel.find({ batchId });

    const statusCounts = certificates.reduce((acc, cert) => {
      acc[cert.status] = (acc[cert.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      batch,
      certificates,
      statusCounts,
      isProcessing: this.processingBatches.get(batchId) || false
    };
  }

  /**
   * Retrieves all certificates for a given project.
   */
  async getCertificatesByProject(projectId: string): Promise<Certificate[]> {
    const certificates = await CertificateModel.find({ projectId }).sort({ createdAt: -1 });
    return certificates.map(cert => this.transformCertificateDocument(cert));
  }

  /**
   * Retrieves all certificates for a specific batch.
   */
  async getCertificatesByBatch(batchId: string): Promise<Certificate[]> {
    const certificates = await CertificateModel.find({ batchId }).sort({ createdAt: -1 });
    return certificates.map(cert => this.transformCertificateDocument(cert));
  }

  /**
   * Transforms a certificate document from the database into a clean data object.
   */
  private transformCertificateDocument(doc: any): Certificate {
    const safeToISOString = (value: any): string => {
      if (!value) return '';
      if (value instanceof Date) return value.toISOString();
      if (typeof value === 'string') return value;
      if (typeof value === 'number') return new Date(value).toISOString();
      return '';
    };

    return {
      id: doc._id?.toString() || doc.id,
      certificateId: doc.certificateId,
      batchId: doc.batchId,
      projectId: doc.projectId,
      filename: doc.filename,
      status: doc.status,
      issuedPdfPath: doc.issuedPdfPath,
      verificationUrl: doc.verificationUrl,
      errorMessage: doc.errorMessage,
      processingStartedAt: safeToISOString(doc.processingStartedAt),
      processingCompletedAt: safeToISOString(doc.processingCompletedAt),
      createdAt: safeToISOString(doc.createdAt),
      updatedAt: safeToISOString(doc.updatedAt)
    };
  }
} 