import React, { useState, useEffect } from 'react';
import { useKernel } from '../context/KernelContext';
import { formatDID, formatRelativeTime, copyToClipboard } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { 
  Key, Plus, Trash2, Copy, Check, Shield, Clock, 
  AlertCircle, Fingerprint
} from 'lucide-react';
import { toast } from 'sonner';

export default function Identity() {
  const { kernel, identity, refreshIdentity } = useKernel();
  const [policyKeys, setPolicyKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKey, setNewKey] = useState({
    subject: '',
    verb: 'read',
    objectRef: '',
    expiresAt: ''
  });

  useEffect(() => {
    fetchPolicyKeys();
  }, []);

  const fetchPolicyKeys = async () => {
    try {
      const keys = await kernel.getPolicyKeys();
      setPolicyKeys(keys);
    } catch (err) {
      console.error('Failed to fetch policy keys:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    try {
      const expiresAt = newKey.expiresAt ? new Date(newKey.expiresAt).toISOString() : null;
      await kernel.createPolicyKey(newKey.subject, newKey.verb, newKey.objectRef, expiresAt);
      toast.success('Policy key created');
      setCreateDialogOpen(false);
      setNewKey({ subject: '', verb: 'read', objectRef: '', expiresAt: '' });
      fetchPolicyKeys();
      refreshIdentity();
    } catch (err) {
      toast.error(err.message || 'Failed to create key');
    }
  };

  const handleRevokeKey = async (keyId) => {
    try {
      await kernel.revokePolicyKey(keyId);
      toast.success('Policy key revoked');
      fetchPolicyKeys();
      refreshIdentity();
    } catch (err) {
      toast.error(err.message || 'Failed to revoke key');
    }
  };

  const handleCopy = async (text, id) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(id);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const getVerbColor = (verb) => {
    switch (verb) {
      case 'read': return 'bg-accent/20 text-accent';
      case 'write': return 'bg-primary/20 text-primary';
      case 'delete': return 'bg-destructive/20 text-destructive';
      case 'execute': return 'bg-yellow-500/20 text-yellow-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6" data-testid="identity-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-mono font-bold">Identity</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your DID and policy keys</p>
        </div>
      </div>

      {/* Identity Info Card */}
      <Card className="identity-card">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-none border border-primary/30 flex items-center justify-center glow-primary">
                <Fingerprint className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Decentralized Identifier</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm text-foreground break-all" data-testid="full-did">
                    {identity?.did}
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleCopy(identity?.did, 'did')}
                    data-testid="copy-did-btn"
                  >
                    {copied === 'did' ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Public Key</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-xs text-muted-foreground truncate max-w-[150px]">
                    {identity?.publicKey?.slice(0, 20)}...
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleCopy(identity?.publicKey, 'pk')}
                  >
                    {copied === 'pk' ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Created</p>
                <p className="font-mono text-sm text-foreground">
                  {identity?.createdAt ? formatRelativeTime(identity.createdAt) : '-'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Policy Keys */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-mono text-lg flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                Policy Keys
              </CardTitle>
              <CardDescription>Signed capabilities that grant authority</CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="create-key-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Key
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="font-mono">Create Policy Key</DialogTitle>
                  <DialogDescription>
                    Define a new capability with subject, verb, and object
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject (DID or Agent ID)</Label>
                    <Input
                      id="subject"
                      placeholder="did:kernel:... or agent-id"
                      value={newKey.subject}
                      onChange={(e) => setNewKey({ ...newKey, subject: e.target.value })}
                      className="terminal-input"
                      data-testid="key-subject-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="verb">Verb (Permission)</Label>
                    <Select 
                      value={newKey.verb} 
                      onValueChange={(v) => setNewKey({ ...newKey, verb: v })}
                    >
                      <SelectTrigger data-testid="key-verb-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="read">Read</SelectItem>
                        <SelectItem value="write">Write</SelectItem>
                        <SelectItem value="execute">Execute</SelectItem>
                        <SelectItem value="delete">Delete</SelectItem>
                        <SelectItem value="delegate">Delegate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="object">Object (Resource)</Label>
                    <Input
                      id="object"
                      placeholder="file:data/* or agent:* or *"
                      value={newKey.objectRef}
                      onChange={(e) => setNewKey({ ...newKey, objectRef: e.target.value })}
                      className="terminal-input"
                      data-testid="key-object-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expires">Expires At (Optional)</Label>
                    <Input
                      id="expires"
                      type="datetime-local"
                      value={newKey.expiresAt}
                      onChange={(e) => setNewKey({ ...newKey, expiresAt: e.target.value })}
                      className="terminal-input"
                      data-testid="key-expires-input"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateKey}
                    disabled={!newKey.subject || !newKey.objectRef}
                    data-testid="confirm-create-key-btn"
                  >
                    Create Key
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {policyKeys.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Key className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No policy keys</p>
                <p className="text-xs mt-1">Create keys to grant capabilities</p>
              </div>
            ) : (
              <div className="space-y-3">
                {policyKeys.map((key) => (
                  <div 
                    key={key.id} 
                    className={`bento-card p-4 ${key.revoked ? 'opacity-50' : ''}`}
                    data-testid={`policy-key-${key.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Shield className="w-4 h-4 text-muted-foreground" />
                          <span className="font-mono text-sm truncate max-w-[200px]">
                            {key.subject}
                          </span>
                          <Badge className={getVerbColor(key.verb)}>
                            {key.verb}
                          </Badge>
                          <span className="font-mono text-sm text-muted-foreground truncate max-w-[150px]">
                            {key.objectRef}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(key.createdAt)}
                          </span>
                          {key.expiresAt && (
                            <span className="flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Expires: {formatRelativeTime(key.expiresAt)}
                            </span>
                          )}
                          {key.revoked && (
                            <Badge variant="destructive" className="text-xs">Revoked</Badge>
                          )}
                        </div>
                      </div>
                      {!key.revoked && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleRevokeKey(key.id)}
                          className="text-destructive hover:text-destructive"
                          data-testid={`revoke-key-${key.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
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
