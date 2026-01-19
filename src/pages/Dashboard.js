import React, { useState, useEffect } from 'react';
import { useKernel } from '../context/KernelContext';
import { formatDID, formatKarma, formatRelativeTime, formatHash } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  Fingerprint, Activity, Users, TrendingUp, Zap, 
  Bot, Key, Vote, Coins, RefreshCw,
  ArrowUpRight, ArrowDownRight, Clock, Hash
} from 'lucide-react';
import { toast } from 'sonner';
import { economy } from '../kernel';

export default function Dashboard() {
  const { kernel, identity, refreshIdentity } = useKernel();
  const [stats, setStats] = useState(null);
  const [pulses, setPulses] = useState([]);
  const [agents, setAgents] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, pulsesData, agentsData, leaderboardData] = await Promise.all([
        economy.getStats(),
        kernel.getPulses(10),
        kernel.getAgents(),
        economy.getLeaderboard(5),
      ]);
      setStats(statsData);
      setPulses(pulsesData);
      setAgents(agentsData);
      setLeaderboard(leaderboardData);
      await refreshIdentity();
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType) => {
    if (actionType.includes('agent')) return <Bot className="w-4 h-4" />;
    if (actionType.includes('vote') || actionType.includes('proposal')) return <Vote className="w-4 h-4" />;
    if (actionType.includes('stake')) return <Coins className="w-4 h-4" />;
    if (actionType.includes('key')) return <Key className="w-4 h-4" />;
    if (actionType.includes('message') || actionType.includes('feed')) return <Users className="w-4 h-4" />;
    return <Zap className="w-4 h-4" />;
  };

  const getImpactColor = (score) => {
    if (score >= 5) return 'text-primary';
    if (score >= 0) return 'text-accent';
    return 'text-destructive';
  };

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-mono font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Kernel overview and activity</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchDashboardData}
          disabled={loading}
          data-testid="refresh-btn"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Identity Card */}
      <Card className="identity-card">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-none border border-primary/30 flex items-center justify-center glow-primary">
                <Fingerprint className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Your Identity</p>
                <p className="font-mono text-lg text-foreground" data-testid="user-did">
                  {formatDID(identity?.did, 24)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Karma</p>
                <p className="font-mono text-2xl font-bold text-primary" data-testid="user-karma">
                  {formatKarma(identity?.karma || 0)}
                </p>
              </div>
              <div className="karma-meter w-24">
                <div 
                  className="karma-meter-fill" 
                  style={{ width: `${Math.min((identity?.karma || 0) / 100 * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Activity className="w-5 h-5 text-primary" />
              <Badge variant="outline" className="text-xs">Local</Badge>
            </div>
            <p className="stat-value mt-3" data-testid="stat-pulses">{stats?.totalPulses || 0}</p>
            <p className="stat-label">Total Pulses</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Users className="w-5 h-5 text-accent" />
            </div>
            <p className="stat-value mt-3" data-testid="stat-identities">{stats?.totalIdentities || 0}</p>
            <p className="stat-label">Identities</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <p className="stat-value mt-3" data-testid="stat-karma">{formatKarma(stats?.totalKarma || 0)}</p>
            <p className="stat-label">Total Karma</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Coins className="w-5 h-5 text-accent" />
            </div>
            <p className="stat-value mt-3" data-testid="stat-staked">{formatKarma(stats?.totalStaked || 0)}</p>
            <p className="stat-label">Total Staked</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Pulse Feed */}
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="font-mono text-lg flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Recent Pulses
            </CardTitle>
            <CardDescription>Your latest activity signals</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              {pulses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Zap className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">No pulses yet</p>
                  <p className="text-xs mt-1">Start taking actions to generate pulses</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pulses.map((pulse, index) => (
                    <div 
                      key={pulse.id} 
                      className="bento-card p-3 hover:border-primary/30 transition-colors"
                      data-testid={`pulse-${index}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-none border border-border flex items-center justify-center">
                            {getActionIcon(pulse.actionType)}
                          </div>
                          <div>
                            <p className="font-mono text-sm text-foreground">
                              {pulse.actionType.replace(/_/g, ' ')}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {formatRelativeTime(pulse.timestamp)}
                              </span>
                              <Hash className="w-3 h-3 text-muted-foreground ml-2" />
                              <span className="hash-display">
                                {formatHash(pulse.hash)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1 ${getImpactColor(pulse.impactScore)}`}>
                          {pulse.impactScore >= 0 ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
                          <span className="font-mono text-sm">{pulse.impactScore > 0 ? '+' : ''}{pulse.impactScore}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Active Agents */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="font-mono text-lg flex items-center gap-2">
                <Bot className="w-4 h-4 text-accent" />
                Active Agents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agents.filter(a => a.status === 'active').length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Bot className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No active agents</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {agents.filter(a => a.status === 'active').slice(0, 5).map((agent) => (
                    <div 
                      key={agent.id} 
                      className="flex items-center justify-between p-2 border border-border hover:border-accent/30 transition-colors"
                      data-testid={`agent-${agent.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary pulse-glow" />
                        <span className="font-mono text-sm truncate max-w-[120px]">{agent.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">{agent.agentType}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Karma Leaderboard */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="font-mono text-lg flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <TrendingUp className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No data yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((entry, index) => (
                    <div 
                      key={entry.did} 
                      className="flex items-center justify-between p-2"
                      data-testid={`leaderboard-${index}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-sm w-6 ${index === 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                          #{index + 1}
                        </span>
                        <span className="font-mono text-sm truncate max-w-[100px]">
                          {formatDID(entry.did, 12)}
                        </span>
                        {entry.did === identity?.did && (
                          <Badge variant="secondary" className="text-xs">You</Badge>
                        )}
                      </div>
                      <span className="font-mono text-sm text-primary">
                        {formatKarma(entry.karma)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
