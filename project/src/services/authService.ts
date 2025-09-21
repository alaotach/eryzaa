// MongoDB Backend Authentication Service

const API_BASE_URL = 'http://localhost:5000/api';

export interface User {
  id: string;
  name: string;
  email: string;
  walletAddress?: string;
  avatar: string;
  preferences?: {
    theme: 'light' | 'dark' | 'auto';
    notifications: {
      email: boolean;
      browser: boolean;
      jobUpdates: boolean;
      marketingEmails: boolean;
    };
    defaultRole: 'client' | 'provider';
  };
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
  message?: string;
}

class AuthService {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    // Load token and user from localStorage on initialization
    this.token = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('authUser');
    if (savedUser) {
      try {
        this.user = JSON.parse(savedUser);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('authUser');
      }
    }
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const { name, email, password, confirmPassword } = data;
      
      // Client-side validation
      if (!name || !email || !password || !confirmPassword) {
        return { success: false, error: 'All fields are required' };
      }
      
      if (password !== confirmPassword) {
        return { success: false, error: 'Passwords do not match' };
      }
      
      if (password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters long' };
      }

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const responseData = await response.json();

      if (responseData.success && responseData.token && responseData.user) {
        this.token = responseData.token;
        this.user = responseData.user;
        localStorage.setItem('authToken', responseData.token);
        localStorage.setItem('authUser', JSON.stringify(responseData.user));
      }

      return {
        success: responseData.success,
        user: responseData.user,
        token: responseData.token,
        error: responseData.message
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Network error. Please try again.'
      };
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { email, password } = credentials;
      
      // Client-side validation
      if (!email || !password) {
        return { success: false, error: 'Email and password are required' };
      }

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const responseData = await response.json();

      if (responseData.success && responseData.token && responseData.user) {
        this.token = responseData.token;
        this.user = responseData.user;
        localStorage.setItem('authToken', responseData.token);
        localStorage.setItem('authUser', JSON.stringify(responseData.user));
      }

      return {
        success: responseData.success,
        user: responseData.user,
        token: responseData.token,
        error: responseData.message
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Network error. Please try again.'
      };
    }
  }

  async logout(): Promise<void> {
    this.token = null;
    this.user = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  }

  async getCurrentUser(): Promise<AuthResponse> {
    if (!this.token) {
      return { success: false, error: 'No active session' };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      });

      const responseData = await response.json();

      if (responseData.success && responseData.user) {
        this.user = responseData.user;
        localStorage.setItem('authUser', JSON.stringify(this.user));
        return {
          success: true,
          user: this.user
        };
      } else {
        // Token might be invalid
        await this.logout();
        return { success: false, error: 'Session expired' };
      }
    } catch (error) {
      console.error('Get current user error:', error);
      // Return cached user if network error
      if (this.user) {
        return { success: true, user: this.user };
      }
      return { success: false, error: 'Network error' };
    }
  }

  async updateProfile(updates: Partial<User>): Promise<AuthResponse> {
    if (!this.token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const responseData = await response.json();

      if (responseData.success && responseData.user) {
        this.user = responseData.user;
        localStorage.setItem('authUser', JSON.stringify(this.user));
      }

      return {
        success: responseData.success,
        user: responseData.user,
        error: responseData.message
      };
    } catch (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        error: 'Network error. Please try again.'
      };
    }
  }

  async connectWallet(walletAddress: string): Promise<AuthResponse> {
    if (!this.token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/connect-wallet`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      });

      const responseData = await response.json();

      if (responseData.success && responseData.user) {
        this.user = responseData.user;
        localStorage.setItem('authUser', JSON.stringify(this.user));
      }

      return {
        success: responseData.success,
        user: responseData.user,
        error: responseData.message
      };
    } catch (error) {
      console.error('Connect wallet error:', error);
      return {
        success: false,
        error: 'Network error. Please try again.'
      };
    }
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): User | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }
}

export default new AuthService();
