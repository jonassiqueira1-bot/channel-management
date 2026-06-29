import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Boostly Docs',
  tagline: 'Documentação da plataforma Boostly',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://docs.boostly.com.br',
  baseUrl: '/',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'pt-BR',
    locales: ['pt-BR'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/docs',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Boostly',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentação',
          to: '/docs/intro',
        },
        {
          href: 'https://boostly.com.br',
          label: 'Acessar plataforma',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `© ${new Date().getFullYear()} Boostly. Todos os direitos reservados.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
