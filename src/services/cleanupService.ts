// services/cleanupService.ts
import { bookingService } from "./bookingService";
import { Alert } from "react-native";

class CleanupService {
  private static instance: CleanupService;
  private lastCleanupTime = 0;
  private readonly CLEANUP_COOLDOWN = 5 * 60 * 1000; // 5 phút cooldown

  static getInstance() {
    if (!CleanupService.instance) {
      CleanupService.instance = new CleanupService();
    }
    return CleanupService.instance;
  }

  // Manual cleanup với UI feedback
  async manualCleanup(): Promise<boolean> {
    try {
      await bookingService.cleanupAllPendingBookings();

      return true;
    } catch (error) {
      console.error("❌ Manual cleanup failed:", error);
      return false;
    }
  }

  // Cleanup và retry booking
  async cleanupAndRetryBooking<T>(
    retryFunction: () => Promise<T>,
    retryDelay = 1500
  ): Promise<T> {
    try {
      // 1. Cleanup expired bookings
      await this.manualCleanup();

      // 2. Đợi server xử lý
      await new Promise((resolve) => setTimeout(resolve, retryDelay));

      // 3. Retry operation

      const result = await retryFunction();

      return result;
    } catch (error) {
      console.error("❌ Cleanup and retry failed:", error);
      throw error;
    }
  }

  // Check if can cleanup (để tránh spam)
  canCleanup(): boolean {
    const now = Date.now();
    return now - this.lastCleanupTime >= this.CLEANUP_COOLDOWN;
  }

  // Rate-limited cleanup
  async smartCleanup(): Promise<boolean> {
    if (!this.canCleanup()) {
      return false;
    }

    const result = await this.manualCleanup();
    if (result) {
      this.lastCleanupTime = Date.now();
    }
    return result;
  }
}

export const cleanupService = CleanupService.getInstance();
