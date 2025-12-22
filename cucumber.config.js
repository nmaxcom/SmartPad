module.exports = {
  default: {
    require: [
      "tests/features/support/playwright-setup.ts", // Load Playwright setup first
      "tests/features/step_definitions/*.ts", // Load TypeScript step definitions
    ],
    requireModule: ["ts-node/register"], // Enable TypeScript support
    format: ["progress", "json:cucumber-report.json"],
    publish: false,
    parallel: 1, // Disable parallel execution for now since we're using Playwright
    timeout: 60000, // Increase timeout for browser operations
  },
};
