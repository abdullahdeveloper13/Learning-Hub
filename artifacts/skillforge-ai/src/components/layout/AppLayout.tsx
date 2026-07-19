import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "./Header";
import { AppSidebar } from "./AppSidebar";
import { LoadingState } from "../shared/LoadingState";

export function AppLayout({ children, requiredRole }: { children: React.ReactNode, requiredRole?: "student" | "instructor" | "admin" }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    } else if (!isLoading && isAuthenticated && requiredRole) {
      if (requiredRole === "admin" && user?.role !== "admin") {
        setLocation("/dashboard");
      }
      if (requiredRole === "instructor" && user?.role === "student") {
        setLocation("/dashboard");
      }
    }
  }, [isLoading, isAuthenticated, requiredRole, user, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
        <p className="text-muted-foreground">Loading your workspace...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
