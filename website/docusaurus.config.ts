import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "SmartPad Docs",
  tagline: "Text-first computation docs",
  favicon: "img/logo.svg",
  url: "https://nmaxcom.github.io",
  baseUrl: "/SmartPad/docs/",
  trailingSlash: true,
  organizationName: "nmaxcom",
  projectName: "SmartPad",
  onBrokenLinks: "throw",
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },
  presets: [
    [
      "classic",
      {
        docs: {
          path: "docs",
          routeBasePath: "/",
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/nmaxcom/SmartPad/tree/main/website/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    image: "img/logo.svg",
    navbar: {
      title: "SmartPad Docs",
      items: [
        { to: "/", label: "Docs", position: "left" },
        { href: "https://github.com/nmaxcom/SmartPad", label: "GitHub", position: "right" },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [{ label: "Overview", to: "/" }],
        },
        {
          title: "Project",
          items: [{ label: "SmartPad App", href: "https://nmaxcom.github.io/SmartPad/" }],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} SmartPad`,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
