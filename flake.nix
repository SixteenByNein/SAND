{
  description = "Build system for the SAND RPG system";

  inputs = {
    devshell.url = "github:numtide/devshell";
    flake-utils.url = "github:numtide/flake-utils";
    nixpkgs-latest.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs = { self, flake-utils, devshell, nixpkgs, nixpkgs-latest }:
    flake-utils.lib.eachDefaultSystem (system: {
      devShell =
        let
          pkgsLatest = import nixpkgs-latest { inherit system; };
          # Required because the version of Deno in 22.11 chokes on bare NPM imports.
          latestOverlay = final: prev: { deno = pkgsLatest.deno; };
          pkgs = import nixpkgs {
            inherit system;

            overlays = [ devshell.overlays.default latestOverlay ];
          };
        in
        pkgs.devshell.mkShell {
          imports = [ (pkgs.devshell.importTOML ./devshell.toml) ];
        };
    });
}
