import { useState, useEffect } from 'react';
import { Key, Shield, Plus, Trash2, Send, RefreshCw, CheckCircle2, AlertCircle, Globe, Zap, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';

export default function App() {
  const [groqKeys, setGroqKeys] = useState<string[]>([]);
  const [authorizedKeys, setAuthorizedKeys] = useState<string[]>([]);
  const [newGroqKey, setNewGroqKey] = useState('');
  const [newAuthKey, setNewAuthKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testPrompt, setTestPrompt] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const adminId = params.get('id');
    const secretId = (import.meta as any).env.VITE_ADMIN_ID;

    if (adminId && adminId === secretId) {
      setIsAdmin(true);
      fetchConfig();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await axios.get('/api/config');
      setGroqKeys(res.data.groqKeys || []);
      setAuthorizedKeys(res.data.authorizedKeys || []);
    } catch (err) {
      console.error('Failed to fetch config', err);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (updatedGroq: string[], updatedAuth: string[]) => {
    setSaving(true);
    try {
      await axios.post('/api/config', {
        groqKeys: updatedGroq,
        authorizedKeys: updatedAuth
      });
    } catch (err) {
      console.error('Failed to save config', err);
    } finally {
      setSaving(false);
    }
  };

  const addGroqKey = () => {
    if (!newGroqKey.trim()) return;
    const updated = [...groqKeys, newGroqKey.trim()];
    setGroqKeys(updated);
    setNewGroqKey('');
    saveConfig(updated, authorizedKeys);
  };

  const removeGroqKey = (index: number) => {
    const updated = groqKeys.filter((_, i) => i !== index);
    setGroqKeys(updated);
    saveConfig(updated, authorizedKeys);
  };

  const addAuthKey = () => {
    if (!newAuthKey.trim()) return;
    const updated = [...authorizedKeys, newAuthKey.trim()];
    setAuthorizedKeys(updated);
    setNewAuthKey('');
    saveConfig(groqKeys, updated);
  };

  const removeAuthKey = (index: number) => {
    const updated = authorizedKeys.filter((_, i) => i !== index);
    setAuthorizedKeys(updated);
    saveConfig(groqKeys, updated);
  };

  const runTest = async () => {
    if (!testPrompt.trim() || authorizedKeys.length === 0) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await axios.post('/api/platform', {
        prompt: testPrompt,
        model: 'mixtral-8x7b-32768',
        unique_key: authorizedKeys[0] // Use first auth key for testing
      });
      setTestResult(res.data);
    } catch (err: any) {
      setTestResult({ error: err.response?.data || err.message });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-dark">
        <RefreshCw className="w-8 h-8 text-brand-green animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-bg-dark text-text-primary flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl"
        >
          <div className="w-20 h-20 bg-brand-green rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(34,197,94,0.3)]">
            <Globe className="text-bg-dark w-10 h-10" />
          </div>
          <h1 className="text-5xl font-extrabold mb-4 tracking-tight">
            Xon Ai <span className="text-brand-green">API</span>
          </h1>
          <p className="text-xl text-text-secondary mb-12 leading-relaxed">
            The high-performance Groq API wrapper with intelligent rollover and zero downtime.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-surface p-6 rounded-xl border border-surface-hover">
              <Zap className="text-accent-orange w-8 h-8 mb-4 mx-auto" />
              <h3 className="font-bold mb-2">Ultra Fast</h3>
              <p className="text-sm text-text-muted">Direct edge routing to Groq's LPU infrastructure.</p>
            </div>
            <div className="bg-surface p-6 rounded-xl border border-surface-hover">
              <RefreshCw className="text-brand-green w-8 h-8 mb-4 mx-auto" />
              <h3 className="font-bold mb-2">Auto Rollover</h3>
              <p className="text-sm text-text-muted">Seamlessly switches keys on rate limits or failures.</p>
            </div>
            <div className="bg-surface p-6 rounded-xl border border-surface-hover">
              <Lock className="text-accent-blue w-8 h-8 mb-4 mx-auto" />
              <h3 className="font-bold mb-2">Secure</h3>
              <p className="text-sm text-text-muted">Authorized key validation for every request.</p>
            </div>
          </div>

          <div className="bg-surface/50 border border-surface-hover p-4 rounded-lg inline-block">
            <code className="text-brand-green text-sm">POST /api/platform</code>
          </div>
        </motion.div>
        
        <footer className="fixed bottom-8 text-text-muted text-xs">
          © 2026 Xon Ai • Enterprise API Solutions
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-6xl mx-auto">
      <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-brand-green rounded-lg flex items-center justify-center">
              <Shield className="text-bg-dark w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Xon Ai <span className="text-brand-green">Admin</span></h1>
          </div>
          <p className="text-text-secondary">Platform Configuration & Key Management</p>
        </div>
        <div className="flex items-center gap-2 bg-surface px-4 py-2 rounded-full border border-surface-hover">
          <div className="w-2 h-2 bg-brand-green rounded-full animate-pulse" />
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">System Online</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Groq Keys Management */}
        <section className="bg-surface p-6 rounded-2xl border border-surface-hover shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <Key className="text-brand-green w-5 h-5" />
            <h2 className="text-xl font-semibold">Groq API Keys Pool</h2>
          </div>
          
          <div className="flex gap-2 mb-6">
            <input
              type="password"
              value={newGroqKey}
              onChange={(e) => setNewGroqKey(e.target.value)}
              placeholder="gsk_..."
              className="flex-1 bg-bg-dark border border-surface-hover rounded-lg px-4 py-2 focus:outline-none focus:border-brand-green transition-colors"
            />
            <button
              onClick={addGroqKey}
              className="bg-brand-green hover:bg-brand-green-dark text-bg-dark font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus size={20} /> Add
            </button>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence>
              {groqKeys.map((key, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center justify-between bg-bg-dark/50 p-3 rounded-lg border border-surface-hover group"
                >
                  <code className="text-xs text-text-muted truncate max-w-[200px]">
                    {key.substring(0, 8)}••••••••••••••••
                  </code>
                  <button
                    onClick={() => removeGroqKey(i)}
                    className="text-text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {groqKeys.length === 0 && (
              <p className="text-center text-text-muted py-4 italic">No keys added yet.</p>
            )}
          </div>
        </section>

        {/* Authorized Keys Management */}
        <section className="bg-surface p-6 rounded-2xl border border-surface-hover shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="text-accent-blue w-5 h-5" />
            <h2 className="text-xl font-semibold">Authorized Platform Keys</h2>
          </div>

          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={newAuthKey}
              onChange={(e) => setNewAuthKey(e.target.value)}
              placeholder="Enter unique key..."
              className="flex-1 bg-bg-dark border border-surface-hover rounded-lg px-4 py-2 focus:outline-none focus:border-accent-blue transition-colors"
            />
            <button
              onClick={addAuthKey}
              className="bg-accent-blue hover:bg-blue-600 text-bg-dark font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus size={20} /> Add
            </button>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence>
              {authorizedKeys.map((key, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center justify-between bg-bg-dark/50 p-3 rounded-lg border border-surface-hover group"
                >
                  <span className="text-sm font-mono text-accent-blue">{key}</span>
                  <button
                    onClick={() => removeAuthKey(i)}
                    className="text-text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {authorizedKeys.length === 0 && (
              <p className="text-center text-text-muted py-4 italic">No authorized keys defined.</p>
            )}
          </div>
        </section>

        {/* API Tester */}
        <section className="lg:col-span-2 bg-surface p-6 rounded-2xl border border-surface-hover shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <Send className="text-accent-orange w-5 h-5" />
            <h2 className="text-xl font-semibold">Platform API Tester</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-text-muted mb-2">Test Prompt</label>
              <textarea
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder="Ask something to test the rollover..."
                className="w-full h-24 bg-bg-dark border border-surface-hover rounded-lg px-4 py-3 focus:outline-none focus:border-accent-orange transition-colors resize-none"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-text-muted">
                {authorizedKeys.length > 0 ? (
                  <span className="flex items-center gap-1"><CheckCircle2 size={14} className="text-brand-green" /> Ready to test</span>
                ) : (
                  <span className="flex items-center gap-1 text-accent-orange"><AlertCircle size={14} /> Add an authorized key first</span>
                )}
              </div>
              <button
                onClick={runTest}
                disabled={testing || !testPrompt.trim() || authorizedKeys.length === 0}
                className="bg-accent-orange hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-2 rounded-lg transition-all flex items-center gap-2"
              >
                {testing ? <RefreshCw className="animate-spin" size={20} /> : <Send size={20} />}
                Run Test
              </button>
            </div>

            {testResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 bg-bg-dark p-4 rounded-lg border border-surface-hover overflow-x-auto"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase text-text-muted">Response</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${testResult.error ? 'bg-red-500/20 text-red-400' : 'bg-brand-green/20 text-brand-green'}`}>
                    {testResult.error ? 'FAILED' : 'SUCCESS'}
                  </span>
                </div>
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </motion.div>
            )}
          </div>
        </section>
      </div>

      <footer className="mt-12 text-center text-text-muted text-sm pb-12">
        <p>© 2026 Xon Ai Platform • Built for scale</p>
      </footer>

      {saving && (
        <div className="fixed bottom-6 right-6 bg-brand-green text-bg-dark px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-bold animate-pulse">
          <RefreshCw size={16} className="animate-spin" /> Saving changes...
        </div>
      )}
    </div>
  );
}
