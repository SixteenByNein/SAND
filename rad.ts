import { DOMParser, HTMLDocument } from "deno_dom";
import { parse, renderHTML } from "djot";
import type { WalkEntry } from "std/fs/walk.ts";
import { Task, Tasks } from "rad/mod.ts";
import { dirname, join } from "std/path/mod.ts";

import { DependencyDiscoveryCache } from "./lib/deps.ts";
import { applyFilters, filterDeps, findFilterScripts, scriptFileDeps, type FilterScript } from "./lib/html.ts";

const BUILD_DIR = "build";
const DIST_DIR = join(BUILD_DIR, "dist");
const DEPS_DIR = join(BUILD_DIR, "deps");

const buildDir = {
  fn() {
    Deno.mkdir(BUILD_DIR, { recursive: true });
  }
};

const distDir = {
  fn() {
    Deno.mkdir(DIST_DIR, { recursive: true });
  },
  dependsOn: [buildDir],
};

const depsDir = {
  fn() {
    Deno.mkdir(DEPS_DIR, { recursive: true });
  },
  dependsOn: [buildDir],
};

const copyStyles: Task = {
  prereqs: ["src/styles/**/*.css"],
  mapPrereqToTarget: ({ reroot }) => reroot("src", DIST_DIR, "css", "css"),
  async onMake(_env, { changedPrereqs, getTarget }) {
    for await (const prereq of changedPrereqs) {
      const target = getTarget!(prereq);
      await Deno.mkdir(dirname(target), { recursive: true });
      await Deno.copyFile(prereq.path, target);
    }
  },
};

const build: Task = {
  dependsOn: [copyStyles, depsDir, distDir],
  prereqs: ["src/pages/**/*.dj"],
  mapPrereqToTarget: ({ reroot }) => reroot(join("src", "pages"), DIST_DIR, "dj", "html"),
  async onMake(_env, { changedPrereqs, getTarget, prereqs }) {
    const parser = new DOMParser();
    type ParseResult = { doc: HTMLDocument, filters: FilterScript[] };
    const parseCache = new Map<string, ParseResult>();
    const parsePage = async (path: string) => {
      let result = parseCache.get(path);
      if (result != undefined) {
        return result;
      }
      const text = await Deno.readTextFile(path);
      const parsed = parse(text);
      const html = renderHTML(parsed);
      const doc = parser.parseFromString(html, "text/html");
      if (doc == null) {
        throw new Error(`failed to parse HTML in ${path}`);
      }
      const filters = findFilterScripts(doc, path);
      result = { doc, filters };
      parseCache.set(path, result);
      return result;
    };

    const pages = new Map<string, WalkEntry>();
    for await (const req of prereqs) {
      pages.set(req.path, req);
    }
    const deps = await DependencyDiscoveryCache.withFile(
      join(DEPS_DIR, "filters.json"),
      async (path: string) => {
        if (pages.has(path)) {
          const imports = new Set<string>();
          const { filters } = await parsePage(path);
          for (const filter of filters) {
            await filterDeps(filter, imports);
          }
          return imports;
        } else {
          return scriptFileDeps(path);
        }
      }
    );
    const changedByDeps = new Set<WalkEntry>();
    for (const [path, page] of pages) {
      const time = await deps.latestDepModification(path);
      const target = getTarget!(page);
      try {
        const { mtime } = await Deno.stat(target);
        if (mtime != null && time > mtime) {
          changedByDeps.add(page);
        }
      } catch (e: unknown) {
        if (!(e instanceof Deno.errors.NotFound)) {
          throw e;
        }
      }
    }
    await deps.save();

    const processPage = async (req: WalkEntry) => {
      let { doc, filters } = await parsePage(req.path);
      doc = await applyFilters(doc, filters);
      const target = getTarget!(req);
      Deno.mkdir(dirname(target), { recursive: true });
      const html = "<!doctype html>\n" + doc.documentElement!.outerHTML;
      await Deno.writeTextFile(target!, html);
    };
    for (const req of changedByDeps) {
      await processPage(req);
    }
    for await (const req of changedPrereqs) {
      if (!changedByDeps.has(req)) {
        await processPage(req);
      }
    }
  },
};

export const tasks: Tasks = {
  build,
  buildDir,
  depsDir,
  distDir,
  copyStyles,
};
