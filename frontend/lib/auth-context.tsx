"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { User } from "./types";
import { apiRequest, clearToken, getToken, setToken } from "./api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  authenticateWithGoogle: (credential: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  requestSignupOtp: (email: string) => Promise<void>;
  verifySignupEmailOtp: (email: string, otp: string) => Promise<string>;
  verifySignupOtp: (data: SignupData & { otp: string }) => Promise<void>;
  completeVerifiedSignup: (data: SignupData & { verificationToken: string }) => Promise<void>;
  signupAdmin: (data: AdminSignupData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface AdminSignupData extends SignupData {
  paymentAmount: number;
  paymentReference: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "developer";
  createdAt?: string;
}

const splitName = (name: string) => {
  const parts = (name || "").trim().split(/\s+/);
  const firstName = parts[0] || "User";
  const lastName = parts.slice(1).join(" ") || "";
  return { firstName, lastName };
};

const mapApiUser = (user: ApiUser): User => {
  const { firstName, lastName } = splitName(user.name);
  return {
    id: user.id,
    email: user.email,
    firstName,
    lastName,
    role: user.role,
    createdAt: user.createdAt || new Date().toISOString(),
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const token = getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiRequest<{ user: ApiUser }>("/auth/profile");
        setUser(mapApiUser(response.user));
      } catch {
        clearToken();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiRequest<{ token: string; user: ApiUser }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
        auth: false,
      }
    );
    setToken(response.token);
    setUser(mapApiUser(response.user));
  };

  const authenticateWithGoogle = async (credential: string) => {
    const response = await apiRequest<{ token: string; user: ApiUser }>(
      "/auth/google",
      {
        method: "POST",
        body: JSON.stringify({ credential }),
        auth: false,
      }
    );
    setToken(response.token);
    setUser(mapApiUser(response.user));
  };

  const signup = async (data: SignupData) => {
    const response = await apiRequest<{ token: string; user: ApiUser }>(
      "/auth/signup",
      {
        method: "POST",
        body: JSON.stringify({
          name: `${data.firstName} ${data.lastName}`.trim(),
          email: data.email,
          password: data.password,
          role: "developer",
        }),
        auth: false,
      }
    );
    setToken(response.token);
    setUser(mapApiUser(response.user));
  };

  const requestSignupOtp = async (email: string) => {
    await apiRequest<{ message: string }>("/auth/signup/send-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
      auth: false,
    });
  };

  const verifySignupEmailOtp = async (email: string, otp: string) => {
    const response = await apiRequest<{ message: string; verificationToken: string }>(
      "/auth/signup/verify-email-otp",
      {
        method: "POST",
        body: JSON.stringify({ email, otp }),
        auth: false,
      }
    );

    return response.verificationToken;
  };

  const verifySignupOtp = async (data: SignupData & { otp: string }) => {
    const response = await apiRequest<{ token: string; user: ApiUser }>(
      "/auth/signup/verify-otp",
      {
        method: "POST",
        body: JSON.stringify({
          name: `${data.firstName} ${data.lastName}`.trim(),
          email: data.email,
          password: data.password,
          otp: data.otp,
        }),
        auth: false,
      }
    );
    setToken(response.token);
    setUser(mapApiUser(response.user));
  };

  const completeVerifiedSignup = async (data: SignupData & { verificationToken: string }) => {
    const response = await apiRequest<{ token: string; user: ApiUser }>(
      "/auth/signup/complete-verified",
      {
        method: "POST",
        body: JSON.stringify({
          name: `${data.firstName} ${data.lastName}`.trim(),
          email: data.email,
          password: data.password,
          verificationToken: data.verificationToken,
        }),
        auth: false,
      }
    );
    setToken(response.token);
    setUser(mapApiUser(response.user));
  };

  const signupAdmin = async (data: AdminSignupData) => {
    const response = await apiRequest<{ token: string; user: ApiUser }>(
      "/auth/signup/admin",
      {
        method: "POST",
        body: JSON.stringify({
          name: `${data.firstName} ${data.lastName}`.trim(),
          email: data.email,
          password: data.password,
          paymentAmount: data.paymentAmount,
          paymentReference: data.paymentReference,
          paymentStatus: "paid",
        }),
        auth: false,
      }
    );
    setToken(response.token);
    setUser(mapApiUser(response.user));
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  const updateProfile = async (data: Partial<User>) => {
    if (user) {
      const name = `${data.firstName || user.firstName} ${data.lastName || user.lastName}`.trim();
      const response = await apiRequest<{ user: ApiUser }>("/auth/profile", {
        method: "PUT",
        body: JSON.stringify({
          name,
          email: data.email || user.email,
        }),
      });
      setUser(mapApiUser(response.user));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        authenticateWithGoogle,
        signup,
        requestSignupOtp,
        verifySignupEmailOtp,
        verifySignupOtp,
        completeVerifiedSignup,
        signupAdmin,
        logout,
        updateProfile,
      }}
    >
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
