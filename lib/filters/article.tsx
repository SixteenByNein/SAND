import { HTMLDocument, Node } from "deno_dom";

export type ArticleOptions = {
  makeHeader?(): Node,
  makeMain?(contents: Iterable<Node>): Node,
  makeFooter?(): Node,
};

export default function makeFilter(options: ArticleOptions) {
  return (doc: HTMLDocument) => {
    const contents = [...doc.body.childNodes];
    contents.forEach(n => doc.body.removeChild(n));
    doc.body.appendChild(options.makeHeader?.() ?? <header></header>);
    doc.body.appendChild(options.makeMain?.(contents) ?? <main>{contents}</main>);
    doc.body.appendChild(options.makeFooter?.() ?? <footer></footer>);
  };
}
