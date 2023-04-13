import { parse, renderHTML } from "djot";
import { Task, Tasks } from "rad/mod.ts";
import { dirname, join } from "std/path/mod.ts";

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
    for await (const req of changedPrereqs) {
      const text = await Deno.readTextFile(req.path);
      const parsed = parse(text);
      const html = renderHTML(parsed);
      const target = getTarget!(req);
      Deno.mkdir(dirname(target), { recursive: true });
      await Deno.writeTextFile(target!, html);
    }
  },
};

export const tasks: Tasks = {
  build,
  buildDir,
};
