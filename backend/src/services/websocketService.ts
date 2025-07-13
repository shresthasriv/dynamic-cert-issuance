import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { CertificateIssuanceService } from './certificateIssuanceService';

export class WebSocketService {
  private io: SocketIOServer;
  private issuanceService: CertificateIssuanceService;

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    this.issuanceService = CertificateIssuanceService.getInstance();
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Handle new client connections
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Join project room
      socket.on('joinProject', (projectId: string) => {
        socket.join(`project-${projectId}`);
        console.log(`Client ${socket.id} joined project ${projectId}`);
      });

      // Join batch room
      socket.on('joinBatch', (batchId: string) => {
        socket.join(`batch-${batchId}`);
        console.log(`Client ${socket.id} joined batch ${batchId}`);
      });

      // Leave rooms on disconnect
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    // Listen to issuance service events
    this.issuanceService.on('batchStarted', (data) => {
      this.io.to(`batch-${data.batchId}`).emit('batchStarted', data);
    });

    this.issuanceService.on('batchCompleted', (data) => {
      this.io.to(`batch-${data.batchId}`).emit('batchCompleted', data);
    });

    this.issuanceService.on('batchFailed', (data) => {
      this.io.to(`batch-${data.batchId}`).emit('batchFailed', data);
    });

    this.issuanceService.on('certificateStarted', (data) => {
      this.io.to(`batch-${data.batchId}`).emit('certificateStarted', data);
    });

    this.issuanceService.on('certificateCompleted', (data) => {
      this.io.to(`batch-${data.batchId}`).emit('certificateCompleted', data);
    });

    this.issuanceService.on('certificateRepublished', (data) => {
      this.io.to(`batch-${data.batchId}`).emit('certificateRepublished', data);
    });
  }

  // Send real-time updates to specific rooms
  sendToProject(projectId: string, event: string, data: any) {
    this.io.to(`project-${projectId}`).emit(event, data);
  }

  sendToBatch(batchId: string, event: string, data: any) {
    this.io.to(`batch-${batchId}`).emit(event, data);
  }

  // Broadcast to all connected clients
  broadcast(event: string, data: any) {
    this.io.emit(event, data);
  }
} 