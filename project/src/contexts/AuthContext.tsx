import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWeb3 } from './Web3Context';
import authService, { User } from '../services/authService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: { name: string; email: string; password: string; confirmPassword: string }) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { userAddress } = useWeb3();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check for stored auth token first
        const storedAuth = localStorage.getItem('authUser');
        if (storedAuth) {
          try {
            const parsedUser = JSON.parse(storedAuth);
            setUser(parsedUser);
            console.log('Restored user from localStorage:', parsedUser.email);
          } catch (parseError) {
            console.error('Error parsing stored auth:', parseError);
            localStorage.removeItem('authUser');
          }
        }
        
        // Also try to get current user from server
        const response = await authService.getCurrentUser();
        if (response.success && response.user) {
          setUser(response.user);
          localStorage.setItem('authUser', JSON.stringify(response.user));
        } else if (!storedAuth) {
          // No stored auth and server doesn't recognize user
          setUser(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // If server call fails but we have stored auth, keep the stored user
        if (!localStorage.getItem('authUser')) {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Sync wallet address with user profile when wallet is connected
  useEffect(() => {
    const syncWalletAddress = async () => {
      if (user && userAddress && user.walletAddress !== userAddress) {
        try {
          const response = await authService.connectWallet(userAddress);
          if (response.success && response.user) {
            setUser(response.user);
            localStorage.setItem('authUser', JSON.stringify(response.user));
          }
        } catch (error) {
          console.error('Error syncing wallet address:', error);
        }
      }
    };

    syncWalletAddress();
  }, [user, userAddress]);

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      if (response.success && response.user) {
        setUser(response.user);
        localStorage.setItem('authUser', JSON.stringify(response.user));
        return { success: true };
      } else {
        return { success: false, message: response.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const register = async (data: { name: string; email: string; password: string; confirmPassword: string }) => {
    try {
      const response = await authService.register(data);
      if (response.success && response.user) {
        setUser(response.user);
        localStorage.setItem('authUser', JSON.stringify(response.user));
        return { success: true };
      } else {
        return { success: false, message: response.error || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      localStorage.removeItem('authUser');
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local state even if server call fails
      setUser(null);
      localStorage.removeItem('authUser');
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    try {
      const response = await authService.updateProfile(updates);
      if (response.success && response.user) {
        setUser(response.user);
        localStorage.setItem('authUser', JSON.stringify(response.user));
        return { success: true };
      } else {
        return { success: false, message: response.error || 'Update failed' };
      }
    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};