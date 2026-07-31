import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Split Tally',
  tagline: 'Finance without forms: a voice-native ledger with a market for what you are owed',
  favicon: 'img/favicon.svg',

  future: {
    v4: true,
  },

  // GitHub Pages.
  url: 'https://zzaved.github.io',
  baseUrl: '/Split-Tally/',
  organizationName: 'zzaved',
  projectName: 'Split-Tally',
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'throw',

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  themes: ['@docusaurus/theme-mermaid'],

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: 'docs',
          editUrl: 'https://github.com/zzaved/Split-Tally/tree/main/documentation/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.png',
    colorMode: {
      // The product is Ink on Cream. The documentation follows it rather than
      // defaulting to a dark theme that would misrepresent the thing it
      // describes.
      defaultMode: 'light',
      respectPrefersColorScheme: true,
    },
    mermaid: {
      theme: {light: 'neutral', dark: 'dark'},
    },
    navbar: {
      title: 'Split Tally',
      logo: {
        alt: 'Split Tally',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://split-tally-seven.vercel.app',
          label: 'Live app',
          position: 'right',
        },
        {
          href: 'https://github.com/zzaved/Split-Tally',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'light',
      links: [
        {
          title: 'Read',
          items: [
            {label: 'Start here', to: '/docs/intro'},
            {label: 'How the AI works', to: '/docs/how-it-works/ai-integration'},
            {label: 'Judging alignment', to: '/docs/judging-alignment'},
          ],
        },
        {
          title: 'Use',
          items: [
            {label: 'Live app', href: 'https://split-tally-seven.vercel.app'},
            {label: 'Run it yourself', to: '/docs/using-it/setup-and-deployment'},
          ],
        },
        {
          title: 'Source',
          items: [
            {label: 'GitHub', href: 'https://github.com/zzaved/Split-Tally'},
            {label: 'Markdown copy of these docs', href: 'https://github.com/zzaved/Split-Tally/tree/main/documentation/markdown'},
          ],
        },
      ],
      copyright: 'Split Tally, built by Pablo Azevedo for the AI Designathon @ MERGE 2026.',
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
