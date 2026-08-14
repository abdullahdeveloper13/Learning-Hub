import React from "react";
import { useLocation } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { completeSupabaseOAuth } from "@/lib/supabase-auth";

export default function OAuthCallback() {
  const [, setLocation] = useLocation();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    completeSupabaseOAuth()
      .then(({ user }) => {
        if (!mounted) return;
        if (user.role === "admin") setLocation("/admin/dashboard");
        else if (user.role === "instructor") setLocation("/instructor/dashboard");
        else setLocation("/dashboard");
        window.location.reload();
      })
      .catch((authError) => {
        if (!mounted) return;
        setError(authError instanceof Error ? authError.message : "OAuth sign-in failed.");
      });

    return () => {
      mounted = false;
    };
  }, [setLocation]);

  return (
    <PublicLayout>
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-xl">
          {error ? (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold font-serif">Sign-in could not be completed</h1>
                <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              </div>
              <Button onClick={() => setLocation("/login")} className="w-full">
                Back to sign in
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <LoadingState count={1} />
              <div>
                <h1 className="text-2xl font-bold font-serif">Completing sign-in</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Securing your SkillForge AI session.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
