export const formatDateTimeForAPI = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}:00`;
};

export const formatDisplayDateTime = (date: Date): string => {
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const formatDisplayDateOnly = (date: Date): string => {
  return date.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const formatDisplayTimeOnly = (date: Date): string => {
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// Helper để set giờ và phút cụ thể
export const setTimeToDate = (
  date: Date,
  hour: number,
  minute: number
): Date => {
  const newDate = new Date(date);
  newDate.setHours(hour, minute, 0, 0); // hour, minute, second=0, millisecond=0
  return newDate;
};

// Helper để tạo date với giờ phút cụ thể
export const createDateWithTime = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): Date => {
  return new Date(year, month, day, hour, minute, 0, 0);
};

// Helper để lấy giờ và phút từ Date
export const getTimeFromDate = (
  date: Date
): { hour: number; minute: number } => {
  return {
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
};
