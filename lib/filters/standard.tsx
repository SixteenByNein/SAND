import article, { ArticleOptions } from "lib/filters/article.tsx";
import { pipe } from "lib/filters/combinators.tsx";
import stylesheet from "lib/filters/stylesheet.tsx";
import title, { TitleOptions } from "lib/filters/title.tsx";

export type StandardFilterOptions = TitleOptions
  & ArticleOptions;

/// Adds all the trappings of a "standard" page
export default function makeStandardFilter(options: StandardFilterOptions) {
  const makeHeader = () => <header>
    <h1>{options.title}</h1>
  </header>;
  return pipe(
    title(options),
    stylesheet("/styles/style.css"),
    article({ makeHeader, ...options }),
  );
}
