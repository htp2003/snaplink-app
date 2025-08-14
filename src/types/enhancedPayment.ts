// types/enhancedPayment.ts - Extended payment types for both flows

import type { PaymentFlowData } from './payment';

// ✅ NEW: Flow types
export type PaymentFlowType = 'regular_booking' | 'event_booking';

// ✅ NEW: Event booking data structure
export interface EventBookingData {
  eventBookingId: number;
  eventId: number;
  eventPhotographerId: number;
  eventName: string;
  eventLocation: string;
  eventStartDate: string;
  eventEndDate: string;
  userId: number;
  photographerName: string;
  totalPrice: number;
}

// ✅ ENHANCED: Extended PaymentFlowData to support both flows
export interface EnhancedPaymentFlowData extends PaymentFlowData {
  flowType: PaymentFlowType;
  eventBooking?: EventBookingData; // Only present for event bookings
}

// ✅ NEW: Navigation params for OrderEventDetail → PaymentWaitingScreen
export interface EventPaymentNavigationData {
  eventBooking: {
    eventBookingId: number;
    eventId: number;
    eventPhotographerId: number;
    eventName: string;
    eventLocation: string;
    eventStartDate: string;
    eventEndDate: string;
    userId: number;
    photographerName: string;
    totalPrice: number;
  };
  payment: {
    // Primary API fields
    paymentId: number;
    externalTransactionId: string;
    customerId: number;
    customerName: string;
    totalAmount: number;
    status: string;
    bookingId: number; // This will be eventBookingId for event flow
    photographerName: string;
    locationName: string;
    
    // Legacy compatibility
    id: number;
    paymentUrl: string;
    orderCode: string;
    amount: number;
    qrCode?: string | null;
  };
  user: {
    name: string;
    email: string;
  };
  flowType: 'event_booking';
}

// ✅ NEW: Helper function to create enhanced payment flow data
export const createEnhancedPaymentFlowData = (
  baseData: PaymentFlowData,
  flowType: PaymentFlowType,
  eventBooking?: EventBookingData
): EnhancedPaymentFlowData => {
  return {
    ...baseData,
    flowType,
    eventBooking,
  };
};

// ✅ NEW: Helper function to create event payment navigation data
export const createEventPaymentNavigationData = (
  eventBookingData: EventBookingData,
  paymentData: any,
  userData: { name: string; email: string }
): EventPaymentNavigationData => {
  return {
    eventBooking: eventBookingData,
    payment: {
      // Map payment data
      paymentId: paymentData.paymentId || paymentData.id,
      externalTransactionId: paymentData.externalTransactionId || paymentData.orderCode || "",
      customerId: eventBookingData.userId,
      customerName: userData.name,
      totalAmount: paymentData.totalAmount || paymentData.amount || eventBookingData.totalPrice,
      status: paymentData.status || "Pending",
      bookingId: eventBookingData.eventBookingId, // Use eventBookingId as bookingId
      photographerName: eventBookingData.photographerName,
      locationName: eventBookingData.eventLocation,
      
      // Legacy compatibility
      id: paymentData.paymentId || paymentData.id,
      paymentUrl: paymentData.paymentUrl || "",
      orderCode: paymentData.externalTransactionId || paymentData.orderCode || "",
      amount: paymentData.totalAmount || paymentData.amount || eventBookingData.totalPrice,
      qrCode: paymentData.qrCode,
    },
    user: userData,
    flowType: 'event_booking',
  };
};

// ✅ NEW: Type guards
export const isEventBookingFlow = (data: any): data is EventPaymentNavigationData => {
  return data.flowType === 'event_booking' && data.eventBooking;
};

export const isRegularBookingFlow = (data: any): data is PaymentFlowData => {
  return !data.flowType || data.flowType === 'regular_booking';
};