// components/Event/index.ts

export { default as EventCard } from './EventCard';
export { default as HotEventBanner } from './HotEventBanner';
export { default as EventCarousel } from './EventCarousel';
export { default as EventSection } from './EventSection';

// Re-export types if needed
export type {
  LocationEvent,
  EventBooking,
  EventApplication,
  EventStatistics
} from '../../types/event';