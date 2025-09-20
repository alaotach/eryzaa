import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  role: 'user' | 'provider';
  walletAddress?: string;
  tokenBalance: number;
  reputation: number;
  stakedTokens: number;
  avatar: string;
  completedJobs: number;
  averageCompletionTime: number;
  tokensEarned: number;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: 'user' | 'provider') => Promise<void>;
  logout: () => void;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchRole: (role: 'user' | 'provider') => void;
  updateUser: (updates: Partial<User>) => void;
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

  useEffect(() => {
    // Load user from localStorage on app start
    const savedUser = localStorage.getItem('eryza_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (email: string, password: string, role: 'user' | 'provider') => {
    // Mock login - in real app, this would call your API
    const mockUser: User = {
      id: 'user_' + Math.random().toString(36).substr(2, 9),
      email,
      role,
      tokenBalance: 1000,
      reputation: 4.2,
      stakedTokens: role === 'provider' ? 500 : 0,
      avatar: `https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400`,
      completedJobs: 23,
      averageCompletionTime: 2.5,
      tokensEarned: 5420,
    };
    
    setUser(mockUser);
    localStorage.setItem('eryza_user', JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('eryza_user');
    localStorage.removeItem('eryza_wallet');
  };

  const connectWallet = async () => {
    // Mock Core Wallet connection
    if (user) {
      const walletAddress = '0x' + Math.random().toString(16).substr(2, 40);
      const updatedUser = { ...user, walletAddress };
      setUser(updatedUser);
      localStorage.setItem('eryza_user', JSON.stringify(updatedUser));
      localStorage.setItem('eryza_wallet', walletAddress);
    }
  };

  const disconnectWallet = () => {
    if (user) {
      const updatedUser = { ...user, walletAddress: undefined };
      setUser(updatedUser);
      localStorage.setItem('eryza_user', JSON.stringify(updatedUser));
      localStorage.removeItem('eryza_wallet');
    }
  };

  const switchRole = (role: 'user' | 'provider') => {
    if (user) {
      const updatedUser = { ...user, role, stakedTokens: role === 'provider' ? 500 : 0 };
      setUser(updatedUser);
      localStorage.setItem('eryza_user', JSON.stringify(updatedUser));
    }
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('eryza_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      connectWallet,
      disconnectWallet,
      switchRole,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};