import {
  array,
  ContextEntry,
  failure,
  type OutputOf,
  record,
  string,
  success,
  type,
  Type,
  type TypeOf,
  ValidationError,
} from "io-ts";
import { pipe } from "fp-ts/function.js";
import { chain, isLeft } from "fp-ts/Either.js";

/**
 * Helps to manage automatically discovered dependencies for input files
 */
export class DependencyDiscoveryCache {
  private latestMtimeCache = new Map<string, Date>();

  private constructor(
    private cachePath: string,
    private deps: Map<string, DepEntry>,
    private discover: (path: string) => Promise<Set<string>>,
  ) { }

  public static async withFile(
    path: string,
    discover: (path: string) => Promise<Set<string>>,
  ): Promise<DependencyDiscoveryCache> {
    let text;
    try {
      text = await Deno.readTextFile(path);
    } catch (e: unknown) {
      if (e instanceof Deno.errors.NotFound) {
        return new DependencyDiscoveryCache(path, new Map(), discover);
      } else {
        throw e;
      }
    }
    const json = JSON.parse(text);
    const deps = DepsEntries.decode(json);
    if (isLeft(deps)) {
      const handleContext = (c: ContextEntry) => `    expected ${c.type.name} at ${c.key}; got ${c.actual ?? "nothing"}`;
      const handleError = (e: ValidationError) => {
        let msg = `  ${e.message ?? `invalid data ${e.value}`}`;
        if (e.context.length > 0) {
          msg += `:\n${e.context.map(handleContext).join("\n")}`
        }
        return msg;
      };
      const errors = deps.left.map(handleError).join("\n");
      throw new Error(`failed to load dependency data from ${path}:\n${errors}`);
    }
    return new DependencyDiscoveryCache(path, deps.right, discover);
  }

  async save(): Promise<void> {
    const json = JSON.stringify(DepsEntries.encode(this.deps));
    await Deno.writeTextFile(this.cachePath, json);
  }

  async dependencies(file: string): Promise<Set<string>> {
    const modified = await mtime(file);
    let entry = this.deps.get(file);
    if (entry == undefined || entry.time < modified) {
      entry = { time: modified, deps: await this.discover(file) };
      this.deps.set(file, entry);
    }
    return entry.deps;
  }

  async latestDepModification(file: string): Promise<Date> {
    const visitedStack = new Set<string>(file);
    const impl = async (file: string): Promise<Date> => {
      const cached = this.latestMtimeCache.get(file);
      if (cached != undefined) {
        return cached;
      }
      let maxTime = (await mtime(file)).getTime();
      visitedStack.add(file);
      const deps = await this.dependencies(file);
      for (const dep of deps) {
        if (visitedStack.has(dep)) {
          throw new Error(`file ${dep} has a recursive dependency on itself`);
        }
        maxTime = Math.max(maxTime, (await impl(dep)).getTime());
      }
      visitedStack.delete(file);
      const date = new Date(maxTime);
      this.latestMtimeCache.set(file, date);
      return date;
    };
    return await impl(file);
  }
}

export async function mtime(filename: string): Promise<Date> {
  let { mtime } = await Deno.stat(filename);
  if (mtime == undefined) {
    throw new Error(`failed to get modification time for ${filename}`);
  } else if (typeof (mtime) === "number") {
    mtime = new Date(mtime);
  }
  return mtime;
}

const DateFromString = new Type<Date, string>(
  "DateFromString",
  (u): u is Date => u instanceof Date,
  (u, c) => pipe(
    string.validate(u, c),
    chain((s: string) => {
      if (!/^([+-][0-9]{2})?[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(s)) {
        return failure(u, c, "invalid date string");
      }
      const d = new Date(s);
      return isNaN(d.getTime()) ? failure(u, c) : success(d)
    })
  ),
  (a) => a.toISOString(),
)

const StringSet = new Type<Set<string>, string[]>(
  "StringSet",
  (u): u is Set<string> => {
    if (!(u instanceof Set)) {
      return false;
    }
    for (const i of u) {
      if (typeof (i) !== "string") {
        return false;
      }
    }
    return true;
  },
  (u, c) => pipe(
    array(string).validate(u, c),
    chain((strs: string[]) => success(new Set(strs))),
  ),
  (a) => [...a.values()],
)

const DepEntry = type({
  time: DateFromString,
  deps: StringSet,
});
type DepEntry = TypeOf<typeof DepEntry>;

const DepsEntries = new Type<Map<string, DepEntry>, Record<string, OutputOf<typeof DepEntry>>>(
  "DepsEntries",
  (u): u is Map<string, DepEntry> => {
    if (!(u instanceof Map)) {
      return false;
    }
    for (const [k, v] of u) {
      if (typeof (k) !== "string") {
        return false;
      }
      if (!DepEntry.is(v)) {
        return false;
      }
    }
    return true;
  },
  (u, c) => pipe(
    record(string, DepEntry).validate(u, c),
    chain((deps: Record<string, DepEntry>) => success(new Map(Object.entries(deps)))),
  ),
  (a) => Object.fromEntries([...a.entries()].map(([k, v]) => [k, DepEntry.encode(v)])),
);
