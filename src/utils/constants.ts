export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  PHOTOGRAPHER: 'photographer',
  LOCATION_OWNER: 'locationowner',
  MODERATOR: 'moderator'
} as const;

export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected'
} as const;

export const AVAILABILITY_STATUS = {
  AVAILABLE: 'available',
  BUSY: 'busy',
  OFFLINE: 'offline'
} as const;

export const PHOTO_CONCEPTS = [
  { id: 'portrait', name: 'Chân dung' },
  { id: 'couple', name: 'Cặp đôi' },
  { id: 'family', name: 'Gia đình' },
  { id: 'fashion', name: 'Thời trang' },
  { id: 'lifestyle', name: 'Lifestyle' },
  { id: 'travel', name: 'Du lịch' },
  { id: 'event', name: 'Sự kiện' },
  { id: 'maternity', name: 'Bầu bí' },
  { id: 'graduation', name: 'Tốt nghiệp' }
] as const;