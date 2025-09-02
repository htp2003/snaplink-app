// hooks/useVenueOwnerEvent.ts
import { useState, useCallback, useEffect } from "react";
import { Alert } from "react-native";
import { venueOwnerEventService } from "../services/VenueOwnerEventService";
import {
  VenueOwnerEvent,
  CreateEventRequest,
  UpdateEventRequest,
  EventApplication,
  EventBooking,
  EventStatistics,
  VenueOwnerEventsDashboard,
  EventStatus,
  ApplicationStatus,
  EventFilters,
  EventPhotographer,
  ApprovedEventPhotographer,
  NormalizedEventBooking,
} from "../types/VenueOwnerEvent";

export function useVenueOwnerEvent() {
  // State management
  const [events, setEvents] = useState<VenueOwnerEvent[]>([]);
  const [dashboardData, setDashboardData] =
    useState<VenueOwnerEventsDashboard | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<VenueOwnerEvent | null>(
    null
  );
  const [applications, setApplications] = useState<EventApplication[]>([]);
  const [bookings, setBookings] = useState<EventBooking[]>([]);
  const [statistics, setStatistics] = useState<EventStatistics | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [approvedPhotographers, setApprovedPhotographers] = useState<
    ApprovedEventPhotographer[]
  >([]);
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Get events for single location
   */
  const getEventsByLocationId = useCallback(
    async (locationId: number): Promise<VenueOwnerEvent[]> => {
      setLoading(true);
      setError(null);

      try {
        const result = await venueOwnerEventService.getEventsByLocationId(
          locationId
        );
        console.log(
          "✅ Events retrieved for location:",
          locationId,
          result.length
        );
        setEvents(result);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách sự kiện";
        console.error("❌ Get events error:", errorMessage);

        // Don't set error for 404 (no events found)
        if (!errorMessage.includes("404")) {
          setError(errorMessage);
        } else {
          console.log("ℹ️ No events found, showing empty state");
          setEvents([]);
        }
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Get dashboard data for multiple locations
   */
  const getDashboardData = useCallback(
    async (
      locationIds: number[]
    ): Promise<VenueOwnerEventsDashboard | null> => {
      setLoading(true);
      setError(null);

      try {
        const result =
          await venueOwnerEventService.getEventsForMultipleLocations(
            locationIds
          );
        console.log("✅ Dashboard data retrieved:", result);
        setDashboardData(result);

        // Also update events array with all events
        const allEvents = result.locations.flatMap((loc) => loc.events);
        setEvents(allEvents);

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể tải dữ liệu dashboard";
        console.error("❌ Get dashboard data error:", errorMessage);
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Get event by ID with details
   */
  const getEventById = useCallback(
    async (eventId: number): Promise<VenueOwnerEvent | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await venueOwnerEventService.getEventById(eventId);
        console.log("✅ Event detail retrieved:", result);
        setSelectedEvent(result);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể tải thông tin sự kiện";
        console.error("❌ Get event detail error:", errorMessage);
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Create new event
   */
  const createEvent = useCallback(
    async (data: CreateEventRequest): Promise<VenueOwnerEvent | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await venueOwnerEventService.createEvent(data);
        console.log("✅ Event created successfully:", result);

        // Add to current events list
        setEvents((prev) => [...prev, result]);

        // Update dashboard data if available
        if (dashboardData) {
          setDashboardData((prev) => {
            if (!prev) return prev;

            return {
              ...prev,
              locations: prev.locations.map((loc) =>
                loc.locationId === data.locationId
                  ? { ...loc, events: [...loc.events, result] }
                  : loc
              ),
              summary: {
                ...prev.summary,
                totalEvents: prev.summary.totalEvents + 1,
              },
            };
          });
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể tạo sự kiện";
        console.error("❌ Create event error:", errorMessage);
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [dashboardData]
  );

  /**
   * Update event
   */
  const updateEvent = useCallback(
    async (
      eventId: number,
      data: UpdateEventRequest
    ): Promise<VenueOwnerEvent | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await venueOwnerEventService.updateEvent(eventId, data);
        console.log("✅ Event updated successfully:", result);

        // Update in current events list
        setEvents((prev) =>
          prev.map((event) => (event.eventId === eventId ? result : event))
        );

        // Update selected event if it's the same
        if (selectedEvent?.eventId === eventId) {
          setSelectedEvent(result);
        }

        // Update dashboard data if available
        if (dashboardData) {
          setDashboardData((prev) => {
            if (!prev) return prev;

            return {
              ...prev,
              locations: prev.locations.map((loc) => ({
                ...loc,
                events: loc.events.map((event) =>
                  event.eventId === eventId ? result : event
                ),
              })),
            };
          });
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể cập nhật sự kiện";
        console.error("❌ Update event error:", errorMessage);
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [selectedEvent, dashboardData]
  );

  /**
   * Update event status
   */
  const updateEventStatus = useCallback(
    async (eventId: number, status: EventStatus): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const success = await venueOwnerEventService.updateEventStatus(
          eventId,
          status
        );

        if (success) {
          console.log("✅ Event status updated successfully");

          // Update in current events list
          setEvents((prev) =>
            prev.map((event) =>
              event.eventId === eventId ? { ...event, status } : event
            )
          );

          // Update selected event if it's the same
          if (selectedEvent?.eventId === eventId) {
            setSelectedEvent((prev) => (prev ? { ...prev, status } : prev));
          }

          // Update dashboard data if available
          if (dashboardData) {
            setDashboardData((prev) => {
              if (!prev) return prev;

              return {
                ...prev,
                locations: prev.locations.map((loc) => ({
                  ...loc,
                  events: loc.events.map((event) =>
                    event.eventId === eventId ? { ...event, status } : event
                  ),
                })),
              };
            });
          }
        }

        return success;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể cập nhật trạng thái sự kiện";
        console.error("❌ Update event status error:", errorMessage);
        setError(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [selectedEvent, dashboardData]
  );

  /**
   * Delete event
   */
  const deleteEvent = useCallback(
    async (eventId: number): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const success = await venueOwnerEventService.deleteEvent(eventId);

        if (success) {
          console.log("✅ Event deleted successfully");

          // Remove from current events list
          setEvents((prev) =>
            prev.filter((event) => event.eventId !== eventId)
          );

          // Clear selected event if it's the same
          if (selectedEvent?.eventId === eventId) {
            setSelectedEvent(null);
          }

          // Update dashboard data if available
          if (dashboardData) {
            setDashboardData((prev) => {
              if (!prev) return prev;

              return {
                ...prev,
                locations: prev.locations.map((loc) => ({
                  ...loc,
                  events: loc.events.filter(
                    (event) => event.eventId !== eventId
                  ),
                })),
                summary: {
                  ...prev.summary,
                  totalEvents: prev.summary.totalEvents - 1,
                },
              };
            });
          }
        }

        return success;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể xóa sự kiện";
        console.error("❌ Delete event error:", errorMessage);
        setError(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [selectedEvent, dashboardData]
  );

  /**
   * Get event applications
   */
  const getEventApplications = useCallback(
    async (eventId: number): Promise<EventApplication[]> => {
      setLoading(true);
      setError(null);

      try {
        const result = await venueOwnerEventService.getEventApplications(
          eventId
        );
        console.log("✅ Applications retrieved:", result.length);
        setApplications(result);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách đăng ký";
        console.error("❌ Get applications error:", errorMessage);

        if (!errorMessage.includes("404")) {
          setError(errorMessage);
        } else {
          setApplications([]);
        }
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );
  /**
   * Get approved photographers for event
   */
  const getApprovedPhotographers = useCallback(
    async (eventId: number): Promise<ApprovedEventPhotographer[]> => {
      setLoading(true);
      setError(null);

      try {
        const result = await venueOwnerEventService.getApprovedPhotographers(
          eventId
        );
        console.log("✅ Approved photographers retrieved:", result.length);
        setApprovedPhotographers(result);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách nhiếp ảnh gia";
        console.error("❌ Get approved photographers error:", errorMessage);

        if (!errorMessage.includes("404")) {
          setError(errorMessage);
        } else {
          setApprovedPhotographers([]);
        }
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );
  /**
   * Respond to photographer application
   */
  const respondToApplication = useCallback(
    async (
      eventId: number,
      photographerId: number,
      status: ApplicationStatus,
      rejectionReason?: string
    ): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const success = await venueOwnerEventService.respondToApplication(
          eventId,
          photographerId,
          status,
          rejectionReason
        );

        if (success) {
          console.log("✅ Application response sent successfully");

          // Update applications list
          setApplications((prev) =>
            prev.map((app) =>
              app.eventId === eventId && app.photographerId === photographerId
                ? {
                    ...app,
                    status,
                    rejectionReason,
                    respondedAt: new Date().toISOString(),
                  }
                : app
            )
          );
        }

        return success;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể phản hồi đăng ký";
        console.error("❌ Respond to application error:", errorMessage);
        setError(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Get event bookings
   */
  const getEventBookings = useCallback(
    async (eventId: number): Promise<NormalizedEventBooking[]> => {
      setLoading(true);
      setError(null);

      try {
        console.log("📅 Fetching bookings for event:", eventId);

        // Use updated service method that returns normalized data
        const result = await venueOwnerEventService.getEventBookings(eventId);

        console.log("✅ Normalized bookings retrieved:", result.length);

        // Log first booking for debugging
        if (result.length > 0) {
          console.log("🔍 First booking sample:", {
            id: result[0].eventBookingId,
            customer: result[0].customer.fullName,
            photographer: result[0].photographer.fullName,
            status: result[0].status,
            totalAmount: result[0].totalAmount,
            startDatetime: result[0].startDatetime,
          });
        }

        setBookings(result);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách đặt lịch";
        console.error("❌ Get bookings error:", errorMessage);

        if (!errorMessage.includes("404")) {
          setError(errorMessage);
        } else {
          setBookings([]);
        }
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Get event statistics
   */
  const getEventStatistics = useCallback(
    async (eventId: number): Promise<EventStatistics | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await venueOwnerEventService.getEventStatistics(eventId);
        console.log("✅ Statistics retrieved:", result);
        setStatistics(result);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể tải thống kê sự kiện";
        console.error("❌ Get statistics error:", errorMessage);

        if (!errorMessage.includes("404")) {
          setError(errorMessage);
        } else {
          setStatistics(null);
        }
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Refresh events data
   */
  const refreshEvents = useCallback(
    async (locationId?: number, locationIds?: number[]): Promise<void> => {
      setRefreshing(true);
      setError(null);

      try {
        if (locationIds && locationIds.length > 0) {
          // Multi-location refresh
          await getDashboardData(locationIds);
        } else if (locationId) {
          // Single location refresh
          await getEventsByLocationId(locationId);
        }
      } catch (err) {
        console.error("❌ Refresh events error:", err);
      } finally {
        setRefreshing(false);
      }
    },
    [getDashboardData, getEventsByLocationId]
  );

  /**
   * Filter events by criteria
   */
  const filterEvents = useCallback(
    (filters: EventFilters): VenueOwnerEvent[] => {
      return events.filter((event) => {
        if (filters.locationId && event.locationId !== filters.locationId) {
          return false;
        }
        if (filters.status && event.status !== filters.status) {
          return false;
        }
        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          const nameMatch = event.name.toLowerCase().includes(searchLower);
          const descMatch = event.description
            ?.toLowerCase()
            .includes(searchLower);
          if (!nameMatch && !descMatch) {
            return false;
          }
        }
        if (filters.startDate) {
          const eventStart = new Date(event.startDate);
          const filterStart = new Date(filters.startDate);
          if (eventStart < filterStart) {
            return false;
          }
        }
        if (filters.endDate) {
          const eventEnd = new Date(event.endDate);
          const filterEnd = new Date(filters.endDate);
          if (eventEnd > filterEnd) {
            return false;
          }
        }
        return true;
      });
    },
    [events]
  );

  /**
   * Show error alert
   */
  const showErrorAlert = useCallback(
    (customMessage?: string) => {
      const message = customMessage || error || "Có lỗi xảy ra";
      Alert.alert("Lỗi", message);
    },
    [error]
  );

  /**
   * Clear all data (useful for logout)
   */
  const clearAllData = useCallback(() => {
    setEvents([]);
    setDashboardData(null);
    setSelectedEvent(null);
    setApplications([]);
    setBookings([]);
    setStatistics(null);
    setError(null);
  }, []);

  return {
    // State
    events,
    dashboardData,
    selectedEvent,
    applications,
    bookings,
    statistics,
    loading,
    error,
    refreshing,

    // Event Management
    getEventsByLocationId,
    getDashboardData,
    getEventById,
    createEvent,
    updateEvent,
    updateEventStatus,
    deleteEvent,

    // Applications & Bookings
    getEventApplications,
    respondToApplication,
    getEventBookings,
    getEventStatistics,
    approvedPhotographers,
    getApprovedPhotographers,

    // Utilities
    refreshEvents,
    filterEvents,
    clearError,
    showErrorAlert,
    clearAllData,
    setSelectedEvent,
  };
}
