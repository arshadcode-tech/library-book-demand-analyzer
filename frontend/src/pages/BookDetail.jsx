import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BookOpen, CopyCheck, ArrowLeft, Calendar, User, Tag, MapPin, Building, ArrowLeftRight } from 'lucide-react';
import { api } from '../services/api';
import { Card, PageHeader, Loading, ErrorMessage, Button } from '../components/UI';

export default function BookDetail() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [txs, setTxs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api(`/books/${id}`),
      api(`/transactions?book_id=${id}`)
    ])
    .then(([b, t]) => {
      setBook(b);
      setTxs(t);
      setLoading(false);
    })
    .catch(e => {
      setError(e.message);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <Loading />;
  if (error && !book) return <ErrorMessage message={error} />;

  return (
    <>
      <div className="mb-6">
        <Link to="/books" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">
          <ArrowLeft size={16} /> Back to Inventory
        </Link>
      </div>

      {book && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Col: Cover and Quick Info */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6 flex flex-col items-center text-center">
              <div className="w-48 h-72 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-md flex items-center justify-center relative mb-6">
                {book.image_url ? (
                  <img src={`http://localhost:8000${book.image_url}`} alt={book.title} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <BookOpen size={48} className="text-slate-300" />
                )}
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-2 leading-tight">{book.title}</h1>
              <p className="text-sm font-medium text-slate-500 mb-4">{book.author}</p>
              
              <div className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-bold mb-2 ${book.available_copies > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                <CopyCheck size={18} />
                {book.available_copies > 0 ? `${book.available_copies} Copies Available` : 'Currently Out of Stock'}
              </div>
              <p className="text-xs font-medium text-slate-500">
                {book.total_copies - book.available_copies} of {book.total_copies} currently issued
              </p>
            </Card>

            <Card>
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800">Quick Details</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><Tag size={16}/></div>
                  <div><p className="text-xs text-slate-500 font-medium">ISBN</p><p className="text-sm font-bold text-slate-700 font-mono">{book.isbn}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><Building size={16}/></div>
                  <div><p className="text-xs text-slate-500 font-medium">Department</p><p className="text-sm font-bold text-slate-700">{book.department}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><MapPin size={16}/></div>
                  <div><p className="text-xs text-slate-500 font-medium">Location</p><p className="text-sm font-bold text-slate-700">{book.shelf_location}</p></div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Col: Expanded Details and History */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
                <BookOpen size={20} className="text-indigo-600"/>
                <h3 className="text-lg font-bold text-slate-800">Publication Information</h3>
              </div>
              <div className="p-6 grid grid-cols-2 gap-y-6 gap-x-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Category / Subject</label>
                  <span className="text-sm font-medium text-slate-800 px-3 py-1 bg-slate-100 rounded-md inline-block">{book.category}</span>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Publisher</label>
                  <span className="text-sm font-bold text-slate-700">{book.publisher || 'Unknown'}</span>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Publication Year</label>
                  <span className="text-sm font-bold text-slate-700">{book.publication_year || '—'}</span>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Date Added to Catalog</label>
                  <span className="text-sm font-bold text-slate-700">{book.date_added || '—'}</span>
                </div>
              </div>
            </Card>

            <Card>
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white/50">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight size={20} className="text-indigo-600"/>
                  <h3 className="text-lg font-bold text-slate-800">Circulation History</h3>
                </div>
                <span className="px-2.5 py-1 text-xs font-bold tracking-wider bg-slate-100 text-slate-600 rounded-lg">{txs.length} total records</span>
              </div>
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr>
                      <th className="bg-slate-50 px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">Tx Code</th>
                      <th className="bg-slate-50 px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">Student</th>
                      <th className="bg-slate-50 px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">Issue Date</th>
                      <th className="bg-slate-50 px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {txs.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs font-medium text-slate-600">{t.transaction_code}</td>
                        <td className="px-6 py-4 text-slate-700 font-medium">Stu #{t.student_id}</td>
                        <td className="px-6 py-4 text-slate-600">{t.issue_date}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${t.status === 'returned' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!txs.length && (
                      <tr><td colSpan="4" className="px-6 py-12 text-center text-sm font-medium text-slate-400">No borrowing history for this book yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
