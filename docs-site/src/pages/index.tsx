import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import styles from './index.module.css';

const categories = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
      </svg>
    ),
    title: 'Primeiros passos',
    desc: 'Como começar, criar conta e navegar pela plataforma',
    count: 2,
    to: '/docs/intro',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
    title: 'Módulos principais',
    desc: 'Pipeline, Customer Success, Projetos, Tarefas, Comissões e mais',
    count: 21,
    to: '/docs/modulos/dashboard',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/>
      </svg>
    ),
    title: 'Configurações',
    desc: 'Usuários, perfis de acesso, funis, metas, integrações e muito mais',
    count: 19,
    to: '/docs/configuracoes/empresa',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
    ),
    title: 'Integrações',
    desc: 'Conecte o Boostly ao RD Station, HubSpot, Webhooks e outros sistemas',
    count: 2,
    to: '/docs/integracoes/webhook',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
    title: 'Alertas',
    desc: 'Configure regras de notificação automática para sua equipe',
    count: 1,
    to: '/docs/alertas/configurando-regras',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
    title: 'Acesso à plataforma',
    desc: 'Login, recuperação de senha e aceite de convites',
    count: 3,
    to: '/docs/publico/login',
  },
];

export default function Home() {
  return (
    <Layout title="Central de Ajuda" description="Documentação completa da plataforma Boostly">
      <div className={styles.hero}>
        <h1>No que podemos te ajudar?</h1>
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Pesquisar artigos..."
            readOnly
            onFocus={() => {
              const btn = document.querySelector<HTMLButtonElement>('.DocSearch-Button, [class*="searchBar"] button');
              btn?.click();
            }}
          />
        </div>
      </div>

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

      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} Boostly. Todos os direitos reservados.</span>
      </footer>
    </Layout>
  );
}
