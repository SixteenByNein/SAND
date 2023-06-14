import type { Element, HTMLDocument } from "deno_dom";
import { fromFileUrl } from "std/path/mod.ts";
import ts from "typescript";

export class FilterScript {
  constructor(readonly element: Element, readonly parentFilename: string) { }

  async sourceText(): Promise<string> {
    const src = this.element.getAttribute("src");
    if (src != undefined) {
      const resolved = resolveRawImportToFile(src);
      if (resolved == null) {
        throw new Error(`unresolved import: ${src}`);
      }
      return await Deno.readTextFile(resolved);
    } else {
      return this.element.textContent;
    }
  }

  get filename(): string {
    const src = this.element.getAttribute("src");
    if (src != undefined) {
      const resolved = resolveRawImportToFile(src);
      if (resolved == null) {
        throw new Error(`unresolved import: ${src}`);
      }
      return resolved;
    } else {
      return this.parentFilename;
    }
  }

  async run(doc: HTMLDocument): Promise<HTMLDocument> {
    let module: Record<string, unknown>;
    const src = this.element.getAttribute("src");
    if (src != undefined) {
      module = await import(src);
    } else {
      let type = this.element.getAttribute("type") ?? "text/javascript";
      if (type === "module") {
        type = "text/javascript";
      }
      const blob = new Blob([this.element.textContent], { type });
      const url = URL.createObjectURL(blob);
      try {
        module = await import(url);
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    if (!(module.default instanceof Function)) {
      throw new Error(`expected filter module to have a function as its default export, not ${typeof module.default}`);
    }

    // Document has to be available as global for JSX.
    const window = (globalThis as typeof globalThis & { document?: unknown });
    const hadDocument = "document" in window;
    const oldDocument = window.document;
    window.document = doc;
    try {
      return module.default(doc) ?? doc;
    } finally {
      if (hadDocument) {
        window.document = oldDocument;
      } else {
        delete window.document;
      }
    }
  }

  get externalSrc(): string | null {
    return this.element.getAttribute("src") ?? null;
  }
}

const filterRegex = /^module|(text\/javascript|application\/typescript)(,.*)?$/;
export function findFilterScripts(doc: HTMLDocument, filename: string): FilterScript[] {
  return ([...doc.querySelectorAll("script")] as Element[])
    .filter(n => {
      if (!n.hasAttribute("data-filter")) {
        return false;
      }
      const type = n.getAttribute("type");
      if (type != undefined && !type.match(filterRegex)) {
        return false;
      }
      return true;
    })
    .map(n => new FilterScript(n, filename));
}


// Based on find-imports-ts (https://www.npmjs.com/package/find-imports-ts)
function collectImports(src: ts.SourceFile, imports: Set<string>): void {
  const walk = (node: ts.Node) => {
    if (ts.isImportDeclaration(node)) {
      // ES2015 import
      const moduleSpecifier = node.moduleSpecifier as ts.StringLiteral;
      imports.add(moduleSpecifier.text);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      // Dynamic import()
      const moduleSpecifier = node.arguments[0];
      if (ts.isStringLiteral(moduleSpecifier)) {
        imports.add(moduleSpecifier.text);
      } else {
        console.warn("import() with dynamic expressions is not supported");
      }
    }
    ts.forEachChild(node, walk);
  };
  walk(src);
}

export async function filterDeps(filter: FilterScript, imports: Set<string>): Promise<void> {
  const rawImports = new Set<string>();
  const src = ts.createSourceFile(filter.filename, await filter.sourceText(), ts.ScriptTarget.ESNext, true);
  collectImports(src, rawImports);
  findFileImports(rawImports, imports);
}

export async function scriptFileDeps(path: string): Promise<Set<string>> {
  const text = await Deno.readTextFile(path);
  const src = ts.createSourceFile(path, text, ts.ScriptTarget.ESNext, true);
  const rawImports = new Set<string>();
  collectImports(src, rawImports);
  const fileImports = new Set<string>();
  findFileImports(rawImports, fileImports);
  return fileImports;
}

function findFileImports(rawImports: Set<string>, fileImports: Set<string>): void {
  for (const raw of rawImports) {
    const resolved = resolveRawImportToFile(raw);
    if (resolved != null) {
      fileImports.add(resolved);
    }
  }
}

function resolveRawImportToFile(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(import.meta.resolve(raw));
  } catch (_) {
    return null;
  }
  if (url.protocol !== "file:") {
    return null;
  }
  return fromFileUrl(url);
}

export async function applyFilters(doc: HTMLDocument, filters: FilterScript[]): Promise<HTMLDocument> {
  for (const filter of filters) {
    doc = await filter.run(doc);
  }
  for (const filter of filters) {
    filter.element.parentElement?.removeChild(filter.element);
  }
  return doc;
}
