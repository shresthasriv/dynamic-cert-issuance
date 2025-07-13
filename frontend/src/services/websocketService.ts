import { io, Socket } from 'socket.io-client';

export interface WebSocketEventHandlers {
  onBatchStarted?: (data: { batchId: string; totalCertificates: number }) => void;
  onBatchCompleted?: (data: { batchId: string }) => void;
  onBatchFailed?: (data: { batchId: string; error: any }) => void;
  onCertificateStarted?: (data: { certificateId: string; batchId: string }) => void;
  onCertificateCompleted?: (data: { 
    certificateId: string; 
    batchId: string; 
    status: 'issued' | 'failed'; 
    error?: string 
  }) => void;
  onCertificateRepublished?: (data: { certificateId: string; batchId: string }) => void;
}

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  connect(url: string = process.env.REACT_APP_WS_URL || 'http://localhost:5000'): void {
    if (this.socket && this.isConnected) {
      return; // Already connected
    }

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    this.setupConnectionHandlers();
  }

  private setupConnectionHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('❌ Max reconnection attempts reached');
      }
    });

    this.socket.on('reconnect', () => {
      console.log('✅ WebSocket reconnected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });
  }

  joinProject(projectId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('joinProject', projectId);
      console.log(`🏠 Joined project room: ${projectId}`);
    }
  }

  joinBatch(batchId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('joinBatch', batchId);
      console.log(`📦 Joined batch room: ${batchId}`);
    }
  }

  onBatchEvents(handlers: WebSocketEventHandlers): void {
    if (!this.socket) return;

    if (handlers.onBatchStarted) {
      this.socket.on('batchStarted', handlers.onBatchStarted);
    }

    if (handlers.onBatchCompleted) {
      this.socket.on('batchCompleted', handlers.onBatchCompleted);
    }

    if (handlers.onBatchFailed) {
      this.socket.on('batchFailed', handlers.onBatchFailed);
    }

    if (handlers.onCertificateStarted) {
      this.socket.on('certificateStarted', handlers.onCertificateStarted);
    }

    if (handlers.onCertificateCompleted) {
      this.socket.on('certificateCompleted', handlers.onCertificateCompleted);
    }

    if (handlers.onCertificateRepublished) {
      this.socket.on('certificateRepublished', handlers.onCertificateRepublished);
    }
  }

  offBatchEvents(): void {
    if (!this.socket) return;

    this.socket.off('batchStarted');
    this.socket.off('batchCompleted');
    this.socket.off('batchFailed');
    this.socket.off('certificateStarted');
    this.socket.off('certificateCompleted');
    this.socket.off('certificateRepublished');
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('🔌 WebSocket disconnected');
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Create singleton instance
export const websocketService = new WebSocketService(); 