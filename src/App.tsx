import { useState, useEffect } from 'react';
import { Key, Shield, Plus, Trash2, Send, RefreshCw, CheckCircle2, AlertCircle, Globe, Zap, Lock, BarChart3, Activity, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';

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
  const [activeTab, setActiveTab] = useState<'config' | 'monitoring'>('config');
  const [stats, setStats] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [fetchingStats, setFetchingStats] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const adminId = params.get('id');
    const secretId = import.meta.env.VITE_ADMIN_ID;

    console.log('Admin Check:', { 
      provided: adminId, 
      configured: secretId ? 'SET' : 'NOT SET' 
    });

    if (adminId && secretId && adminId.trim() === secretId.trim()) {
      setIsAdmin(true);
      fetchConfig();
      fetchStats();
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

  const fetchStats = async () => {
    setFetchingStats(true);
    try {
      const res = await axios.get('/api/stats');
      setStats(res.data.stats || []);
      setRecentLogs(res.data.recentLogs || []);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    } finally {
      setFetchingStats(false);
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
        model: 'qwen/qwen3-32b',
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
      <div className="min-h-screen bg-bg-dark text-text-primary p-6 md:p-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Hero Section */}
          <header className="text-center mb-16">
            <div className="w-20 h-20 bg-brand-green rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(34,197,94,0.3)]">
              <Globe className="text-bg-dark w-10 h-10" />
            </div>
            <h1 className="text-6xl font-extrabold mb-4 tracking-tight">
              Xon Ai <span className="text-brand-green">API</span>
            </h1>
            <p className="text-xl text-text-secondary leading-relaxed max-w-2xl mx-auto">
              The high-performance Groq API wrapper with intelligent rollover and zero downtime.
            </p>
          </header>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            <div className="bg-surface p-6 rounded-xl border border-surface-hover">
              <Zap className="text-accent-orange w-8 h-8 mb-4 mx-auto" />
              <h3 className="font-bold mb-2 text-center">Ultra Fast</h3>
              <p className="text-sm text-text-muted text-center">Direct edge routing to Groq's LPU infrastructure.</p>
            </div>
            <div className="bg-surface p-6 rounded-xl border border-surface-hover">
              <RefreshCw className="text-brand-green w-8 h-8 mb-4 mx-auto" />
              <h3 className="font-bold mb-2 text-center">Auto Rollover</h3>
              <p className="text-sm text-text-muted text-center">Seamlessly switches keys on rate limits or failures.</p>
            </div>
            <div className="bg-surface p-6 rounded-xl border border-surface-hover">
              <Lock className="text-accent-blue w-8 h-8 mb-4 mx-auto" />
              <h3 className="font-bold mb-2 text-center">Secure</h3>
              <p className="text-sm text-text-muted text-center">Authorized key validation for every request.</p>
            </div>
          </div>

          {/* Documentation Section */}
          <section className="bg-surface rounded-2xl border border-surface-hover overflow-hidden shadow-2xl">
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
                <Shield className="text-brand-green" /> API Documentation
              </h2>
              
              <div className="space-y-10">
                {/* Endpoint */}
                <div>
                  <h3 className="text-xs font-bold uppercase text-text-muted mb-3 tracking-widest">Endpoint</h3>
                  <div className="bg-bg-dark p-4 rounded-lg border border-surface-hover flex items-center justify-between">
                    <code className="text-brand-green font-mono">POST /api/platform</code>
                    <span className="text-[10px] bg-brand-green/10 text-brand-green px-2 py-1 rounded font-bold">STABLE</span>
                  </div>
                </div>

                {/* Parameters */}
                <div>
                  <h3 className="text-xs font-bold uppercase text-text-muted mb-3 tracking-widest">Request Parameters</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-surface-hover">
                          <th className="pb-3 font-bold text-text-secondary">Parameter</th>
                          <th className="pb-3 font-bold text-text-secondary">Type</th>
                          <th className="pb-3 font-bold text-text-secondary">Description</th>
                        </tr>
                      </thead>
                      <tbody className="text-text-muted">
                        <tr className="border-b border-surface-hover/50">
                          <td className="py-4 font-mono text-brand-green">prompt</td>
                          <td className="py-4">string</td>
                          <td className="py-4">The message to send to the model. <span className="text-accent-orange text-[10px] font-bold ml-1">REQUIRED</span></td>
                        </tr>
                        <tr className="border-b border-surface-hover/50">
                          <td className="py-4 font-mono text-brand-green">unique_key</td>
                          <td className="py-4">string</td>
                          <td className="py-4">Your authorized platform access key. <span className="text-accent-orange text-[10px] font-bold ml-1">REQUIRED</span></td>
                        </tr>
                        <tr>
                          <td className="py-4 font-mono text-brand-green">model</td>
                          <td className="py-4">string</td>
                          <td className="py-4">Optional. Groq model ID (default: qwen/qwen3-32b).</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Example */}
                <div>
                  <h3 className="text-xs font-bold uppercase text-text-muted mb-3 tracking-widest">Example Request (cURL)</h3>
                  <div className="bg-bg-dark p-5 rounded-lg border border-surface-hover">
                    <pre className="text-xs font-mono text-accent-blue overflow-x-auto leading-relaxed">
{`curl -X POST /api/platform \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Hello Xon Ai!",
    "unique_key": "YOUR_KEY_HERE"
  }'`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-brand-green/5 p-6 border-t border-surface-hover text-center">
              <p className="text-sm text-text-secondary">
                Need an access key? Contact the administrator of this Xon Ai instance.
              </p>
            </div>
          </section>

          <footer className="mt-20 text-center text-text-muted text-sm pb-12">
            © 2026 Xon Ai • Enterprise API Solutions
          </footer>
        </motion.div>
      </div>
    );
  }

    const COLORS = {
      success: '#22c55e',
      error: '#ef4444',
      fallback: '#f97316'
    };

    const chartData = stats.map(s => ({
      name: s._id.charAt(0).toUpperCase() + s._id.slice(1),
      value: s.count,
      color: COLORS[s._id as keyof typeof COLORS] || '#94a3b8'
    }));

    return (
      <div className="min-h-screen bg-bg-dark text-text-primary p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-brand-green rounded-lg flex items-center justify-center">
                  <Shield className="text-bg-dark w-6 h-6" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Xon Ai <span className="text-brand-green">Admin</span></h1>
              </div>
              <p className="text-text-secondary">Platform Configuration & Monitoring</p>
            </div>
            
            <div className="flex bg-surface p-1 rounded-lg border border-surface-hover">
              <button 
                onClick={() => setActiveTab('config')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-bold ${activeTab === 'config' ? 'bg-brand-green text-bg-dark' : 'text-text-secondary hover:text-text-primary'}`}
              >
                <Key className="w-4 h-4" />
                Configuration
              </button>
              <button 
                onClick={() => setActiveTab('monitoring')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-bold ${activeTab === 'monitoring' ? 'bg-brand-green text-bg-dark' : 'text-text-secondary hover:text-text-primary'}`}
              >
                <Activity className="w-4 h-4" />
                Monitoring
              </button>
            </div>
          </header>

          <AnimatePresence mode="wait">
            {activeTab === 'config' ? (
              <motion.div 
                key="config"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-8"
              >
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
      </motion.div>
    ) : (
              <motion.div 
                key="monitoring"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-surface p-6 rounded-2xl border border-surface-hover shadow-xl">
                    <div className="text-text-secondary text-sm mb-1">Total Requests</div>
                    <div className="text-4xl font-bold text-brand-green">
                      {stats.reduce((acc, s) => acc + s.count, 0)}
                    </div>
                  </div>
                  <div className="bg-surface p-6 rounded-2xl border border-surface-hover shadow-xl">
                    <div className="text-text-secondary text-sm mb-1">Success Rate</div>
                    <div className="text-4xl font-bold text-accent-blue">
                      {stats.length > 0 ? Math.round((stats.find(s => s._id === 'success')?.count || 0) / stats.reduce((acc, s) => acc + s.count, 0) * 100) : 0}%
                    </div>
                  </div>
                  <div className="bg-surface p-6 rounded-2xl border border-surface-hover shadow-xl">
                    <div className="text-text-secondary text-sm mb-1">Fallbacks (Rollovers)</div>
                    <div className="text-4xl font-bold text-accent-orange">
                      {stats.find(s => s._id === 'fallback')?.count || 0}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Chart Section */}
                  <div className="bg-surface p-6 rounded-2xl border border-surface-hover shadow-xl">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-brand-green" />
                      Request Distribution
                    </h3>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                            itemStyle={{ color: '#f1f5f9' }}
                          />
                          <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Recent Activity Section */}
                  <div className="bg-surface p-6 rounded-2xl border border-surface-hover shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <History className="w-5 h-5 text-accent-blue" />
                        Recent Activity
                      </h3>
                      <button 
                        onClick={fetchStats}
                        className={`text-text-muted hover:text-brand-green transition-all ${fetchingStats ? 'animate-spin' : ''}`}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {recentLogs.map((log, i) => (
                        <div key={i} className="flex items-center justify-between bg-bg-dark/50 p-3 rounded-lg border border-surface-hover text-xs">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              log.status === 'success' ? 'bg-green-500' : 
                              log.status === 'fallback' ? 'bg-orange-500' : 'bg-red-500'
                            }`} />
                            <div>
                              <div className="text-text-primary font-mono">{log.uniqueKey}</div>
                              <div className="text-text-muted">{new Date(log.timestamp).toLocaleString()}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-text-secondary">{log.aiModel}</div>
                            <div className="text-text-muted">{log.attempts} attempts</div>
                          </div>
                        </div>
                      ))}
                      {recentLogs.length === 0 && (
                        <div className="text-center py-12 text-text-muted italic">
                          No activity recorded yet
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {saving && (
            <div className="fixed bottom-8 right-8 bg-brand-green text-bg-dark px-4 py-2 rounded-full font-bold shadow-2xl flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Saving Changes...
            </div>
          )}
        </div>
      </div>
    );
  }
