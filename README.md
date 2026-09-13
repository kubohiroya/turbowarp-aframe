# TurboWarp-A-Frame

[日本語](README.ja.md)

TurboWarp-A-Frame is an unsandboxed TurboWarp extension for building declarative A-Frame scene graphs from blocks.

It treats TurboWarp sprites and backdrops as places to run 3D scene logic, not as 3D object identities. The 3D world is addressed with A-Frame-style node ids, classes, data attributes, attributes, templates, selectors, and events.

## What it does

- Creates an embedded A-Frame scene host from TurboWarp.
- Builds a parent-child scene graph with primitive, image, text, model, light, camera, and group nodes.
- Selects nodes with a limited `#id`, `.class`, and `[data-key=value]` selector subset.
- Mutates local `position`, `rotation`, class, `data-*`, visibility, and arbitrary A-Frame component attributes.
- Loads JSON templates and instantiates them with explicit instance ids.
- Mounts the A-Frame host near the detected TurboWarp stage and queues scene-ready, DOM pointer/click, and selector-scoped custom events for hat blocks.
- Defines and plays Three.js keyframe animation clips with vector and quaternion tracks.
- Keeps AR and collision APIs documented as next-stage extension points while preserving a small initial implementation.

## Requirements and safety

- Node.js 22 or newer
- Corepack-managed pnpm
- TurboWarp unsandboxed extension support
- A-Frame loaded by the host page or project environment before using the generated extension in a browser

Unsandboxed extensions can manipulate the containing page. Load only generated extension bundles that you trust.

## Install

```bash
corepack enable
pnpm install --frozen-lockfile
```

## Quick start

```bash
pnpm run build
```

Load `dist/turbowarp-aframe.js` as an unsandboxed custom extension in TurboWarp.

For package-based reuse, pin the version:

```bash
pnpm add --save-exact @kubohiroya/turbowarp-aframe@0.2.0
```

## Block reference

<!-- BEGIN GENERATED BLOCKS -->

### `create 3D scene with layer [LAYER] mode [MODE]`

Initializes the A-Frame scene host and emits the scene ready event.

| Property | Value |
|---|---|
| Type | Command |
| Opcode | `createScene` |
| `LAYER` | String, default: `above-stage` |
| `MODE` | String, default: `3d` |

### `load template [ID] from JSON [SOURCE]`

Stores a declarative scene graph template for later instantiation.

| Property | Value |
|---|---|
| Type | Command |
| Opcode | `loadTemplate` |
| `ID` | String, default: `monster` |
| `SOURCE` | String, default: `{"type":"box","id":"body","attributes":{"color":"#4cffb0"}}` |

### `create [TYPE] node id [ID] under [PARENT]`

Creates a primitive, model, text, light, camera, or group node.

| Property | Value |
|---|---|
| Type | Command |
| Opcode | `createNode` |
| `TYPE` | String, default: `box` |
| `ID` | String, default: `card` |
| `PARENT` | String, default: `#scene` |

### `create template [TEMPLATE] as [INSTANCE] under [PARENT]`

Instantiates a stored template under the first node matching the parent selector.

| Property | Value |
|---|---|
| Type | Command |
| Opcode | `createFromTemplate` |
| `TEMPLATE` | String, default: `monster` |
| `INSTANCE` | String, default: `monster-1` |
| `PARENT` | String, default: `#scene` |

### `set selector [SELECTOR] position x [X] y [Y] z [Z]`

Sets local position on every node matching the selector.

| Property | Value |
|---|---|
| Type | Command |
| Opcode | `setPosition` |
| `SELECTOR` | String, default: `#card` |
| `X` | Number, default: `0` |
| `Y` | Number, default: `1` |
| `Z` | Number, default: `-3` |

### `move selector [SELECTOR] by x [X] y [Y] z [Z]`

Offsets local position on every node matching the selector.

| Property | Value |
|---|---|
| Type | Command |
| Opcode | `moveBy` |
| `SELECTOR` | String, default: `#card` |
| `X` | Number, default: `0` |
| `Y` | Number, default: `0` |
| `Z` | Number, default: `1` |

### `set selector [SELECTOR] rotation x [X] y [Y] z [Z]`

Sets local Euler rotation in degrees on every node matching the selector.

| Property | Value |
|---|---|
| Type | Command |
| Opcode | `setRotation` |
| `SELECTOR` | String, default: `#card` |
| `X` | Number, default: `0` |
| `Y` | Number, default: `45` |
| `Z` | Number, default: `0` |

### `add class [CLASS] to selector [SELECTOR]`

Adds a CSS-style class to every node matching the selector.

| Property | Value |
|---|---|
| Type | Command |
| Opcode | `addClass` |
| `CLASS` | String, default: `monster` |
| `SELECTOR` | String, default: `#card` |

### `set selector [SELECTOR] data [KEY] to [VALUE]`

Sets a data-* value on every node matching the selector.

| Property | Value |
|---|---|
| Type | Command |
| Opcode | `setData` |
| `SELECTOR` | String, default: `#card` |
| `KEY` | String, default: `zone` |
| `VALUE` | String, default: `field` |

### `set selector [SELECTOR] attribute [NAME] to [VALUE]`

Sets an A-Frame component or HTML attribute on every node matching the selector.

| Property | Value |
|---|---|
| Type | Command |
| Opcode | `setAttribute` |
| `SELECTOR` | String, default: `#card` |
| `NAME` | String, default: `visible` |
| `VALUE` | String, default: `true` |

### `delete selector [SELECTOR]`

Deletes every non-root node matching the selector and its descendants.

| Property | Value |
|---|---|
| Type | Command |
| Opcode | `deleteSelector` |
| `SELECTOR` | String, default: `#card` |

### `count selector [SELECTOR]`

Returns the number of nodes matching a limited selector.

| Property | Value |
|---|---|
| Type | Reporter |
| Opcode | `countSelector` |
| `SELECTOR` | String, default: `.monster` |

### `event target id`

Returns the id of the most recently handled 3D event target.

| Property | Value |
|---|---|
| Type | Reporter |
| Opcode | `eventTargetId` |

### `emit 3D event [TYPE] from selector [SELECTOR] with data [DATA]`

Queues and dispatches a 3D event from the first node matching the selector.

| Property | Value |
|---|---|
| Type | Command |
| Opcode | `emitEvent` |
| `TYPE` | String, default: `attack` |
| `SELECTOR` | String, default: `#card` |
| `DATA` | String, default: `{}` |

### `when 3D scene ready`

Fires once after create 3D scene initializes the scene host.

| Property | Value |
|---|---|
| Type | Hat |
| Opcode | `whenSceneReady` |

### `when event [TYPE] on selector [SELECTOR]`

Fires when a queued 3D event of the given type targets a node matching the selector.

| Property | Value |
|---|---|
| Type | Hat |
| Opcode | `whenEventOnSelector` |
| `TYPE` | String, default: `attack` |
| `SELECTOR` | String, default: `.monster` |

### `create 3D animation clip [NAME] duration [DURATION]`

Creates or replaces a Three.js AnimationClip definition.

| Property | Value |
|---|---|
| Type | Command |
| Opcode | `createAnimationClip` |
| `NAME` | String, default: `wave` |
| `DURATION` | Number, default: `-1` |

### `delete 3D animation clip [NAME]`

Deletes a stored 3D animation clip definition and stops its active actions.

| Property | Value |
|---|---|
| Type | Command |
| Opcode | `deleteAnimationClip` |
| `NAME` | String, default: `wave` |

### `add vector keyframe track to clip [CLIP] path [PATH] times [TIMES] values [VALUES]`

Adds a Three.js VectorKeyframeTrack definition with x y z values.

| Property | Value |
|---|---|
| Type | Command |
| Opcode | `addVectorKeyframeTrack` |
| `CLIP` | String, default: `move-up` |
| `PATH` | String, default: `.position` |
| `TIMES` | String, default: `0,0.5,1` |
| `VALUES` | String, default: `0,1,-3, 0,1.5,-3, 0,1,-3` |

### `add quaternion keyframe track to clip [CLIP] path [PATH] times [TIMES] values [VALUES]`

Adds a Three.js QuaternionKeyframeTrack definition with x y z w values.

| Property | Value |
|---|---|
| Type | Command |
| Opcode | `addQuaternionKeyframeTrack` |
| `CLIP` | String, default: `wave` |
| `PATH` | String, default: `.quaternion` |
| `TIMES` | String, default: `0,0.5,1` |
| `VALUES` | String, default: `0,0,0,1, 0,0,0.389,0.921, 0,0,0,1` |

### `add euler rotation keyframe track to clip [CLIP] path [PATH] times [TIMES] values [VALUES] unit [UNIT]`

Adds a quaternion track converted from Euler x y z rotation values.

| Property | Value |
|---|---|
| Type | Command |
| Opcode | `addEulerRotationKeyframeTrack` |
| `CLIP` | String, default: `wave` |
| `PATH` | String, default: `.quaternion` |
| `TIMES` | String, default: `0,0.25,0.5,0.75,1` |
| `VALUES` | String, default: `0,0,0, 0,0,0.8, 0,0,0, 0,0,-0.8, 0,0,0` |
| `UNIT` | String, default: `radians` |

### `add position keyframe to clip [CLIP] at [TIME] x [X] y [Y] z [Z]`

Adds or replaces one position keyframe on the clip.

| Property | Value |
|---|---|
| Type | Command |
| Opcode | `addPositionKeyframe` |
| `CLIP` | String, default: `move-up` |
| `TIME` | Number, default: `0` |
| `X` | Number, default: `0` |
| `Y` | Number, default: `1` |
| `Z` | Number, default: `-3` |

### `add scale keyframe to clip [CLIP] at [TIME] x [X] y [Y] z [Z]`

Adds or replaces one scale keyframe on the clip.

| Property | Value |
|---|---|
| Type | Command |
| Opcode | `addScaleKeyframe` |
| `CLIP` | String, default: `pulse` |
| `TIME` | Number, default: `0` |
| `X` | Number, default: `1` |
| `Y` | Number, default: `1` |
| `Z` | Number, default: `1` |

### `add euler rotation keyframe to clip [CLIP] at [TIME] x [X] y [Y] z [Z] unit [UNIT]`

Adds or replaces one Euler rotation keyframe converted to quaternion values.

| Property | Value |
|---|---|
| Type | Command |
| Opcode | `addEulerRotationKeyframe` |
| `CLIP` | String, default: `wave` |
| `TIME` | Number, default: `0` |
| `X` | Number, default: `0` |
| `Y` | Number, default: `0` |
| `Z` | Number, default: `0.8` |
| `UNIT` | String, default: `radians` |

### `play 3D animation clip [CLIP] on selector [SELECTOR] loop [LOOP]`

Plays a stored 3D animation clip on every matching node.

| Property | Value |
|---|---|
| Type | Command |
| Opcode | `playAnimationClip` |
| `CLIP` | String, default: `wave` |
| `SELECTOR` | String, default: `#leftArm` |
| `LOOP` | Boolean, default: `true` |

### `stop 3D animation clip [CLIP] on selector [SELECTOR]`

Stops a stored 3D animation clip on every matching node.

| Property | Value |
|---|---|
| Type | Command |
| Opcode | `stopAnimationClip` |
| `CLIP` | String, default: `wave` |
| `SELECTOR` | String, default: `#leftArm` |

### `pause 3D animation clip [CLIP] on selector [SELECTOR]`

Pauses a stored 3D animation clip on every matching node.

| Property | Value |
|---|---|
| Type | Command |
| Opcode | `pauseAnimationClip` |
| `CLIP` | String, default: `wave` |
| `SELECTOR` | String, default: `#leftArm` |

### `resume 3D animation clip [CLIP] on selector [SELECTOR]`

Resumes a paused 3D animation clip on every matching node.

| Property | Value |
|---|---|
| Type | Command |
| Opcode | `resumeAnimationClip` |
| `CLIP` | String, default: `wave` |
| `SELECTOR` | String, default: `#leftArm` |

### `set 3D animation clip [CLIP] on selector [SELECTOR] time scale [SCALE]`

Sets the playback speed for a stored 3D animation clip on every matching node.

| Property | Value |
|---|---|
| Type | Command |
| Opcode | `setAnimationTimeScale` |
| `CLIP` | String, default: `wave` |
| `SELECTOR` | String, default: `#leftArm` |
| `SCALE` | Number, default: `1` |

### `is 3D animation clip [CLIP] playing on selector [SELECTOR]?`

Reports whether any matching node has the stored 3D animation clip playing.

| Property | Value |
|---|---|
| Type | Boolean |
| Opcode | `isAnimationClipPlaying` |
| `CLIP` | String, default: `wave` |
| `SELECTOR` | String, default: `#leftArm` |

<!-- END GENERATED BLOCKS -->

## Scene model

`#scene` is the root node. Every block operates on this extension-owned 3D graph; Scratch sprites, backdrops, clones, and the current sprite target are not imported into the node identity model.

Selectors intentionally support a small subset first:

- `#card`
- `.monster`
- `[data-zone=field]`
- `*`
- `@event` or `event target` after an event hat runs

When a selector matches multiple nodes, command blocks apply to all matches. Blocks that require one node, such as template instantiation parents or event emitters, use the first match in graph insertion order.

## Keyframe animations

Animation blocks create stored clip definitions and play them on matching node root `object3D` instances through `AFRAME.THREE.AnimationMixer` when A-Frame and Three.js are available. `VectorKeyframeTrack` supports `.position` and `.scale`; `QuaternionKeyframeTrack` supports `.quaternion`. glTF internals such as bones, child objects, and material properties are outside the initial scope.

The CSV track blocks are low-level APIs that stay close to Three.js. Classroom and ordinary block projects should prefer the single-keyframe blocks: `add position keyframe...`, `add scale keyframe...`, and `add euler rotation keyframe...`. A keyframe with the same clip, path, and time replaces the earlier value.

Existing `set selector [SELECTOR] rotation x [X] y [Y] z [Z]` uses A-Frame rotation attributes in degrees. Quaternion tracks operate on Three.js object state, so Euler helper input must declare `degrees` or `radians` and is converted to quaternion values before playback.

## Architecture

```text
src/index.ts + src/extension.ts
  -> vite-plugin-turbowarp-extension
  -> dist/turbowarp-aframe.js

src/config.ts + src/block-definitions.json
  -> extension-api-manifest Vite plugin
  -> dist/extension-manifest.json
```

See [docs/architecture.md](docs/architecture.md) for the issue #1 architecture, initial scope, rollback path, and AR fallback notes.

## Development

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

The full repository check is:

```bash
pnpm run check
```

## License

SPDX-License-Identifier: MPL-2.0
