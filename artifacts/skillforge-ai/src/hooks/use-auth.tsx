import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { User, AuthResponse, LoginInput, RegisterInput } from "@workspace/api-client-react/api.schemas";
import { login as apiLogin, register as apiRegister, logout as apiLogout } from "@workspace/api-client-react/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginInput) => Promise<AuthResponse>;
  register: (data: RegisterInput) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const storedToken = localStorage.getItem("sf_token");
    const storedUser = localStorage.getItem("sf_user");
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("sf_token");
        localStorage.removeItem("sf_user");
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = async (data: LoginInput) => {
    const res = await apiLogin(data);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem("sf_token", res.token);
    localStorage.setItem("sf_user", JSON.stringify(res.user));
    return res;
  };

  const register = async (data: RegisterInput) => {
    const res = await apiRegister(data);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem("sf_token", res.token);
    localStorage.setItem("sf_user", JSON.stringify(res.user));
    return res;
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (e) {
      // ignore
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem("sf_token");
      localStorage.removeItem("sf_user");
      setLocation("/login");
    }
  };
  
  const updateUser = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem("sf_user", JSON.stringify(newUser));
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!token,
      isLoading,
      login,
      register,
      logout,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
