import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

const categories = [
  {
    icon: '📊', title: 'Dashboard', desc: 'KPIs e indicadores personalizáveis',
    to: '/docs/modulos/dashboard',
  },
  {
    icon: '🎯', title: 'Pipeline de Vendas', desc: 'Oportunidades em kanban com funis',
    to: '/docs/modulos/pipeline',
  },
  {
    icon: '🤝', title: 'Customer Success', desc: 'Saúde dos clientes e framework LAER',
    to: '/docs/modulos/customer-success',
  },
  {
    icon: '✅', title: 'Tarefas', desc: 'Atividades com prioridades e vínculos',
    to: '/docs/modulos/tarefas',
  },
  {
    icon: '🏗️', title: 'Projetos', desc: 'Implementações pós-venda com kanban MIT',
    to: '/docs/modulos/projetos',
  },
  {
    icon: '💰', title: 'Comissões', desc: 'Regras de cálculo e repasse',
    to: '/docs/modulos/comissoes',
  },
];

const settings = [
  { icon: '🏢', title: 'Empresa & Filiais', to: '/docs/configuracoes/empresa' },
  { icon: '👥', title: 'Usuários & Perfis', to: '/docs/configuracoes/usuarios' },
  { icon: '🔗', title: 'Integrações', to: '/docs/configuracoes/integracoes' },
  { icon: '🔔', title: 'Alertas', to: '/docs/configuracoes/alertas' },
  { icon: '🎯', title: 'Metas & KPIs', to: '/docs/configuracoes/metas' },
  { icon: '🔀', title: 'Funis de Venda', to: '/docs/configuracoes/funis' },
  { icon: '🤝', title: 'Parceiros', to: '/docs/configuracoes/parceiros' },
  { icon: '📦', title: 'Produtos', to: '/docs/configuracoes/produtos' },
  { icon: '📋', title: 'Campos customizados', to: '/docs/configuracoes/config-campos' },
];

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title="Documentação" description="Central de ajuda Boostly">
      <div className={styles.hero}>
        <h1>Como podemos ajudar?</h1>
        <p>Documentação completa da plataforma Boostly</p>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Buscar artigos..."
            onFocus={(e) => {
              const btn = document.querySelector<HTMLButtonElement>('.DocSearch-Button');
              if (btn) { e.currentTarget.blur(); btn.click(); }
            }}
            readOnly
          />
          <kbd className={styles.searchKbd}>⌘K</kbd>
        </div>
      </div>

      <main className={styles.main}>
        <section>
          <h2 className={styles.sectionLabel}>Módulos principais</h2>
          <div className={styles.grid}>
            {categories.map((c) => (
              <Link key={c.to} to={c.to} className={styles.card}>
                <span className={styles.cardIcon}>{c.icon}</span>
                <strong>{c.title}</strong>
                <p>{c.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className={styles.sectionLabel}>Configurações</h2>
          <div className={styles.gridSm}>
            {settings.map((s) => (
              <Link key={s.to} to={s.to} className={styles.cardSm}>
                <span>{s.icon}</span>
                <span>{s.title}</span>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className={styles.sectionLabel}>Primeiros passos</h2>
          <div className={styles.gridSm}>
            <Link to="/docs/intro" className={styles.cardSm}><span>📖</span><span>O que é o Boostly?</span></Link>
            <Link to="/docs/primeiros-passos" className={styles.cardSm}><span>🚀</span><span>Primeiros passos</span></Link>
            <Link to="/docs/publico/aceitar-convite" className={styles.cardSm}><span>📧</span><span>Aceitar convite</span></Link>
            <Link to="/docs/publico/recuperar-senha" className={styles.cardSm}><span>🔑</span><span>Recuperar senha</span></Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
