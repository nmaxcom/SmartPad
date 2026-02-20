import { defaultRegistry } from "../../src/eval";
import type { EvaluationContext } from "../../src/eval/registry";
import { parseLine } from "../../src/parsing/astParser";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import type { Variable } from "../../src/state/types";
import { recordEquationFromNode } from "../../src/solve/equationStore";

const createContext = (): EvaluationContext => ({
  variableStore: new ReactiveVariableStore(),
  variableContext: new Map<string, Variable>(),
  functionStore: new Map(),
  equationStore: [],
  lineNumber: 1,
  decimalPlaces: 6,
});

const syncVariables = (context: EvaluationContext) => {
  context.variableContext.clear();
  context.variableStore.getAllVariables().forEach((variable) => {
    context.variableContext.set(variable.name, variable);
  });
};

const evaluateLine = (
  line: string,
  context: EvaluationContext,
  lineNumber: number
) => {
  const node = parseLine(line, lineNumber);
  context.lineNumber = lineNumber;
  const result = defaultRegistry.evaluate(node, context);
  recordEquationFromNode(node, context.equationStore ?? []);
  syncVariables(context);
  return result;
};

const expectMathResult = (result: ReturnType<typeof evaluateLine>): string => {
  expect(result).toBeTruthy();
  expect(["mathResult", "combined"]).toContain(result?.type);
  return (result as any).result as string;
};

describe("Unit alias examples", () => {
  test("workweek rate conversion uses alias in compound unit", () => {
    const context = createContext();
    evaluateLine("workday = 8 h", context, 1);
    evaluateLine("workweek = 5 workday", context, 2);
    evaluateLine("salary = $20/h", context, 3);

    const result = evaluateLine("salary to $/workweek =>", context, 4);
    const output = expectMathResult(result);
    expect(output).toMatch(/\$?800\s*\/\s*workweek/);
  });

  test("alias in denominator converts back to base units", () => {
    const context = createContext();
    evaluateLine("workweek = 40 h", context, 1);
    evaluateLine("speed = 100 km/workweek", context, 2);

    const result = evaluateLine("speed to km/h =>", context, 3);
    const output = expectMathResult(result);
    expect(output).toMatch(/2\.5\s*km\/h/);
  });

  test("alias target preserves alias in output", () => {
    const context = createContext();
    evaluateLine("workweek = 40 h", context, 1);
    evaluateLine("time = 10 h", context, 2);

    const result = evaluateLine("time in workweek =>", context, 3);
    const output = expectMathResult(result);
    expect(output).toMatch(/0\.25\s*workweek/);
  });

  test("scaled alias behaves like a unit in arithmetic", () => {
    const context = createContext();
    evaluateLine("lap = 400 m", context, 1);
    evaluateLine("race = 10 lap", context, 2);

    const result = evaluateLine("race to km =>", context, 3);
    const output = expectMathResult(result);
    expect(output).toMatch(/4\s*km/);
  });

  test("alias conversions work with plural form inputs", () => {
    const context = createContext();
    evaluateLine("workweek = 40 h", context, 1);

    const result = evaluateLine("2 workweeks to h =>", context, 2);
    const output = expectMathResult(result);
    expect(output).toMatch(/80\s*h/);
  });

  test("alias-based rates combine with unit arithmetic", () => {
    const context = createContext();
    evaluateLine("shift = 8 h", context, 1);
    evaluateLine("line = 12 m/h", context, 2);

    const result = evaluateLine("line * shift =>", context, 3);
    const output = expectMathResult(result);
    expect(output).toMatch(/96\s*m/);
  });

  test("alias supports calendar-like naming without date math", () => {
    const context = createContext();
    evaluateLine("fortnight = 14 day", context, 1);

    const result = evaluateLine("1 year in fortnight =>", context, 2);
    const output = expectMathResult(result);
    expect(output).toMatch(/fortnight/);
  });

  test("content creation example converts time to workweeks", () => {
    const context = createContext();
    evaluateLine("writing = 500 words/h", context, 1);
    evaluateLine("book = 80000 words", context, 2);
    evaluateLine("workweek = 25 h", context, 3);

    const time = expectMathResult(
      evaluateLine("time to write = book / writing =>", context, 4)
    );
    expect(time).toMatch(/160\s*h/);

    const inWeeks = expectMathResult(evaluateLine("time to write in workweek =>", context, 5));
    expect(inWeeks).toMatch(/6\.4\s*workweek/);
  });

  test("manufacturing example yields batches from unit output", () => {
    const context = createContext();
    evaluateLine("batch = 10 kg", context, 1);
    evaluateLine("line rate = 12 units/h", context, 2);
    evaluateLine("shift = 8 h", context, 3);

    const output = expectMathResult(evaluateLine("output = line rate * shift =>", context, 4));
    expect(output).toMatch(/96\s*unit/);

    const perBatch = expectMathResult(evaluateLine("output to unit/batch =>", context, 5));
    expect(perBatch).toMatch(/9\.6\s*unit\/batch/);
  });

  test("per-person costs example keeps the person and month units", () => {
    const context = createContext();
    evaluateLine("household = 3 person", context, 1);
    evaluateLine("rent = $1500/month", context, 2);

    const result = expectMathResult(evaluateLine("rent / household =>", context, 3));
    expect(result).toMatch(/\$?500/);
    expect(result).toMatch(/person/);
    expect(result).toMatch(/month/);
  });

  test("currency rates can be converted using bare time units", () => {
    const context = createContext();
    evaluateLine("result = $33400", context, 1);
    const annual = expectMathResult(
      evaluateLine("annual salary = result / year =>", context, 2)
    );
    expect(annual).toMatch(/\$?33,?400\s*\/\s*year/);
    const monthly = expectMathResult(
      evaluateLine("monthly salary = annual salary to $/month =>", context, 3)
    );
    expect(monthly).toMatch(/\$?\d+(\.\d+)?\s*\/\s*month/);
    const weekly = expectMathResult(
      evaluateLine("weekly salary = annual salary to $/week =>", context, 4)
    );
    expect(weekly).toMatch(/\$?\d+(\.\d+)?\s*\/\s*week/);
  });

  test("cloud pricing example uses chained aliases", () => {
    const context = createContext();
    evaluateLine("Mreq = 1e6 request", context, 1);
    evaluateLine("api = $0.35/Mreq", context, 2);
    evaluateLine("traffic = 80 Mreq/month", context, 3);

    const result = expectMathResult(evaluateLine("cost = api * traffic =>", context, 4));
    expect(result).toMatch(/\$?28/);
    expect(result).toMatch(/month/);
  });

  test("food and recipe example scales per serving", () => {
    const context = createContext();
    evaluateLine("recipe = 8 serving", context, 1);
    evaluateLine("flour = 500 g", context, 2);

    const perServing = expectMathResult(
      evaluateLine("per serving = flour / recipe =>", context, 3)
    );
    expect(perServing).toMatch(/62\.5\s*g/);
    expect(perServing).toMatch(/serving/);

    evaluateLine("need = 3 serving", context, 4);
    const total = expectMathResult(evaluateLine("per serving * need =>", context, 5));
    expect(total).toMatch(/187\.5\s*g/);
  });

  test("energy and batteries example converts runtime to days", () => {
    const context = createContext();
    evaluateLine("battery = 60 Wh", context, 1);
    evaluateLine("draw = 7 W", context, 2);

    const runtime = expectMathResult(evaluateLine("runtime = battery / draw =>", context, 3));
    expect(runtime).toMatch(/8\.57/);
    expect(runtime).toMatch(/h/);

    const inDays = expectMathResult(evaluateLine("runtime in days =>", context, 4));
    expect(inDays).toMatch(/0\.357/);
    expect(inDays).toMatch(/day/);
  });

  test("defect rate example supports scaled conversion targets", () => {
    const context = createContext();
    evaluateLine("defects = 7 defect", context, 1);
    evaluateLine("production = 1200 unit", context, 2);

    const rate = expectMathResult(evaluateLine("rate = defects / production =>", context, 3));
    expect(rate).toMatch(/0\.00583/);
    expect(rate).toMatch(/defect/);
    expect(rate).toMatch(/unit/);

    const scaled = expectMathResult(
      evaluateLine("rate to defect/(1000 unit) =>", context, 4)
    );
    expect(scaled).toMatch(/5\.83/);
    expect(scaled).toMatch(/defect/);
    expect(scaled).toMatch(/1000 unit/);
  });

  test("data throughput pricing example aligns units before pricing", () => {
    const context = createContext();
    evaluateLine("byte = 1 unit", context, 1);
    evaluateLine("GB = 1e9 byte", context, 2);
    evaluateLine("TB = 1000 GB", context, 3);
    evaluateLine("egress = $0.09/GB", context, 4);
    evaluateLine("traffic = 12 TB/month", context, 5);
    evaluateLine("traffic_gb = traffic in GB/month", context, 6);

    const result = expectMathResult(evaluateLine("cost = egress * traffic_gb =>", context, 7));
    expect(result).toMatch(/\$?1080/);
    expect(result).toMatch(/month/);
  });

  test("information unit conversions support decimal and binary sizes", () => {
    const context = createContext();

    const decimal = expectMathResult(evaluateLine("2048 B to KB =>", context, 1));
    expect(decimal).toMatch(/2\.048\s*KB|2\.048\s*kB/);

    const binary = expectMathResult(evaluateLine("2048 B to KiB =>", context, 2));
    expect(binary).toMatch(/2\s*KiB/);

    const mebibyte = expectMathResult(evaluateLine("1 MiB to B =>", context, 3));
    expect(mebibyte).toMatch(/1,?048,?576\s*B/);
  });

  test("throughput conversions handle Mbit/s aliases and MB/s", () => {
    const context = createContext();

    const mbps = expectMathResult(evaluateLine("24 Mbit/s to MB/s =>", context, 1));
    expect(mbps).toMatch(/3\s*MB\/s/);

    const mbpsAlias = expectMathResult(evaluateLine("24 Mbps to MB/s =>", context, 2));
    expect(mbpsAlias).toMatch(/3\s*MB\/s/);
  });

  test("throughput multiplied by time yields equivalent total data forms", () => {
    const context = createContext();

    const megabits = expectMathResult(evaluateLine("6 Mb/s * 1.7 h to Mb =>", context, 1));
    expect(megabits).toMatch(/36,?720\s*Mb/);

    const gigabits = expectMathResult(evaluateLine("6 Mb/s * 1.7 h to Gb =>", context, 2));
    expect(gigabits).toMatch(/36\.72\s*Gb/);

    const megabytes = expectMathResult(evaluateLine("6 Mb/s * 1.7 h to MB =>", context, 3));
    expect(megabytes).toMatch(/4,?590\s*MB/);

    const gigabytes = expectMathResult(evaluateLine("6 Mb/s * 1.7 h to GB =>", context, 4));
    expect(gigabytes).toMatch(/4\.59\s*GB/);
  });

  test("download-time problems evaluate with information rates", () => {
    const context = createContext();

    const simple = expectMathResult(evaluateLine("100 MB / 25 MB/s =>", context, 1));
    expect(simple).toMatch(/4\s*s/);

    const larger = expectMathResult(evaluateLine("10 GB / 50 MB/s to s =>", context, 2));
    expect(larger).toMatch(/200\s*s/);
  });

  test("rate multiplied by time simplifies to total data unit", () => {
    const context = createContext();
    const result = expectMathResult(evaluateLine("6 MB/s * 2 h =>", context, 1));
    expect(result).toMatch(/43,?200\s*MB/);
  });

  test("bit-rate multiplied by time simplifies to total megabits", () => {
    const context = createContext();
    const result = expectMathResult(evaluateLine("6Mbit/s * 2 h to Mb =>", context, 1));
    expect(result).toMatch(/43,?200\s*Mb/);
  });

  test("custom typo units can compose arithmetically but cannot convert to information units", () => {
    const context = createContext();

    const raw = expectMathResult(evaluateLine("6dsbidt/s * 2 h =>", context, 1));
    expect(raw).toMatch(/43,?200\s*dsbidt/);

    const toMb = evaluateLine("6dsbidt/s * 2 h to MB =>", context, 2);
    expect(toMb?.type).toBe("error");
    expect((toMb as any).displayText).toMatch(/Cannot convert custom count units to information units/i);

    const toBits = evaluateLine("6dsbidt/s * 2 h to bit =>", context, 3);
    expect(toBits?.type).toBe("error");
    expect((toBits as any).displayText).toMatch(/Cannot convert custom count units to information units/i);
  });

  test("chemical mixing example keeps concentration units", () => {
    const context = createContext();
    evaluateLine("solution = 250 mL", context, 1);
    evaluateLine("salt = 5 g", context, 2);

    const concentration = expectMathResult(
      evaluateLine("concentration = salt / solution =>", context, 3)
    );
    expect(concentration).toMatch(/0\.02\s*g/);
    expect(concentration).toMatch(/mL/);

    evaluateLine("needml = 2000 mL", context, 4);
    const total = expectMathResult(
      evaluateLine("salt * (needml / solution) =>", context, 5)
    );
    expect(total).toMatch(/40\s*g/);
  });

  test("latency budget example converts to seconds", () => {
    const context = createContext();
    evaluateLine("p99 = 180 ms/request", context, 1);
    evaluateLine("budget = 1000 request", context, 2);

    const time = expectMathResult(evaluateLine("time = p99 * budget =>", context, 3));
    expect(time).toMatch(/(180000\s*ms|180\s*s)/);

    const inSeconds = expectMathResult(evaluateLine("time in s =>", context, 4));
    expect(inSeconds).toMatch(/180\s*s/);
  });

  test("dozen alias resolves as a countable unit", () => {
    const context = createContext();
    evaluateLine("dozen = 12 unit", context, 1);

    const result = expectMathResult(evaluateLine("3 dozen =>", context, 2));
    expect(result).toMatch(/36\s*unit|3\s*dozens?/);
  });

  test("pace converts using workday overrides", () => {
    const context = createContext();
    evaluateLine("workday = 8 h", context, 1);
    evaluateLine("workweek = 5 workday", context, 2);
    evaluateLine("day = workday", context, 3);
    evaluateLine("pace = 100 km/workweek", context, 4);

    const result = expectMathResult(evaluateLine("pace to km/day =>", context, 5));
    expect(result).toMatch(/20\s*km\/day/);
  });

  test("payload scaling example converts rocket to payload units", () => {
    const context = createContext();
    evaluateLine("t = 1000 kg", context, 1);
    evaluateLine("payload = 15 t", context, 2);
    evaluateLine("rocket = 550 t", context, 3);

    const result = expectMathResult(evaluateLine("rocket in payload =>", context, 4));
    expect(result).toMatch(/36\.6/);
    expect(result).toMatch(/payload/);
  });
});
