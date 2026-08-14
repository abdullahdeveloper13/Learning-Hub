import React from "react";
import { Link, useLocation } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = React.useState("");
  const [done, setDone] = React.useState(false);
  const { toast } = useToast();
  const token = new URLSearchParams(window.location.search).get("token") || "";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      toast({ title: payload.error || "Reset failed", variant: "destructive" });
      return;
    }
    setDone(true);
    setTimeout(() => setLocation("/login"), 1200);
  }

  return (
    <PublicLayout>
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
        <form onSubmit={submit} className="w-full rounded-xl border bg-card p-8 shadow-sm space-y-5">
          <div>
            <h1 className="text-2xl font-bold font-serif">Choose a new password</h1>
            <p className="text-sm text-muted-foreground mt-2">Use at least 8 characters.</p>
          </div>
          {!token ? (
            <div className="rounded-lg border bg-destructive/10 p-4 text-sm text-destructive">This reset link is missing a token.</div>
          ) : done ? (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm">Password updated. Redirecting to login.</div>
          ) : (
            <>
              <Input type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />
              <Button type="submit" className="w-full">Update password</Button>
            </>
          )}
          <Link href="/login" className="block text-sm text-primary hover:underline">Back to login</Link>
        </form>
      </div>
    </PublicLayout>
  );
}
