// services/VenueOwnerEventService.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  VenueOwnerEvent,
  CreateEventRequest,
  UpdateEventRequest,
  EventApplication,
  EventBooking,
  EventStatistics,
  EventFilters,
  ApplicationFilters,
  BookingFilters,
  EventApplicationResponse,
  VenueOwnerEventsDashboard,
  EventStatus,
  ApplicationStatus,
} from "../types/VenueOwnerEvent";

const API_BASE_URL =
  "https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net";

class VenueOwnerEventService {
  private async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem("token");
  }

  private async makeAuthenticatedRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = await this.getAuthToken();

    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });
  }

  /**
   * Get events by location ID
   */
  async getEventsByLocationId(locationId: number): Promise<VenueOwnerEvent[]> {
    try {
      console.log("📅 Getting events for location:", locationId);

      const response = await this.makeAuthenticatedRequest(
        `${API_BASE_URL}/api/LocationEvent/location/${locationId}`
      );

      console.log("📥 Get events response status:", response.status);

      if (response.status === 404) {
        console.log("ℹ️ No events found for location - returning empty array");
        return [];
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Get events error:", errorText);
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Events retrieved:", result);

      // Handle different response formats
      let eventsArray: VenueOwnerEvent[] = [];

      if (Array.isArray(result)) {
        eventsArray = result;
      } else if (result && result.data && Array.isArray(result.data)) {
        eventsArray = result.data;
      } else if (result && typeof result === "object") {
        // Single event object
        eventsArray = [result];
      } else {
        console.log("⚠️ Unexpected response format, returning empty array");
        return [];
      }

      console.log(
        `✅ Events for location ${locationId}: ${eventsArray.length} items`
      );
      return eventsArray;
    } catch (error) {
      console.error("❌ Get events by location error:", error);
      throw error;
    }
  }

  /**
   * Get events for multiple locations (for dashboard)
   */
  async getEventsForMultipleLocations(
    locationIds: number[]
  ): Promise<VenueOwnerEventsDashboard> {
    try {
      console.log("🏢 Getting events for multiple locations:", locationIds);

      const locationPromises = locationIds.map(async (locationId) => {
        try {
          const events = await this.getEventsByLocationId(locationId);

          // Calculate location stats
          const activeEvents = events.filter(
            (e) => e.status === "Active"
          ).length;
          const upcomingEvents = events.filter(
            (e) =>
              e.status === "Open" ||
              (e.status === "Draft" && new Date(e.startDate) > new Date())
          ).length;
          const totalRevenue = events.reduce(
            (sum, e) =>
              sum +
              (e.totalBookingsCount || 0) *
                (e.discountedPrice || e.originalPrice || 0),
            0
          );

          return {
            locationId,
            locationName: events[0]?.location?.name || `Location ${locationId}`,
            events,
            activeEventsCount: activeEvents,
            upcomingEventsCount: upcomingEvents,
            totalRevenue,
          };
        } catch (error) {
          console.error(
            `❌ Error getting events for location ${locationId}:`,
            error
          );
          return {
            locationId,
            locationName: `Location ${locationId}`,
            events: [],
            activeEventsCount: 0,
            upcomingEventsCount: 0,
            totalRevenue: 0,
          };
        }
      });

      const locations = await Promise.all(locationPromises);

      // Calculate summary
      const summary = {
        totalLocations: locations.length,
        totalEvents: locations.reduce((sum, loc) => sum + loc.events.length, 0),
        activeEvents: locations.reduce(
          (sum, loc) => sum + loc.activeEventsCount,
          0
        ),
        upcomingEvents: locations.reduce(
          (sum, loc) => sum + loc.upcomingEventsCount,
          0
        ),
        totalRevenue: locations.reduce((sum, loc) => sum + loc.totalRevenue, 0),
        totalBookings: locations.reduce(
          (sum, loc) =>
            sum +
            loc.events.reduce(
              (eventSum, event) => eventSum + (event.totalBookingsCount || 0),
              0
            ),
          0
        ),
      };

      console.log("✅ Multi-location dashboard data:", { locations, summary });

      return { locations, summary };
    } catch (error) {
      console.error("❌ Get multi-location events error:", error);
      throw error;
    }
  }

  /**
   * Get event by ID with details
   */
  async getEventById(eventId: number): Promise<VenueOwnerEvent | null> {
    try {
      console.log("🔍 Getting event by ID:", eventId);

      const response = await this.makeAuthenticatedRequest(
        `${API_BASE_URL}/api/LocationEvent/${eventId}/detail`
      );

      console.log("📥 Get event detail response status:", response.status);

      if (response.status === 404) {
        console.log("ℹ️ Event not found");
        return null;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Get event detail error:", errorText);
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Event detail retrieved:", result);

      // Handle response format
      if (result && result.data) {
        return result.data;
      } else if (result && typeof result === "object") {
        return result;
      }

      return null;
    } catch (error) {
      console.error("❌ Get event by ID error:", error);
      throw error;
    }
  }

  /**
   * Create new event
   */
  async createEvent(data: CreateEventRequest): Promise<VenueOwnerEvent> {
    try {
      console.log("🏗️ Creating new event:", data);

      const response = await this.makeAuthenticatedRequest(
        `${API_BASE_URL}/api/LocationEvent`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );

      console.log("📥 Create event response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Create event error:", errorText);
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Event created:", result);

      // Handle response format
      if (result && result.data) {
        return result.data;
      } else if (result && typeof result === "object") {
        return result;
      }

      throw new Error("Invalid response format");
    } catch (error) {
      console.error("❌ Create event error:", error);
      throw error;
    }
  }

  /**
   * Update event
   */
  async updateEvent(
    eventId: number,
    data: UpdateEventRequest
  ): Promise<VenueOwnerEvent> {
    try {
      console.log("✏️ Updating event:", eventId, data);

      const response = await this.makeAuthenticatedRequest(
        `${API_BASE_URL}/api/LocationEvent/${eventId}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        }
      );

      console.log("📥 Update event response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Update event error:", errorText);
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Event updated:", result);

      // Handle response format
      if (result && result.data) {
        return result.data;
      } else if (result && typeof result === "object") {
        return result;
      }

      throw new Error("Invalid response format");
    } catch (error) {
      console.error("❌ Update event error:", error);
      throw error;
    }
  }

  /**
   * Update event status
   */
  async updateEventStatus(
    eventId: number,
    status: EventStatus
  ): Promise<boolean> {
    try {
      console.log("🔄 Updating event status:", eventId, status);

      const response = await this.makeAuthenticatedRequest(
        `${API_BASE_URL}/api/LocationEvent/${eventId}/status`,
        {
          method: "PATCH",
          body: JSON.stringify(status),
        }
      );

      console.log("📥 Update status response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Update status error:", errorText);
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      console.log("✅ Event status updated");
      return true;
    } catch (error) {
      console.error("❌ Update event status error:", error);
      throw error;
    }
  }

  /**
   * Delete event
   */
  async deleteEvent(eventId: number): Promise<boolean> {
    try {
      console.log("🗑️ Deleting event:", eventId);

      const response = await this.makeAuthenticatedRequest(
        `${API_BASE_URL}/api/LocationEvent/${eventId}`,
        {
          method: "DELETE",
        }
      );

      console.log("📥 Delete event response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Delete event error:", errorText);
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      console.log("✅ Event deleted");
      return true;
    } catch (error) {
      console.error("❌ Delete event error:", error);
      throw error;
    }
  }

  /**
   * Get event applications
   */
  async getEventApplications(eventId: number): Promise<EventApplication[]> {
    try {
      console.log("📝 Getting applications for event:", eventId);

      const response = await this.makeAuthenticatedRequest(
        `${API_BASE_URL}/api/LocationEvent/${eventId}/applications`
      );

      console.log("📥 Get applications response status:", response.status);

      if (response.status === 404) {
        console.log("ℹ️ No applications found - returning empty array");
        return [];
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Get applications error:", errorText);
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Applications retrieved:", result);

      // Handle response format
      if (Array.isArray(result)) {
        return result;
      } else if (result && result.data && Array.isArray(result.data)) {
        return result.data;
      }

      return [];
    } catch (error) {
      console.error("❌ Get event applications error:", error);
      throw error;
    }
  }

  /**
   * Respond to photographer application
   */
  async respondToApplication(
    eventId: number,
    photographerId: number,
    status: ApplicationStatus,
    rejectionReason?: string
  ): Promise<boolean> {
    try {
      console.log("✅❌ Responding to application:", {
        eventId,
        photographerId,
        status,
      });

      const requestData: EventApplicationResponse = {
        eventId,
        photographerId,
        status,
        rejectionReason,
      };

      const response = await this.makeAuthenticatedRequest(
        `${API_BASE_URL}/api/LocationEvent/respond-application`,
        {
          method: "POST",
          body: JSON.stringify(requestData),
        }
      );

      console.log("📥 Respond application response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Respond application error:", errorText);
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      console.log("✅ Application response sent");
      return true;
    } catch (error) {
      console.error("❌ Respond to application error:", error);
      throw error;
    }
  }

  /**
   * Get event bookings
   */
  async getEventBookings(eventId: number): Promise<EventBooking[]> {
    try {
      console.log("📅 Getting bookings for event:", eventId);

      const response = await this.makeAuthenticatedRequest(
        `${API_BASE_URL}/api/LocationEvent/${eventId}/bookings`
      );

      console.log("📥 Get bookings response status:", response.status);

      if (response.status === 404) {
        console.log("ℹ️ No bookings found - returning empty array");
        return [];
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Get bookings error:", errorText);
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Bookings retrieved:", result);

      // Handle response format
      if (Array.isArray(result)) {
        return result;
      } else if (result && result.data && Array.isArray(result.data)) {
        return result.data;
      }

      return [];
    } catch (error) {
      console.error("❌ Get event bookings error:", error);
      throw error;
    }
  }

  /**
   * Get event statistics
   */
  async getEventStatistics(eventId: number): Promise<EventStatistics | null> {
    try {
      console.log("📊 Getting statistics for event:", eventId);

      const response = await this.makeAuthenticatedRequest(
        `${API_BASE_URL}/api/LocationEvent/${eventId}/statistics`
      );

      console.log("📥 Get statistics response status:", response.status);

      if (response.status === 404) {
        console.log("ℹ️ Statistics not found");
        return null;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Get statistics error:", errorText);
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Statistics retrieved:", result);

      // Handle response format
      if (result && result.data) {
        return result.data;
      } else if (result && typeof result === "object") {
        return result;
      }

      return null;
    } catch (error) {
      console.error("❌ Get event statistics error:", error);
      throw error;
    }
  }

  /**
   * Get approved photographers for event
   */
  async getApprovedPhotographers(
    eventId: number
  ): Promise<EventPhotographer[]> {
    try {
      console.log("👥 Getting approved photographers for event:", eventId);

      const response = await this.makeAuthenticatedRequest(
        `${API_BASE_URL}/api/LocationEvent/${eventId}/approved-photographers`
      );

      console.log(
        "📥 Get approved photographers response status:",
        response.status
      );

      if (response.status === 404) {
        console.log(
          "ℹ️ No approved photographers found - returning empty array"
        );
        return [];
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Get approved photographers error:", errorText);
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Approved photographers retrieved:", result);

      // Handle response format
      if (Array.isArray(result)) {
        return result;
      } else if (result && result.data && Array.isArray(result.data)) {
        return result.data;
      }

      return [];
    } catch (error) {
      console.error("❌ Get approved photographers error:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const venueOwnerEventService = new VenueOwnerEventService();
