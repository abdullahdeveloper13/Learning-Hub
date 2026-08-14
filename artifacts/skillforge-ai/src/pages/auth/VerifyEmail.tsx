import React from "react";
import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export default function VerifyEmail() {
  const [state, setState] = React.useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = React.useState("Verifying your email...");

  React.useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") || "";
    if (!token) {
      setState("error");
      setMessage("This verification link is missing a token.");
      return;
    }
    fetch(`${API_BASE}/api/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).then(async (response) => {
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Verification failed");
      setState("success");
      setMessage("Your email has been verified.");
    }).catch((error) => {
      setState("error");
      setMessage(error.message || "Verification failed.");
    });
  }, []);

  return (
    <PublicLayout>
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
        <div className="w-full rounded-xl border bg-card p-8 text-center shadow-sm space-y-5">
          <h1 className="text-2xl font-bold font-serif">{state === "success" ? "Email verified" : state === "error" ? "Verification failed" : "Verifying"}</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
          <Button asChild><Link href="/login">Go to login</Link></Button>
        </div>
      </div>
    </PublicLayout>
  );
}
