// services/venueTransactionService.ts

import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net";

// 🔥 VENUE OWNER SPECIFIC TRANSACTION TYPES
export interface VenueTransaction {
  transactionId: number;
  referencePaymentId: number | null;
  fromUserId: number | null;
  fromUserName: string | null;
  toUserId: number | null;
  toUserName: string | null;
  amount: number;
  currency: string;
  type: string;
  status: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  paymentMethod: string | null;
  paymentStatus: string | null;
}

export interface VenueDisplayTransaction extends VenueTransaction {
  id: number;
  description: string;
  transactionDate: string;
  displayType: "income" | "expense";
  formattedDate: string;
  formattedAmount: string;
  statusColor: string;
  statusBgColor: string;
  iconName: string;
  iconBgColor: string;
  customerName?: string;
}

export interface VenueTransactionHistoryData {
  transactions: VenueTransaction[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface VenueTransactionHistoryResponse {
  error: number;
  message: string;
  data: VenueTransactionHistoryData;
}

export interface VenueTransactionStats {
  todayIncome: number;
  monthlyIncome: number;
  pendingAmount: number;
  completedBookings: number;
}

class VenueTransactionService {
  // Get token from AsyncStorage
  private async getAuthToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem("token");
      console.log(
        "🔑 VenueTransactionService - Retrieved token:",
        token ? "***EXISTS***" : "NULL"
      );
      return token;
    } catch (error) {
      console.error("❌ Error getting token from AsyncStorage:", error);
      return null;
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken();

    if (!token) {
      throw new Error("No authentication token found. Please login again.");
    }

    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
      ...options,
    };

    console.log("🌐 VenueTransactionService API Request:", {
      url,
      method: config.method || "GET",
      hasAuth: !!token,
    });

    const response = await fetch(url, config);

    console.log("🔥 VenueTransactionService API Response:", {
      status: response.status,
      statusText: response.statusText,
      url,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ VenueTransactionService API Error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorData,
      });
      throw new Error(`API Error: ${response.status} - ${errorData}`);
    }

    return response.json();
  }

  // 🏢 Get transaction history for location owner
  async getLocationOwnerTransactionHistory(
    locationOwnerId: number,
    page = 1,
    pageSize = 10
  ): Promise<VenueTransactionHistoryData> {
    if (!locationOwnerId) {
      console.warn("❌ locationOwnerId is required");
      return {
        transactions: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }

    const endpoint = `/api/Transaction/history/location-owner/${locationOwnerId}?page=${page}&pageSize=${pageSize}`;

    try {
      console.log("🏢 Fetching location owner transaction history:", {
        locationOwnerId,
        page,
        pageSize,
      });

      const response = await this.makeRequest<VenueTransactionHistoryResponse>(
        endpoint
      );

      console.log("✅ Location owner transaction history response:", response);

      // Check if API call was successful
      if (response.error !== 0) {
        throw new Error(response.message || "API returned error");
      }

      // Return the data part of response
      return response.data;
    } catch (error) {
      console.error(
        "❌ Error fetching location owner transaction history:",
        error
      );
      // Return empty result on error
      return {
        transactions: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }
  }

  // 🔥 Convert API transaction to VenueDisplayTransaction
  convertToDisplayTransaction(
    transaction: VenueTransaction
  ): VenueDisplayTransaction {
    const formatInfo = this.formatTransactionForDisplay(transaction);

    return {
      ...transaction,
      // Map API fields to display fields
      id: transaction.transactionId,
      description:
        transaction.note || this.getTransactionDescription(transaction.type),
      transactionDate: transaction.createdAt,
      // Add display properties
      displayType: formatInfo.displayType,
      formattedDate: formatInfo.formattedDate,
      formattedAmount: formatInfo.formattedAmount,
      statusColor: formatInfo.statusColor,
      statusBgColor: formatInfo.statusBgColor,
      iconName: formatInfo.iconName,
      iconBgColor: formatInfo.iconBgColor,
      customerName: this.getCustomerName(transaction),
    };
  }

  // Helper method to format transaction for display
  private formatTransactionForDisplay(transaction: VenueTransaction): {
    displayType: "income" | "expense";
    formattedDate: string;
    formattedAmount: string;
    statusColor: string;
    statusBgColor: string;
    iconName: string;
    iconBgColor: string;
  } {
    const displayType = this.getDisplayType(transaction.type);
    const formattedDate = new Date(transaction.createdAt).toLocaleDateString(
      "vi-VN"
    );
    const formattedAmount = new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(transaction.amount);

    const statusColors = this.getStatusColors(transaction.status);
    const iconInfo = this.getTransactionIcon(displayType, transaction.status);

    return {
      displayType,
      formattedDate,
      formattedAmount,
      statusColor: statusColors.statusColor,
      statusBgColor: statusColors.statusBgColor,
      iconName: iconInfo.iconName,
      iconBgColor: iconInfo.iconBgColor,
    };
  }

  // 🔥 VENUE OWNER SPECIFIC: Better transaction type detection
  private getDisplayType(transactionType: string): "income" | "expense" {
    const type = transactionType.toLowerCase();

    // Income types for venue owners (Tiền VÀO ví)
    const incomeTypes = [
      "deposit", // 🔥 NẠP TIỀN VÀO VÍ = +
      "photographerfee", // Thu phí từ thợ chụp
      "venuefee", // Thu phí địa điểm
      "refund", // Hoàn tiền (được hoàn)
      "escrowrelease", // Tiền được giải phóng từ escrow
      "rental", // Thu từ thuê địa điểm
      "booking", // Thu từ đặt chỗ
      "commission", // Hoa hồng
      "bonus", // Thưởng
      "payment", // Thanh toán nhận được
    ];

    // Expense types for venue owners (Tiền RA khỏi ví)
    const expenseTypes = [
      "purchase", // Mua gói dịch vụ = -
      "withdrawal", // Rút tiền = -
      "platformfee", // Phí nền tảng = -
      "subscription", // Đăng ký gói = -
      "fee", // Phí dịch vụ = -
      "upgrade", // Nâng cấp dịch vụ = -
      "escrowhold", // Tiền bị giữ trong escrow = -
    ];

    if (incomeTypes.includes(type)) {
      return "income"; // ✅ DEPOSIT = INCOME = +
    }

    if (expenseTypes.includes(type)) {
      return "expense"; // ✅ WITHDRAWAL = EXPENSE = -
    }

    // 🔥 FALLBACK: Dựa vào fromUserId/toUserId để xác định
    // Nhưng vì chúng ta không có transaction object ở đây,
    // nên default sẽ là income (safer cho user experience)
    return "income";
  }

  private getTransactionDescription(type: string): string {
    switch (type.toLowerCase()) {
      // 🔥 INCOME TYPES (+)
      case "deposit":
        return "Nạp tiền vào ví";
      case "photographerfee":
        return "Thu phí thợ chụp";
      case "venuefee":
        return "Thu phí địa điểm";
      case "refund":
        return "Hoàn tiền";
      case "escrowrelease":
        return "Giải phóng từ escrow";
      case "rental":
        return "Thu từ thuê địa điểm";
      case "booking":
        return "Thu từ đặt chỗ";
      case "commission":
        return "Hoa hồng";
      case "bonus":
        return "Thưởng";
      case "payment":
        return "Thanh toán";

      // 🔥 EXPENSE TYPES (-)
      case "purchase":
        return "Mua gói dịch vụ";
      case "withdrawal":
        return "Rút tiền";
      case "platformfee":
        return "Phí nền tảng";
      case "subscription":
        return "Đăng ký gói";
      case "fee":
        return "Phí dịch vụ";
      case "upgrade":
        return "Nâng cấp dịch vụ";
      case "escrowhold":
        return "Giữ trong escrow";

      default:
        return "Giao dịch";
    }
  }

  private getCustomerName(transaction: VenueTransaction): string | undefined {
    const displayType = this.getDisplayType(transaction.type);

    // For income transactions, show who paid (fromUserName)
    if (displayType === "income" && transaction.fromUserName) {
      return transaction.fromUserName;
    }

    // For expense transactions, show who received (toUserName)
    if (displayType === "expense" && transaction.toUserName) {
      return transaction.toUserName;
    }

    return undefined;
  }

  private getStatusColors(status: string): {
    statusColor: string;
    statusBgColor: string;
  } {
    switch (status.toLowerCase()) {
      case "success":
        return {
          statusColor: "#166534", // green-800
          statusBgColor: "#DCFCE7", // green-100
        };
      case "pending":
        return {
          statusColor: "#92400E", // yellow-800
          statusBgColor: "#FEF3C7", // yellow-100
        };
      case "failed":
      case "cancelled":
        return {
          statusColor: "#991B1B", // red-800
          statusBgColor: "#FEE2E2", // red-100
        };
      default:
        return {
          statusColor: "#374151", // gray-700
          statusBgColor: "#F3F4F6", // gray-100
        };
    }
  }

  private getTransactionIcon(
    type: "income" | "expense",
    status: string
  ): {
    iconName: string;
    iconBgColor: string;
  } {
    // Status-based icons
    if (status.toLowerCase() === "pending") {
      return {
        iconName: "time-outline",
        iconBgColor: "#FEF3C7", // yellow-100
      };
    }

    if (
      status.toLowerCase() === "failed" ||
      status.toLowerCase() === "cancelled"
    ) {
      return {
        iconName: "close-circle-outline",
        iconBgColor: "#FEE2E2", // red-100
      };
    }

    // Type-based icons
    return type === "income"
      ? {
          iconName: "arrow-down-outline", // Money coming in
          iconBgColor: "#DCFCE7", // green-100
        }
      : {
          iconName: "arrow-up-outline", // Money going out
          iconBgColor: "#FEE2E2", // red-100
        };
  }

  // Calculate transaction statistics
  calculateStats(transactions: VenueTransaction[]): VenueTransactionStats {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    let todayIncome = 0;
    let monthlyIncome = 0;
    let pendingAmount = 0;
    let completedBookings = 0;

    // Check if transactions is an array
    if (!Array.isArray(transactions)) {
      console.warn("Transactions is not an array:", transactions);
      return {
        todayIncome: 0,
        monthlyIncome: 0,
        pendingAmount: 0,
        completedBookings: 0,
      };
    }

    transactions.forEach((transaction) => {
      const transactionDate = new Date(transaction.createdAt);
      const isIncome = this.getDisplayType(transaction.type) === "income";

      if (isIncome) {
        // Pending amount
        if (transaction.status.toLowerCase() === "pending") {
          pendingAmount += transaction.amount;
        }

        // Successful transactions
        if (transaction.status.toLowerCase() === "success") {
          if (transactionDate >= startOfDay) {
            todayIncome += transaction.amount;
          }
          if (transactionDate >= startOfMonth) {
            monthlyIncome += transaction.amount;
          }

          // Count completed bookings (rental/booking types)
          const type = transaction.type.toLowerCase();
          if (type === "rental" || type === "booking") {
            completedBookings++;
          }
        }
      }
    });

    return {
      todayIncome,
      monthlyIncome,
      pendingAmount,
      completedBookings,
    };
  }

  // Get status text in Vietnamese
  getStatusText(status: string): string {
    switch (status.toLowerCase()) {
      case "success":
        return "Hoàn thành";
      case "pending":
        return "Đang xử lý";
      case "failed":
        return "Thất bại";
      case "cancelled":
        return "Đã hủy";
      default:
        return "Không xác định";
    }
  }

  // Format currency
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  }

  // Format date
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

export default new VenueTransactionService();
