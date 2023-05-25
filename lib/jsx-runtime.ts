import { HTMLDocument, Node } from "deno_dom";

declare global {
  namespace JSX {
    type Element = Node;
    interface IntrinsicElements {
      [key: string]: unknown,
    }
    interface ElementChildrenAttribute {
      children: unknown;
    }
  }
}

type Props = {
  children?: (Node | string)[] | Node | string,
} & Record<string, unknown>;

type Component = (props: Props) => Node | string;

function toNode(val: Node | string, doc: HTMLDocument): Node {
  if (typeof val === "string") {
    return doc.createTextNode(val);
  } else {
    return val;
  }
}

export function jsx(
  type: string | Component,
  props?: Props | null,
): Node
{
  const doc = (globalThis as unknown as { document: HTMLDocument }).document;
  let element: Node;
  if (typeof type === "string") {
    element = doc.createElement(type);
    if (props?.children != undefined) {
      if (typeof props.children === "object" && Symbol.iterator in props.children) {
        for (const child of props.children) {
          element.appendChild(toNode(child, doc));
        }
      } else {
        element.appendChild(toNode(props.children, doc));
      }
    }
    return element;
  } else {
    return toNode(type(props ?? {}), doc);
  }
}

export const jsxs = jsx;
