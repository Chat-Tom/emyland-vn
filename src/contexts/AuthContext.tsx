import React, { createContext, useContext, useState, useEffect } from 'react';
import { StorageManager, UserAccount } from '../utils/storage';

interface AuthContextType {
  user: UserAccount | null;
  isAuthenticated: boolean;
  login: (user: UserAccount) => void;
  logout: () => void;
  updateUser: (user: UserAccount) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing user session on app start
    const currentUser = StorageManager.getCurrentUser();
    if (currentUser && currentUser.isLoggedIn) {
      setUser(currentUser);
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const login = (userData: UserAccount) => {
    setUser(userData);
    setIsAuthenticated(true);
    StorageManager.setCurrentUser(userData);
  };

  const logout = () => {
    if (user) {
      const updatedUser = { ...user, isLoggedIn: false };
      StorageManager.saveUser(updatedUser);
    }
    StorageManager.clearCurrentUser();
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (userData: UserAccount) => {
    setUser(userData);
    StorageManager.saveUser(userData);
    StorageManager.setCurrentUser(userData);
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      login,
      logout,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};