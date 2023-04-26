import type { Element, HTMLDocument } from "deno_dom";

class FilterScript {
  constructor(readonly element: Element) { }

  async run(doc: HTMLDocument): Promise<HTMLDocument> {
    let module: Record<string, unknown>;
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
    if (!(module.default instanceof Function)) {
      throw new Error(`expected filter module to have a function as its default export, not ${typeof module.default}`);
    }
    return module.default(doc) ?? doc;
  }

  get externalSrc(): string | null {
    return this.element.getAttribute("src") ?? null;
  }
}

const filterRegex = /^module|(text\/javascript|application\/typescript)(,.*)?$/;
export function findFilterScripts(doc: HTMLDocument): FilterScript[] {
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
    .map(n => new FilterScript(n));
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
