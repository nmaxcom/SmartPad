require('ts-node/register/transpile-only');

const fs = require('node:fs');
const path = require('node:path');
const { parseLine } = require('../src/parsing/astParser');
const { defaultRegistry } = require('../src/eval');
const { ReactiveVariableStore } = require('../src/state/variableStore');
const { recordEquationFromNode } = require('../src/solve/equationStore');

const createContext = () => ({
  variableStore: new ReactiveVariableStore(),
  variableContext: new Map(),
  functionStore: new Map(),
  equationStore: [],
  lineNumber: 1,
  decimalPlaces: 6,
});

const syncVariables = (context) => {
  context.variableContext.clear();
  context.variableStore.getAllVariables().forEach((variable) => {
    context.variableContext.set(variable.name, variable);
  });
};

const evaluateLine = (line, context, lineNumber) => {
  const node = parseLine(line, lineNumber);
  context.lineNumber = lineNumber;
  const result = defaultRegistry.evaluate(node, context);
  recordEquationFromNode(node, context.equationStore || []);
  syncVariables(context);
  return result;
};

const cases = [
  { id: 1, title: 'Constant multiplication without spaces', input: '23*PI=>', expectedPattern: /72\.256/i },
  { id: 2, title: 'Constant multiplication reversed order', input: 'PI*23=>', expectedPattern: /72\.256/i },
  { id: 3, title: 'Implicit multiplication number-parentheses', input: '2(3+4)=>', expectedPattern: /14\b/ },
  { id: 4, title: 'Implicit multiplication between grouped expressions', input: '(2+3)(4+5)=>', expectedPattern: /45\b/ },
  { id: 5, title: 'Unary minus with exponent precedence', input: '-2^2=>', expectedPattern: /-?4\b/ },
  { id: 6, title: 'Parenthesized negative base exponent', input: '(-2)^2=>', expectedPattern: /4\b/ },
  { id: 7, title: 'Function call without parentheses style', input: 'abs -4=>', expectedPattern: /4\b/ },
  { id: 8, title: 'PI rounding helper', input: 'round(PI,2)=>', expectedPattern: /3\.14/ },
  { id: 9, title: 'Max helper without function parentheses', input: 'max 3,7=>', expectedPattern: /7\b/ },
  { id: 10, title: 'Chained function and decimal', input: 'sqrt(16)+2.5=>', expectedPattern: /6\.5/ },

  { id: 11, title: 'Phrase percentage with spaced variable name', setup: ['discount=15%', 'base price=$120.50'], input: 'discount off base price =>', expectedPattern: /102\.425|102\.43/ },
  { id: 12, title: 'Tax on phrase-result variable', setup: ['discount=15%', 'base price=$120.50', 'final price=discount off base price=>', 'tax=8%'], input: 'tax on final price =>', expectedPattern: /110\./ },
  { id: 13, title: 'As-percent without spaces', input: '20/80 as %=>', expectedPattern: /25\s*%/i },
  { id: 14, title: 'Part-of-base is percent compact form', input: '20 of 80 is %=>', expectedPattern: /25\s*%/i },
  { id: 15, title: 'Percent of unit value no spaces around of', input: '10% of 155N=>', expectedPattern: /15\.5\s*N/i },
  { id: 16, title: 'Percent on scalar', input: '5% on 100=>', expectedPattern: /105\b/ },
  { id: 17, title: 'Percent off scalar', input: '5% off 100=>', expectedPattern: /95\b/ },
  { id: 18, title: 'Variable ratio as percent compact', setup: ['numerator=20', 'denominator=80'], input: 'numerator/denominator as %=>', expectedPattern: /25\s*%/i },
  { id: 19, title: 'Add percentage shorthand', input: '80+20%=>', expectedPattern: /96\b/ },
  { id: 20, title: 'Sequential percentage subtraction', input: '500-10%-5%=>', expectedPattern: /427\.5|427\.50/ },

  { id: 21, title: 'Unit arithmetic no spaces', input: '2km+300m=>', expectedPattern: /2\.3\s*km|2300\s*m/i },
  { id: 22, title: 'Mixed imperial-metric add', input: '1ft+1m=>', expectedPattern: /1\.3048\s*m|4\.2808\s*ft/i },
  { id: 23, title: 'Rate multiplied by duration compact', input: '9L/min*18min=>', expectedPattern: /162\s*L/i },
  { id: 24, title: 'Speed conversion mph to m/s', input: '60mph to m/s=>', expectedPattern: /26\.8|26\.82/i },
  { id: 25, title: 'Data throughput conversion', input: '24Mbit/s to MB/s=>', expectedPattern: /3\s*MB\/s/i },
  { id: 26, title: 'Squared unit conversion', input: '100 cm^2 to m^2=>', expectedPattern: /0\.01\s*m\^2/i },
  { id: 27, title: 'Exponent suffix form', input: '4^2m=>', expectedPattern: /16\s*m/i },
  { id: 28, title: 'Derived unit conversion to N', input: '1kg*m/s^2 to N=>', expectedPattern: /1\s*N\b/i },
  { id: 29, title: 'RPM to Hz conversion', input: '1200rpm to Hz=>', expectedPattern: /20\s*Hz/i },
  { id: 30, title: 'US gallon to liter conversion compact', input: '2gal to L=>', expectedPattern: /7\.57|7\.571/i },

  { id: 31, title: 'Date month carry no spaces', input: '2024-01-31+1 month=>', expectedPattern: /2024-02-29/ },
  { id: 32, title: 'Date plus exact days no spaces', input: '2024-01-31+30 days=>', expectedPattern: /2024-03-01/ },
  { id: 33, title: 'Business-day addition compact', input: '2024-11-25+5 business days=>', expectedPattern: /2024-12-02/ },
  { id: 34, title: 'Business-day subtraction compact', input: '2024-12-02-1 business day=>', expectedPattern: /2024-11-29/ },
  { id: 35, title: 'Time plus duration compact', input: '19:30+5h20min3s=>', expectedPattern: /00:50:03/ },
  { id: 36, title: 'Time minus duration compact', input: '00:10-45min=>', expectedPattern: /23:25/ },
  { id: 37, title: 'Today keyword compact spacing', input: 'today+10 days=>', expectedPattern: /\d{4}-\d{2}-\d{2}/ },
  { id: 38, title: 'Relative weekday lowercase', input: 'next monday+2 weeks=>', expectedPattern: /\d{4}-\d{2}-\d{2}/ },
  { id: 39, title: 'Date range explicit duration step', input: '2026-01-01..2026-01-05 step 1 day=>', expectedPattern: /2026-01-05/ },
  { id: 40, title: 'Time range explicit duration step', input: '09:00..11:00 step 30 min=>', expectedPattern: /11:00/ },

  { id: 41, title: 'List sum with compact assignment', setup: ['costs=$12,$15,$9'], input: 'sum(costs)=>', expectedPattern: /36/ },
  { id: 42, title: 'Average with direct list args', input: 'avg($12,$15,$9)=>', expectedPattern: /12/ },
  { id: 43, title: 'Total over mixed-distance list', setup: ['lengths=3m,25m,48km'], input: 'total(lengths)=>', expectedPattern: /48\.028\s*km|48028\s*m/i },
  { id: 44, title: 'Where filter over currency list', setup: ['costs=$12,$15,$9'], input: 'costs where > $10=>', expectedPattern: /\$12.*\$15/i },
  { id: 45, title: 'Typing order variable dependency', setup: ['x = 2*y', 'y=3'], input: 'x=>', expectedPattern: /6\b/ },
  { id: 46, title: 'Typing order with deferred formula', setup: ['total = price*qty', 'price=3', 'qty=4'], input: 'total=>', expectedPattern: /12\b/ },
  { id: 47, title: 'Explicit solve with inline knowns', setup: ['distance=40m', 'time=2s'], input: 'solve v in distance = v * time =>', expectedPattern: /20\s*m\/s|v\s*=\s*20/i },
  { id: 48, title: 'Store and convert unit result', setup: ['result=2km+300m=>'], input: 'result to km=>', expectedPattern: /2\.3\s*km/i },
  { id: 49, title: 'Locale-style date slash input', input: '06/05/2024=>', expectNonError: true },
  { id: 50, title: 'Thousands separator in assignment value', setup: ['a=2000=>'], input: 'b=2,000=>', expectedPattern: /2000|2,000/ },
];

if (cases.length !== 50) {
  throw new Error(`Expected 50 cases, got ${cases.length}`);
}

const runCase = (testCase) => {
  const context = createContext();
  const setupResults = [];
  let setupFailed = false;
  let lineNumber = 1;

  for (const setupLine of testCase.setup || []) {
    const setupResult = evaluateLine(setupLine, context, lineNumber++);
    setupResults.push({ line: setupLine, result: setupResult });
    if (setupResult?.type === 'error') {
      setupFailed = true;
      break;
    }
  }

  let result = null;
  if (!setupFailed) {
    result = evaluateLine(testCase.input, context, lineNumber);
  }

  const resultText = result?.result || result?.displayText || '';
  const displayText = result?.displayText || resultText || '';
  let passed = !setupFailed && result?.type !== 'error';
  let reason = '';

  if (setupFailed) {
    reason = `setup error: ${setupResults[setupResults.length - 1]?.result?.error || 'unknown setup error'}`;
  } else if (result?.type === 'error') {
    reason = result.error || result.displayText || 'runtime error';
  } else if (testCase.expectedPattern && !testCase.expectedPattern.test(String(resultText))) {
    passed = false;
    reason = `unexpected output: ${resultText || displayText}`;
  } else if (testCase.expectNonError && result?.type === 'error') {
    passed = false;
    reason = result.error || 'unexpected error';
  }

  return {
    id: testCase.id,
    title: testCase.title,
    setup: testCase.setup || [],
    input: testCase.input,
    passed,
    reason,
    output: resultText || displayText,
  };
};

const startedAt = new Date().toISOString();
const results = cases.map(runCase);
const failed = results.filter((entry) => !entry.passed);
const passed = results.filter((entry) => entry.passed);

const lines = [];
lines.push('# Temporary Edge Exploration Report');
lines.push('');
lines.push(`- Generated at: ${startedAt}`);
lines.push(`- Total cases: ${results.length}`);
lines.push(`- Passed: ${passed.length}`);
lines.push(`- Failed: ${failed.length}`);
lines.push('');
lines.push('## Failing Cases');
lines.push('');
if (failed.length === 0) {
  lines.push('- None');
} else {
  for (const entry of failed) {
    lines.push(`### Case ${entry.id}: ${entry.title}`);
    lines.push(`- Setup: ${entry.setup.length ? entry.setup.join(' | ') : '(none)'}`);
    lines.push(`- Input: \`${entry.input}\``);
    lines.push(`- Reason: ${entry.reason}`);
    lines.push(`- Output: ${entry.output || '(none)'}`);
    lines.push('');
  }
}

lines.push('## All Cases');
lines.push('');
lines.push('| # | Case | Input | Status | Output |');
lines.push('|---|---|---|---|---|');
for (const entry of results) {
  const status = entry.passed ? 'PASS' : 'FAIL';
  const output = (entry.output || '').replace(/\|/g, '\\|');
  lines.push(`| ${entry.id} | ${entry.title} | \`${entry.input}\` | ${status} | ${output} |`);
}

const reportDir = path.join(process.cwd(), 'artifacts');
const reportPath = path.join(reportDir, 'temporary-edge-test-report.md');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');

console.log('Temporary edge exploration complete.');
console.log(`Total: ${results.length} | Passed: ${passed.length} | Failed: ${failed.length}`);
console.log(`Report: ${reportPath}`);
if (failed.length > 0) {
  console.log('Failing case IDs:', failed.map((entry) => entry.id).join(', '));
}
