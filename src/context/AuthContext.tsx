import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  adminLogin,
  agentLogin,
  userLogin,
  adminLogout,
  agentLogout,
  userLogout,
} from '../services/auth.service';
import {
  clearAccessToken,
  formatApiError,
  getAccessToken,
  setAccessToken,
  setUnauthorizedHandler,
} from '../lib/api';
import { isAdminPortalRole } from '../lib/roles';
import type { ApiError, PortalRole, Agent } from '../types/api';
import { formatAgentName, formatUserName } from '../types/api';

export interface User {
  id: string;
  name: string;
  email: string | null;
  role: PortalRole;
  agentLoginId?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string, portal: PortalRole) => Promise<void>;
  loginWithAgentSession: (accessToken: string, agent: Agent) => void;
  logout: () => Promise<void>;
}

const USER_KEY = 'app_user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const clearSession = () => {
  clearAccessToken();
  localStorage.removeItem(USER_KEY);
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const handleUnauthorized = () => {
    setUser(null);
    clearSession();
  };

  useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized);

    const storedUser = localStorage.getItem(USER_KEY);
    const token = getAccessToken();

    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        clearSession();
      }
    } else if (storedUser || token) {
      clearSession();
    }

    setLoading(false);
  }, []);

  const persistSession = (nextUser: User, accessToken: string) => {
    setAccessToken(accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const login = async (
    identifier: string,
    password: string,
    portal: PortalRole,
  ): Promise<void> => {
    try {
      if (portal === 'agent') {
        const { accessToken, agent } = await agentLogin(identifier, password);
        persistSession(
          {
            id: agent.id,
            name: formatAgentName(agent),
            email: agent.email,
            role: 'agent',
            agentLoginId: agent.agentLoginId,
          },
          accessToken,
        );
        return;
      }

      if (portal === 'withdrawal') {
        const { accessToken, user: loginUser } = await userLogin(identifier, password);
        persistSession(
          {
            id: loginUser.id,
            name: formatUserName(loginUser),
            email: loginUser.email,
            role: 'withdrawal',
          },
          accessToken,
        );
        return;
      }

      const { accessToken, admin } = await adminLogin(identifier, password);
      persistSession(
        {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
        accessToken,
      );
    } catch (error) {
      throw new Error(formatApiError(error as ApiError));
    }
  };

  const logout = async (): Promise<void> => {
    const token = getAccessToken();
    const currentUser = user;

    setUser(null);
    clearSession();

    if (!token || !currentUser) {
      return;
    }

    try {
      if (currentUser.role === 'agent') {
        await agentLogout();
      } else if (currentUser.role === 'withdrawal') {
        await userLogout();
      } else if (isAdminPortalRole(currentUser.role)) {
        await adminLogout();
      }
    } catch {
      // Session already cleared locally
    }
  };

  const loginWithAgentSession = (accessToken: string, agent: Agent) => {
    persistSession(
      {
        id: agent.id,
        name: formatAgentName(agent),
        email: agent.email,
        role: 'agent',
        agentLoginId: agent.agentLoginId,
      },
      accessToken,
    );
  };

  const value = {
    user,
    login,
    loginWithAgentSession,
    logout,
    loading,
    isAuthenticated: !!user && !!getAccessToken(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
