import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/use-auth";
import { 
  useGetNotifications, 
  useMarkNotificationsRead,
  getGetNotificationsQueryKey
} from "@workspace/api-client-react/api";
import { Notification } from "@workspace/api-client-react/api.schemas";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Link } from "wouter";
import { 
  Bell, BookOpen, MessageSquare, Star, Trophy, AlertCircle, CheckCircle2 
} from "lucide-react";

export default function Notifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useGetNotifications();

  const markReadMutation = useMarkNotificationsRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
      }
    }
  });

  const handleMarkAllRead = () => {
    if (!notifications) return;
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length > 0) {
      markReadMutation.mutate({ data: { notificationIds: unreadIds } });
    }
  };

  const handleMarkRead = (id: number) => {
    markReadMutation.mutate({ data: { notificationIds: [id] } });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'enrollment': return <BookOpen className="w-5 h-5 text-blue-500" />;
      case 'message': return <MessageSquare className="w-5 h-5 text-primary" />;
      case 'review': return <Star className="w-5 h-5 text-amber-500 fill-amber-500" />;
      case 'completion': return <Trophy className="w-5 h-5 text-green-500" />;
      case 'announcement': return <AlertCircle className="w-5 h-5 text-purple-500" />;
      default: return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Bell className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold font-serif">Notifications</h1>
              <p className="text-muted-foreground">You have {unreadCount} unread messages.</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllRead} disabled={markReadMutation.isPending}>
              <CheckCircle2 className="w-4 h-4 mr-2" /> Mark all as read
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
          </div>
        ) : notifications && notifications.length > 0 ? (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card 
                key={notification.id} 
                className={`overflow-hidden transition-all duration-300 ${!notification.isRead ? 'border-primary/50 shadow-md bg-primary/5' : 'bg-card opacity-80'}`}
              >
                <div className="flex p-4 gap-4">
                  <div className="shrink-0 mt-1">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className={`font-semibold text-base ${!notification.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {notification.title}
                      </h4>
                      <span className="text-xs text-muted-foreground whitespace-nowrap pt-1">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {notification.body && (
                      <p className={`text-sm ${!notification.isRead ? 'text-muted-foreground' : 'text-muted-foreground/70'} line-clamp-2`}>
                        {notification.body}
                      </p>
                    )}
                    
                    <div className="pt-2 flex items-center justify-between">
                      {notification.link && (
                        <Button variant="link" className="p-0 h-auto text-primary" asChild>
                          <Link href={notification.link}>View Details</Link>
                        </Button>
                      )}
                      
                      {!notification.isRead && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-xs ml-auto"
                          onClick={() => handleMarkRead(notification.id)}
                        >
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState 
            icon={Bell}
            title="All caught up!"
            description="You don't have any notifications right now."
          />
        )}
      </div>
    </AppLayout>
  );
}
