import React, { useEffect, useState, useRef } from 'react';
import { BookOpen, CopyCheck, TrendingUp, AlertTriangle, BrainCircuit, ArrowUpRight, RefreshCw, MoreVertical } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, BarChart, Bar, AreaChart, Area } from 'recharts';
import { api } from '../services/api'; 
import { Card, PageHeader, StatCard, Loading, ErrorMessage, Button } from '../components/UI';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  
  const load = () => api('/dashboard').then(setData).catch(e => setError(e.message));
  
  useEffect(() => { load() }, []);
  
  if (!data && !error) return <Loading />;
  
  return (
    <>
      <PageHeader 
        title="Library Overview" 
        subtitle="Real-time collection health, borrowing trends, and ML demand signals." 
        action={<Button onClick={load} variant="secondary"><RefreshCw size={16}/> Refresh</Button>}
      />
      <ErrorMessage message={error} />
      
      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <StatCard label="Total Catalog Titles" value={data.total_books} icon={BookOpen} detail="Unique books available" trend="+12% from last month" trendUp={true} />
            <StatCard label="Physical Copies" value={data.total_copies} icon={CopyCheck} detail={`${data.available_copies} copies currently on shelf`} />
            <StatCard label="Issues This Month" value={data.issues_this_month} icon={TrendingUp} detail="Active reader engagement" trend="+5.2% from last month" trendUp={true} />
            <StatCard label="Low-Stock Alerts" value={data.low_stock_books} icon={AlertTriangle} detail="Titles with ≤ 2 copies available" variant="warning" />
            <StatCard label="High-Demand Books" value={data.high_demand_books} icon={ArrowUpRight} detail="Sustained borrowing velocity" />
            <StatCard label="Predicted ML Demand" value={data.predicted_next_month_demand || '—'} icon={BrainCircuit} detail="Forecasted total issues next month" variant="indigo" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card className="lg:col-span-2">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white/50">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Monthly Borrowing Demand</h3>
                  <p className="text-xs text-slate-500 font-medium">Historical issue transactions over time</p>
                </div>
                <div className="px-2.5 py-1 text-[10px] font-bold tracking-wider bg-indigo-50 text-indigo-600 rounded-md uppercase">Historical</div>
              </div>
              <div className="h-[300px] p-6">
                {data.monthly_demand?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.monthly_demand} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIssues" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }} />
                      <Area type="monotone" dataKey="issues" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorIssues)" activeDot={{ r: 6, fill: '#4F46E5', stroke: '#fff', strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">No issue history yet.</div>
                )}
              </div>
            </Card>

            <Card className="flex flex-col h-[400px] lg:h-auto">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Top Demanded Books</h3>
                  <p className="text-xs text-slate-500 font-medium">Ranked by total issues</p>
                </div>
                <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={16}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {data.top_books?.length ? (
                  data.top_books.slice(0, 6).map((b, i) => (
                    <div key={b.id || i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group">
                      <div className="w-12 h-16 shrink-0 bg-slate-100 rounded-md overflow-hidden border border-slate-200 flex items-center justify-center relative shadow-sm">
                        {b.image_url ? (
                          <img src={`http://localhost:8000${b.image_url}`} alt={b.title} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                        ) : null}
                        <div className={`absolute inset-0 flex flex-col items-center justify-center text-slate-300 ${b.image_url ? 'hidden' : 'flex'}`}>
                          <BookOpen size={18} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">{b.title}</h4>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs font-medium text-slate-500 truncate">{b.author || 'Unknown'}</span>
                          <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{b.issues} issues</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">No book issue records yet.</div>
                )}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-800">Demand by Subject</h3>
                <p className="text-xs text-slate-500 font-medium">Issue distribution across categories</p>
              </div>
              <div className="h-[280px] p-6">
                {data.category_demand?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.category_demand}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#64748B' }} interval={0} angle={-25} textAnchor="end" height={65} axisLine={false} tickLine={false} dy={5} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="issues" fill="#0EA5E9" radius={[4, 4, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">Analytics will appear after importing data.</div>
                )}
              </div>
            </Card>

            <Card>
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-red-50/30">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Low-Stock Alerts</h3>
                  <p className="text-xs text-slate-500 font-medium">Titles requiring librarian review</p>
                </div>
                <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider bg-red-100 text-red-700 rounded-md uppercase">Action Required</span>
              </div>
              <div className="p-2">
                {data.low_stock?.length ? (
                  data.low_stock.slice(0, 6).map(b => (
                    <div className="flex justify-between items-center p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 rounded-lg transition-colors" key={b.id}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0">
                          <AlertTriangle size={14} />
                        </div>
                        <div>
                          <b className="text-sm font-bold text-slate-800 block leading-tight">{b.title}</b>
                          <small className="text-[11px] font-medium text-slate-500">{b.total_copies} total copies in catalog</small>
                        </div>
                      </div>
                      <span className="text-xs font-bold bg-red-100 text-red-700 px-3 py-1 rounded-full whitespace-nowrap shadow-sm border border-red-200">
                        {b.available_copies} left
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-10 text-center text-sm font-medium text-slate-400">No low-stock titles detected.</div>
                )}
              </div>
            </Card>
          </div>

          <Card>
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Recent Transactions</h3>
              <p className="text-xs text-slate-500 font-medium">Latest circulation activity</p>
            </div>
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr>
                    <th className="bg-slate-50 px-6 py-3.5 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">Tx Code</th>
                    <th className="bg-slate-50 px-6 py-3.5 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">Book ID</th>
                    <th className="bg-slate-50 px-6 py-3.5 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">Department</th>
                    <th className="bg-slate-50 px-6 py-3.5 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">Issue Date</th>
                    <th className="bg-slate-50 px-6 py-3.5 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recent_transactions?.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-medium text-slate-600">{t.transaction_code}</td>
                      <td className="px-6 py-4 font-medium text-slate-700">BK-{String(t.book_id).padStart(4, '0')}</td>
                      <td className="px-6 py-4 text-slate-600">{t.department}</td>
                      <td className="px-6 py-4 text-slate-600">{t.issue_date}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${t.status === 'returned' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!data.recent_transactions?.length && (
                    <tr><td colSpan="5" className="px-6 py-8 text-center text-sm text-slate-400">Recent issues will show here.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
