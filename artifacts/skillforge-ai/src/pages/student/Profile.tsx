import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateUser } from "@workspace/api-client-react/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema } from "@/lib/schemas";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera } from "lucide-react";

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      bio: user?.bio || "",
      avatarUrl: user?.avatarUrl || "",
      password: "",
    },
  });

  const updateMutation = useUpdateUser({
    mutation: {
      onSuccess: (updatedUser) => {
        updateUser(updatedUser);
        toast({
          title: "Profile updated",
          description: "Your profile has been saved successfully.",
        });
        // Clear password field after save
        form.setValue("password", "");
      },
      onError: (err: any) => {
        toast({
          variant: "destructive",
          title: "Update failed",
          description: err.message || "Failed to update profile.",
        });
      }
    }
  });

  const onSubmit = (values: z.infer<typeof profileSchema>) => {
    if (!user) return;
    
    // Only send fields that have changed or are needed
    const payload: any = {};
    if (values.name !== user.name) payload.name = values.name;
    if (values.bio !== user.bio) payload.bio = values.bio;
    if (values.avatarUrl !== user.avatarUrl) payload.avatarUrl = values.avatarUrl;
    if (values.password && values.password.length > 0) payload.password = values.password;
    
    if (Object.keys(payload).length > 0) {
      updateMutation.mutate({ userId: user.id, data: payload });
    } else {
      toast({ title: "No changes", description: "You didn't make any changes." });
    }
  };

  if (!user) return null;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-serif mb-2">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account details and preferences.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your photo and personal details here.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                {/* Avatar Section */}
                <div className="flex items-center gap-6 pb-6 border-b">
                  <div className="relative group">
                    <Avatar className="h-24 w-24 border-2 border-border">
                      <AvatarImage src={form.watch("avatarUrl") || undefined} />
                      <AvatarFallback className="text-2xl">{user.name.substring(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 space-y-2">
                    <FormField
                      control={form.control}
                      name="avatarUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profile Picture URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com/avatar.jpg" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input value={user.email} disabled className="bg-muted" />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
                  </FormItem>
                </div>

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell us a little about yourself..." 
                          className="resize-none min-h-[120px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-6 border-t">
                  <h3 className="text-lg font-medium mb-4">Change Password</h3>
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem className="max-w-md">
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Leave blank to keep current" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={updateMutation.isPending} className="px-8">
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
