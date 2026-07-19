import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetUsers, useUpdateUserRole, useDeleteUser } from "@workspace/api-client-react/api";
import { UserRole } from "@workspace/api-client-react/api.schemas";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LoadingState } from "@/components/shared/LoadingState";
import { Search, ShieldAlert, Trash2, Shield, GraduationCap, BookOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminUsers() {
  const [search, setSearch] = React.useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useGetUsers({ search: search || undefined });
  
  const roleMutation = useUpdateUserRole({
    mutation: {
      onSuccess: () => {
        toast({ title: "User role updated" });
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      }
    }
  });

  const deleteMutation = useDeleteUser({
    mutation: {
      onSuccess: () => {
        toast({ title: "User deleted" });
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      }
    }
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <ShieldAlert className="w-4 h-4 text-destructive" />;
      case 'instructor': return <BookOpen className="w-4 h-4 text-blue-500" />;
      default: return <GraduationCap className="w-4 h-4 text-primary" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return "bg-destructive/10 text-destructive border-destructive/20";
      case 'instructor': return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default: return "bg-primary/10 text-primary border-primary/20";
    }
  };

  return (
    <AppLayout requiredRole="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-serif mb-2">Manage Users</h1>
          <p className="text-muted-foreground">View and manage all user accounts across the platform.</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search users by name or email..." 
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}
              </div>
            ) : data?.users && data.users.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground bg-muted/50 uppercase">
                      <tr>
                        <th className="px-6 py-3 font-medium">User</th>
                        <th className="px-6 py-3 font-medium">Role</th>
                        <th className="px-6 py-3 font-medium">Joined</th>
                        <th className="px-6 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.users.map((user) => (
                        <tr key={user.id} className="bg-card hover:bg-muted/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border">
                                <AvatarImage src={user.avatarUrl || undefined} />
                                <AvatarFallback>{user.name.substring(0,2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold text-foreground">{user.name}</div>
                                <div className="text-muted-foreground">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className={`capitalize ${getRoleBadgeColor(user.role)}`}>
                              <span className="flex items-center gap-1.5">
                                {getRoleIcon(user.role)} {user.role}
                              </span>
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">Manage</Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => roleMutation.mutate({ userId: user.id, data: { role: 'student' as any } })}
                                  disabled={user.role === 'student'}
                                >
                                  Make Student
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => roleMutation.mutate({ userId: user.id, data: { role: 'instructor' as any } })}
                                  disabled={user.role === 'instructor'}
                                >
                                  Make Instructor
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => roleMutation.mutate({ userId: user.id, data: { role: 'admin' as any } })}
                                  disabled={user.role === 'admin'}
                                >
                                  Make Admin
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                                  onClick={() => {
                                    if(confirm("Delete this user permanently?")) {
                                      deleteMutation.mutate({ userId: user.id });
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete Account
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">No users found.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
