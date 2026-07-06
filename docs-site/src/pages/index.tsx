import { useState, useEffect, useRef } from 'react';
import Link from '@docusaurus/Link';
import { useHistory, useLocation } from '@docusaurus/router';
import Layout from '@theme/Layout';
import styles from './index.module.css';

type Doc = { title: string; path: string; excerpt: string };

const categories = [
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
    title: 'Primeiros passos', desc: 'Como começar, criar conta e navegar pela plataforma', count: 2, to: '/docs/intro',
  },
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    title: 'Módulos principais', desc: 'Pipeline, Customer Success, Projetos, Tarefas, Comissões e mais', count: 21, to: '/docs/modulos/dashboard',
  },
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>,
    title: 'Configurações', desc: 'Usuários, perfis de acesso, funis, metas, integrações e muito mais', count: 19, to: '/docs/configuracoes/empresa',
  },
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    title: 'Integrações', desc: 'Conecte o Boostly ao RD Station, HubSpot, Webhooks e outros sistemas', count: 2, to: '/docs/integracoes/webhook',
  },
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    title: 'Alertas', desc: 'Configure regras de notificação automática para sua equipe', count: 1, to: '/docs/alertas/configurando-regras',
  },
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    title: 'Acesso à plataforma', desc: 'Login, recuperação de senha e aceite de convites', count: 3, to: '/docs/publico/login',
  },
];

function highlight(text: string, query: string) {
  if (!query) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((p, i) =>
    regex.test(p) ? <mark key={i} className={styles.mark}>{p}</mark> : p
  );
}

export default function Home() {
  const location = useLocation();
  const history = useHistory();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Doc[]>([]);
  const [manifest, setManifest] = useState<Doc[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/search-manifest.json').then(r => r.json()).then(setManifest).catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q') || '';
    setQuery(q);
    if (q && manifest.length) {
      const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
      setResults(manifest.filter(doc =>
        terms.every(t => (doc.title + ' ' + doc.excerpt).toLowerCase().includes(t))
      ));
    } else {
      setResults([]);
    }
  }, [location.search, manifest]);

  function handleSearch(value: string) {
    setQuery(value);
    if (value.trim()) {
      history.replace({ search: `?q=${encodeURIComponent(value.trim())}` });
    } else {
      history.replace({ search: '' });
    }
  }

  const showResults = query.trim().length > 0;

  return (
    <Layout title="Central de Ajuda" description="Documentação completa da plataforma Boostly">
      <div className={styles.hero}>
        <h1>No que podemos te ajudar?</h1>
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            className={styles.searchInput}
            type="text"
            placeholder="Pesquisar artigos..."
            value={query}
            onChange={e => handleSearch(e.target.value)}
            autoComplete="off"
          />
          {query && (
            <button className={styles.clearBtn} onClick={() => handleSearch('')} aria-label="Limpar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>

        {showResults && (
          <div className={styles.searchResults}>
            {results.length === 0 ? (
              <div className={styles.noResults}>Nenhum artigo encontrado para <strong>"{query}"</strong></div>
            ) : (
              results.map(doc => (
                <Link key={doc.path} to={doc.path} className={styles.resultItem}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.resultIcon}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <div>
                    <strong>{highlight(doc.title, query)}</strong>
                    <p>{highlight(doc.excerpt, query)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      {!showResults && (
        <main className={styles.main}>
          <div className={styles.list}>
            {categories.map((c) => (
              <Link key={c.to} to={c.to} className={styles.row}>
                <span className={styles.rowIcon}>{c.icon}</span>
                <div className={styles.rowBody}>
                  <strong>{c.title}</strong>
                  <p>{c.desc}</p>
                </div>
                <span className={styles.rowCount}>{c.count} artigos</span>
                <svg className={styles.rowArrow} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Link>
            ))}
          </div>
        </main>
      )}

      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} Boostly. Todos os direitos reservados.</span>
      </footer>
    </Layout>
  );
}
