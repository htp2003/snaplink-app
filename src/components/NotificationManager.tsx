// utils/NotificationManager.ts - ✅ SINGLETON PATTERN
import { notificationService } from '../services/notificationService';

class NotificationManager {
  private static instance: NotificationManager;
  private isInitializing = false;
  private isInitialized = false;
  private currentUserId: number | null = null;
  private initPromise: Promise<boolean> | null = null;

  private constructor() {}

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  async initializeForUser(userId: number, forceReinit = false): Promise<boolean> {
    // If already initializing for this user, return the existing promise
    if (this.isInitializing && this.currentUserId === userId && this.initPromise) {
      console.log('🔔 Already initializing for user', userId, '- waiting for completion');
      return await this.initPromise;
    }

    // If already initialized for this user and not forcing reinit
    if (this.isInitialized && this.currentUserId === userId && !forceReinit) {
      console.log('🔔 Already initialized for user', userId);
      return true;
    }

    // If switching users, cleanup first
    if (this.currentUserId && this.currentUserId !== userId) {
      console.log('🔔 Switching users, cleaning up previous initialization');
      await this.cleanup();
    }

    // Start new initialization
    this.isInitializing = true;
    this.currentUserId = userId;
    
    this.initPromise = this.doInitialize(userId);
    const result = await this.initPromise;
    
    this.isInitializing = false;
    this.isInitialized = result;
    this.initPromise = null;
    
    return result;
  }

  private async doInitialize(userId: number): Promise<boolean> {
    try {
      console.log('🔔 NotificationManager: Initializing for user', userId);
      
      // Set user ID in service
      notificationService.setUserId(userId);
      
      // Check if already has registered device
      const isRegistered = await notificationService.isCurrentDeviceRegistered();
      
      if (isRegistered) {
        console.log('✅ Device already registered for user', userId);
        return true;
      }

      console.log('🔔 Device not registered, attempting registration...');
      return true; // Let the hook handle the actual registration
      
    } catch (error) {
      console.error('❌ NotificationManager initialization failed:', error);
      return false;
    }
  }

  async cleanup(): Promise<void> {
    try {
      console.log('🧹 NotificationManager: Cleaning up...');
      
     
      
      notificationService.clearUserId();
      
      this.isInitialized = false;
      this.isInitializing = false;
      this.currentUserId = null;
      this.initPromise = null;
      
      console.log('✅ NotificationManager cleanup completed');
    } catch (error) {
      console.error('❌ NotificationManager cleanup error:', error);
    }
  }

  getCurrentUserId(): number | null {
    return this.currentUserId;
  }

  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  getIsInitializing(): boolean {
    return this.isInitializing;
  }
}

export const notificationManager = NotificationManager.getInstance();