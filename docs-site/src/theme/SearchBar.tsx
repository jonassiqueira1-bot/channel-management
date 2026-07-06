import { useState } from 'react';
import { useHistory } from '@docusaurus/router';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const history = useHistory();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      history.push(`/?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 8, padding: '0 12px', height: 36,
        transition: 'background 0.15s',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Pesquisar..."
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            color: '#fff', fontSize: 13, width: 160,
          }}
        />
      </div>
    </form>
  );
}
