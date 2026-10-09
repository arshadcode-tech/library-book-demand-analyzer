import React, { useState } from 'react';
import { BookOpen, Lock, User, ArrowRight } from 'lucide-react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const res = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (!res.ok) {
        throw new Error('Invalid username or password');
      }
      
      const data = await res.json();
      localStorage.setItem('token', data.token);
      onLogin(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/20 blur-[120px] rounded-full pointer-events-none"></div>
      
      <div className="w-full max-w-md p-8 bg-white/80 backdrop-blur-xl shadow-2xl shadow-indigo-900/5 rounded-3xl border border-white/50 relative z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 mx-auto mb-6">
            <BookOpen size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Library Demand Analyzer</h1>
          <p className="text-sm text-slate-500 mt-2 font-medium">Please sign in to access the dashboard</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold text-center border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Username</label>
            <div className="relative">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-slate-700"
                placeholder="Enter username"
              />
            </div>
          </div>
          
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-slate-700"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-slate-900/20 hover:shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 group"
          >
            {loading ? 'Signing in...' : 'Sign In'}
            {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>
        
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400 font-medium">Secured by Antigravity Auth</p>
        </div>
      </div>
    </div>
  );
}
