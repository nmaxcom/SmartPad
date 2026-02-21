import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docsSidebar: [
    "intro",
    {
      type: "category",
      label: "Start Here",
      items: [
        "guides/getting-started",
        "guides/syntax-playbook",
        "guides/units-reference",
        "guides/examples-gallery",
        "guides/troubleshooting",
        "guides/feature-map",
      ],
    },
    "specs/index",
    {
      type: "category",
      label: "Core Experience",
      items: [
        "specs/live-results",
        "specs/result-chips-and-references",
        "specs/plotting-and-dependency-views",
      ],
    },
    {
      type: "category",
      label: "Math and Units",
      items: [
        "specs/currency-and-fx",
        "specs/duration-and-time-values",
      ],
    },
    {
      type: "category",
      label: "Data and Collections",
      items: [
        "specs/lists",
        "specs/ranges",
        "specs/locale-date-time",
      ],
    },
    {
      type: "category",
      label: "Workspace",
      items: [
        "specs/file-management",
      ],
    },
  ],
};

export default sidebars;
