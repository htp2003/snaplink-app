import { useState, useEffect, useCallback } from 'react';
import withdrawalService from '../services/withdrawalService';
import {
  WithdrawalRequest,
  CreateWithdrawalRequest,
  UpdateWithdrawalRequest,
  WithdrawalLimits,
  WithdrawalRequestsResponse,
  ProcessWithdrawalRequest,
  RejectWithdrawalRequest,
  CompleteWithdrawalRequest
} from '../types/withdrawal';

// Hook for managing user's withdrawal requests
export const useWithdrawalRequests = (shouldFetch: boolean = true) => {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
    hasMore: false
  });

  const fetchRequests = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!shouldFetch) return;

    try {
      if (page === 1) {
        setLoading(true);
      }
      setError(null);

      const response = await withdrawalService.getUserWithdrawalRequests(page, pagination.pageSize);
      
      if (response.error === 0 && response.data) {
        const { withdrawalRequests, totalCount, totalPages } = response.data;
        
        // Format requests for display
        const formattedRequests = withdrawalRequests.map(request => 
          withdrawalService.formatWithdrawalRequestForDisplay(request)
        );

        if (append && page > 1) {
          setRequests(prev => [...prev, ...formattedRequests]);
        } else {
          setRequests(formattedRequests);
        }

        setPagination(prev => ({
          ...prev,
          page,
          totalCount,
          totalPages,
          hasMore: page < totalPages
        }));
      } else {
        throw new Error(response.message || 'Không thể tải danh sách yêu cầu rút tiền');
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching withdrawal requests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [shouldFetch, pagination.pageSize]);

  const refreshRequests = useCallback(async () => {
    setRefreshing(true);
    await fetchRequests(1, false);
  }, [fetchRequests]);

  const loadMore = useCallback(async () => {
    if (pagination.hasMore && !loading) {
      await fetchRequests(pagination.page + 1, true);
    }
  }, [fetchRequests, pagination.hasMore, pagination.page, loading]);

  const createRequest = useCallback(async (data: CreateWithdrawalRequest): Promise<WithdrawalRequest> => {
    try {
      setError(null);
      const response = await withdrawalService.createWithdrawalRequest(data);
      
      if (response.error === 0 && response.data) {
        // Refresh the list to include the new request
        await refreshRequests();
        return response.data;
      } else {
        throw new Error(response.message || 'Không thể tạo yêu cầu rút tiền');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshRequests]);

  const updateRequest = useCallback(async (withdrawalId: number, data: UpdateWithdrawalRequest): Promise<WithdrawalRequest> => {
    try {
      setError(null);
      const response = await withdrawalService.updateWithdrawalRequest(withdrawalId, data);
      
      if (response.error === 0 && response.data) {
        // Update the request in the local list
        setRequests(prev => prev.map(req => 
          req.id === withdrawalId 
            ? withdrawalService.formatWithdrawalRequestForDisplay(response.data)
            : req
        ));
        return response.data;
      } else {
        throw new Error(response.message || 'Không thể cập nhật yêu cầu rút tiền');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const cancelRequest = useCallback(async (withdrawalId: number): Promise<void> => {
    try {
      setError(null);
      const response = await withdrawalService.cancelWithdrawalRequest(withdrawalId);
      
      if (response.error === 0) {
        // Remove the request from the local list or refresh
        await refreshRequests();
      } else {
        throw new Error(response.message || 'Không thể hủy yêu cầu rút tiền');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshRequests]);

  useEffect(() => {
    if (shouldFetch) {
      fetchRequests(1, false);
    }
  }, [shouldFetch]);

  return {
    requests,
    loading,
    refreshing,
    error,
    pagination,
    refreshRequests,
    loadMore,
    createRequest,
    updateRequest,
    cancelRequest
  };
};

// Hook for withdrawal limits
export const useWithdrawalLimits = (shouldFetch: boolean = true) => {
  const [limits, setLimits] = useState<WithdrawalLimits>({
    minAmount: 10000,
    maxAmount: 50000000
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLimits = useCallback(async () => {
    if (!shouldFetch) return;

    try {
      setLoading(true);
      setError(null);

      const response = await withdrawalService.getWithdrawalLimits();
      
      if (response.error === 0 && response.data) {
        setLimits(response.data);
      } else {
        throw new Error(response.message || 'Không thể tải giới hạn rút tiền');
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching withdrawal limits:', err);
    } finally {
      setLoading(false);
    }
  }, [shouldFetch]);

  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  return {
    limits,
    loading,
    error,
    refreshLimits: fetchLimits
  };
};

// Hook for single withdrawal request details
export const useWithdrawalRequest = (withdrawalId: number | null, shouldFetch: boolean = true) => {
  const [request, setRequest] = useState<WithdrawalRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequest = useCallback(async () => {
    if (!withdrawalId || !shouldFetch) return;

    try {
      setLoading(true);
      setError(null);

      const response = await withdrawalService.getWithdrawalRequestDetail(withdrawalId);
      
      if (response.error === 0 && response.data) {
        setRequest(withdrawalService.formatWithdrawalRequestForDisplay(response.data));
      } else {
        throw new Error(response.message || 'Không thể tải thông tin yêu cầu rút tiền');
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching withdrawal request:', err);
    } finally {
      setLoading(false);
    }
  }, [withdrawalId, shouldFetch]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  return {
    request,
    loading,
    error,
    refreshRequest: fetchRequest
  };
};

// Hook for admin/moderator operations
export const useWithdrawalAdmin = () => {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
    hasMore: false
  });

  const fetchAllRequests = useCallback(async (
    page: number = 1, 
    status?: string, 
    append: boolean = false
  ) => {
    try {
      if (page === 1) {
        setLoading(true);
      }
      setError(null);

      const response = await withdrawalService.getAllWithdrawalRequests(page, pagination.pageSize, status);
      
      if (response.error === 0 && response.data) {
        const { withdrawalRequests, totalCount, totalPages } = response.data;
        
        // Format requests for display
        const formattedRequests = withdrawalRequests.map(request => 
          withdrawalService.formatWithdrawalRequestForDisplay(request)
        );

        if (append && page > 1) {
          setRequests(prev => [...prev, ...formattedRequests]);
        } else {
          setRequests(formattedRequests);
        }

        setPagination(prev => ({
          ...prev,
          page,
          totalCount,
          totalPages,
          hasMore: page < totalPages
        }));
      } else {
        throw new Error(response.message || 'Không thể tải danh sách yêu cầu rút tiền');
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching all withdrawal requests:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.pageSize]);

  const fetchRequestsByStatus = useCallback(async (
    status: string,
    page: number = 1,
    append: boolean = false
  ) => {
    try {
      if (page === 1) {
        setLoading(true);
      }
      setError(null);

      const response = await withdrawalService.getWithdrawalRequestsByStatus(status, page, pagination.pageSize);
      
      if (response.error === 0 && response.data) {
        const { withdrawalRequests, totalCount, totalPages } = response.data;
        
        // Format requests for display
        const formattedRequests = withdrawalRequests.map(request => 
          withdrawalService.formatWithdrawalRequestForDisplay(request)
        );

        if (append && page > 1) {
          setRequests(prev => [...prev, ...formattedRequests]);
        } else {
          setRequests(formattedRequests);
        }

        setPagination(prev => ({
          ...prev,
          page,
          totalCount,
          totalPages,
          hasMore: page < totalPages
        }));
      } else {
        throw new Error(response.message || 'Không thể tải danh sách yêu cầu rút tiền');
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching withdrawal requests by status:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.pageSize]);

  const processRequest = useCallback(async (
    withdrawalId: number, 
    data: ProcessWithdrawalRequest
  ): Promise<WithdrawalRequest> => {
    try {
      setError(null);
      const response = await withdrawalService.processWithdrawalRequest(withdrawalId, data);
      
      if (response.error === 0 && response.data) {
        // Update the request in the local list
        setRequests(prev => prev.map(req => 
          req.id === withdrawalId 
            ? withdrawalService.formatWithdrawalRequestForDisplay(response.data)
            : req
        ));
        return response.data;
      } else {
        throw new Error(response.message || 'Không thể xử lý yêu cầu rút tiền');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const approveRequest = useCallback(async (withdrawalId: number): Promise<WithdrawalRequest> => {
    try {
      setError(null);
      const response = await withdrawalService.approveWithdrawalRequest(withdrawalId);
      
      if (response.error === 0 && response.data) {
        // Update the request in the local list
        setRequests(prev => prev.map(req => 
          req.id === withdrawalId 
            ? withdrawalService.formatWithdrawalRequestForDisplay(response.data)
            : req
        ));
        return response.data;
      } else {
        throw new Error(response.message || 'Không thể phê duyệt yêu cầu rút tiền');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const rejectRequest = useCallback(async (
    withdrawalId: number, 
    data: RejectWithdrawalRequest
  ): Promise<WithdrawalRequest> => {
    try {
      setError(null);
      const response = await withdrawalService.rejectWithdrawalRequest(withdrawalId, data);
      
      if (response.error === 0 && response.data) {
        // Update the request in the local list
        setRequests(prev => prev.map(req => 
          req.id === withdrawalId 
            ? withdrawalService.formatWithdrawalRequestForDisplay(response.data)
            : req
        ));
        return response.data;
      } else {
        throw new Error(response.message || 'Không thể từ chối yêu cầu rút tiền');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const completeRequest = useCallback(async (
    withdrawalId: number, 
    data?: CompleteWithdrawalRequest
  ): Promise<WithdrawalRequest> => {
    try {
      setError(null);
      const response = await withdrawalService.completeWithdrawalRequest(withdrawalId, data);
      
      if (response.error === 0 && response.data) {
        // Update the request in the local list
        setRequests(prev => prev.map(req => 
          req.id === withdrawalId 
            ? withdrawalService.formatWithdrawalRequestForDisplay(response.data)
            : req
        ));
        return response.data;
      } else {
        throw new Error(response.message || 'Không thể hoàn thành yêu cầu rút tiền');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (pagination.hasMore && !loading) {
      await fetchAllRequests(pagination.page + 1, undefined, true);
    }
  }, [fetchAllRequests, pagination.hasMore, pagination.page, loading]);

  return {
    requests,
    loading,
    error,
    pagination,
    fetchAllRequests,
    fetchRequestsByStatus,
    processRequest,
    approveRequest,
    rejectRequest,
    completeRequest,
    loadMore
  };
};

// Hook for withdrawal form validation
export const useWithdrawalForm = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateAmount = useCallback((amount: number, maxBalance: number): string | null => {
    if (!amount || amount <= 0) {
      return 'Vui lòng nhập số tiền';
    }
    
    if (amount < 10000) {
      return 'Số tiền tối thiểu là 10,000 VND';
    }
    
    if (amount > 50000000) {
      return 'Số tiền tối đa là 50,000,000 VND';
    }
    
    if (amount > maxBalance) {
      return 'Số tiền vượt quá số dư khả dụng';
    }
    
    return null;
  }, []);

  const validateBankAccount = useCallback((accountNumber: string): string | null => {
    if (!accountNumber || accountNumber.trim().length === 0) {
      return 'Vui lòng nhập số tài khoản';
    }
    
    if (accountNumber.length < 6) {
      return 'Số tài khoản tối thiểu 6 số';
    }
    
    if (accountNumber.length > 100) {
      return 'Số tài khoản không được quá 100 ký tự';
    }
    
    if (!/^\d+$/.test(accountNumber)) {
      return 'Số tài khoản chỉ được chứa số';
    }
    
    return null;
  }, []);

  const validateAccountName = useCallback((accountName: string): string | null => {
    if (!accountName || accountName.trim().length === 0) {
      return 'Vui lòng nhập tên chủ tài khoản';
    }
    
    if (accountName.length > 100) {
      return 'Tên chủ tài khoản không được quá 100 ký tự';
    }
    
    return null;
  }, []);

  const validateBankName = useCallback((bankName: string): string | null => {
    if (!bankName || bankName.trim().length === 0) {
      return 'Vui lòng chọn ngân hàng';
    }
    
    if (bankName.length > 100) {
      return 'Tên ngân hàng không được quá 100 ký tự';
    }
    
    return null;
  }, []);

  const validateForm = useCallback((data: CreateWithdrawalRequest, maxBalance: number) => {
    const newErrors: Record<string, string> = {};

    const amountError = validateAmount(data.amount, maxBalance);
    if (amountError) newErrors.amount = amountError;

    const accountError = validateBankAccount(data.bankAccountNumber);
    if (accountError) newErrors.bankAccountNumber = accountError;

    const nameError = validateAccountName(data.bankAccountName);
    if (nameError) newErrors.bankAccountName = nameError;

    const bankError = validateBankName(data.bankName);
    if (bankError) newErrors.bankName = bankError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [validateAmount, validateBankAccount, validateAccountName, validateBankName]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  return {
    errors,
    validateForm,
    validateAmount,
    validateBankAccount,
    validateAccountName,
    validateBankName,
    clearErrors,
    clearFieldError
  };
};