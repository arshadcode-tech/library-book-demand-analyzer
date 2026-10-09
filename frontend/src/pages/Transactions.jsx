import React, { useEffect, useState } from 'react';
import { ArrowLeftRight, Check, CornerDownLeft, Search, Calendar, Clock } from 'lucide-react';
import { api } from '../services/api';
import { Button, Card, ErrorMessage, PageHeader, Loading } from '../components/UI';

export default function Transactions() {
  const [txs, setTxs] = useState([]);
  const [books, setBooks] = useState([]);
  const [issueForm, setIssueForm] = useState({ book_id: '', student_code: '', due_date: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState('issue');
  const [search, setSearch] = useState('');

  const load = () => {
    api('/transactions').then(setTxs).catch(e => setError(e.message));
    api('/books?limit=500').then(setBooks).catch(e => setError(e.message));
  };
  
  useEffect(() => { load() }, []);

  const handleIssue = async e => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/transactions/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: Number(issueForm.book_id),
          student_code: issueForm.student_code,
          due_date: issueForm.due_date
        })
      });
      setIssueForm({ book_id: '', student_code: '', due_date: '' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleReturn = async tx => {
    if (!confirm(`Process return for ${tx.transaction_code}?`)) return;
    try {
      await api(`/transactions/${tx.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ return_date: new Date().toISOString().split('T')[0] })
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const filtered = txs.filter(t => t.transaction_code.toLowerCase().includes(search.toLowerCase()) || t.department.toLowerCase().includes(search.toLowerCase()));
  const availableBooks = books.filter(b => b.available_copies > 0);

  return (
    <>
      <PageHeader 
        title="Circulation Desk" 
        subtitle="Manage book checkouts, returns, and view active transactions." 
      />
      <ErrorMessage message={error} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Action Panel */}
        <Card className="lg:col-span-1">
          <div className="flex border-b border-slate-100">
            <button 
              className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'issue' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
              onClick={() => setActiveTab('issue')}
            >
              Issue Book
            </button>
            <button 
              className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'return' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
              onClick={() => setActiveTab('return')}
            >
              Quick Return
            </button>
          </div>
          
          <div className="p-6">
            {activeTab === 'issue' ? (
              <form onSubmit={handleIssue} className="flex flex-col gap-4">
                <div className="form-group mb-0">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 block">Select Book *</label>
                  <select 
                    required 
                    value={issueForm.book_id} 
                    onChange={e => setIssueForm({...issueForm, book_id: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                  >
                    <option value="" disabled>Choose a book...</option>
                    {availableBooks.map(b => (
                      <option key={b.id} value={b.id}>{b.title} ({b.available_copies} left)</option>
                    ))}
                  </select>
                </div>
                <div className="form-group mb-0">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 block">Student Code *</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="e.g. STU-001"
                    value={issueForm.student_code} 
                    onChange={e => setIssueForm({...issueForm, student_code: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 block">Due Date *</label>
                  <input 
                    required 
                    type="date" 
                    value={issueForm.due_date} 
                    onChange={e => setIssueForm({...issueForm, due_date: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                  />
                </div>
                <Button type="submit" disabled={busy} className="mt-2 w-full justify-center">
                  {busy ? 'Processing...' : 'Complete Issue'}
                </Button>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                  <CornerDownLeft size={28} />
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">Quick Return</h4>
                <p className="text-xs text-slate-500 font-medium px-4">Find the transaction in the list below and click the Return button to process it instantly.</p>
              </div>
            )}
          </div>
        </Card>

        {/* Transactions List */}
        <Card className="lg:col-span-2 flex flex-col h-full min-h-[500px]">
          <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/50">
            <div>
              <h3 className="text-base font-bold text-slate-800">Transaction History</h3>
              <p className="text-xs font-medium text-slate-500 mt-1">Recent issues and returns</p>
            </div>
            <div className="flex items-center px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all w-full sm:w-64 shadow-sm">
              <Search size={16} className="text-slate-400 mr-2 shrink-0" />
              <input 
                placeholder="Search tx code..." 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-sm font-medium w-full text-slate-700 placeholder:text-slate-400"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr>
                  <th className="bg-slate-50 px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">Tx Code</th>
                  <th className="bg-slate-50 px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">Book ID</th>
                  <th className="bg-slate-50 px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">Student</th>
                  <th className="bg-slate-50 px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 text-center">Status</th>
                  <th className="bg-slate-50 px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-700">{t.transaction_code}</td>
                    <td className="px-6 py-4 font-medium text-slate-600">BK-{String(t.book_id).padStart(4, '0')}</td>
                    <td className="px-6 py-4 text-slate-600 font-medium">Stu #{t.student_id}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${t.status === 'returned' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {t.status === 'issued' ? (
                        <button 
                          onClick={() => handleReturn(t)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm"
                        >
                          <CornerDownLeft size={14}/> Return
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600">
                          <Check size={14}/> Returned
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-sm font-medium text-slate-400 bg-slate-50/50">
                      No transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
