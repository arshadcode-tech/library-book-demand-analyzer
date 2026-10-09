const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
export async function api(path, options={}) {
  const token = localStorage.getItem('token');
  if (token) {
    options.headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
  }
  const response=await fetch(`${BASE}${path}`,options);
  if(!response.ok){let message=`Request failed (${response.status})`;try{const body=await response.json();message=Array.isArray(body.detail)?body.detail.map(e=>`${e.loc.slice(-1)}: ${e.msg}`).join(', '):body.detail||message}catch{}throw new Error(message)}
  if(response.status===204)return null;
  const type=response.headers.get('content-type')||'';
  return type.includes('application/json')?response.json():response.blob();
}
export const download = async (path, filename) => { const blob=await api(path); const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url); };
