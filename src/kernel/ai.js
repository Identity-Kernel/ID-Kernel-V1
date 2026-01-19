// Identity Kernel - AI Module
// Pure JS, Browser-first, Deterministic Mock

import { kernel } from './kernel.js';

class AIModule {
  constructor() {
    this.mode = 'frozen'; // frozen or unfrozen
    this.history = [];
    this.maxHistory = 100;
  }

  // Set AI mode
  setMode(mode) {
    if (mode !== 'frozen' && mode !== 'unfrozen') {
      throw new Error('Invalid mode. Use "frozen" or "unfrozen"');
    }
    this.mode = mode;
  }

  // Deterministic hash for seeding responses
  async deterministicHash(input) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Query AI (deterministic mock)
  async query(prompt, context = {}) {
    const did = kernel.currentDID;
    if (!did) throw new Error('No active identity');

    const promptHash = await this.deterministicHash(prompt);
    const seed = promptHash.slice(0, 16);

    // Keyword-based response system
    const responses = this.generateResponse(prompt.toLowerCase(), seed);

    const result = {
      response: responses,
      deterministicSeed: seed,
      model: this.mode === 'frozen' ? 'ollama-kernel-frozen' : 'ollama-kernel-unfrozen',
      timestamp: new Date().toISOString(),
      promptHash
    };

    // Store in history
    this.history.push({
      prompt,
      response: result,
      timestamp: result.timestamp
    });

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Emit pulse
    await kernel.emitPulse('ai_query', 0.5, { promptHash: seed, mode: this.mode });

    kernel.emit('ai:response', result);
    return result;
  }

  generateResponse(prompt, seed) {
    // Comprehensive response patterns
    if (prompt.includes('help') || prompt.includes('what can you')) {
      return `I am the Identity Kernel AI assistant operating in ${this.mode} mode.

I can help you with:
• DID Management - Create, recover, and manage decentralized identities
• Pulse System - Understand atomic execution signals and hash-linked chains
• Karma - Learn about deterministic reputation scoring
• Agents - Spawn and manage isolated execution contexts
• Governance - Create proposals and participate in voting
• Economy - Staking, tokens, and analytics
• Social - Feeds, channels, and messaging

Ask me about any of these topics!`;
    }

    if (prompt.includes('did') || prompt.includes('identity') || prompt.includes('decentralized')) {
      return `A Decentralized Identifier (DID) is your globally unique identity in the kernel.

Key properties:
• Generated from a 24-word mnemonic phrase
• Deterministically derived using SHA-256
• Format: did:kernel:{hash}
• Acts as your root of authority
• All operations are cryptographically tied to your DID

Your DID is the kernel. There is no ambient authority outside it.`;
    }

    if (prompt.includes('karma')) {
      return `Karma is a deterministic reputation system based on your pulses.

How it works:
• Each pulse adds impact_score to your karma (capped at 10 per pulse)
• Karma affects voting weight in governance
• Influences visibility and scheduling priority
• Cannot grant authority - only modulates feedback

Anti-manipulation:
• Per-DID impact limits prevent Sybil attacks
• Reputation decays over time
• Cross-DID collaboration requires signed acceptance`;
    }

    if (prompt.includes('pulse')) {
      return `Pulses are atomic, signed execution records.

Structure:
• originDID - Who emitted the pulse
• timestamp - When it occurred
• actionType - What action was taken
• impactScore - Karma impact
• hash - Cryptographic hash of the pulse
• prevHash - Link to previous pulse (chain integrity)

Pulses form a hash-linked chain enabling:
• Verifiable history
• Deterministic replay
• Tamper detection
• Recovery and rollback`;
    }

    if (prompt.includes('agent')) {
      return `Agents are isolated execution contexts scoped under your DID.

Lifecycle:
1. Spawn - Create new agent with configuration
2. Schedule - Kernel schedules execution
3. Checkpoint - Save state for recovery
4. Suspend/Resume - Pause and continue
5. Terminate - Clean shutdown

Properties:
• Strong isolation via sandboxing
• No shared mutable state
• Communicate via kernel-mediated IPC
• Each has its own karma tracking`;
    }

    if (prompt.includes('governance') || prompt.includes('proposal') || prompt.includes('vote')) {
      return `Governance uses karma-weighted voting.

Proposals:
• Anyone can create proposals
• Set voting deadlines
• Track votes for/against

Voting:
• Weight = max(1, karma / 10)
• One vote per DID per proposal
• Results computed deterministically

This ensures more active, reputable identities have proportionally more influence.`;
    }

    if (prompt.includes('stake') || prompt.includes('economy') || prompt.includes('token')) {
      return `The economy module handles staking and tokens.

Staking:
• Lock tokens for a duration
• Longer duration = higher APY
• 7 days: 5% | 30 days: 10% | 90 days: 15% | 180 days: 20% | 365 days: 25%

Tokens:
• Activity-derived from pulses
• Karma multiplier affects rewards
• All calculations are deterministic`;
    }

    if (prompt.includes('recovery') || prompt.includes('mnemonic') || prompt.includes('backup')) {
      return `Recovery uses your 24-word mnemonic phrase.

Process:
1. Mnemonic deterministically generates DID and keys
2. Pulse chain can be replayed from any checkpoint
3. State is reconstructed across nodes

CRITICAL: Your mnemonic is your root entropy.
• Loss = permanent loss of control
• Never share it
• Store securely offline`;
    }

    if (prompt.includes('social') || prompt.includes('chat') || prompt.includes('feed')) {
      return `Social features enable decentralized communication.

Channels:
• Create public or private channels
• Invite members
• Real-time messaging

Feed:
• Post updates with tags
• React to posts
• All actions generate pulses`;
    }

    if (prompt.includes('security') || prompt.includes('trust')) {
      return `Security properties of the Identity Kernel:

• Least privilege - Only granted capabilities work
• Strong isolation - Sandboxed agents
• Cryptographic auditability - All actions hash-linked
• Deterministic portability - Same inputs = same outputs
• Immutable append-only logs
• Replay and fabrication resistance`;
    }

    // Default response with seed-based variation
    const defaultResponses = [
      `Processing query with deterministic seed ${seed}. This is a ${this.mode} model instance. For specific help, try asking about: DID, Karma, Pulses, Agents, Governance, Economy, or Security.`,
      `Query received [seed: ${seed}]. The Identity Kernel operates on the principle that identity is the kernel. All operations are cryptographically enforced and deterministic.`,
      `Deterministic response generated [${seed}]. In a full deployment, this would connect to a local Ollama instance for more sophisticated inference while maintaining determinism.`
    ];

    const index = parseInt(seed.slice(0, 2), 16) % defaultResponses.length;
    return defaultResponses[index];
  }

  // Get conversation history
  getHistory() {
    return [...this.history];
  }

  // Clear history
  clearHistory() {
    this.history = [];
  }
}

export const ai = new AIModule();
export default ai;
