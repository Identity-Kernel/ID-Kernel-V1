// Identity Kernel - IndexedDB Storage Layer
// Pure JS, Browser-first, Persistent

const DB_NAME = 'IdentityKernelDB';
const DB_VERSION = 1;

class KernelStorage {
  constructor() {
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Identities store
        if (!db.objectStoreNames.contains('identities')) {
          const identities = db.createObjectStore('identities', { keyPath: 'did' });
          identities.createIndex('karma', 'karma', { unique: false });
          identities.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Pulses store
        if (!db.objectStoreNames.contains('pulses')) {
          const pulses = db.createObjectStore('pulses', { keyPath: 'id' });
          pulses.createIndex('originDID', 'originDID', { unique: false });
          pulses.createIndex('timestamp', 'timestamp', { unique: false });
          pulses.createIndex('actionType', 'actionType', { unique: false });
          pulses.createIndex('did_timestamp', ['originDID', 'timestamp'], { unique: false });
        }

        // Policy Keys store
        if (!db.objectStoreNames.contains('policyKeys')) {
          const keys = db.createObjectStore('policyKeys', { keyPath: 'id' });
          keys.createIndex('did', 'did', { unique: false });
          keys.createIndex('revoked', 'revoked', { unique: false });
        }

        // Agents store
        if (!db.objectStoreNames.contains('agents')) {
          const agents = db.createObjectStore('agents', { keyPath: 'id' });
          agents.createIndex('did', 'did', { unique: false });
          agents.createIndex('status', 'status', { unique: false });
        }

        // Proposals store (Governance)
        if (!db.objectStoreNames.contains('proposals')) {
          const proposals = db.createObjectStore('proposals', { keyPath: 'id' });
          proposals.createIndex('did', 'did', { unique: false });
          proposals.createIndex('status', 'status', { unique: false });
          proposals.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Stakes store (Economy)
        if (!db.objectStoreNames.contains('stakes')) {
          const stakes = db.createObjectStore('stakes', { keyPath: 'id' });
          stakes.createIndex('did', 'did', { unique: false });
          stakes.createIndex('status', 'status', { unique: false });
        }

        // Channels store (Social)
        if (!db.objectStoreNames.contains('channels')) {
          const channels = db.createObjectStore('channels', { keyPath: 'id' });
          channels.createIndex('createdBy', 'createdBy', { unique: false });
        }

        // Messages store (Social)
        if (!db.objectStoreNames.contains('messages')) {
          const messages = db.createObjectStore('messages', { keyPath: 'id' });
          messages.createIndex('channelId', 'channelId', { unique: false });
          messages.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Feed Posts store (Social)
        if (!db.objectStoreNames.contains('feedPosts')) {
          const posts = db.createObjectStore('feedPosts', { keyPath: 'id' });
          posts.createIndex('did', 'did', { unique: false });
          posts.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // Generic transaction helper
  async transaction(storeName, mode, callback) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      
      try {
        const result = callback(store);
        if (result instanceof IDBRequest) {
          result.onsuccess = () => resolve(result.result);
          result.onerror = () => reject(result.error);
        } else {
          tx.oncomplete = () => resolve(result);
        }
      } catch (err) {
        reject(err);
      }
      
      tx.onerror = () => reject(tx.error);
    });
  }

  // Identity operations
  async saveIdentity(identity) {
    return this.transaction('identities', 'readwrite', store => store.put(identity));
  }

  async getIdentity(did) {
    return this.transaction('identities', 'readonly', store => store.get(did));
  }

  async updateKarma(did, delta) {
    const identity = await this.getIdentity(did);
    if (identity) {
      identity.karma = (identity.karma || 0) + delta;
      await this.saveIdentity(identity);
    }
    return identity;
  }

  async getLeaderboard(limit = 10) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('identities', 'readonly');
      const store = tx.objectStore('identities');
      const index = store.index('karma');
      const results = [];
      
      const request = index.openCursor(null, 'prev');
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && results.length < limit) {
          results.push({
            did: cursor.value.did,
            karma: cursor.value.karma,
            createdAt: cursor.value.createdAt
          });
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Pulse operations
  async savePulse(pulse) {
    return this.transaction('pulses', 'readwrite', store => store.put(pulse));
  }

  async getPulses(did, limit = 50, actionType = null) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('pulses', 'readonly');
      const store = tx.objectStore('pulses');
      const index = store.index('did_timestamp');
      const results = [];
      
      const range = IDBKeyRange.bound([did, ''], [did, '\uffff']);
      const request = index.openCursor(range, 'prev');
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && results.length < limit) {
          if (!actionType || cursor.value.actionType === actionType) {
            results.push(cursor.value);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllPulses(limit = 50) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('pulses', 'readonly');
      const store = tx.objectStore('pulses');
      const index = store.index('timestamp');
      const results = [];
      
      const request = index.openCursor(null, 'prev');
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getLastPulse(did) {
    const pulses = await this.getPulses(did, 1);
    return pulses[0] || null;
  }

  // Policy Key operations
  async savePolicyKey(key) {
    return this.transaction('policyKeys', 'readwrite', store => store.put(key));
  }

  async getPolicyKeys(did) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('policyKeys', 'readonly');
      const store = tx.objectStore('policyKeys');
      const index = store.index('did');
      const request = index.getAll(did);
      
      request.onsuccess = () => {
        resolve(request.result.filter(k => !k.revoked));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async revokePolicyKey(keyId, did) {
    const key = await this.transaction('policyKeys', 'readonly', store => store.get(keyId));
    if (key && key.did === did) {
      key.revoked = true;
      await this.savePolicyKey(key);
    }
  }

  // Agent operations
  async saveAgent(agent) {
    return this.transaction('agents', 'readwrite', store => store.put(agent));
  }

  async getAgents(did) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('agents', 'readonly');
      const store = tx.objectStore('agents');
      const index = store.index('did');
      const request = index.getAll(did);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAgent(agentId, did) {
    const agent = await this.transaction('agents', 'readonly', store => store.get(agentId));
    return agent?.did === did ? agent : null;
  }

  async updateAgentStatus(agentId, did, status) {
    const agent = await this.getAgent(agentId, did);
    if (agent) {
      agent.status = status;
      await this.saveAgent(agent);
    }
  }

  async addAgentCheckpoint(agentId, checkpoint) {
    const agent = await this.transaction('agents', 'readonly', store => store.get(agentId));
    if (agent) {
      agent.checkpoints = agent.checkpoints || [];
      agent.checkpoints.push(checkpoint);
      await this.saveAgent(agent);
    }
  }

  // Proposal operations (Governance)
  async saveProposal(proposal) {
    return this.transaction('proposals', 'readwrite', store => store.put(proposal));
  }

  async getProposals(status = null) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('proposals', 'readonly');
      const store = tx.objectStore('proposals');
      const request = store.getAll();
      
      request.onsuccess = () => {
        let results = request.result;
        if (status) {
          results = results.filter(p => p.status === status);
        }
        results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getProposal(id) {
    return this.transaction('proposals', 'readonly', store => store.get(id));
  }

  // Stake operations (Economy)
  async saveStake(stake) {
    return this.transaction('stakes', 'readwrite', store => store.put(stake));
  }

  async getStakes(did) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('stakes', 'readonly');
      const store = tx.objectStore('stakes');
      const index = store.index('did');
      const request = index.getAll(did);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Channel operations (Social)
  async saveChannel(channel) {
    return this.transaction('channels', 'readwrite', store => store.put(channel));
  }

  async getChannels() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('channels', 'readonly');
      const store = tx.objectStore('channels');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Message operations (Social)
  async saveMessage(message) {
    return this.transaction('messages', 'readwrite', store => store.put(message));
  }

  async getMessages(channelId, limit = 50) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('messages', 'readonly');
      const store = tx.objectStore('messages');
      const index = store.index('channelId');
      const request = index.getAll(channelId);
      
      request.onsuccess = () => {
        const results = request.result
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
          .slice(-limit);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Feed Post operations (Social)
  async saveFeedPost(post) {
    return this.transaction('feedPosts', 'readwrite', store => store.put(post));
  }

  async getFeedPosts(limit = 50) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('feedPosts', 'readonly');
      const store = tx.objectStore('feedPosts');
      const index = store.index('timestamp');
      const results = [];
      
      const request = index.openCursor(null, 'prev');
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Economy stats
  async getEconomyStats() {
    await this.init();
    
    const identities = await new Promise((resolve, reject) => {
      const tx = this.db.transaction('identities', 'readonly');
      const request = tx.objectStore('identities').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    const pulses = await new Promise((resolve, reject) => {
      const tx = this.db.transaction('pulses', 'readonly');
      const request = tx.objectStore('pulses').count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    const stakes = await new Promise((resolve, reject) => {
      const tx = this.db.transaction('stakes', 'readonly');
      const request = tx.objectStore('stakes').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    const totalKarma = identities.reduce((sum, i) => sum + (i.karma || 0), 0);
    const totalStaked = stakes.filter(s => s.status === 'active').reduce((sum, s) => sum + (s.amount || 0), 0);
    
    return {
      totalKarma,
      totalStaked,
      totalPulses: pulses,
      totalIdentities: identities.length
    };
  }

  // Clear all data (for testing/reset)
  async clearAll() {
    await this.init();
    const storeNames = [...this.db.objectStoreNames];
    
    for (const storeName of storeNames) {
      await this.transaction(storeName, 'readwrite', store => store.clear());
    }
  }
}

export const storage = new KernelStorage();
export default storage;
