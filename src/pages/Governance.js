import React, { useState, useEffect } from 'react';
import { useKernel } from '../context/KernelContext';
import { formatDID, formatRelativeTime, formatKarma } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Progress } from '../components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { 
  Vote, Plus, ThumbsUp, ThumbsDown, RefreshCw, Clock,
  CheckCircle, XCircle, AlertCircle, Scale
} from 'lucide-react';
import { toast } from 'sonner';
import { governance } from '../kernel';

export default function Governance() {
  const { identity, refreshIdentity } = useKernel();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    proposalType: 'general',
    votingDeadlineHours: 168
  });

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    setLoading(true);
    try {
      const data = await governance.getProposals();
      setProposals(data);
    } catch (err) {
      console.error('Failed to fetch proposals:', err);
      toast.error('Failed to load proposals');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProposal = async () => {
    try {
      await governance.createProposal(
        newProposal.title,
        newProposal.description,
        newProposal.proposalType,
        newProposal.votingDeadlineHours
      );
      toast.success('Proposal created');
      setCreateDialogOpen(false);
      setNewProposal({ title: '', description: '', proposalType: 'general', votingDeadlineHours: 168 });
      fetchProposals();
      refreshIdentity();
    } catch (err) {
      toast.error(err.message || 'Failed to create proposal');
    }
  };

  const handleVote = async (proposalId, vote) => {
    try {
      const result = await governance.vote(proposalId, vote);
      toast.success(`Voted ${vote} with weight ${result.voteWeight.toFixed(1)}`);
      fetchProposals();
      refreshIdentity();
    } catch (err) {
      toast.error(err.message || 'Failed to vote');
    }
  };

  const getStatusIcon = (status, result) => {
    if (status === 'active') return <Clock className="w-4 h-4 text-accent" />;
    if (result === 'passed') return <CheckCircle className="w-4 h-4 text-primary" />;
    return <XCircle className="w-4 h-4 text-destructive" />;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-accent/20 text-accent';
      case 'closed': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const calculateVotePercentage = (proposal) => {
    const total = proposal.votesFor + proposal.votesAgainst;
    if (total === 0) return { for: 50, against: 50 };
    return {
      for: (proposal.votesFor / total) * 100,
      against: (proposal.votesAgainst / total) * 100
    };
  };

  const activeProposals = proposals.filter(p => p.status === 'active');
  const closedProposals = proposals.filter(p => p.status === 'closed');

  return (
    <div className="space-y-6" data-testid="governance-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-mono font-bold">Governance</h1>
          <p className="text-sm text-muted-foreground mt-1">Karma-weighted proposals and voting</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchProposals}
            disabled={loading}
            data-testid="refresh-governance-btn"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="create-proposal-btn">
                <Plus className="w-4 h-4 mr-2" />
                New Proposal
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-mono">Create Proposal</DialogTitle>
                <DialogDescription>
                  Submit a new governance proposal for voting
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Proposal title"
                    value={newProposal.title}
                    onChange={(e) => setNewProposal({ ...newProposal, title: e.target.value })}
                    className="terminal-input"
                    data-testid="proposal-title-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your proposal..."
                    value={newProposal.description}
                    onChange={(e) => setNewProposal({ ...newProposal, description: e.target.value })}
                    className="terminal-input min-h-[100px]"
                    data-testid="proposal-description-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">Voting Duration (hours)</Label>
                  <Input
                    id="deadline"
                    type="number"
                    value={newProposal.votingDeadlineHours}
                    onChange={(e) => setNewProposal({ ...newProposal, votingDeadlineHours: parseInt(e.target.value) || 168 })}
                    className="terminal-input"
                    data-testid="proposal-deadline-input"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateProposal}
                  disabled={!newProposal.title || !newProposal.description}
                  data-testid="confirm-create-proposal-btn"
                >
                  Create Proposal
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Voting Weight Info */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scale className="w-5 h-5 text-primary" />
              <div>
                <p className="font-mono text-sm">Your Voting Weight</p>
                <p className="text-xs text-muted-foreground">Based on your karma: {formatKarma(identity?.karma || 0)}</p>
              </div>
            </div>
            <p className="font-mono text-2xl text-primary" data-testid="voting-weight">
              {Math.max(1, (identity?.karma || 0) / 10).toFixed(1)}x
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Active Proposals */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-mono text-lg flex items-center gap-2">
            <Vote className="w-4 h-4 text-primary" />
            Active Proposals ({activeProposals.length})
          </CardTitle>
          <CardDescription>Vote on these proposals before they close</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {activeProposals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Vote className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No active proposals</p>
                <p className="text-xs mt-1">Create one to start governance</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeProposals.map((proposal) => {
                  const votes = calculateVotePercentage(proposal);
                  const hasVoted = proposal.voters?.includes(identity?.did);
                  
                  return (
                    <div 
                      key={proposal.id} 
                      className="proposal-card active"
                      data-testid={`proposal-${proposal.id}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-mono text-lg text-foreground">{proposal.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{proposal.description}</p>
                        </div>
                        <Badge className={getStatusColor(proposal.status)}>
                          {proposal.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Ends {formatRelativeTime(proposal.votingDeadline)}
                        </span>
                        <span>•</span>
                        <span>By {formatDID(proposal.did, 12)}</span>
                      </div>

                      {/* Vote Bar */}
                      <div className="vote-bar mb-2">
                        <div className="vote-bar-for" style={{ width: `${votes.for}%` }} />
                        <div className="vote-bar-against" style={{ width: `${votes.against}%` }} />
                      </div>
                      
                      <div className="flex items-center justify-between text-xs mb-4">
                        <span className="text-primary">For: {proposal.votesFor.toFixed(1)}</span>
                        <span className="text-destructive">Against: {proposal.votesAgainst.toFixed(1)}</span>
                      </div>

                      {/* Vote Buttons */}
                      {hasVoted ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="w-4 h-4 text-primary" />
                          You have voted on this proposal
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleVote(proposal.id, 'for')}
                            className="flex-1"
                            data-testid={`vote-for-${proposal.id}`}
                          >
                            <ThumbsUp className="w-4 h-4 mr-2" />
                            Vote For
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleVote(proposal.id, 'against')}
                            className="flex-1"
                            data-testid={`vote-against-${proposal.id}`}
                          >
                            <ThumbsDown className="w-4 h-4 mr-2" />
                            Vote Against
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Closed Proposals */}
      {closedProposals.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-mono text-lg">Closed Proposals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {closedProposals.slice(0, 5).map((proposal) => {
                const votes = calculateVotePercentage(proposal);
                return (
                  <div key={proposal.id} className="proposal-card closed p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(proposal.status, proposal.result)}
                        <span className="font-mono text-sm">{proposal.title}</span>
                      </div>
                      <Badge variant={proposal.result === 'passed' ? 'default' : 'destructive'}>
                        {proposal.result || 'closed'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
