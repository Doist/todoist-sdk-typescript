import { themes as prismThemes } from 'prism-react-renderer'
import type { Config } from '@docusaurus/types'
import type * as Preset from '@docusaurus/preset-classic'

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
    title: 'Todoist SDK',
    tagline: 'The official TypeScript API client for the Todoist Sync API.',
    favicon: 'img/favicon.ico',

    url: 'https://todoist.github.io/',
    // Set the /<baseUrl>/ pathname under which your site is served
    // For GitHub pages deployment, it is often '/<projectName>/'
    baseUrl: '/todoist-sdk-typescript/',

    organizationName: 'todoist',
    projectName: 'todoist-sdk-typescript',

    onBrokenLinks: 'throw',
    onBrokenMarkdownLinks: 'warn',

    // Even if you don't use internationalization, you can use this field to set
    // useful metadata like html lang. For example, if your site is Chinese, you
    // may want to replace "en" with "zh-Hans".
    i18n: {
        defaultLocale: 'en',
        locales: ['en'],
    },

    presets: [
        [
            'classic',
            {
                docs: { sidebarPath: './sidebars.ts', routeBasePath: '/' },
                theme: {
                    customCss: './src/css/custom.css',
                },
                blog: false,
            } satisfies Preset.Options,
        ],
    ],

    themeConfig: {
        image: 'img/todoist-social-card.png',
        navbar: {
            title: 'Todoist SDK',
            logo: {
                alt: 'Todoist Logo',
                src: 'img/todoist-logo.svg',
            },
            items: [
                {
                    position: 'left',
                    label: 'Docs',
                    to: '/',
                },
                {
                    href: 'https://github.com/todoist/todoist-sdk-typescript',
                    label: 'GitHub',
                    position: 'right',
                },
            ],
        },
        footer: {
            style: 'dark',
            links: [
                {
                    title: 'Docs',
                    items: [
                        {
                            label: 'About',
                            to: '/',
                        },
                        {
                            label: 'Authorization',
                            to: '/authorization',
                        },
                    ],
                },
                {
                    title: 'More',
                    items: [
                        {
                            label: 'Engineering at Doist',
                            href: 'https://doist.dev',
                        },
                        {
                            label: 'GitHub',
                            href: 'https://github.com/todoist/todoist-sdk-typescript',
                        },
                    ],
                },
            ],
        },
        prism: {
            theme: prismThemes.github,
            darkTheme: prismThemes.dracula,
        },
    } satisfies Preset.ThemeConfig,

    plugins: [
        [
            'docusaurus-plugin-typedoc',
            {
                plugin: ['typedoc-plugin-zod'],
                out: './docs/api',
                entryPoints: ['../src/index.ts'],
                entryFileName: '',
                outputFileStrategy: 'members',
                readme: 'none',
                tsconfig: '../tsconfig.docs.json',
                useCodeBlocks: true,
                sanitizeComments: true,
                sidebar: { autoConfiguration: true },
                disableSources: true,
                expandObjects: true,
                expandParameters: true,
                excludeNotDocumented: true,
                excludeNotDocumentedKinds: ['Variable'],
                pageTitleTemplates: { member: '{name}' },

                /**
                 * Table formatting
                 */
                parametersFormat: 'table',
                interfacePropertiesFormat: 'table',
                classPropertiesFormat: 'table',
                typeDeclarationFormat: 'table',
                propertyMembersFormat: 'table',
                enumMembersFormat: 'table',
                indexFormat: 'table',
                tableColumnSettings: { hideInherited: true },
            },
        ],
    ],
}

export default config
