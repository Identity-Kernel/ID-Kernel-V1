import React, { useState } from 'react';
import { useKernel } from '../context/KernelContext';
import { useNavigate } from 'react-router-dom';
import { formatRelativeTime, copyToClipboard, localStore } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { 
  Settings, Download, Upload, Trash2, Copy, Check,
  AlertTriangle, LogOut, Database, Key, Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { storage } from '../kernel';

export default function SettingsPage() {
  const { kernel, identity, logout } = useKernel();
  const navigate = useNavigate();
  const [exportData, setExportData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const handleExport = async () => {
    try {
      const data = await kernel.exportState();
      setExportData(data);
      toast.success('State exported successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to export state');
    }
  };

  const handleDownload = () => {
    if (!exportData) return;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `identity-kernel-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup downloaded');
  };

  const handleCopyMnemonic = async () => {
    const mnemonic = localStore.get('kernel_mnemonic');
    if (mnemonic) {
      const success = await copyToClipboard(mnemonic);
      if (success) {
        setCopied(true);
        toast.success('Mnemonic copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      }
    } else {
      toast.error('No mnemonic found. You may have recovered without saving it.');
    }
  };

  const handleClearData = async () => {
    try {
      await storage.clearAll();
      logout();
      navigate('/');
      toast.success('All data cleared');
    } catch (err) {
      toast.error('Failed to clear data');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const savedMnemonic = localStore.get('kernel_mnemonic');

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div>
        <h1 className="text-2xl sm:text-3xl font-mono font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Recovery, export, and preferences</p>
      </div>

      {/* Recovery Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-mono text-lg flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            Recovery
          </CardTitle>
          <CardDescription>Your mnemonic is the only way to recover your identity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {savedMnemonic ? (
            <>
              <Alert className="bg-destructive/10 border-destructive/30">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive">
                  Keep your mnemonic safe and private. Never share it with anyone.
                </AlertDescription>
              </Alert>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleCopyMnemonic} data-testid="copy-mnemonic-btn">
                  {copied ? <Check className="w-4 h-4 mr-2 text-primary" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? 'Copied!' : 'Copy Mnemonic'}
                </Button>
              </div>
            </>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No mnemonic stored locally. If you recovered your identity, make sure to save your mnemonic elsewhere.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Export Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-mono text-lg flex items-center gap-2">
            <Download className="w-4 h-4 text-accent" />
            Export & Backup
          </CardTitle>
          <CardDescription>Download your complete state for backup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport} data-testid="export-state-btn">
              <Database className="w-4 h-4 mr-2" />
              Export State
            </Button>
            {exportData && (
              <Button onClick={handleDownload} data-testid="download-backup-btn">
                <Download className="w-4 h-4 mr-2" />
                Download JSON
              </Button>
            )}
          </div>
          
          {exportData && (
            <div className="bg-muted p-3 rounded text-xs font-mono">
              <p>Version: {exportData.version}</p>
              <p>Exported: {formatRelativeTime(exportData.exportedAt)}</p>
              <p>Pulses: {exportData.pulses?.length || 0}</p>
              <p>Agents: {exportData.agents?.length || 0}</p>
              <p>Policy Keys: {exportData.policyKeys?.length || 0}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Storage Info */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-mono text-lg flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            Storage
          </CardTitle>
          <CardDescription>Local IndexedDB storage information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="bento-card p-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Storage Type</p>
              <p className="font-mono text-lg mt-1">IndexedDB</p>
            </div>
            <div className="bento-card p-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Status</p>
              <Badge className="mt-1 bg-primary/20 text-primary">Local Only</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-card border-destructive/30">
        <CardHeader>
          <CardTitle className="font-mono text-lg flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border border-border">
            <div>
              <p className="font-mono text-sm">Logout</p>
              <p className="text-xs text-muted-foreground">Sign out of current session</p>
            </div>
            <Button variant="outline" onClick={handleLogout} data-testid="logout-btn">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-3 border border-destructive/30">
            <div>
              <p className="font-mono text-sm text-destructive">Clear All Data</p>
              <p className="text-xs text-muted-foreground">Permanently delete all local data</p>
            </div>
            <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" data-testid="clear-data-btn">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Data
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="font-mono text-destructive">Clear All Data?</DialogTitle>
                  <DialogDescription>
                    This will permanently delete all identities, pulses, agents, and other data from IndexedDB. 
                    Make sure you have your mnemonic backed up!
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setClearDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleClearData} data-testid="confirm-clear-btn">
                    Yes, Clear Everything
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
