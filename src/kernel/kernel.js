// Identity Kernel - Core Module
// Pure JS, Browser-first, Deterministic Execution

import { storage } from './storage.js';

class IdentityKernel {
  constructor() {
    this.initialized = false;
    this.currentDID = null;
    this.eventListeners = new Map();
  }

  async init() {
    if (this.initialized) return;
    await storage.init();
    this.initialized = true;
    
    // Try to restore session
    const savedDID = localStorage.getItem('kernel_current_did');
    if (savedDID) {
      const identity = await storage.getIdentity(savedDID);
      if (identity) {
        this.currentDID = savedDID;
      }
    }
    
    return this;
  }

  // Event system
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) listeners.splice(index, 1);
    }
  }

  emit(event, data) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(cb => cb(data));
    }
  }

  // Generate 24-word mnemonic
  generateMnemonic() {
    const wordlist = [
      "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract",
      "absurd", "abuse", "access", "accident", "account", "accuse", "achieve", "acid",
      "acoustic", "acquire", "across", "act", "action", "actor", "actual", "adapt",
      "add", "addict", "address", "adjust", "admit", "adult", "advance", "advice",
      "aerobic", "affair", "afford", "afraid", "again", "age", "agent", "agree",
      "ahead", "aim", "air", "airport", "aisle", "alarm", "album", "alcohol",
      "alert", "alien", "all", "alley", "allow", "almost", "alone", "alpha",
      "already", "also", "alter", "always", "amateur", "amazing", "among", "amount",
      "amused", "analyst", "anchor", "ancient", "anger", "angle", "angry", "animal",
      "ankle", "announce", "annual", "another", "answer", "antenna", "antique", "anxiety",
      "any", "apart", "apology", "appear", "apple", "approve", "april", "arch",
      "arctic", "area", "arena", "argue", "arm", "armed", "armor", "army",
      "around", "arrange", "arrest", "arrive", "arrow", "art", "artefact", "artist",
      "artwork", "ask", "aspect", "assault", "asset", "assist", "assume", "asthma",
      "athlete", "atom", "attack", "attend", "attitude", "attract", "auction", "audit",
      "august", "aunt", "author", "auto", "autumn", "average", "avocado", "avoid"
    ];
    
    const words = [];
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    
    for (let i = 0; i < 24; i++) {
      const index = randomBytes[i] % wordlist.length;
      words.push(wordlist[index]);
    }
    
    return words.join(' ');
  }

  // Deterministic key derivation from mnemonic
  async deriveKeysFromMnemonic(mnemonic) {
    const encoder = new TextEncoder();
    const data = encoder.encode(mnemonic);
    
    // SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const seed = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Derive DID
    const did = `did:kernel:${seed.slice(0, 32)}`;
    
    // Derive public key (another hash)
    const pkData = encoder.encode(seed + 'public');
    const pkBuffer = await crypto.subtle.digest('SHA-256', pkData);
    const pkArray = Array.from(new Uint8Array(pkBuffer));
    const publicKey = pkArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Derive private key (another hash)
    const skData = encoder.encode(seed + 'private');
    const skBuffer = await crypto.subtle.digest('SHA-256', skData);
    const skArray = Array.from(new Uint8Array(skBuffer));
    const privateKey = skArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return { did, publicKey, privateKey, seed };
  }

  // Create new identity
  async createIdentity(mnemonic = null) {
    const mnemonicPhrase = mnemonic || this.generateMnemonic();
    const keys = await this.deriveKeysFromMnemonic(mnemonicPhrase);
    
    // Check if identity exists
    const existing = await storage.getIdentity(keys.did);
    if (existing) {
      this.currentDID = keys.did;
      localStorage.setItem('kernel_current_did', keys.did);
      return { ...existing, recovered: true };
    }
    
    const timestamp = new Date().toISOString();
    const identity = {
      did: keys.did,
      publicKey: keys.publicKey,
      createdAt: timestamp,
      karma: 0,
      status: 'active'
    };
    
    await storage.saveIdentity(identity);
    this.currentDID = keys.did;
    localStorage.setItem('kernel_current_did', keys.did);
    
    // Emit genesis pulse
    await this.emitPulse('identity_created', 10, { event: 'genesis' });
    
    this.emit('identity:created', identity);
    
    return { ...identity, mnemonic: mnemonicPhrase };
  }

  // Recover identity from mnemonic
  async recoverIdentity(mnemonic) {
    const keys = await this.deriveKeysFromMnemonic(mnemonic);
    const existing = await storage.getIdentity(keys.did);
    
    if (existing) {
      this.currentDID = keys.did;
      localStorage.setItem('kernel_current_did', keys.did);
      this.emit('identity:recovered', existing);
      return existing;
    }
    
    // Create new if not found
    return this.createIdentity(mnemonic);
  }

  // Get current identity
  async getCurrentIdentity() {
    if (!this.currentDID) return null;
    return storage.getIdentity(this.currentDID);
  }

  // Logout
  logout() {
    this.currentDID = null;
    localStorage.removeItem('kernel_current_did');
    this.emit('identity:logout', null);
  }

  // Compute pulse hash
  async computePulseHash(pulseData, prevHash = null) {
    const encoder = new TextEncoder();
    const data = JSON.stringify({
      originDID: pulseData.originDID,
      timestamp: pulseData.timestamp,
      actionType: pulseData.actionType,
      prevHash
    });
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Emit pulse (atomic execution signal)
  async emitPulse(actionType, impactScore = 1, context = {}, agentId = null, dependencies = []) {
    if (!this.currentDID) throw new Error('No active identity');
    
    // Get previous pulse hash
    const lastPulse = await storage.getLastPulse(this.currentDID);
    const prevHash = lastPulse?.hash || null;
    
    const timestamp = new Date().toISOString();
    const pulseData = {
      id: crypto.randomUUID(),
      originDID: this.currentDID,
      agentId,
      timestamp,
      actionType,
      impactScore,
      context,
      dependencies,
      prevHash
    };
    
    pulseData.hash = await this.computePulseHash(pulseData, prevHash);
    
    await storage.savePulse(pulseData);
    
    // Update karma (capped at 10 per pulse)
    const cappedImpact = Math.min(impactScore, 10);
    await storage.updateKarma(this.currentDID, cappedImpact);
    
    this.emit('pulse:created', pulseData);
    
    return pulseData;
  }

  // Get pulses
  async getPulses(limit = 50, filter = null) {
    if (!this.currentDID) return [];
    return storage.getPulses(this.currentDID, limit, filter);
  }

  // Get all pulses (global feed)
  async getAllPulses(limit = 50) {
    return storage.getAllPulses(limit);
  }

  // Verify pulse chain integrity
  async verifyPulseChain() {
    if (!this.currentDID) return { valid: true, pulseCount: 0 };
    
    const pulses = await storage.getPulses(this.currentDID, 10000);
    pulses.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    if (pulses.length === 0) return { valid: true, pulseCount: 0 };
    
    for (let i = 0; i < pulses.length; i++) {
      const expectedPrev = i > 0 ? pulses[i - 1].hash : null;
      if (pulses[i].prevHash !== expectedPrev) {
        return { valid: false, pulseCount: pulses.length, brokenAt: pulses[i].id };
      }
    }
    
    return { valid: true, pulseCount: pulses.length };
  }

  // Create policy key
  async createPolicyKey(subject, verb, objectRef, expiresAt = null, constraints = null) {
    if (!this.currentDID) throw new Error('No active identity');
    
    const key = {
      id: crypto.randomUUID(),
      did: this.currentDID,
      subject,
      verb,
      objectRef,
      constraints,
      createdAt: new Date().toISOString(),
      expiresAt,
      revoked: false
    };
    
    await storage.savePolicyKey(key);
    await this.emitPulse('policy_key_created', 2, { keyId: key.id, verb });
    
    this.emit('key:created', key);
    return key;
  }

  // Revoke policy key
  async revokePolicyKey(keyId) {
    if (!this.currentDID) throw new Error('No active identity');
    
    await storage.revokePolicyKey(keyId, this.currentDID);
    await this.emitPulse('policy_key_revoked', -1, { keyId });
    
    this.emit('key:revoked', { keyId });
  }

  // Get policy keys
  async getPolicyKeys() {
    if (!this.currentDID) return [];
    return storage.getPolicyKeys(this.currentDID);
  }

  // Spawn agent
  async spawnAgent(name, agentType = 'worker', config = {}) {
    if (!this.currentDID) throw new Error('No active identity');
    
    const agent = {
      id: crypto.randomUUID(),
      did: this.currentDID,
      name,
      agentType,
      status: 'active',
      createdAt: new Date().toISOString(),
      config,
      karma: 0,
      checkpoints: []
    };
    
    await storage.saveAgent(agent);
    await this.emitPulse('agent_spawned', 5, { agentId: agent.id, name });
    
    this.emit('agent:spawned', agent);
    return agent;
  }

  // Get agents
  async getAgents() {
    if (!this.currentDID) return [];
    return storage.getAgents(this.currentDID);
  }

  // Checkpoint agent
  async checkpointAgent(agentId) {
    if (!this.currentDID) throw new Error('No active identity');
    
    const agent = await storage.getAgent(agentId, this.currentDID);
    if (!agent) throw new Error('Agent not found');
    
    const encoder = new TextEncoder();
    const data = JSON.stringify(agent);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const stateHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    const checkpoint = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      stateHash
    };
    
    await storage.addAgentCheckpoint(agentId, checkpoint);
    await this.emitPulse('agent_checkpoint', 1, { agentId, checkpointId: checkpoint.id }, agentId);
    
    return checkpoint;
  }

  // Terminate agent
  async terminateAgent(agentId) {
    if (!this.currentDID) throw new Error('No active identity');
    
    await storage.updateAgentStatus(agentId, this.currentDID, 'terminated');
    await this.emitPulse('agent_terminated', -2, { agentId }, agentId);
    
    this.emit('agent:terminated', { agentId });
  }

  // Export state for backup
  async exportState() {
    if (!this.currentDID) throw new Error('No active identity');
    
    const identity = await storage.getIdentity(this.currentDID);
    const pulses = await storage.getPulses(this.currentDID, 10000);
    const agents = await storage.getAgents(this.currentDID);
    const keys = await storage.getPolicyKeys(this.currentDID);
    const stakes = await storage.getStakes(this.currentDID);
    
    return {
      version: '1.2',
      exportedAt: new Date().toISOString(),
      identity,
      pulses,
      agents,
      policyKeys: keys,
      stakes
    };
  }

  // Get economy stats
  async getEconomyStats() {
    return storage.getEconomyStats();
  }

  // Get leaderboard
  async getLeaderboard(limit = 10) {
    return storage.getLeaderboard(limit);
  }
}

// Singleton instance
export const kernel = new IdentityKernel();
export default kernel;
