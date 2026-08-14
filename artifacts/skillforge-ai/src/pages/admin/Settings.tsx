import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export default function AdminSettings() {
  const [platformName, setPlatformName] = React.useState("SkillForge AI");
  const { toast } = useToast();
  const token = localStorage.getItem("sf_token") || "";

  React.useEffect(() => {
    fetch(`${API_BASE}/api/admin/settings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : {})
      .then((settings: Record<string, any>) => {
        if (settings["branding"]?.platformName) setPlatformName(settings["branding"].platformName);
      })
      .catch(() => {});
  }, [token]);

  async function save() {
    const response = await fetch(`${API_BASE}/api/admin/settings/branding`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ value: { platformName } }),
    });
    toast({ title: response.ok ? "Settings saved" : "Settings failed" });
  }

  return (
    <AppLayout requiredRole="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-serif">Platform Settings</h1>
          <p className="text-muted-foreground">Branding and feature flags. Secrets stay in environment variables.</p>
        </div>
        <Card>
          <CardHeader><CardTitle>Branding</CardTitle></CardHeader>
          <CardContent className="max-w-md space-y-4">
            <Input value={platformName} onChange={(event) => setPlatformName(event.target.value)} />
            <Button onClick={save}>Save settings</Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
