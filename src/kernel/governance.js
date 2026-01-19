// Identity Kernel - Governance Module
// Pure JS, Browser-first

import { kernel } from './kernel.js';
import { storage } from './storage.js';

class GovernanceModule {
  // Create proposal
  async createProposal(title, description, proposalType = 'general', votingDeadlineHours = 168) {
    const did = kernel.currentDID;
    if (!did) throw new Error('No active identity');
    
    const timestamp = new Date();
    const deadline = new Date(timestamp.getTime() + votingDeadlineHours * 3600 * 1000);
    
    const proposal = {
      id: crypto.randomUUID(),
      did,
      title,
      description,
      proposalType,
      status: 'active',
      votesFor: 0,
      votesAgainst: 0,
      voters: [],
      createdAt: timestamp.toISOString(),
      votingDeadline: deadline.toISOString()
    };
    
    await storage.saveProposal(proposal);
    await kernel.emitPulse('proposal_created', 3, { proposalId: proposal.id, title });
    
    kernel.emit('proposal:created', proposal);
    return proposal;
  }

  // Get all proposals
  async getProposals(status = null) {
    return storage.getProposals(status);
  }

  // Get single proposal
  async getProposal(id) {
    return storage.getProposal(id);
  }

  // Cast vote (karma-weighted)
  async vote(proposalId, vote) {
    const did = kernel.currentDID;
    if (!did) throw new Error('No active identity');
    
    const proposal = await storage.getProposal(proposalId);
    if (!proposal) throw new Error('Proposal not found');
    if (proposal.status !== 'active') throw new Error('Voting closed');
    if (proposal.voters.includes(did)) throw new Error('Already voted');
    
    // Check deadline
    if (new Date() > new Date(proposal.votingDeadline)) {
      proposal.status = 'closed';
      await storage.saveProposal(proposal);
      throw new Error('Voting deadline passed');
    }
    
    // Get voter's karma for weighted voting
    const identity = await storage.getIdentity(did);
    const voteWeight = Math.max(1, (identity?.karma || 0) / 10);
    
    if (vote === 'for') {
      proposal.votesFor += voteWeight;
    } else {
      proposal.votesAgainst += voteWeight;
    }
    proposal.voters.push(did);
    
    await storage.saveProposal(proposal);
    await kernel.emitPulse('vote_cast', 1, { proposalId, vote, weight: voteWeight });
    
    kernel.emit('vote:cast', { proposalId, vote, weight: voteWeight });
    return { voteWeight, proposal };
  }

  // Close proposal (check deadline)
  async checkAndCloseProposal(proposalId) {
    const proposal = await storage.getProposal(proposalId);
    if (!proposal || proposal.status !== 'active') return proposal;
    
    if (new Date() > new Date(proposal.votingDeadline)) {
      proposal.status = 'closed';
      proposal.result = proposal.votesFor > proposal.votesAgainst ? 'passed' : 'rejected';
      await storage.saveProposal(proposal);
      kernel.emit('proposal:closed', proposal);
    }
    
    return proposal;
  }
}

export const governance = new GovernanceModule();
export default governance;
