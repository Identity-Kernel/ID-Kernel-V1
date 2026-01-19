// Identity Kernel - Social Module
// Pure JS, Browser-first

import { kernel } from './kernel.js';
import { storage } from './storage.js';

class SocialModule {
  // Create channel
  async createChannel(name, description = '', isPrivate = false) {
    const did = kernel.currentDID;
    if (!did) throw new Error('No active identity');
    
    const channel = {
      id: crypto.randomUUID(),
      name,
      description,
      isPrivate,
      createdBy: did,
      createdAt: new Date().toISOString(),
      members: [did]
    };
    
    await storage.saveChannel(channel);
    await kernel.emitPulse('channel_created', 2, { channelId: channel.id, name });
    
    kernel.emit('channel:created', channel);
    return channel;
  }

  // Get channels
  async getChannels() {
    const channels = await storage.getChannels();
    const did = kernel.currentDID;
    
    // Filter: public channels or channels where user is member
    return channels.filter(c => !c.isPrivate || c.members?.includes(did));
  }

  // Join channel
  async joinChannel(channelId) {
    const did = kernel.currentDID;
    if (!did) throw new Error('No active identity');
    
    const channels = await storage.getChannels();
    const channel = channels.find(c => c.id === channelId);
    
    if (!channel) throw new Error('Channel not found');
    if (channel.isPrivate) throw new Error('Cannot join private channel');
    
    if (!channel.members.includes(did)) {
      channel.members.push(did);
      await storage.saveChannel(channel);
    }
    
    return channel;
  }

  // Send message
  async sendMessage(channelId, content) {
    const did = kernel.currentDID;
    if (!did) throw new Error('No active identity');
    
    const message = {
      id: crypto.randomUUID(),
      channelId,
      did,
      content,
      timestamp: new Date().toISOString()
    };
    
    await storage.saveMessage(message);
    await kernel.emitPulse('message_sent', 0.5, { channelId });
    
    kernel.emit('message:sent', message);
    return message;
  }

  // Get messages
  async getMessages(channelId, limit = 50) {
    return storage.getMessages(channelId, limit);
  }

  // Create feed post
  async createFeedPost(content, tags = []) {
    const did = kernel.currentDID;
    if (!did) throw new Error('No active identity');
    
    const post = {
      id: crypto.randomUUID(),
      did,
      content,
      tags,
      timestamp: new Date().toISOString(),
      reactions: {}
    };
    
    await storage.saveFeedPost(post);
    await kernel.emitPulse('feed_post_created', 1, { postId: post.id });
    
    kernel.emit('feed:posted', post);
    return post;
  }

  // Get feed posts
  async getFeedPosts(limit = 50) {
    return storage.getFeedPosts(limit);
  }

  // React to post
  async reactToPost(postId, reaction) {
    const did = kernel.currentDID;
    if (!did) throw new Error('No active identity');
    
    const posts = await storage.getFeedPosts(1000);
    const post = posts.find(p => p.id === postId);
    
    if (!post) throw new Error('Post not found');
    
    if (!post.reactions[reaction]) {
      post.reactions[reaction] = [];
    }
    
    if (!post.reactions[reaction].includes(did)) {
      post.reactions[reaction].push(did);
      await storage.saveFeedPost(post);
      await kernel.emitPulse('reaction_added', 0.1, { postId, reaction });
    }
    
    return post;
  }
}

export const social = new SocialModule();
export default social;
