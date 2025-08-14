import { useState, useEffect, useCallback } from 'react';
import { 
  LocationEvent, 
  EventApplication, 
  EventApplicationRequest,
  EventPhotographer,
  EventStatistics,
  EventBooking,
  EventBookingRequest
} from '../types/event';
import { photographerEventService } from '../services/photographerEventService';

// Hook for discovering events (active, upcoming, featured)
export const useEventDiscovery = () => {
  const [activeEvents, setActiveEvents] = useState<LocationEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<LocationEvent[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<LocationEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching events...');
      
      const [activeResponse, upcomingResponse, featuredResponse] = await Promise.all([
        photographerEventService.getActiveEvents(),
        photographerEventService.getUpcomingEvents(),
        photographerEventService.getFeaturedEvents()
      ]);
      
      console.log('Featured events response:', featuredResponse);
      console.log('Active events response:', activeResponse);
      console.log('Upcoming events response:', upcomingResponse);
      
      if (activeResponse.error === 0) {
        setActiveEvents(activeResponse.data || []);
      }
      if (upcomingResponse.error === 0) {
        setUpcomingEvents(upcomingResponse.data || []);
      }
      if (featuredResponse.error === 0) {
        setFeaturedEvents(featuredResponse.data || []);
      }
      
      if (activeResponse.error !== 0 && upcomingResponse.error !== 0 && featuredResponse.error !== 0) {
        setError('Failed to load events');
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllEvents();
  }, [fetchAllEvents]);

  return {
    activeEvents,
    upcomingEvents,
    featuredEvents,
    loading,
    error,
    refetch: fetchAllEvents
  };
};

// Hook for searching events
export const useEventSearch = () => {
  const [events, setEvents] = useState<LocationEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchEvents = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setEvents([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await photographerEventService.searchEvents(searchTerm);
      
      if (response.error === 0) {
        setEvents(response.data);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const searchNearbyEvents = useCallback(async (latitude: number, longitude: number, radiusKm: number = 10) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await photographerEventService.getNearbyEvents(latitude, longitude, radiusKm);
      
      if (response.error === 0) {
        setEvents(response.data);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    events,
    loading,
    error,
    searchEvents,
    searchNearbyEvents
  };
};

// Hook for event details
export const useEventDetail = (eventId: number | null) => {
  const [event, setEvent] = useState<LocationEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEventDetail = useCallback(async () => {
    if (!eventId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await photographerEventService.getEventDetail(eventId);
      
      if (response.error === 0) {
        setEvent(response.data);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEventDetail();
  }, [fetchEventDetail]);

  return {
    event,
    loading,
    error,
    refetch: fetchEventDetail
  };
};

// Hook for photographer applications management
export const usePhotographerApplications = (photographerId: number | null) => {
  const [applications, setApplications] = useState<EventApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    if (!photographerId) {
      console.log('No photographerId provided');
      return;
    }
    
    console.log('Fetching applications for photographer:', photographerId);
    setLoading(true);
    setError(null);
    
    try {
      const response = await photographerEventService.getPhotographerApplications(photographerId);
      console.log('Applications response:', response);
      
      if (response.error === 0) {
        setApplications(response.data || []);
      } else {
        setError(response.message);
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [photographerId]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  return {
    applications,
    loading,
    error,
    refetch: fetchApplications
  };
};

// Hook for application actions (apply, withdraw)
export const useApplicationActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyToEvent = async (request: EventApplicationRequest): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await photographerEventService.applyToEvent(request);
      
      if (response.error === 0) {
        return true;
      } else {
        setError(response.message);
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const withdrawApplication = async (eventId: number, photographerId: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await photographerEventService.withdrawApplication(eventId, photographerId);
      
      if (response.error === 0) {
        return true;
      } else {
        setError(response.message);
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const checkApplicationEligibility = async (eventId: number, photographerId: number): Promise<boolean> => {
    try {
      return await photographerEventService.canApplyToEvent(eventId, photographerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  };

  const getApplicationStatus = async (eventId: number, photographerId: number): Promise<string | null> => {
    try {
      return await photographerEventService.getApplicationStatus(eventId, photographerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  };

  return {
    applyToEvent,
    withdrawApplication,
    checkApplicationEligibility,
    getApplicationStatus,
    loading,
    error
  };
};

// Hook for approved photographers (to see competition)
export const useApprovedPhotographers = (eventId: number | null) => {
  const [photographers, setPhotographers] = useState<EventPhotographer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApprovedPhotographers = useCallback(async () => {
    if (!eventId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await photographerEventService.getApprovedPhotographers(eventId);
      
      if (response.error === 0) {
        setPhotographers(response.data);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchApprovedPhotographers();
  }, [fetchApprovedPhotographers]);

  return {
    photographers,
    loading,
    error,
    refetch: fetchApprovedPhotographers
  };
};

// ========== CUSTOMER BOOKING HOOKS ==========
export const useEventBooking = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bookEvent = async (request: EventBookingRequest): Promise<any | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await photographerEventService.bookEvent(request);
      
      if (response.error === 0) {
        console.log("✅ Event booking successful:", response.data);
        return response.data; // ✅ Return the actual booking data
      } else {
        setError(response.message);
        console.error("❌ Event booking failed:", response.message);
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Booking failed';
      setError(errorMessage);
      console.error("❌ Event booking error:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (eventBookingId: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await photographerEventService.cancelEventBooking(eventBookingId);
      
      if (response.error === 0) {
        return true;
      } else {
        setError(response.message);
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancellation failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    bookEvent,
    cancelBooking,
    loading,
    error
  };
};

// ========== USER BOOKINGS HOOK ==========

export const useUserEventBookings = (userId: number | null) => {
  const [bookings, setBookings] = useState<EventBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserBookings = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await photographerEventService.getUserEventBookings(userId);
      
      if (response.error === 0) {
        setBookings(response.data || []);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserBookings();
  }, [fetchUserBookings]);

  return {
    bookings,
    loading,
    error,
    refetch: fetchUserBookings
  };
};

// ========== HOT EVENTS HOOK ==========

export const useHotEvents = () => {
  const [hotEvents, setHotEvents] = useState<LocationEvent[]>([]);
  const [trendingEvents, setTrendingEvents] = useState<LocationEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHotEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [hotResponse, trendingResponse] = await Promise.all([
        photographerEventService.getHotEvents(),
        photographerEventService.getTrendingEvents()
      ]);
      
      if (hotResponse.error === 0) {
        setHotEvents(hotResponse.data || []);
      }
      
      if (trendingResponse.error === 0) {
        setTrendingEvents(trendingResponse.data || []);
      }
      
      if (hotResponse.error !== 0 && trendingResponse.error !== 0) {
        setError('Failed to load hot events');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHotEvents();
  }, [fetchHotEvents]);

  return {
    hotEvents,
    trendingEvents,
    loading,
    error,
    refetch: fetchHotEvents
  };
};

// ========== EVENT STATISTICS HOOK ==========

export const useEventStatistics = (eventId: number | null) => {
  const [statistics, setStatistics] = useState<EventStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = useCallback(async () => {
    if (!eventId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await photographerEventService.getEventStatistics(eventId);
      
      if (response.error === 0) {
        setStatistics(response.data);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  return {
    statistics,
    loading,
    error,
    refetch: fetchStatistics
  };
};

// ========== ENHANCED EVENT DISCOVERY ==========

export const useCustomerEventDiscovery = () => {
  const [allEvents, setAllEvents] = useState<LocationEvent[]>([]);
  const [hotEvents, setHotEvents] = useState<LocationEvent[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<LocationEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<LocationEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllCustomerEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [allResponse, hotResponse, featuredResponse, upcomingResponse] = await Promise.all([
        photographerEventService.getAllEvents(),
        photographerEventService.getHotEvents(),
        photographerEventService.getFeaturedEvents(),
        photographerEventService.getUpcomingEvents()
      ]);
      
      if (allResponse.error === 0) {
        setAllEvents(allResponse.data || []);
      }
      if (hotResponse.error === 0) {
        setHotEvents(hotResponse.data || []);
      }
      if (featuredResponse.error === 0) {
        setFeaturedEvents(featuredResponse.data || []);
      }
      if (upcomingResponse.error === 0) {
        setUpcomingEvents(upcomingResponse.data || []);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllCustomerEvents();
  }, [fetchAllCustomerEvents]);

  return {
    allEvents,
    hotEvents,
    featuredEvents,
    upcomingEvents,
    loading,
    error,
    refetch: fetchAllCustomerEvents
  };
};