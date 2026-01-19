import React, { useState, useRef, useEffect } from 'react';
import { useKernel } from '../context/KernelContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Bot, Send, Trash2, Settings, Cpu, Snowflake, Flame
} from 'lucide-react';
import { ai } from '../kernel';

export default function AITerminal() {
  const { refreshIdentity } = useKernel();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('frozen');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setHistory(ai.getHistory());
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;
    
    const prompt = input.trim();
    setInput('');
    setLoading(true);
    
    try {
      ai.setMode(mode);
      const response = await ai.query(prompt);
      setHistory(ai.getHistory());
      refreshIdentity();
    } catch (err) {
      console.error('AI query failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    ai.clearHistory();
    setHistory([]);
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    ai.setMode(newMode);
  };

  return (
    <div className="space-y-6" data-testid="ai-terminal-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-mono font-bold">AI Terminal</h1>
          <p className="text-sm text-muted-foreground mt-1">Local Ollama integration (deterministic mock)</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={mode} onValueChange={handleModeChange}>
            <SelectTrigger className="w-[140px]" data-testid="ai-mode-select">
              {mode === 'frozen' ? (
                <Snowflake className="w-4 h-4 mr-2 text-accent" />
              ) : (
                <Flame className="w-4 h-4 mr-2 text-destructive" />
              )}
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="frozen">
                <div className="flex items-center gap-2">
                  <Snowflake className="w-4 h-4" />
                  Frozen
                </div>
              </SelectItem>
              <SelectItem value="unfrozen">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4" />
                  Unfrozen
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleClear} data-testid="clear-history-btn">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Mode Info */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-primary" />
            <div>
              <p className="font-mono text-sm">
                Model: ollama-kernel-{mode}
              </p>
              <p className="text-xs text-muted-foreground">
                {mode === 'frozen' 
                  ? 'Immutable, deterministic AI backend. No learning.' 
                  : 'Persistent, per-DID learning enabled.'}
              </p>
            </div>
            <Badge className={mode === 'frozen' ? 'bg-accent/20 text-accent' : 'bg-destructive/20 text-destructive'}>
              {mode}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Terminal */}
      <Card className="ai-terminal">
        <CardContent className="p-0">
          <ScrollArea className="h-[500px] p-4">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Bot className="w-12 h-12 mb-4 opacity-50" />
                <p className="font-mono text-sm">Identity Kernel AI v1.2</p>
                <p className="text-xs mt-2 max-w-md text-center">
                  Try asking about: DID, Karma, Pulses, Agents, Governance, Economy, or Security
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {history.map((item, index) => (
                  <div key={index} className="space-y-3">
                    {/* User prompt */}
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-none border border-primary/30 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-xs text-primary">$</span>
                      </div>
                      <div>
                        <p className="font-mono text-sm text-foreground">{item.prompt}</p>
                      </div>
                    </div>
                    
                    {/* AI response */}
                    <div className="flex items-start gap-3 ml-9">
                      <div className="w-6 h-6 rounded-none border border-accent/30 flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="w-3 h-3 text-accent" />
                      </div>
                      <div className="flex-1">
                        <pre className="ai-terminal-output font-mono text-sm text-muted-foreground whitespace-pre-wrap">
                          {item.response.response}
                        </pre>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>seed: {item.response.deterministicSeed}</span>
                          <span>model: {item.response.model}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
          
          <div className="ai-terminal-prompt">
            <span className="text-primary font-mono">$</span>
            <Input
              placeholder="Ask the kernel AI..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              disabled={loading}
              className="flex-1 terminal-input border-0 bg-transparent"
              data-testid="ai-input"
            />
            <Button 
              size="sm" 
              onClick={handleSubmit} 
              disabled={loading || !input.trim()}
              data-testid="ai-send-btn"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick prompts */}
      <div className="flex flex-wrap gap-2">
        {['What is DID?', 'Explain Karma', 'How do pulses work?', 'Tell me about agents', 'What is governance?'].map((prompt) => (
          <Button
            key={prompt}
            variant="outline"
            size="sm"
            onClick={() => setInput(prompt)}
            className="font-mono text-xs"
            data-testid={`quick-prompt-${prompt.replace(/\s+/g, '-').toLowerCase()}`}
          >
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  );
}
