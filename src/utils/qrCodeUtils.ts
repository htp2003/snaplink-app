
export interface QRCodeData {
  type: 'image' | 'text' | 'url';
  data: string;
  displayData?: string;
  isValid: boolean;
}

export class QRCodeHandler {
  
  // ✅ Analyze QR code format from PayOS
  static analyzeQRCode(qrData: string): QRCodeData {
    if (!qrData || typeof qrData !== 'string') {
      return {
        type: 'text',
        data: '',
        isValid: false
      };
    }

    const trimmed = qrData.trim();
    
    // Check if it's a URL (PayOS checkout URL)
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return {
        type: 'url',
        data: trimmed,
        displayData: trimmed,
        isValid: true
      };
    }
    
    // Check if it's a data URI image
    if (trimmed.startsWith('data:image/')) {
      return {
        type: 'image',
        data: trimmed,
        isValid: true
      };
    }
    
    // Check if it's EMVCo QR text format (Vietnamese banking)
    if (/^[0-9]{4}/.test(trimmed) && trimmed.length > 50) {
      return {
        type: 'text',
        data: trimmed,
        displayData: this.formatQRText(trimmed),
        isValid: true
      };
    }
    
    // Default to text
    return {
      type: 'text',
      data: trimmed,
      displayData: trimmed,
      isValid: trimmed.length > 0
    };
  }

  // ✅ Format QR text for better display
  static formatQRText(qrText: string): string {
    // Add spaces every 4 characters for better readability
    return qrText.replace(/(.{4})/g, '$1 ').trim();
  }

  // ✅ Generate QR image from text/URL
  static generateQRImageData(data: string): string {
    // This will be used with react-native-qrcode-svg
    return data;
  }

  // ✅ Check if QR can be scanned
  static canBeScanned(qrData: QRCodeData): boolean {
    return qrData.isValid && (qrData.type === 'text' || qrData.type === 'url');
  }

  // ✅ Get suggestions for QR usage
  static getUsageSuggestions(qrData: QRCodeData): string[] {
    const suggestions: string[] = [];
    
    switch (qrData.type) {
      case 'url':
        suggestions.push('Mở link này trong trình duyệt để thanh toán');
        suggestions.push('Hoặc tạo QR code từ link này để scan');
        break;
      case 'text':
        suggestions.push('Sao chép mã này và dán vào app banking');
        suggestions.push('Hoặc sử dụng chức năng "Nhập mã thủ công"');
        suggestions.push('Mã này tương thích với các app banking Việt Nam');
        break;
      case 'image':
        suggestions.push('Scan QR code này bằng app banking');
        break;
      default:
        suggestions.push('Sử dụng link thanh toán thay thế');
    }
    
    return suggestions;
  }
}

// ✅ Enhanced PayOS Service to handle QR properly
export class EnhancedPayOSService {
  
  // ✅ Extract QR data from PayOS response
  static extractQRFromPayOS(payosResponse: any): {
    qrCode: QRCodeData | null;
    paymentUrl: string;
    shouldGenerateQR: boolean;
  } {
    let qrCode: QRCodeData | null = null;
    let shouldGenerateQR = false;
    
    const paymentUrl = payosResponse.checkoutUrl || payosResponse.paymentUrl || '';
    
    // Try to find QR data in various fields
    const qrSources = [
      payosResponse.qrCode,
      payosResponse.qr,
      payosResponse.qrCodeUrl,
      payosResponse.qrData
    ];
    
    for (const qrSource of qrSources) {
      if (qrSource && typeof qrSource === 'string' && qrSource.trim()) {
        qrCode = QRCodeHandler.analyzeQRCode(qrSource);
        break;
      }
    }
    
    // If no QR found but we have payment URL, suggest generating QR
    if (!qrCode && paymentUrl) {
      qrCode = QRCodeHandler.analyzeQRCode(paymentUrl);
      shouldGenerateQR = true;
    }
    
    return {
      qrCode,
      paymentUrl,
      shouldGenerateQR
    };
  }

  // ✅ Get QR display component props
  static getQRDisplayProps(payosResponse: any) {
    const { qrCode, paymentUrl, shouldGenerateQR } = this.extractQRFromPayOS(payosResponse);
    
    return {
      hasQR: !!qrCode?.isValid,
      qrType: qrCode?.type || 'none',
      qrData: qrCode?.data || '',
      displayData: qrCode?.displayData || qrCode?.data || '',
      canBeScanned: qrCode ? QRCodeHandler.canBeScanned(qrCode) : false,
      suggestions: qrCode ? QRCodeHandler.getUsageSuggestions(qrCode) : [],
      paymentUrl,
      shouldGenerateQR,
      // For react-native-qrcode-svg
      qrImageData: qrCode?.isValid ? QRCodeHandler.generateQRImageData(qrCode.data) : null
    };
  }
}