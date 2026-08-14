import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export default function AdminReports() {
  const [reports, setReports] = React.useState<any[]>([]);
  const token = localStorage.getItem("sf_token") || "";

  const load = React.useCallback(() => {
    fetch(`${API_BASE}/api/admin/reports`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setReports)
      .catch(() => setReports([]));
  }, [token]);

  React.useEffect(() => { load(); }, [load]);

  async function update(id: number, status: "resolved" | "dismissed") {
    await fetch(`${API_BASE}/api/admin/reports/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status, resolutionNote: status }),
    });
    load();
  }

  return (
    <AppLayout requiredRole="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-serif">Reports & Moderation</h1>
          <p className="text-muted-foreground">Review reported users, courses, reviews, and discussions.</p>
        </div>
        <Card>
          <CardHeader><CardTitle>Reports</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {reports.length ? reports.map(report => (
              <div key={report.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{report.targetType} #{report.targetId}</div>
                  <Badge>{report.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{report.reason}</p>
                {report.status === "open" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => update(report.id, "resolved")}>Resolve</Button>
                    <Button size="sm" variant="outline" onClick={() => update(report.id, "dismissed")}>Dismiss</Button>
                  </div>
                )}
              </div>
            )) : <div className="py-10 text-center text-muted-foreground">No reports.</div>}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
