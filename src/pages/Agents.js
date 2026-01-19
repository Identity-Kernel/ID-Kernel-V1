import React, { useState, useEffect } from 'react';
import { useKernel } from '../context/KernelContext';
import { formatRelativeTime, formatHash } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { 
  Bot, Plus, Play, Pause, Save, XCircle, RefreshCw,
  Clock, Hash, Settings, Activity
} from 'lucide-react';
import { toast } from 'sonner';

export default function Agents() {
  const { kernel, refreshIdentity } = useKernel();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newAgent, setNewAgent] = useState({
    name: '',
    agentType: 'worker'
  });

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const data = await kernel.getAgents();
      setAgents(data);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      toast.error('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const handleSpawnAgent = async () => {
    try {
      await kernel.spawnAgent(newAgent.name, newAgent.agentType);
      toast.success('Agent spawned successfully');
      setCreateDialogOpen(false);
      setNewAgent({ name: '', agentType: 'worker' });
      fetchAgents();
      refreshIdentity();
    } catch (err) {
      toast.error(err.message || 'Failed to spawn agent');
    }
  };

  const handleCheckpoint = async (agentId) => {
    try {
      await kernel.checkpointAgent(agentId);
      toast.success('Checkpoint created');
      fetchAgents();
      refreshIdentity();
    } catch (err) {
      toast.error(err.message || 'Failed to create checkpoint');
    }
  };

  const handleTerminate = async (agentId) => {
    try {
      await kernel.terminateAgent(agentId);
      toast.success('Agent terminated');
      fetchAgents();
      refreshIdentity();
    } catch (err) {
      toast.error(err.message || 'Failed to terminate agent');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-primary/20 text-primary';
      case 'suspended': return 'bg-yellow-500/20 text-yellow-500';
      case 'terminated': return 'bg-destructive/20 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'worker': return <Activity className="w-4 h-4" />;
      case 'scheduler': return <Clock className="w-4 h-4" />;
      case 'executor': return <Play className="w-4 h-4" />;
      default: return <Bot className="w-4 h-4" />;
    }
  };

  const activeAgents = agents.filter(a => a.status === 'active');
  const terminatedAgents = agents.filter(a => a.status === 'terminated');

  return (
    <div className="space-y-6" data-testid="agents-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-mono font-bold">Agents</h1>
          <p className="text-sm text-muted-foreground mt-1">Isolated execution contexts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchAgents}
            disabled={loading}
            data-testid="refresh-agents-btn"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="spawn-agent-btn">
                <Plus className="w-4 h-4 mr-2" />
                Spawn Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-mono">Spawn New Agent</DialogTitle>
                <DialogDescription>
                  Create an isolated execution context
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Agent Name</Label>
                  <Input
                    id="name"
                    placeholder="my-worker-agent"
                    value={newAgent.name}
                    onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                    className="terminal-input"
                    data-testid="agent-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Agent Type</Label>
                  <Select 
                    value={newAgent.agentType} 
                    onValueChange={(v) => setNewAgent({ ...newAgent, agentType: v })}
                  >
                    <SelectTrigger data-testid="agent-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="worker">Worker</SelectItem>
                      <SelectItem value="scheduler">Scheduler</SelectItem>
                      <SelectItem value="executor">Executor</SelectItem>
                      <SelectItem value="validator">Validator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSpawnAgent}
                  disabled={!newAgent.name}
                  data-testid="confirm-spawn-btn"
                >
                  Spawn Agent
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Active</span>
            </div>
            <p className="stat-value mt-2" data-testid="active-agents-count">{activeAgents.length}</p>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Terminated</span>
            </div>
            <p className="stat-value mt-2 text-muted-foreground">{terminatedAgents.length}</p>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Save className="w-5 h-5 text-accent" />
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Checkpoints</span>
            </div>
            <p className="stat-value mt-2 text-accent">
              {agents.reduce((sum, a) => sum + (a.checkpoints?.length || 0), 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Agent List */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-mono text-lg flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            All Agents
          </CardTitle>
          <CardDescription>Manage your isolated execution contexts</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {agents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Bot className="w-10 h-10 mb-3 opacity-50" />
                <p className="text-sm">No agents</p>
                <p className="text-xs mt-1">Spawn an agent to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {agents.map((agent) => (
                  <div 
                    key={agent.id} 
                    className={`bento-card p-4 ${agent.status === 'terminated' ? 'opacity-60' : ''}`}
                    data-testid={`agent-card-${agent.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-none border flex items-center justify-center ${agent.status === 'active' ? 'border-primary/30 glow-primary' : 'border-border'}`}>
                          {getTypeIcon(agent.agentType)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-lg text-foreground">{agent.name}</p>
                            <Badge className={getStatusColor(agent.status)}>
                              {agent.status}
                            </Badge>
                            <Badge variant="outline">{agent.agentType}</Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Hash className="w-3 h-3" />
                              <span className="font-mono">{formatHash(agent.id, 8)}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatRelativeTime(agent.createdAt)}
                            </span>
                            {agent.checkpoints?.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Save className="w-3 h-3" />
                                {agent.checkpoints.length} checkpoint{agent.checkpoints.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {agent.status === 'active' && (
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleCheckpoint(agent.id)}
                            data-testid={`checkpoint-${agent.id}`}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleTerminate(agent.id)}
                            className="text-destructive hover:text-destructive"
                            data-testid={`terminate-${agent.id}`}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Checkpoints */}
                    {agent.checkpoints?.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Recent Checkpoints</p>
                        <div className="space-y-1">
                          {agent.checkpoints.slice(-3).map((cp, i) => (
                            <div key={cp.id} className="flex items-center gap-2 text-xs">
                              <Save className="w-3 h-3 text-accent" />
                              <span className="font-mono text-muted-foreground">{formatHash(cp.stateHash, 16)}</span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-muted-foreground">{formatRelativeTime(cp.timestamp)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
