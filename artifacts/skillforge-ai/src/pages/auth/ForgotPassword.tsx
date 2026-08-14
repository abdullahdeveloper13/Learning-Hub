import React from "react";
import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export default function ForgotPassword() {
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const { toast } = useToast();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      toast({ title: "Reset request failed", variant: "destructive" });
      return;
    }
    setSent(true);
  }

  return (
    <PublicLayout>
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
        <form onSubmit={submit} className="w-full rounded-xl border bg-card p-8 shadow-sm space-y-5">
          <div>
            <h1 className="text-2xl font-bold font-serif">Reset password</h1>
            <p className="text-sm text-muted-foreground mt-2">Enter your account email and SkillForge AI will send reset instructions if the account exists.</p>
          </div>
          {sent ? (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm">Check your email for a reset link.</div>
          ) : (
            <>
              <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
              <Button type="submit" className="w-full">Send reset link</Button>
            </>
          )}
          <Link href="/login" className="block text-sm text-primary hover:underline">Back to login</Link>
        </form>
      </div>
    </PublicLayout>
  );
}
