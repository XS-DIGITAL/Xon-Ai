import { useState, useEffect } from 'react';
import { Key, Shield, Plus, Trash2, Send, RefreshCw, CheckCircle2, AlertCircle, Globe, Zap, Lock, BarChart3, Activity, History, CreditCard, User, ExternalLink, ArrowRight } from 'lucide-react';
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
  const [view, setView] = useState<'landing' | 'admin' | 'user' | 'purchase'>('landing');
  const [activeTab, setActiveTab] = useState<'config' | 'monitoring' | 'payments'>('config');
  const [stats, setStats] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [paymentStats, setPaymentStats] = useState<any[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [fetchingStats, setFetchingStats] = useState(false);
  
  // User Dashboard State
  const [userKeyData, setUserKeyData] = useState<any>(null);
  const [userStats, setUserStats] = useState<any[]>([]);
  const [userLogs, setUserLogs] = useState<any[]>([]);
  const [userKeyInput, setUserKeyInput] = useState("");
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState("");
  
  // Purchase State
  const [purchaseEmail, setPurchaseEmail] = useState("");
  const [purchaseType, setPurchaseType] = useState<'subscription' | 'onetime'>('subscription');
  const [purchasedKey, setPurchasedKey] = useState("");
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [flwConfig, setFlwConfig] = useState<{ publicKey: string; planId: string | null } | null>(null);

  useEffect(() => {
    // Load Flutterwave Config
    const fetchFlwConfig = async () => {
      try {
        const res = await axios.get('/api/pay/config');
        setFlwConfig(res.data);
      } catch (err) {
        console.error("Failed to fetch FLW config", err);
      }
    };
    fetchFlwConfig();

    // Load Flutterwave Script
    const script = document.createElement('script');
    script.src = 'https://checkout.flutterwave.com/v3.js';
    script.async = true;
    document.body.appendChild(script);

    const params = new URLSearchParams(window.location.search);
    const adminId = params.get('id');
    const keyParam = params.get('key');
    const secretId = import.meta.env.VITE_ADMIN_ID;

    if (adminId && secretId && adminId.trim() === secretId.trim()) {
      setIsAdmin(true);
      setView('admin');
      fetchConfig();
      fetchStats();
    } else if (keyParam) {
      handleUserLogin(keyParam);
    } else {
      setLoading(false);
    }

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleUserLogin = async (key: string) => {
    setUserLoading(true);
    setUserError("");
    try {
      const res = await axios.post('/api/user/dashboard', { key });
      setUserKeyData(res.data.userKey);
      setUserStats(res.data.stats);
      setUserLogs(res.data.recentLogs);
      setUserKeyInput(key);
      setView('user');
    } catch (err: any) {
      setUserError(err.response?.data?.error || "Failed to access dashboard");
    } finally {
      setUserLoading(false);
      setLoading(false);
    }
  };

  const handleFlutterwavePayment = () => {
    if (!purchaseEmail) {
      alert("Please enter your email");
      return;
    }

    const amount = purchaseType === 'subscription' ? 2 : 20;
    const tx_ref = `xon_${Date.now()}`;

    const config: any = {
      public_key: flwConfig?.publicKey || import.meta.env.VITE_FLW_PUBLIC_KEY || "FLWPUBK_TEST-SANDBOX-X",
      tx_ref,
      amount,
      currency: "USD",
      payment_options: "card,mobilemoney,ussd",
      customer: {
        email: purchaseEmail,
        name: "Xon AI User",
      },
      customizations: {
        title: "Xon AI Unique Key",
        description: purchaseType === 'subscription' ? "Monthly Subscription ($2/mo)" : "Lifetime Key ($20)",
        logo: "https://xon-ai.com/logo.png",
      },
      callback: (data: any) => {
        if (data.status === "successful") {
          verifyPayment(data.transaction_id);
        }
      },
      onclose: () => {
        console.log("Payment modal closed");
      }
    };

    if (purchaseType === 'subscription' && flwConfig?.planId) {
      config.payment_plan = flwConfig.planId;
    }

    (window as any).FlutterwaveCheckout(config);
  };

  const verifyPayment = async (transaction_id: string) => {
    setVerifyingPayment(true);
    try {
      const res = await axios.post('/api/pay/verify', {
        transaction_id,
        email: purchaseEmail,
        type: purchaseType
      });
      if (res.data.success) {
        setPurchasedKey(res.data.key);
      }
    } catch (err: any) {
      alert("Payment verification failed. Please contact support.");
    } finally {
      setVerifyingPayment(false);
    }
  };

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
      setPaymentStats(res.data.paymentStats || []);
      setTotalEarnings(res.data.totalEarnings || 0);
      setRecentPayments(res.data.recentPayments || []);
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

  // --- RENDER VIEWS ---

  // 1. LANDING PAGE
  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-bg-dark text-text-primary flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl w-full text-center"
        >
          <div className="w-24 h-24 bg-brand-green rounded-3xl flex items-center justify-center mx-auto mb-10 shadow-[0_0_50px_rgba(34,197,94,0.4)]">
            <Zap className="text-bg-dark w-12 h-12" />
          </div>
          <h1 className="text-6xl font-black tracking-tighter mb-6">
            Xon Ai <span className="text-brand-green">Platform</span>
          </h1>
          <p className="text-xl text-text-secondary mb-12 max-w-2xl mx-auto leading-relaxed">
            Enterprise-grade API rollover system. Scale your AI applications with guaranteed uptime and smart key management.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <button 
              onClick={() => setView('purchase')}
              className="group bg-brand-green hover:bg-brand-green-dark text-bg-dark p-8 rounded-2xl transition-all flex flex-col items-center gap-4 shadow-xl hover:scale-[1.02]"
            >
              <CreditCard className="w-10 h-10" />
              <div className="text-center">
                <div className="text-xl font-bold">Get Unique Key</div>
                <div className="text-sm opacity-80">Start from $2/month</div>
              </div>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </button>

            <div className="bg-surface p-8 rounded-2xl border border-surface-hover shadow-xl flex flex-col gap-4">
              <User className="w-10 h-10 text-accent-blue mx-auto" />
              <div className="text-center">
                <div className="text-xl font-bold">User Dashboard</div>
                <div className="text-sm text-text-secondary">Monitor your key usage</div>
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Enter your key..."
                  value={userKeyInput}
                  onChange={(e) => setUserKeyInput(e.target.value)}
                  className="flex-1 bg-bg-dark border border-surface-hover rounded-lg px-3 py-2 text-sm focus:border-accent-blue outline-none"
                />
                <button 
                  onClick={() => handleUserLogin(userKeyInput)}
                  disabled={userLoading || !userKeyInput.trim()}
                  className="bg-accent-blue hover:bg-blue-600 text-bg-dark p-2 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {userLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                </button>
              </div>
              {userError && <p className="text-xs text-red-400 mt-1">{userError}</p>}
            </div>
          </div>

          <div className="mt-16 flex items-center justify-center gap-8 text-text-muted">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span className="text-sm">Secure Payments</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              <span className="text-sm">Instant Activation</span>
            </div>
          </div>

          {/* API Documentation Section */}
          <section className="mt-20 bg-surface rounded-3xl border border-surface-hover shadow-2xl overflow-hidden text-left">
            <div className="p-8 border-b border-surface-hover bg-brand-green/5">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Globe className="text-brand-green" />
                API Documentation
              </h2>
            </div>
            
            <div className="p-8">
              <div className="space-y-8">
                {/* Endpoint */}
                <div>
                  <h3 className="text-xs font-bold uppercase text-text-muted mb-3 tracking-widest">Endpoint</h3>
                  <div className="flex items-center gap-2 bg-bg-dark p-4 rounded-lg border border-surface-hover">
                    <span className="px-2 py-1 bg-brand-green text-bg-dark text-[10px] font-black rounded">POST</span>
                    <code className="text-sm font-mono text-text-primary">/api/platform</code>
                  </div>
                </div>

                {/* Parameters */}
                <div>
                  <h3 className="text-xs font-bold uppercase text-text-muted mb-3 tracking-widest">Request Body</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-text-secondary border-b border-surface-hover">
                          <th className="pb-4 font-bold">Parameter</th>
                          <th className="pb-4 font-bold">Type</th>
                          <th className="pb-4 font-bold">Description</th>
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
          </section>

          <footer className="mt-20 text-center text-text-muted text-sm pb-12">
            © 2026 Xon Ai • Enterprise API Solutions
          </footer>
        </motion.div>
      </div>
    );
  }

  // 2. PURCHASE PAGE
  if (view === 'purchase') {
    return (
      <div className="min-h-screen bg-bg-dark text-text-primary p-6 md:p-12">
        <div className="max-w-4xl mx-auto">
          <button 
            onClick={() => setView('landing')}
            className="text-text-secondary hover:text-brand-green mb-8 flex items-center gap-2 transition-colors"
          >
            <ArrowRight className="w-4 h-4 rotate-180" /> Back to Home
          </button>

          <header className="mb-12">
            <h2 className="text-4xl font-bold mb-4">Get Your <span className="text-brand-green">Unique Key</span></h2>
            <p className="text-text-secondary">Choose a plan that fits your needs. Keys are generated instantly after payment.</p>
          </header>

          {purchasedKey ? (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-surface p-10 rounded-3xl border-2 border-brand-green text-center shadow-[0_0_50px_rgba(34,197,94,0.1)]"
            >
              <div className="w-20 h-20 bg-brand-green/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="text-brand-green w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Payment Successful!</h3>
              <p className="text-text-secondary mb-8">Your unique access key has been generated. Please save it securely.</p>
              
              <div className="bg-bg-dark p-6 rounded-2xl border border-surface-hover mb-8 relative group">
                <code className="text-3xl font-mono text-brand-green break-all">{purchasedKey}</code>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(purchasedKey);
                    alert("Key copied to clipboard!");
                  }}
                  className="absolute top-2 right-2 p-2 bg-surface rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <History className="w-4 h-4" />
                </button>
              </div>

              <button 
                onClick={() => handleUserLogin(purchasedKey)}
                className="bg-brand-green text-bg-dark font-bold px-8 py-3 rounded-xl hover:bg-brand-green-dark transition-all"
              >
                Go to Dashboard
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-surface p-6 rounded-2xl border border-surface-hover">
                  <label className="block text-xs font-bold uppercase text-text-muted mb-3">Your Email Address</label>
                  <input 
                    type="email" 
                    placeholder="email@example.com"
                    value={purchaseEmail}
                    onChange={(e) => setPurchaseEmail(e.target.value)}
                    className="w-full bg-bg-dark border border-surface-hover rounded-xl px-4 py-3 focus:border-brand-green outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <button 
                    onClick={() => setPurchaseType('subscription')}
                    className={`p-6 rounded-2xl border-2 transition-all text-left flex justify-between items-center ${purchaseType === 'subscription' ? 'border-brand-green bg-brand-green/5' : 'border-surface-hover bg-surface hover:border-text-muted'}`}
                  >
                    <div>
                      <div className="font-bold text-lg">Subscription</div>
                      <div className="text-sm text-text-secondary">Billed monthly</div>
                    </div>
                    <div className="text-2xl font-black text-brand-green">$2<span className="text-sm font-normal">/mo</span></div>
                  </button>

                  <button 
                    onClick={() => setPurchaseType('onetime')}
                    className={`p-6 rounded-2xl border-2 transition-all text-left flex justify-between items-center ${purchaseType === 'onetime' ? 'border-accent-orange bg-accent-orange/5' : 'border-surface-hover bg-surface hover:border-text-muted'}`}
                  >
                    <div>
                      <div className="font-bold text-lg">Lifetime Access</div>
                      <div className="text-sm text-text-secondary">One-time payment</div>
                    </div>
                    <div className="text-2xl font-black text-accent-orange">$20</div>
                  </button>
                </div>

                <button 
                  onClick={handleFlutterwavePayment}
                  disabled={!purchaseEmail || verifyingPayment}
                  className="w-full bg-brand-green hover:bg-brand-green-dark text-bg-dark font-black py-5 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 text-lg disabled:opacity-50"
                >
                  {verifyingPayment ? <RefreshCw className="animate-spin" /> : <CreditCard />}
                  {verifyingPayment ? "Verifying..." : `Pay $${purchaseType === 'subscription' ? 2 : 20} Now`}
                </button>
                
                <p className="text-center text-xs text-text-muted">
                  Secure payment processed by Flutterwave.
                </p>
              </div>

              <div className="bg-surface p-8 rounded-2xl border border-surface-hover flex flex-col justify-center">
                <h3 className="text-xl font-bold mb-6">Plan Features</h3>
                <ul className="space-y-4">
                  {[
                    "Full API Access",
                    "Smart Key Rollover",
                    "Usage Monitoring",
                    "99.9% Uptime Guarantee",
                    purchaseType === 'onetime' ? "Never Expires" : "Cancel Anytime"
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-text-secondary">
                      <CheckCircle2 className="text-brand-green w-5 h-5" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. USER DASHBOARD
  if (view === 'user' && userKeyData) {
    const COLORS = {
      success: '#22c55e',
      error: '#ef4444',
      fallback: '#f97316'
    };

    const userChartData = userStats.map(s => ({
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
                <div className="w-10 h-10 bg-accent-blue rounded-lg flex items-center justify-center">
                  <User className="text-bg-dark w-6 h-6" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">User <span className="text-accent-blue">Dashboard</span></h1>
              </div>
              <p className="text-text-secondary">Monitoring for {userKeyData.email}</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className={`px-4 py-2 rounded-full border text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${userKeyData.status === 'active' ? 'border-brand-green/30 text-brand-green bg-brand-green/5' : 'border-red-500/30 text-red-500 bg-red-500/5'}`}>
                <div className={`w-2 h-2 rounded-full ${userKeyData.status === 'active' ? 'bg-brand-green animate-pulse' : 'bg-red-500'}`} />
                {userKeyData.status}
              </div>
              <button 
                onClick={() => setView('landing')}
                className="text-text-secondary hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="bg-surface p-6 rounded-2xl border border-surface-hover shadow-xl">
              <div className="text-text-secondary text-sm mb-1">Key Type</div>
              <div className="text-2xl font-bold capitalize text-white">{userKeyData.type}</div>
              {userKeyData.nextPaymentDate && (
                <div className="text-xs text-text-muted mt-2">Next Renewal: {new Date(userKeyData.nextPaymentDate).toLocaleDateString()}</div>
              )}
            </div>
            <div className="bg-surface p-6 rounded-2xl border border-surface-hover shadow-xl">
              <div className="text-text-secondary text-sm mb-1">Total Requests</div>
              <div className="text-2xl font-bold text-brand-green">
                {userStats.reduce((acc, s) => acc + s.count, 0)}
              </div>
            </div>
            <div className="bg-surface p-6 rounded-2xl border border-surface-hover shadow-xl">
              <div className="text-text-secondary text-sm mb-1">Success Rate</div>
              <div className="text-2xl font-bold text-accent-blue">
                {userStats.length > 0 ? Math.round((userStats.find(s => s._id === 'success')?.count || 0) / userStats.reduce((acc, s) => acc + s.count, 0) * 100) : 0}%
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-surface p-6 rounded-2xl border border-surface-hover shadow-xl">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-brand-green" />
                Usage Distribution
              </h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={userChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {userChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#f1f5f9' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-surface p-6 rounded-2xl border border-surface-hover shadow-xl">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <History className="w-5 h-5 text-accent-blue" />
                Recent Requests
              </h3>
              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                {userLogs.map((log, i) => (
                  <div key={i} className="flex items-center justify-between bg-bg-dark/50 p-3 rounded-lg border border-surface-hover text-[10px]">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        log.status === 'success' ? 'bg-green-500' : 
                        log.status === 'fallback' ? 'bg-orange-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <div className="text-text-primary">{log.aiModel}</div>
                        <div className="text-text-muted">{new Date(log.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="text-right text-text-muted">
                      {log.attempts} attempts
                    </div>
                  </div>
                ))}
                {userLogs.length === 0 && (
                  <div className="text-center py-10 text-text-muted italic">No requests recorded</div>
                )}
              </div>
            </div>
          </div>
        </div>
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
              <button 
                onClick={() => setActiveTab('payments')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-bold ${activeTab === 'payments' ? 'bg-brand-green text-bg-dark' : 'text-text-secondary hover:text-text-primary'}`}
              >
                <CreditCard className="w-4 h-4" />
                Payments
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

            {activeTab === 'payments' && (
              <motion.div 
                key="payments"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-surface p-6 rounded-2xl border border-surface-hover shadow-xl">
                    <div className="text-text-secondary text-sm mb-1 uppercase tracking-wider font-bold">Total Earnings</div>
                    <div className="text-4xl font-black text-brand-green">${totalEarnings.toFixed(2)}</div>
                    <div className="text-xs text-text-muted mt-2">Gross revenue across all keys</div>
                  </div>
                  <div className="bg-surface p-6 rounded-2xl border border-surface-hover shadow-xl">
                    <div className="text-text-secondary text-sm mb-1 uppercase tracking-wider font-bold">Subscriptions</div>
                    <div className="text-4xl font-black text-accent-blue">
                      {paymentStats.find(p => p._id === 'subscription')?.count || 0}
                    </div>
                    <div className="text-xs text-text-muted mt-2">Active & recurring monthly plans</div>
                  </div>
                  <div className="bg-surface p-6 rounded-2xl border border-surface-hover shadow-xl">
                    <div className="text-text-secondary text-sm mb-1 uppercase tracking-wider font-bold">One-time Sales</div>
                    <div className="text-4xl font-black text-accent-orange">
                      {paymentStats.find(p => p._id === 'onetime')?.count || 0}
                    </div>
                    <div className="text-xs text-text-muted mt-2">Lifetime access keys sold</div>
                  </div>
                </div>

                <div className="bg-surface rounded-2xl border border-surface-hover shadow-xl overflow-hidden">
                  <div className="p-6 border-b border-surface-hover flex items-center justify-between">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <History className="w-5 h-5 text-brand-green" />
                      Recent Transactions
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-bg-dark/50 text-text-secondary text-xs uppercase tracking-widest">
                          <th className="px-6 py-4 font-bold">Customer</th>
                          <th className="px-6 py-4 font-bold">Type</th>
                          <th className="px-6 py-4 font-bold">Amount</th>
                          <th className="px-6 py-4 font-bold">Date</th>
                          <th className="px-6 py-4 font-bold">Reference</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-hover">
                        {recentPayments.map((pay, i) => (
                          <tr key={i} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-white">{pay.email}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${pay.type === 'subscription' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>
                                {pay.type}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-bold text-brand-green">${pay.amount.toFixed(2)}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-xs text-text-muted">{new Date(pay.timestamp).toLocaleString()}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-[10px] font-mono text-text-muted truncate max-w-[100px]">{pay.flutterwaveRef}</div>
                            </td>
                          </tr>
                        ))}
                        {recentPayments.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-text-muted italic">
                              No transactions recorded yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
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
