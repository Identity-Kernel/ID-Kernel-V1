import React, { useState, useEffect, useRef } from 'react';
import { useKernel } from '../context/KernelContext';
import { formatDID, formatRelativeTime } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { 
  Users, MessageSquare, Hash, Plus, Send, RefreshCw,
  Heart, Rss, Lock, Globe
} from 'lucide-react';
import { toast } from 'sonner';
import { social } from '../kernel';

export default function Social() {
  const { identity, refreshIdentity } = useKernel();
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [feedPosts, setFeedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messageInput, setMessageInput] = useState('');
  const [postInput, setPostInput] = useState('');
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', description: '', isPrivate: false });
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchSocialData();
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      fetchMessages(selectedChannel.id);
    }
  }, [selectedChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchSocialData = async () => {
    setLoading(true);
    try {
      const [channelsData, feedData] = await Promise.all([
        social.getChannels(),
        social.getFeedPosts(50),
      ]);
      setChannels(channelsData);
      setFeedPosts(feedData);
      if (channelsData.length > 0 && !selectedChannel) {
        setSelectedChannel(channelsData[0]);
      }
    } catch (err) {
      console.error('Failed to fetch social data:', err);
      toast.error('Failed to load social data');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (channelId) => {
    try {
      const data = await social.getMessages(channelId, 100);
      setMessages(data);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const handleCreateChannel = async () => {
    try {
      const channel = await social.createChannel(newChannel.name, newChannel.description, newChannel.isPrivate);
      toast.success('Channel created');
      setCreateChannelOpen(false);
      setNewChannel({ name: '', description: '', isPrivate: false });
      fetchSocialData();
      setSelectedChannel(channel);
      refreshIdentity();
    } catch (err) {
      toast.error(err.message || 'Failed to create channel');
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChannel) return;
    try {
      await social.sendMessage(selectedChannel.id, messageInput.trim());
      setMessageInput('');
      fetchMessages(selectedChannel.id);
      refreshIdentity();
    } catch (err) {
      toast.error(err.message || 'Failed to send message');
    }
  };

  const handleCreatePost = async () => {
    if (!postInput.trim()) return;
    try {
      await social.createFeedPost(postInput.trim());
      setPostInput('');
      fetchSocialData();
      refreshIdentity();
      toast.success('Post created');
    } catch (err) {
      toast.error(err.message || 'Failed to create post');
    }
  };

  const handleReaction = async (postId, reaction) => {
    try {
      await social.reactToPost(postId, reaction);
      fetchSocialData();
      refreshIdentity();
    } catch (err) {
      console.error('Failed to react:', err);
    }
  };

  return (
    <div className="space-y-6" data-testid="social-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-mono font-bold">Social</h1>
          <p className="text-sm text-muted-foreground mt-1">Feeds, channels, and messaging</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchSocialData}
          disabled={loading}
          data-testid="refresh-social-btn"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="chat" data-testid="tab-chat">
            <MessageSquare className="w-4 h-4 mr-2" />
            Channels
          </TabsTrigger>
          <TabsTrigger value="feed" data-testid="tab-feed">
            <Rss className="w-4 h-4 mr-2" />
            Feed
          </TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat">
          <div className="grid lg:grid-cols-4 gap-4">
            {/* Channel List */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-mono text-sm">Channels</CardTitle>
                  <Dialog open={createChannelOpen} onOpenChange={setCreateChannelOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="ghost" data-testid="create-channel-btn">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader>
                        <DialogTitle className="font-mono">Create Channel</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input
                            placeholder="general"
                            value={newChannel.name}
                            onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                            className="terminal-input"
                            data-testid="channel-name-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Input
                            placeholder="Channel description"
                            value={newChannel.description}
                            onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })}
                            className="terminal-input"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleCreateChannel} disabled={!newChannel.name} data-testid="confirm-create-channel-btn">
                          Create
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="p-2">
                <ScrollArea className="h-[500px]">
                  {channels.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No channels</p>
                  ) : (
                    <div className="space-y-1">
                      {channels.map((channel) => (
                        <div
                          key={channel.id}
                          onClick={() => setSelectedChannel(channel)}
                          className={`flex items-center gap-2 p-2 cursor-pointer transition-colors ${selectedChannel?.id === channel.id ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-muted'}`}
                          data-testid={`channel-${channel.id}`}
                        >
                          {channel.isPrivate ? (
                            <Lock className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Hash className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="font-mono text-sm truncate">{channel.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Messages */}
            <Card className="lg:col-span-3 bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="font-mono text-lg flex items-center gap-2">
                  {selectedChannel ? (
                    <>
                      <Hash className="w-4 h-4" />
                      {selectedChannel.name}
                    </>
                  ) : (
                    'Select a channel'
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px] p-4">
                  {messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No messages yet</p>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg) => (
                        <div 
                          key={msg.id} 
                          className={`chat-message ${msg.did === identity?.did ? 'chat-message-own' : 'chat-message-other'}`}
                          data-testid={`message-${msg.id}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-accent">
                              {formatDID(msg.did, 12)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(msg.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
                
                {selectedChannel && (
                  <div className="ai-terminal-prompt">
                    <Input
                      placeholder="Type a message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1 terminal-input border-0"
                      data-testid="message-input"
                    />
                    <Button size="sm" onClick={handleSendMessage} data-testid="send-message-btn">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Feed Tab */}
        <TabsContent value="feed">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Create Post */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-mono text-lg">Create Post</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="What's on your mind?"
                  value={postInput}
                  onChange={(e) => setPostInput(e.target.value)}
                  className="terminal-input min-h-[100px] mb-4"
                  data-testid="post-input"
                />
                <Button onClick={handleCreatePost} disabled={!postInput.trim()} className="w-full" data-testid="create-post-btn">
                  <Send className="w-4 h-4 mr-2" />
                  Post
                </Button>
              </CardContent>
            </Card>

            {/* Feed */}
            <Card className="lg:col-span-2 bg-card border-border">
              <CardHeader>
                <CardTitle className="font-mono text-lg flex items-center gap-2">
                  <Rss className="w-4 h-4 text-primary" />
                  Feed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {feedPosts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No posts yet</p>
                  ) : (
                    <div className="space-y-4">
                      {feedPosts.map((post) => (
                        <div key={post.id} className="feed-post" data-testid={`feed-post-${post.id}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-mono text-sm text-accent">
                              {formatDID(post.did, 12)}
                            </span>
                            {post.did === identity?.did && (
                              <Badge variant="secondary" className="text-xs">You</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(post.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm mb-3">{post.content}</p>
                          {post.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {post.tags.map((tag, i) => (
                                <Badge key={i} variant="outline" className="text-xs">#{tag}</Badge>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleReaction(post.id, 'like')}
                              className={post.reactions?.like?.includes(identity?.did) ? 'text-primary' : ''}
                            >
                              <Heart className={`w-4 h-4 mr-1 ${post.reactions?.like?.includes(identity?.did) ? 'fill-current' : ''}`} />
                              {post.reactions?.like?.length || 0}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
