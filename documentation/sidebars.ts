import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

/**
 * Three top-level documents, then three categories. The split is deliberate:
 * what it is, how it is built, how to use it, and what shape the project is
 * in. Nothing belongs in two places and nothing is left over.
 */
const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    'problem-and-solution',
    'judging-alignment',
    {
      type: 'category',
      label: 'How it works',
      collapsed: false,
      items: [
        'how-it-works/architecture',
        'how-it-works/ai-integration',
        'how-it-works/the-ledger',
      ],
    },
    {
      type: 'category',
      label: 'Using it',
      collapsed: false,
      items: ['using-it/user-flows', 'using-it/setup-and-deployment'],
    },
    {
      type: 'category',
      label: 'Project',
      collapsed: false,
      items: [
        // First, because how this was built is the strongest answer to the
        // question the competition actually asks.
        'project/agents',
        'project/design-system',
        'project/quality',
        'project/roadmap',
        'project/team',
      ],
    },
  ],
};

export default sidebars;
