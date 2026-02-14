module.exports = function prismIncludeLanguages(PrismObject) {
  const Prism = PrismObject;

  Prism.languages.smartpad = {
    warning: /⚠️[^\n]*/,
    result: /=>/,
    variable: {
      pattern: /(^|\n)\s*[A-Za-z_][\w ]*(?=\s*=)/,
      lookbehind: true,
    },
    keyword: /\b(?:to|in)\b/,
    currency: /[$€£¥₹₿]\d+(?:\.\d+)?/,
    unit: /\b(?:USD|EUR|GBP|JPY|INR|BTC|CHF|CAD|AUD|kg|g|mg|lb|m|cm|mm|km|mi|ft|in|s|min|h|hr|hrs|day|days|week|weeks|month|months|year|years|N|lbf|K|C|F|%)\b/,
    number: /\b\d+(?:\.\d+)?(?:e[+\-]?\d+)?\b/i,
    operator: /[+\-*/^=]/,
  };
};
