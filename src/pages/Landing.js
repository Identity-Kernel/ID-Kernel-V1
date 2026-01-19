import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKernel } from '../context/KernelContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Fingerprint, Key, Shield, Zap, Copy, Check, AlertCircle, Loader2 } from 'lucide-react';
import { copyToClipboard } from '../lib/utils';
import { toast } from 'sonner';

export default function Landing() {
  const navigate = useNavigate();
  const { createIdentity, recoverIdentity, loading, error } = useKernel();
  const [mnemonic, setMnemonic] = useState('');
  const [newMnemonic, setNewMnemonic] = useState('');
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState('choose');

  const handleCreate = async () => {
    try {
      const result = await createIdentity();
      setNewMnemonic(result.mnemonic);
      setStep('created');
      toast.success('Identity created successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to create identity');
    }
  };

  const handleRecover = async () => {
    if (!mnemonic.trim()) {
      toast.error('Please enter your mnemonic');
      return;
    }
    try {
      await recoverIdentity(mnemonic.trim());
      toast.success('Identity recovered successfully');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Failed to recover identity');
    }
  };

  const handleCopyMnemonic = async () => {
    const success = await copyToClipboard(newMnemonic);
    if (success) {
      setCopied(true);
      toast.success('Mnemonic copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleContinue = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          {/* Logo & Title */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-none border border-primary/30 mb-6 glow-primary">
              <Fingerprint className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-mono font-bold text-foreground mb-4 tracking-tight">
              Identity Kernel
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Decentralized identity execution kernel. Pure JavaScript, browser-first.
              Your DID is the sole authority.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
            <div className="bento-card flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-mono text-sm font-medium text-foreground">100% Local</h3>
                <p className="text-xs text-muted-foreground mt-1">No backend required. IndexedDB persistence.</p>
              </div>
            </div>
            <div className="bento-card flex items-start gap-3">
              <Zap className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-mono text-sm font-medium text-foreground">Deterministic</h3>
                <p className="text-xs text-muted-foreground mt-1">Identical inputs produce identical outputs</p>
              </div>
            </div>
            <div className="bento-card flex items-start gap-3">
              <Key className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-mono text-sm font-medium text-foreground">Cryptographic</h3>
                <p className="text-xs text-muted-foreground mt-1">Hash-linked pulses and signed capabilities</p>
              </div>
            </div>
          </div>

          {/* Auth Card */}
          {step === 'choose' && (
            <Card className="bg-card border-border max-w-md mx-auto">
              <CardHeader className="text-center">
                <CardTitle className="font-mono text-xl">Initialize Kernel</CardTitle>
                <CardDescription>Create new identity or recover existing</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="create" className="w-full">
                  <TabsList className="w-full grid grid-cols-2 mb-4">
                    <TabsTrigger value="create" data-testid="tab-create">Create New</TabsTrigger>
                    <TabsTrigger value="recover" data-testid="tab-recover">Recover</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="create">
                    <p className="text-sm text-muted-foreground mb-4">
                      Generate a new decentralized identity with a secure mnemonic phrase.
                    </p>
                    <Button 
                      onClick={handleCreate} 
                      className="w-full glow-primary"
                      disabled={loading}
                      data-testid="create-identity-btn"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Fingerprint className="w-4 h-4 mr-2" />
                          Create Identity
                        </>
                      )}
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="recover">
                    <p className="text-sm text-muted-foreground mb-4">
                      Enter your 24-word mnemonic to recover your identity.
                    </p>
                    <div className="space-y-4">
                      <Input
                        placeholder="Enter your mnemonic phrase..."
                        value={mnemonic}
                        onChange={(e) => setMnemonic(e.target.value)}
                        className="terminal-input font-mono text-sm"
                        data-testid="mnemonic-input"
                      />
                      <Button 
                        onClick={handleRecover} 
                        className="w-full"
                        disabled={loading || !mnemonic.trim()}
                        data-testid="recover-identity-btn"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Recovering...
                          </>
                        ) : (
                          <>
                            <Key className="w-4 h-4 mr-2" />
                            Recover Identity
                          </>
                        )}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>

                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Created State - Show Mnemonic */}
          {step === 'created' && newMnemonic && (
            <Card className="bg-card border-border max-w-lg mx-auto">
              <CardHeader className="text-center">
                <div className="w-12 h-12 rounded-none border border-primary/30 flex items-center justify-center mx-auto mb-4 glow-primary">
                  <Check className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="font-mono text-xl">Identity Created</CardTitle>
                <CardDescription>
                  Save your mnemonic phrase securely. It's the only way to recover your identity.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-destructive/10 border-destructive/30">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-destructive">
                    <strong>CRITICAL:</strong> Write down these words and store them safely. Loss = permanent loss of control.
                  </AlertDescription>
                </Alert>

                <div className="relative">
                  <div 
                    className="bg-[#121212] border border-border p-4 font-mono text-sm break-words"
                    data-testid="mnemonic-display"
                  >
                    {newMnemonic}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleCopyMnemonic}
                    data-testid="copy-mnemonic-btn"
                  >
                    {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>

                <Button 
                  onClick={handleContinue} 
                  className="w-full glow-primary"
                  data-testid="continue-btn"
                >
                  I've Saved My Mnemonic - Continue
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border p-4 text-center">
        <p className="text-xs text-muted-foreground font-mono">
          Identity Kernel Foundation v1.2 • Pure JS • No Backend • IndexedDB Storage
        </p>
      </footer>
    </div>
  );
}
