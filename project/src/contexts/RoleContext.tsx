import React, { createContext, useContext, useState, useEffect } from 'react';

type UserRole = 'client' | 'provider';

interface RoleContextType {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  toggleRole: () => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userRole, setUserRole] = useState<UserRole>(() => {
    // Get role from localStorage or default to 'client'
    const savedRole = localStorage.getItem('eryzaa-user-role');
    return (savedRole as UserRole) || 'client';
  });

  // Save to localStorage whenever role changes
  useEffect(() => {
    localStorage.setItem('eryzaa-user-role', userRole);
  }, [userRole]);

  const toggleRole = () => {
    setUserRole(prev => prev === 'client' ? 'provider' : 'client');
  };

  return (
    <RoleContext.Provider value={{ userRole, setUserRole, toggleRole }}>
      {children}
    </RoleContext.Provider>
  );
};
