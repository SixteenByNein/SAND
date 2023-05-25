import { HTMLDocument } from "deno_dom";

type Filter = (doc: HTMLDocument) => HTMLDocument | void;

/// Chains several filters together, returning the result of
/// applying each of them in sequence.
export function pipe(...filters: Filter[]): Filter {
  return (doc: HTMLDocument) => {
    for (const filter of filters) {
      doc = filter(doc) ?? doc;
    }
    return doc;
  };
}
