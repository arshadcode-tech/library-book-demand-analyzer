import React, { useEffect, useState, useRef } from 'react';
import { Plus, Search, Trash2, Edit3, BookOpen, UploadCloud, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Button, Card, ErrorMessage, PageHeader, Loading } from '../components/UI';

const empty = { isbn: '', title: '', author: '', category: 'Programming', publisher: '', publication_year: '', department: 'Computer Science', total_copies: 1, available_copies: 1, shelf_location: 'A-01', image_url: '' };

export default function Books() {
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const load = () => api('/books?limit=500').then(setBooks).catch(e => setError(e.message));
  useEffect(() => { load() }, []);

  const filtered = books.filter(b => [b.title, b.author, b.isbn, b.category].some(v => v.toLowerCase().includes(search.toLowerCase())));

  const change = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploadingImage(true);
    try {
      const token = localStorage.getItem('token') || ''; // if auth is added later
      const res = await fetch('http://localhost:8000/api/upload/image', {
        method: 'POST',
        body: formData,
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }
      const data = await res.json();
      setForm(prev => ({ ...prev, image_url: data.url }));
    } catch (err) {
      alert(err.message);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = () => setForm(prev => ({ ...prev, image_url: '' }));

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = { 
        ...form, 
        publication_year: form.publication_year ? Number(form.publication_year) : null, 
        total_copies: Number(form.total_copies), 
        available_copies: Number(form.available_copies) 
      };
      await api(editing ? `/books/${editing}` : '/books', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      setShow(false);
      setEditing(null);
      setForm(empty);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const edit = b => {
    setEditing(b.id);
    setForm({ ...b, publication_year: b.publication_year || '', image_url: b.image_url || '' });
    setShow(true);
  };

  const del = async b => {
    if (!confirm(`Delete “${b.title}”?`)) return;
    try {
      await api(`/books/${b.id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <PageHeader 
        title="Book Inventory" 
        subtitle="Manage library catalog, categories, covers, and copy availability." 
        action={<Button onClick={() => { setEditing(null); setForm(empty); setShow(true); }}><Plus size={16}/> Add Book</Button>}
      />
      <ErrorMessage message={error} />
      
      {show && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{editing ? 'Edit Book Details' : 'Add New Book'}</h3>
                <p className="text-xs font-medium text-slate-500 mt-1">Fields marked with * are required.</p>
              </div>
              <button onClick={() => setShow(false)} className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-full shadow-sm border border-slate-200 transition-all">
                <X size={20}/>
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1">
              <ErrorMessage message={error} />
              <form id="book-form" onSubmit={submit} className="flex flex-col gap-8">
                <div className="flex flex-col md:flex-row gap-10">
                
                {/* Left Col: Image Upload */}
                <div className="w-full md:w-64 shrink-0 flex flex-col gap-3">
                  <label className="text-sm font-bold text-slate-700">Book Cover Image</label>
                  
                  <div className="relative group rounded-xl overflow-hidden bg-slate-50 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all aspect-[2/3] flex flex-col items-center justify-center text-center px-4">
                    {form.image_url ? (
                      <>
                        <img src={`http://localhost:8000${form.image_url}`} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button type="button" onClick={removeImage} className="bg-white/90 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg hover:bg-white flex items-center gap-1">
                            <Trash2 size={14}/> Remove
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={32} className="text-slate-300 mb-2 group-hover:text-indigo-400 transition-colors" />
                        <span className="text-xs font-medium text-slate-500 group-hover:text-indigo-600 transition-colors">
                          {uploadingImage ? 'Uploading...' : 'Click to upload or drag image here'}
                        </span>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          accept="image/png, image/jpeg, image/jpg, image/webp" 
                          onChange={handleImageUpload} 
                          disabled={uploadingImage}
                        />
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 text-center font-medium">Recommended: JPG/PNG, 2:3 ratio, max 5MB</p>
                </div>

                {/* Right Col: Form Fields */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 content-start">
                  {[
                    ['isbn', 'ISBN *', 'text'],
                    ['title', 'Book Title *', 'text'],
                    ['author', 'Author *', 'text'],
                    ['category', 'Subject / Category *', 'text'],
                    ['publisher', 'Publisher', 'text'],
                    ['publication_year', 'Publication Year', 'number'],
                    ['department', 'Department', 'text'],
                    ['total_copies', 'Total Copies *', 'number'],
                    ['available_copies', 'Available Copies *', 'number'],
                    ['shelf_location', 'Shelf Location', 'text']
                  ].map(([name, label, type]) => (
                    <div className="form-group mb-0" key={name}>
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 block">{label}</label>
                      <input 
                        required={label.includes('*')} 
                        type={type} 
                        min={type === 'number' ? 0 : undefined} 
                        value={form[name] ?? ''} 
                        name={name} 
                        onChange={change}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                      />
                    </div>
                  ))}
                </div>
                </div>
                
                <div className="-mx-8 -mb-8 mt-2 px-8 py-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                  <Button type="button" variant="secondary" onClick={() => setShow(false)}>Cancel</Button>
                  <Button type="submit" disabled={busy || uploadingImage}>
                    {busy ? 'Saving...' : (editing ? 'Save Changes' : 'Add Book')}
                  </Button>
                </div>
              </form>
            </div>

          </div>
        </div>
      )}
      
      <Card>
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/50">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-3">
              Catalog Directory 
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-bold">{filtered.length}</span>
            </h3>
            <p className="text-xs font-medium text-slate-500 mt-1">Search by title, author, ISBN or subject</p>
          </div>
          <div className="flex items-center px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all w-full sm:w-80 shadow-sm">
            <Search size={16} className="text-slate-400 mr-2 shrink-0" />
            <input 
              placeholder="Search inventory..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-medium w-full text-slate-700 placeholder:text-slate-400"
            />
          </div>
        </div>
        
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr>
                <th className="bg-slate-50 px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">Book Details</th>
                <th className="bg-slate-50 px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">ISBN</th>
                <th className="bg-slate-50 px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">Category</th>
                <th className="bg-slate-50 px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 text-center">Stock</th>
                <th className="bg-slate-50 px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">Location</th>
                <th className="bg-slate-50 px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(b => (
                <tr key={b.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-14 shrink-0 bg-slate-100 rounded border border-slate-200 flex items-center justify-center relative overflow-hidden shadow-sm">
                        {b.image_url ? (
                          <img src={`http://localhost:8000${b.image_url}`} alt={b.title} className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <BookOpen size={16} className="text-slate-300" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-[200px] max-w-[300px]">
                        <Link to={`/books/${b.id}`} className="font-bold text-slate-800 truncate group-hover:text-indigo-700 hover:underline transition-colors block">
                          {b.title}
                        </Link>
                        <span className="text-xs font-medium text-slate-500 truncate mt-0.5">{b.author}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs font-medium text-slate-600">{b.isbn}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-bold">{b.category}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`text-sm font-bold ${b.available_copies === 0 ? 'text-red-600' : 'text-slate-800'}`}>
                        {b.available_copies} <span className="text-slate-400 font-medium text-xs">/ {b.total_copies}</span>
                      </span>
                      {b.available_copies <= 2 && b.available_copies > 0 && <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 mt-1">Low Stock</span>}
                      {b.available_copies === 0 && <span className="text-[9px] font-bold uppercase tracking-wider text-red-600 mt-1">Out of Stock</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-600">{b.shelf_location}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit" onClick={() => edit(b)}>
                        <Edit3 size={16}/>
                      </button>
                      <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete" onClick={() => del(b)}>
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-sm font-medium text-slate-400 bg-slate-50/50">
                    No books found. Add a title or adjust your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
