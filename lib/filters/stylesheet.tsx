import { HTMLDocument } from "deno_dom";

export default function stylesheet(path: string) {
  return (doc: HTMLDocument) => {
    doc.head.appendChild(<link rel="stylesheet" href={path} />);
  }
}
