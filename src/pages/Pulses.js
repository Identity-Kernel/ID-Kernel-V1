import React, { useState, useEffect } from 'react';
import { useKernel } from '../context/KernelContext';
import { formatRelativeTime, formatHash } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { 
  Zap, Search, Filter, RefreshCw, Hash, Clock, 
  ArrowUpRight, ArrowDownRight, Link2,
  CheckCircle, XCircle, Bot, Key, Vote, Coins, Users
} from 'lucide-react';
import { toast } from 'sonner';

export default function Pulses() {
  const { kernel } = useKernel();
  const [pulses, setPulses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);

  useEffect(() => {
    fetchPulses();
  }, [filter]);

  const fetchPulses = async () => {
    setLoading(true);
    try {
      const actionType = filter !== 'all' ? filter : null;
      const data = await kernel.getPulses(100, actionType);
      setPulses(data);
    } catch (err) {
      console.error('Failed to fetch pulses:', err);
      toast.error('Failed to load pulses');
    } finally {
      setLoading(false);
    }
  };

  const verifyChain = async () => {
    try {
      const result = await kernel.verifyPulseChain();
      setVerifyResult(result);
      if (result.valid) {
        toast.success('Pulse chain verified successfully');
      } else {
        toast.error('Pulse chain integrity broken');
      }
    } catch (err) {
      toast.error('Failed to verify chain');
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

  const filteredPulses = pulses.filter(pulse => {
    if (!search) return true;
    return (
      pulse.actionType.toLowerCase().includes(search.toLowerCase()) ||
      pulse.hash.toLowerCase().includes(search.toLowerCase()) ||
      pulse.id.toLowerCase().includes(search.toLowerCase())
    );
  });

  const actionTypes = [...new Set(pulses.map(p => p.actionType))];

  return (
    <div className="space-y-6" data-testid="pulses-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-mono font-bold">Pulse Explorer</h1>
          <p className="text-sm text-muted-foreground mt-1">Hash-linked atomic execution signals</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={verifyChain}
            data-testid="verify-chain-btn"
          >
            {verifyResult?.valid === true && <CheckCircle className="w-4 h-4 mr-2 text-primary" />}
            {verifyResult?.valid === false && <XCircle className="w-4 h-4 mr-2 text-destructive" />}
            Verify Chain
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchPulses}
            disabled={loading}
            data-testid="refresh-pulses-btn"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {verifyResult && (
        <Card className={`border ${verifyResult.valid ? 'border-primary/30' : 'border-destructive/30'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {verifyResult.valid ? (
                  <CheckCircle className="w-5 h-5 text-primary" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive" />
                )}
                <div>
                  <p className="font-mono text-sm">
                    Chain Status: {verifyResult.valid ? 'Valid' : 'Broken'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {verifyResult.pulseCount} pulses verified
                  </p>
                </div>
              </div>
              {verifyResult.brokenAt && (
                <Badge variant="destructive">
                  Broken at: {formatHash(verifyResult.brokenAt)}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by action, hash, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 terminal-input"
            data-testid="pulse-search"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]" data-testid="pulse-filter">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {actionTypes.map(type => (
              <SelectItem key={type} value={type}>{type.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            {filteredPulses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Zap className="w-10 h-10 mb-3 opacity-50" />
                <p className="text-sm">No pulses found</p>
                <p className="text-xs mt-1">
                  {search ? 'Try a different search term' : 'Start taking actions to generate pulses'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredPulses.map((pulse, index) => (
                  <Dialog key={pulse.id}>
                    <DialogTrigger asChild>
                      <div 
                        className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                        data-testid={`pulse-row-${index}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-none border border-border flex items-center justify-center flex-shrink-0">
                              {getActionIcon(pulse.actionType)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-mono text-sm text-foreground">
                                {pulse.actionType.replace(/_/g, ' ')}
                              </p>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Hash className="w-3 h-3" />
                                  <span className="font-mono">{formatHash(pulse.hash, 16)}</span>
                                </span>
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  {formatRelativeTime(pulse.timestamp)}
                                </span>
                                {pulse.prevHash && (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Link2 className="w-3 h-3" />
                                    <span className="font-mono">{formatHash(pulse.prevHash, 8)}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className={`flex items-center gap-1 flex-shrink-0 ${getImpactColor(pulse.impactScore)}`}>
                            {pulse.impactScore >= 0 ? (
                              <ArrowUpRight className="w-4 h-4" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4" />
                            )}
                            <span className="font-mono text-sm">
                              {pulse.impactScore > 0 ? '+' : ''}{pulse.impactScore}
                            </span>
                          </div>
                        </div>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="font-mono flex items-center gap-2">
                          <Zap className="w-5 h-5 text-primary" />
                          Pulse Details
                        </DialogTitle>
                        <DialogDescription>
                          Atomic execution signal #{index + 1}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Action Type</p>
                            <Badge variant="outline">{pulse.actionType}</Badge>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Impact Score</p>
                            <p className={`font-mono text-lg ${getImpactColor(pulse.impactScore)}`}>
                              {pulse.impactScore > 0 ? '+' : ''}{pulse.impactScore}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Pulse Hash</p>
                          <p className="font-mono text-xs bg-muted p-2 break-all">{pulse.hash}</p>
                        </div>
                        {pulse.prevHash && (
                          <div>
                            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Previous Hash</p>
                            <p className="font-mono text-xs bg-muted p-2 break-all">{pulse.prevHash}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Timestamp</p>
                          <p className="font-mono text-sm">{new Date(pulse.timestamp).toLocaleString()}</p>
                        </div>
                        {pulse.context && Object.keys(pulse.context).length > 0 && (
                          <div>
                            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Context</p>
                            <pre className="font-mono text-xs bg-muted p-2 overflow-auto max-h-32">
                              {JSON.stringify(pulse.context, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
