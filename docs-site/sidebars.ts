import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'category',
      label: 'Introdução',
      collapsed: false,
      items: ['intro', 'primeiros-passos'],
    },

    // ── Módulos principais ──────────────────────────────────────────
    {
      type: 'category',
      label: 'Módulos principais',
      collapsed: false,
      items: [
        'modulos/dashboard',
        'modulos/pipeline',
        'modulos/empresas',
        'modulos/contatos',
        'modulos/vendedores',
        'modulos/franquias',
        'modulos/parceiros',
        'modulos/tarefas',
        'modulos/acoes',
        'modulos/metas',
        'modulos/campanhas',
        'modulos/contratos',
        'modulos/pagamentos',
        'modulos/comissoes',
        'modulos/projetos',
        'modulos/fechamento-horas',
        'modulos/questionarios',
        'modulos/documentos',
        'modulos/playbooks',
        'modulos/customer-success',
        'modulos/relatorios',
      ],
    },

    // ── Configurações ───────────────────────────────────────────────
    {
      type: 'category',
      label: 'Configurações',
      items: [
        {
          type: 'category',
          label: 'Organização',
          items: [
            'configuracoes/empresa',
            'configuracoes/minha-conta',
            'configuracoes/parceiros',
            'configuracoes/maturidade-parceiros',
          ],
        },
        {
          type: 'category',
          label: 'Segurança',
          items: [
            'configuracoes/usuarios',
            'configuracoes/perfis-acesso',
            'configuracoes/equipes',
          ],
        },
        {
          type: 'category',
          label: 'Regras do canal',
          items: [
            'configuracoes/habilitacoes',
            'configuracoes/produtos',
            'configuracoes/funis',
            'configuracoes/tipos-acoes',
            'configuracoes/campanhas',
            'configuracoes/indicadores',
            'configuracoes/metas',
          ],
        },
        {
          type: 'category',
          label: 'Multi-filial',
          items: ['configuracoes/compartilhamento'],
        },
        {
          type: 'category',
          label: 'Sistema',
          items: [
            'configuracoes/config-campos',
            'configuracoes/alertas',
            'configuracoes/integracoes',
            'configuracoes/logs',
          ],
        },
      ],
    },

    // ── Integrações ─────────────────────────────────────────────────
    {
      type: 'category',
      label: 'Integrações',
      items: ['integracoes/webhook', 'integracoes/mapeamento-de-campos'],
    },

    // ── Alertas ─────────────────────────────────────────────────────
    {
      type: 'category',
      label: 'Alertas',
      items: ['alertas/configurando-regras'],
    },

    // ── Administração ───────────────────────────────────────────────
    {
      type: 'category',
      label: 'Administração',
      items: ['admin/usuarios', 'admin/configuracoes'],
    },

    // ── Acesso à plataforma ─────────────────────────────────────────
    {
      type: 'category',
      label: 'Acesso à plataforma',
      items: [
        'publico/login',
        'publico/recuperar-senha',
        'publico/aceitar-convite',
      ],
    },
  ],
};

export default sidebars;
