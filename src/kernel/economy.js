// Identity Kernel - Economy Module
// Pure JS, Browser-first

import { kernel } from './kernel.js';
import { storage } from './storage.js';

class EconomyModule {
  // Create stake
  async createStake(amount, durationDays = 30) {
    const did = kernel.currentDID;
    if (!did) throw new Error('No active identity');
    
    if (amount <= 0) throw new Error('Amount must be positive');
    
    const timestamp = new Date();
    const unlockDate = new Date(timestamp.getTime() + durationDays * 24 * 3600 * 1000);
    
    const stake = {
      id: crypto.randomUUID(),
      did,
      amount,
      durationDays,
      stakedAt: timestamp.toISOString(),
      unlocksAt: unlockDate.toISOString(),
      status: 'active'
    };
    
    await storage.saveStake(stake);
    await kernel.emitPulse('stake_created', amount * 0.1, { stakeId: stake.id, amount });
    
    kernel.emit('stake:created', stake);
    return stake;
  }

  // Get stakes for current identity
  async getStakes() {
    const did = kernel.currentDID;
    if (!did) return [];
    return storage.getStakes(did);
  }

  // Unlock stake (if ready)
  async unlockStake(stakeId) {
    const did = kernel.currentDID;
    if (!did) throw new Error('No active identity');
    
    const stakes = await storage.getStakes(did);
    const stake = stakes.find(s => s.id === stakeId);
    
    if (!stake) throw new Error('Stake not found');
    if (stake.status !== 'active') throw new Error('Stake not active');
    
    if (new Date() < new Date(stake.unlocksAt)) {
      throw new Error('Stake not yet unlocked');
    }
    
    stake.status = 'unlocked';
    stake.unlockedAt = new Date().toISOString();
    
    await storage.saveStake(stake);
    await kernel.emitPulse('stake_unlocked', 1, { stakeId, amount: stake.amount });
    
    kernel.emit('stake:unlocked', stake);
    return stake;
  }

  // Get economy stats
  async getStats() {
    return storage.getEconomyStats();
  }

  // Get karma leaderboard
  async getLeaderboard(limit = 10) {
    return storage.getLeaderboard(limit);
  }

  // Calculate reward multiplier based on karma
  calculateRewardMultiplier(karma) {
    // Logarithmic scaling to prevent exploitation
    if (karma <= 0) return 1;
    return 1 + Math.log10(karma + 1) * 0.5;
  }

  // Get staking APY based on duration
  getStakingAPY(durationDays) {
    if (durationDays <= 7) return 5;
    if (durationDays <= 30) return 10;
    if (durationDays <= 90) return 15;
    if (durationDays <= 180) return 20;
    return 25;
  }
}

export const economy = new EconomyModule();
export default economy;
