import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetActivityLogs } from "@workspace/api-client-react/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/LoadingState";
import { Activity, ShieldAlert, User, BookOpen } from "lucide-react";

export default function AdminLogs() {
  // Pass pagination limits in a real app, just fetching recent ones for now
  const { data: logsData, isLoading } = useGetActivityLogs();

  const getActionColor = (action: string) => {
    if (action.includes('delete') || action.includes('remove') || action.includes('fail')) return "text-destructive bg-destructive/10";
    if (action.includes('create') || action.includes('add') || action.includes('register')) return "text-green-500 bg-green-500/10";
    if (action.includes('update') || action.includes('edit')) return "text-blue-500 bg-blue-500/10";
    return "text-muted-foreground bg-muted";
  };

  const getEntityIcon = (type: string) => {
    switch(type) {
      case 'user': return <User className="w-4 h-4" />;
      case 'course': return <BookOpen className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <AppLayout requiredRole="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-serif mb-2">Activity Logs</h1>
          <p className="text-muted-foreground">System-wide audit trail for security and monitoring.</p>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
              </div>
            ) : logsData && logsData.length > 0 ? (
              <div className="divide-y">
                {logsData.map((log) => (
                  <div key={log.id} className="p-4 flex items-start sm:items-center gap-4 hover:bg-muted/30 transition-colors">
                    <div className="hidden sm:flex w-10 h-10 rounded-full bg-muted items-center justify-center shrink-0">
                      {getEntityIcon(log.entityType || '')}
                    </div>
                    
                    <div className="flex-1 min-w-0 grid sm:grid-cols-12 gap-2 sm:gap-4 items-center">
                      <div className="sm:col-span-3">
                        <Badge variant="outline" className={`font-mono uppercase text-[10px] w-full justify-center ${getActionColor(log.action)}`}>
                          {log.action}
                        </Badge>
                      </div>
                      
                      <div className="sm:col-span-4 text-sm font-medium truncate">
                        {log.userName ? (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-muted-foreground inline" /> {log.userName}
                          </span>
                        ) : "System"}
                      </div>
                      
                      <div className="sm:col-span-3 text-xs text-muted-foreground truncate">
                        {log.entityType && log.entityId ? `${log.entityType} #${log.entityId}` : '-'}
                        {log.details ? ` • ${log.details}` : ''}
                      </div>

                      <div className="sm:col-span-2 text-right text-xs text-muted-foreground font-mono">
                        {new Date(log.createdAt).toLocaleString(undefined, { 
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-20" />
                No activity logs found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
