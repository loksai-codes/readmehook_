# Pixel Pals

![build](https://img.shields.io/badge/build-passing-brightgreen.svg)

A multiplayer pixel-art canvas you can host in one command.

![Pixel Pals demo](./assets/demo.gif "Two people drawing at once")

## Running locally

```sh
git clone https://github.com/pixelpals/pixel-pals.git
cd pixel-pals
docker compose up
```

Then open http://localhost:8080.

```js
// not a quickstart: the JS client API
const canvas = connect('ws://localhost:8080');
```
