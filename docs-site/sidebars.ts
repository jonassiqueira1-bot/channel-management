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
    {
      type: 'category',
      label: 'Pipeline de Vendas',
      items: ['pipeline/visao-geral', 'pipeline/funis', 'pipeline/oportunidades'],
    },
    {
      type: 'category',
      label: 'Integrações',
      items: ['integracoes/webhook', 'integracoes/mapeamento-de-campos'],
    },
    {
      type: 'category',
      label: 'Alertas',
      items: ['alertas/configurando-regras'],
    },
    {
      type: 'category',
      label: 'Administração',
      items: ['admin/usuarios', 'admin/configuracoes'],
    },
  ],
};

export default sidebars;
