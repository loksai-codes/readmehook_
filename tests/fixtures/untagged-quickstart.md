# fastgrep

A ridiculously fast grep for monorepos. Respects `.gitignore`, skips binaries, streams results.

Install
-------

```
$ npm install -g fastgrep
$ fastgrep "TODO" ./src
src/index.ts:12: // TODO: handle symlinks
src/walk.ts:88: // TODO: windows paths
```

Options
-------

```
--json         emit JSON lines
--max <n>      stop after n matches
```
