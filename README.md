# SAND

## Building the Site

The site's build system uses [Deno](https://deno.land) to run the build scripts.
Run `deno task build` to generate the site files, which will appear in the `build` directory.

## Previewing the Site

The generated HTML is designed to be viewed via a Web server, not simply using the local file system.
Run `deno task serve` to start a basic Web server that you can use to preview the generated site.
