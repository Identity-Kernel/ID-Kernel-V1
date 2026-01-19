import React, { useState, useEffect } from 'react';
import { useKernel } from '../context/KernelContext';
import { formatKarma, formatRelativeTime, formatDID } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Progress } from '../components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { 
  Coins, Plus, TrendingUp, Lock, Unlock, RefreshCw,
  Clock, BarChart3, Trophy, Percent
} from 'lucide-react';
import { toast } from 'sonner';
import { economy } from '../kernel';

export default function Economy() {
  const { identity, refreshIdentity } = useKernel();
  const [stats, setStats] = useState(null);
  const [stakes, setStakes] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stakeDialogOpen, setStakeDialogOpen] = useState(false);
  const [newStake, setNewStake] = useState({
    amount: 100,
    durationDays: 30
  });

  useEffect(() => {
    fetchEconomyData();
  }, []);

  const fetchEconomyData = async () => {
    setLoading(true);
    try {
      const [statsData, stakesData, leaderboardData] = await Promise.all([
        economy.getStats(),
        economy.getStakes(),
        economy.getLeaderboard(10),
      ]);
      setStats(statsData);
      setStakes(stakesData);
      setLeaderboard(leaderboardData);
    } catch (err) {
      console.error('Failed to fetch economy data:', err);
      toast.error('Failed to load economy data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStake = async () => {
    try {
      await economy.createStake(newStake.amount, newStake.durationDays);
      toast.success('Stake created successfully');
      setStakeDialogOpen(false);
      setNewStake({ amount: 100, durationDays: 30 });
      fetchEconomyData();
      refreshIdentity();
    } catch (err) {
      toast.error(err.message || 'Failed to create stake');
    }
  };

  const handleUnlock = async (stakeId) => {
    try {
      await economy.unlockStake(stakeId);
      toast.success('Stake unlocked');
      fetchEconomyData();
      refreshIdentity();
    } catch (err) {
      toast.error(err.message || 'Stake not ready to unlock');
    }
  };

  const getAPY = (days) => economy.getStakingAPY(days);

  const calculateStakeProgress = (stake) => {
    const start = new Date(stake.stakedAt).getTime();
    const end = new Date(stake.unlocksAt).getTime();
    const now = Date.now();
    return Math.min(100, ((now - start) / (end - start)) * 100);
  };

  const activeStakes = stakes.filter(s => s.status === 'active');
  const totalStaked = activeStakes.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="space-y-6" data-testid="economy-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-mono font-bold">Economy</h1>
          <p className="text-sm text-muted-foreground mt-1">Staking, tokens, and analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchEconomyData}
            disabled={loading}
            data-testid="refresh-economy-btn"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Dialog open={stakeDialogOpen} onOpenChange={setStakeDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="create-stake-btn">
                <Plus className="w-4 h-4 mr-2" />
                New Stake
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-mono">Create Stake</DialogTitle>
                <DialogDescription>
                  Lock tokens to earn rewards
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={newStake.amount}
                    onChange={(e) => setNewStake({ ...newStake, amount: parseFloat(e.target.value) || 0 })}
                    className="terminal-input"
                    data-testid="stake-amount-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Select 
                    value={String(newStake.durationDays)} 
                    onValueChange={(v) => setNewStake({ ...newStake, durationDays: parseInt(v) })}
                  >
                    <SelectTrigger data-testid="stake-duration-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 Days (5% APY)</SelectItem>
                      <SelectItem value="30">30 Days (10% APY)</SelectItem>
                      <SelectItem value="90">90 Days (15% APY)</SelectItem>
                      <SelectItem value="180">180 Days (20% APY)</SelectItem>
                      <SelectItem value="365">365 Days (25% APY)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-muted p-3 rounded">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Estimated APY</span>
                    <span className="font-mono text-primary">{getAPY(newStake.durationDays)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-muted-foreground">Estimated Reward</span>
                    <span className="font-mono text-primary">
                      +{((newStake.amount * getAPY(newStake.durationDays) / 100) * (newStake.durationDays / 365)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStakeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateStake}
                  disabled={newStake.amount <= 0}
                  data-testid="confirm-stake-btn"
                >
                  Create Stake
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <p className="stat-value" data-testid="total-karma">{formatKarma(stats?.totalKarma || 0)}</p>
            <p className="stat-label">Total Karma</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-5 h-5 text-accent" />
            </div>
            <p className="stat-value" data-testid="total-staked">{formatKarma(stats?.totalStaked || 0)}</p>
            <p className="stat-label">Total Staked</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-5 h-5 text-primary" />
            </div>
            <p className="stat-value" data-testid="your-staked">{formatKarma(totalStaked)}</p>
            <p className="stat-label">Your Staked</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-5 h-5 text-accent" />
            </div>
            <p className="stat-value text-accent">
              {economy.calculateRewardMultiplier(identity?.karma || 0).toFixed(2)}x
            </p>
            <p className="stat-label">Your Multiplier</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Your Stakes */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-mono text-lg flex items-center gap-2">
              <Coins className="w-4 h-4 text-primary" />
              Your Stakes
            </CardTitle>
            <CardDescription>Active and historical stakes</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {stakes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Coins className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">No stakes</p>
                  <p className="text-xs mt-1">Create a stake to start earning</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stakes.map((stake) => {
                    const progress = calculateStakeProgress(stake);
                    const canUnlock = progress >= 100 && stake.status === 'active';
                    
                    return (
                      <div 
                        key={stake.id} 
                        className="bento-card p-4"
                        data-testid={`stake-${stake.id}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-xl text-foreground">{stake.amount}</p>
                              <Badge variant={stake.status === 'active' ? 'default' : 'secondary'}>
                                {stake.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {stake.durationDays} days • {getAPY(stake.durationDays)}% APY
                            </p>
                          </div>
                          {canUnlock && (
                            <Button 
                              size="sm"
                              onClick={() => handleUnlock(stake.id)}
                              data-testid={`unlock-${stake.id}`}
                            >
                              <Unlock className="w-4 h-4 mr-1" />
                              Unlock
                            </Button>
                          )}
                        </div>
                        
                        <Progress value={progress} className="h-2 mb-2" />
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Started {formatRelativeTime(stake.stakedAt)}
                          </span>
                          <span>
                            {progress >= 100 ? 'Ready' : `${progress.toFixed(0)}%`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-mono text-lg flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              Karma Leaderboard
            </CardTitle>
            <CardDescription>Top identities by karma</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {leaderboard.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Trophy className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">No data yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((entry, index) => (
                    <div 
                      key={entry.did} 
                      className={`flex items-center justify-between p-3 border ${index === 0 ? 'border-primary/30 bg-primary/5' : 'border-border'}`}
                      data-testid={`leaderboard-entry-${index}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`font-mono text-lg w-8 ${index === 0 ? 'text-primary' : index < 3 ? 'text-accent' : 'text-muted-foreground'}`}>
                          #{index + 1}
                        </span>
                        <div>
                          <p className="font-mono text-sm">
                            {formatDID(entry.did, 16)}
                          </p>
                          {entry.did === identity?.did && (
                            <Badge variant="secondary" className="text-xs mt-1">You</Badge>
                          )}
                        </div>
                      </div>
                      <span className="font-mono text-lg text-primary">
                        {formatKarma(entry.karma)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
