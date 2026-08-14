import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export default function AdminPayments() {
  const [orders, setOrders] = React.useState<any[]>([]);
  React.useEffect(() => {
    fetch(`${API_BASE}/api/admin/payments/orders`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("sf_token") || ""}` },
    }).then(r => r.ok ? r.json() : []).then(setOrders).catch(() => setOrders([]));
  }, []);

  return (
    <AppLayout requiredRole="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-serif">Payments</h1>
          <p className="text-muted-foreground">Orders, statuses, and revenue from server-confirmed payments.</p>
        </div>
        <Card>
          <CardHeader><CardTitle>Orders</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {orders.length ? orders.map(order => (
              <div key={order.id} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <div className="font-medium">Order #{order.id}</div>
                  <div className="text-sm text-muted-foreground">User #{order.userId} • ${order.total?.toFixed?.(2) ?? order.total} {order.currency}</div>
                </div>
                <Badge variant={order.status === "paid" ? "default" : "secondary"}>{order.status}</Badge>
              </div>
            )) : <div className="py-10 text-center text-muted-foreground">No orders yet.</div>}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
