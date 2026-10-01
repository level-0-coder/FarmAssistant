import { getToken, clearToken } from './auth';
import { ENV } from '../config/options';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers = {}, ...rest } = options;

  let url = `${ENV.API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const token = getToken();
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...rest,
      headers: requestHeaders,
    });

    if (response.status === 401) {
      clearToken();
      // Redirect to landing page on unauthorized
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
      throw new ApiError('Unauthorized. Please log in again.', 401);
    }

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const errorMessage =
        (typeof data === 'object' && data !== null && (data.detail || data.message))
          ? (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail))
          : response.statusText || `Request failed with status ${response.status}`;

      throw new ApiError(errorMessage, response.status, data);
    }

    return data as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err?.message || 'Network error occurred. Please try again.', 0);
  }
}
