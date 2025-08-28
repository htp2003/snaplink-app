// hooks/useComplaintsAgainstMe.ts
import { useState, useEffect, useCallback } from 'react';
import { complaintService, ComplaintAgainstMeResponse, ComplaintListResponse } from '../services/complaintService';

export const useComplaintsAgainstMe = () => {
  const [complaints, setComplaints] = useState<ComplaintAgainstMeResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(false);

  const fetchComplaints = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      }
      setError(null);

      const response = await complaintService.getComplaintsAgainstMe(page);
      
      if (append && page > 1) {
        setComplaints(prev => [...prev, ...response.complaints]);
      } else {
        setComplaints(response.complaints);
      }
      
      setTotalCount(response.totalCount);
      setCurrentPage(page);
      setHasMorePages(page < response.totalPages);
    } catch (err) {
      console.error('Error fetching complaints:', err);
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách phàn nàn');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refreshComplaints = useCallback(async () => {
    setRefreshing(true);
    await fetchComplaints(1, false);
  }, [fetchComplaints]);

  const loadMoreComplaints = useCallback(async () => {
    if (hasMorePages && !loading) {
      await fetchComplaints(currentPage + 1, true);
    }
  }, [hasMorePages, loading, currentPage, fetchComplaints]);

  // Helper functions
  const getComplaintsByBookingId = useCallback((bookingId: number): ComplaintAgainstMeResponse[] => {
    return complaints.filter(complaint => complaint.bookingId === bookingId);
  }, [complaints]);

  const hasComplaints = useCallback((bookingId: number): boolean => {
    return complaints.some(complaint => complaint.bookingId === bookingId);
  }, [complaints]);

  const getComplaintStatus = useCallback((bookingId: number): string | null => {
    const bookingComplaints = complaints.filter(c => c.bookingId === bookingId);
    if (bookingComplaints.length === 0) return null;
    
    // Return most severe status
    if (bookingComplaints.some(c => c.status === "InProgress")) return "InProgress";
    if (bookingComplaints.some(c => c.status === "Pending")) return "Pending";
    return "Resolved";
  }, [complaints]);

  // Statistics
  const pendingComplaintsCount = complaints.filter(c => c.status === "Pending").length;
  const inProgressComplaintsCount = complaints.filter(c => c.status === "InProgress").length;
  const totalComplaintsCount = complaints.length;

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  return {
    complaints,
    loading,
    refreshing,
    error,
    totalCount,
    hasMorePages,
    pendingComplaintsCount,
    inProgressComplaintsCount,
    totalComplaintsCount,
    fetchComplaints,
    refreshComplaints,
    loadMoreComplaints,
    getComplaintsByBookingId,
    hasComplaints,
    getComplaintStatus,
  };
};