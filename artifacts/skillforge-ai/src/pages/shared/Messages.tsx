import React, { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/use-auth";
import { 
  useGetConversations,
  useGetMessages,
  useSendMessage,
  getGetConversationsQueryKey,
  getGetMessagesQueryKey
} from "@workspace/api-client-react/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send, Search, User as UserIcon } from "lucide-react";

export default function Messages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [content, setContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: convsLoading } = useGetConversations();

  const { data: messages, isLoading: msgsLoading } = useGetMessages(activeId!, {
    query: {
      enabled: !!activeId,
      queryKey: getGetMessagesQueryKey(activeId!)
    }
  });

  const sendMutation = useSendMessage({
    mutation: {
      onSuccess: () => {
        setContent("");
        queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey(activeId!) });
        queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
      }
    }
  });

  useEffect(() => {
    if (conversations && conversations.length > 0 && !activeId) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !activeId) return;
    sendMutation.mutate({ conversationId: activeId, data: { content } });
  };

  const getOtherParticipant = (conv: any) => {
    return conv.participants?.find((p: any) => p.id !== user?.id) || conv.participants?.[0];
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6">
        {/* Conversations List */}
        <Card className="w-full md:w-80 flex flex-col shrink-0 overflow-hidden h-[40vh] md:h-full">
          <div className="p-4 border-b bg-muted/30">
            <h2 className="font-bold font-serif text-lg mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" /> Messages
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search messages..." className="pl-9 bg-background" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {convsLoading ? (
              <div className="p-4 space-y-4">
                {[1,2,3].map(i => <div key={i} className="flex gap-3"><div className="w-10 h-10 rounded-full bg-muted animate-pulse" /><div className="flex-1 h-10 bg-muted animate-pulse rounded" /></div>)}
              </div>
            ) : conversations && conversations.length > 0 ? (
              <div className="divide-y">
                {conversations.map((conv) => {
                  const other = getOtherParticipant(conv);
                  const isActive = activeId === conv.id;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setActiveId(conv.id)}
                      className={`w-full text-left p-4 flex items-center gap-3 transition-colors hover:bg-muted/50 ${isActive ? 'bg-primary/5 border-l-4 border-primary' : 'border-l-4 border-transparent'}`}
                    >
                      <Avatar>
                        <AvatarImage src={other?.avatarUrl} />
                        <AvatarFallback>{other?.name?.substring(0,2).toUpperCase() || <UserIcon className="w-4 h-4" />}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <h4 className="font-semibold text-sm truncate">{other?.name || "Unknown"}</h4>
                          {conv.unreadCount ? (
                            <span className="w-5 h-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center shrink-0">
                              {conv.unreadCount}
                            </span>
                          ) : null}
                        </div>
                        <p className={`text-xs truncate ${conv.unreadCount ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                          {conv.lastMessage || "No messages yet"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No conversations yet.
              </div>
            )}
          </div>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden h-[55vh] md:h-full">
          {activeId ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b bg-card flex items-center gap-3 shadow-sm z-10">
                {conversations && (() => {
                  const conv = conversations.find(c => c.id === activeId);
                  const other = getOtherParticipant(conv);
                  return (
                    <>
                      <Avatar>
                        <AvatarImage src={other?.avatarUrl} />
                        <AvatarFallback>{other?.name?.substring(0,2).toUpperCase() || "U"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold text-sm">{other?.name}</h3>
                        <p className="text-xs text-muted-foreground capitalize">{other?.role}</p>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 bg-muted/10 space-y-6">
                {msgsLoading ? (
                  <div className="flex justify-center p-4"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" /></div>
                ) : messages && messages.length > 0 ? (
                  messages.map((msg, idx) => {
                    const isMe = msg.senderId === user?.id;
                    const showAvatar = !isMe && (idx === messages.length - 1 || messages[idx + 1].senderId !== msg.senderId);
                    
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2 max-w-full`}>
                        {!isMe && (
                          <div className="w-8 shrink-0 flex items-end">
                            {showAvatar && (
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={msg.senderAvatar || undefined} />
                                <AvatarFallback className="text-[10px]">{msg.senderName?.substring(0,2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        )}
                        
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                          isMe 
                            ? 'bg-primary text-primary-foreground rounded-br-sm' 
                            : 'bg-card border shadow-sm rounded-bl-sm text-foreground'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          <span className={`text-[10px] block mt-1 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                    <p>Send a message to start the conversation.</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-card border-t shrink-0">
                <form onSubmit={handleSend} className="flex items-end gap-2 relative">
                  <Input 
                    placeholder="Type your message..." 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="flex-1 pr-12 rounded-full bg-muted/50 border-transparent focus-visible:bg-background"
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    disabled={!content.trim() || sendMutation.isPending}
                    className="absolute right-1 top-1 h-8 w-8 rounded-full"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
              <p>Select a conversation to start messaging</p>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
