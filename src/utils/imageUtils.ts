import { Linking } from 'react-native';

export class ImageUtils {
  /**
   * Check if a string is a valid image URL
   */
  static isImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    
    // Check for common image file extensions
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;
    if (imageExtensions.test(url)) return true;
    
    // Check for common image hosting services
    const imageHosts = [
      'ibb.co',
      'imgur.com',
      'drive.google.com',
      'photos.app.goo.gl',
      'images.unsplash.com',
      'cdn.pixabay.com',
      'i.postimg.cc',
      'postimg.cc',
      'tinypic.com',
      'photobucket.com',
      'flickr.com',
    ];
    
    try {
      const urlObj = new URL(url);
      return imageHosts.some(host => urlObj.hostname.includes(host));
    } catch {
      return false;
    }
  }

  /**
   * Convert image URL for better compatibility
   * Especially for ibb.co links
   */
  static processImageUrl(url: string): string {
    if (!url) return url;

    // Handle ibb.co links - convert to direct image URL
    if (url.includes('ibb.co/') && !url.includes('.jpg') && !url.includes('.png')) {
      // Try to extract the image ID and create direct link
      const matches = url.match(/ibb\.co\/([a-zA-Z0-9]+)/);
      if (matches && matches[1]) {
        // For ibb.co, we can try to construct a direct image URL
        // But since ibb.co doesn't always follow a predictable pattern,
        // we'll return the original URL and let the Image component handle it
        return url;
      }
    }

    // Handle Google Drive links
    if (url.includes('drive.google.com')) {
      // Convert Google Drive share links to direct image URLs
      const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
      }
    }

    return url;
  }

  /**
   * Open image URL in browser or external app
   */
  static async openImageInBrowser(url: string): Promise<void> {
    try {
      const processedUrl = this.processImageUrl(url);
      const canOpen = await Linking.canOpenURL(processedUrl);
      if (canOpen) {
        await Linking.openURL(processedUrl);
      } else {
        throw new Error('Cannot open URL');
      }
    } catch (error) {
      console.error('Error opening image URL:', error);
      throw error;
    }
  }

  /**
   * Get image cache key from URL
   */
  static getCacheKey(url: string): string {
    // Create a simple cache key from URL
    return url.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
  }

  /**
   * Validate if URL is safe to load
   */
  static isSafeImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;

    try {
      const urlObj = new URL(url);
      
      // Only allow HTTPS URLs for security
      if (urlObj.protocol !== 'https:') return false;

      // Block potentially dangerous domains
      const blockedDomains = [
        'localhost',
        '127.0.0.1',
        '192.168.',
        '10.',
        '172.',
      ];

      return !blockedDomains.some(domain => 
        urlObj.hostname.includes(domain)
      );
    } catch {
      return false;
    }
  }
}