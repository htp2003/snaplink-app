// hooks/usePhotographerEvent.ts

import { useState, useEffect, useCallback } from 'react';
import { 
  LocationEvent, 
  EventApplication, 
  EventApplicationRequest,
  ApiResponse,
  EventPhotographer
} from '../types/photographerEvent';
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