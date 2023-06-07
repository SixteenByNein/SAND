import { HTMLDocument } from "deno_dom";

export type TitleOptions = {
  title: string;
};

export default function makeFilter(options: TitleOptions) {
  return (doc: HTMLDocument) => {
    doc.head!.appendChild(<title>{options.title}</title>);
  };
}
