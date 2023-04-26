import { DOMParser } from "deno_dom";
import { parse, renderHTML } from "djot";
import { Task, Tasks } from "rad/mod.ts";
import { dirname, join } from "std/path/mod.ts";

import { applyFilters, findFilterScripts } from "./lib/html.ts";

const BUILD_DIR = "build";

const buildDir = {
  fn() {
    Deno.mkdir(BUILD_DIR, { recursive: true });
  }
};

const build: Task = {
  dependsOn: [buildDir],
  prereqs: ["src/pages/**/*.dj"],
  mapPrereqToTarget: ({ reroot }) => reroot(join("src", "pages"), "build", "dj", "html"),
  async onMake(_env, { changedPrereqs, getTarget }) {
    const parser = new DOMParser();
    for await (const req of changedPrereqs) {
      const text = await Deno.readTextFile(req.path);
      const parsed = parse(text);
      const html = renderHTML(parsed);
      let doc = parser.parseFromString(html, "text/html");
      if (doc == null) {
        throw new Error(`failed to parse HTML in ${req.path}`);
      }
      const filters = findFilterScripts(doc);
      doc = await applyFilters(doc, filters);
      const target = getTarget!(req);
      Deno.mkdir(dirname(target), { recursive: true });
      const html = "<!doctype html>\n" + doc.documentElement!.outerHTML;
      await Deno.writeTextFile(target!, html);
    }
  },
};

export const tasks: Tasks = {
  build,
  buildDir,
};
