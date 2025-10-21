/**
 * Django API Client
 * Replaces Supabase client
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

class ApiClient {
  private getAuthHeader(): Record<string, string> {
    const token = localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async handleResponse<T>(response: Response): Promise<{ data: T | null; error: ApiError | null }> {
    if (response.ok) {
      const data = await response.json();
      return { data, error: null };
    }

    const error: ApiError = {
      message: response.statusText,
    };

    try {
      const errorData = await response.json();
      error.message = errorData.detail || errorData.message || response.statusText;
      error.errors = errorData.errors || errorData;
    } catch {
      // Response is not JSON
    }

    return { data: null, error };
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<{ data: T | null; error: ApiError | null }> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await fetch(`${API_URL}${endpoint}${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
    });
    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data: any): Promise<{ data: T | null; error: ApiError | null }> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    return this.handleResponse<T>(response);
  }

  async put<T>(endpoint: string, data: any): Promise<{ data: T | null; error: ApiError | null }> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    return this.handleResponse<T>(response);
  }

  async patch<T>(endpoint: string, data: any): Promise<{ data: T | null; error: ApiError | null }> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string): Promise<{ data: T | null; error: ApiError | null }> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
    });

    if (response.ok) {
      // DELETE might return 204 No Content
      if (response.status === 204) {
        return { data: null, error: null };
      }
      const data = await response.json();
      return { data, error: null };
    }

    return this.handleResponse<T>(response);
  }
}

export const api = new ApiClient();

// Authentication
export const auth = {
  async signInWithPassword(credentials: { email: string; password: string }) {
    const { data, error } = await api.post<{
      access: string;
      refresh: string;
      user: {
        id: string;
        email: string;
        full_name: string;
        role: string;
        region_id: string | null;
      };
    }>('/auth/login/', credentials);

    if (data) {
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      return { data: { user: data.user, session: { access_token: data.access } }, error: null };
    }

    return { data: null, error };
  },

  async signOut() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    return { error: null };
  },

  async getSession() {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return { data: { session: null }, error: null };
    }

    // Get current user to validate session
    const { data, error } = await api.get<any>('/auth/me/');
    if (error) {
      // Token might be expired, try to refresh
      const refreshed = await this.refreshToken();
      if (refreshed.error) {
        return { data: { session: null }, error: null };
      }
      // Try again with new token
      const retry = await api.get<any>('/auth/me/');
      if (retry.error) {
        return { data: { session: null }, error: null };
      }
      return { data: { session: { access_token: token, user: retry.data } }, error: null };
    }

    return { data: { session: { access_token: token, user: data } }, error: null };
  },

  async refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      return { error: { message: 'No refresh token' } };
    }

    const response = await fetch(`${API_URL}/auth/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('access_token', data.access);
      if (data.refresh) {
        localStorage.setItem('refresh_token', data.refresh);
      }
      return { data, error: null };
    }

    return { data: null, error: { message: 'Failed to refresh token' } };
  },

  // Mock onAuthStateChange for compatibility
  onAuthStateChange(callback: (event: string, session: any) => void) {
    // Check session on initialization
    this.getSession().then(({ data }) => {
      callback(data.session ? 'SIGNED_IN' : 'SIGNED_OUT', data.session);
    });

    // Return unsubscribe function
    return {
      data: {
        subscription: {
          unsubscribe: () => {},
        },
      },
    };
  },
};

// Database operations
export const from = (table: string) => {
  return {
    async select(columns: string = '*') {
      const endpoint = `/${table}/`;
      const { data, error } = await api.get<any[]>(endpoint);
      return {
        data,
        error,
        eq: async (column: string, value: any) => {
          const filtered = data?.filter((item: any) => item[column] === value) || [];
          return { data: filtered, error };
        },
        order: (column: string, options?: { ascending?: boolean }) => {
          const sorted = data?.sort((a: any, b: any) => {
            if (options?.ascending === false) {
              return b[column] > a[column] ? 1 : -1;
            }
            return a[column] > b[column] ? 1 : -1;
          }) || [];
          return { data: sorted, error };
        },
        gte: (column: string, value: any) => {
          const filtered = data?.filter((item: any) => item[column] >= value) || [];
          return {
            data: filtered,
            error,
            lte: (column2: string, value2: any) => {
              const filtered2 = filtered.filter((item: any) => item[column2] <= value2);
              return { data: filtered2, error };
            },
          };
        },
        single: async () => {
          return { data: data?.[0] || null, error };
        },
      };
    },

    async insert(values: any) {
      const endpoint = `/${table}/`;
      const { data, error } = await api.post<any>(endpoint, values);
      return { data, error };
    },

    async update(values: any) {
      return {
        eq: async (column: string, value: any) => {
          // For updates, we need the ID
          const endpoint = `/${table}/${value}/`;
          const { data, error } = await api.patch<any>(endpoint, values);
          return { data, error };
        },
      };
    },

    async delete() {
      return {
        eq: async (column: string, value: any) => {
          const endpoint = `/${table}/${value}/`;
          const { data, error } = await api.delete<any>(endpoint);
          return { data, error };
        },
        neq: async (column: string, value: any) => {
          // For bulk delete with neq, we need to fetch all and delete individually
          // This is less efficient, but needed for compatibility
          const { data: items, error: fetchError } = await api.get<any[]>(`/${table}/`);
          if (fetchError) return { data: null, error: fetchError };

          const toDelete = items?.filter((item: any) => item[column] !== value) || [];
          const deletePromises = toDelete.map((item: any) => api.delete(`/${table}/${item.id}/`));
          await Promise.all(deletePromises);

          return { data: null, error: null };
        },
      };
    },
  };
};

export default api;
