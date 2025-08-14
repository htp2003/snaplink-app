// hooks/useEvent.ts - Focused User Event Hooks

import { useState, useEffect, useCallback } from 'react';
import { 
  LocationEvent, 
  EventBooking, 
  EventBookingRequest,
  EventPhotographer
} from '../types/event';
import { eventService } from '../services/eventService';

// ========== 1. EVENT DISCOVERY (cho HomeScreen) ==========

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
        eventService.getActiveEvents(),
        eventService.getUpcomingEvents(),
        eventService.getFeaturedEvents()
      ]);
      
      console.log('Event responses:', { activeResponse, upcomingResponse, featuredResponse });
      
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

// ========== 2. HOT & TRENDING EVENTS ==========

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
        eventService.getHotEvents(),
        eventService.getTrendingEvents()
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

// ========== 3. EVENT SEARCH ==========

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
      const response = await eventService.searchEvents(searchTerm);
      
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
      const response = await eventService.getNearbyEvents(latitude, longitude, radiusKm);
      
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

// ========== 4. EVENT DETAIL ==========

export const useEventDetail = (eventId: number | null) => {
  const [event, setEvent] = useState<LocationEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEventDetail = useCallback(async () => {
    if (!eventId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await eventService.getEventDetail(eventId);
      
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

// ========== 5. APPROVED PHOTOGRAPHERS (cho BookingEventScreen) ==========

export const useApprovedPhotographers = (eventId: number | null) => {
  const [photographers, setPhotographers] = useState<EventPhotographer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApprovedPhotographers = useCallback(async () => {
    if (!eventId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await eventService.getApprovedPhotographers(eventId);
      
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

// ========== 6. EVENT BOOKING (cho BookingEventScreen) ==========

export const useEventBooking = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bookEvent = async (request: EventBookingRequest): Promise<EventBooking | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await eventService.bookEvent(request);
      
      if (response.error === 0) {
        console.log("✅ Event booking successful:", response.data);
        return response.data;
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
      const response = await eventService.cancelEventBooking(eventBookingId);
      
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

// ========== 7. USER EVENT BOOKINGS (optional) ==========

export const useUserEventBookings = (userId: number | null) => {
  const [bookings, setBookings] = useState<EventBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserBookings = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await eventService.getUserEventBookings(userId);
      
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

// ========== 8. COMBINED DISCOVERY FOR CUSTOMER HOME ==========

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
        eventService.getAllEvents(),
        eventService.getHotEvents(),
        eventService.getFeaturedEvents(),
        eventService.getUpcomingEvents()
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