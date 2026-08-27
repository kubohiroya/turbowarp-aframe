# Architecture

[日本語](architecture.ja.md)

## Goal

TurboWarp-A-Frame lets TurboWarp projects construct and operate a declarative 3D scene graph backed by A-Frame. It is not a 3D compatibility layer for Scratch sprites.

Sprites and backdrops remain script containers. The extension-owned graph uses node ids, classes, `data-*` attributes, A-Frame component attributes, templates, selectors, instance ids, and events as its identity model.

## Build outputs

```text
src/index.ts + src/extension.ts
  -> vite-plugin-turbowarp-extension
  -> dist/turbowarp-aframe.js

src/config.ts + src/block-definitions.json
  -> extension-api-manifest Vite plugin
  -> dist/extension-manifest.json
```

The generated JavaScript bundle is an unsandboxed TurboWarp extension. The manifest records the block API contract for compatibility checks.

## Scene initialization

`createScene` creates a root `#scene` node and, when a browser DOM exists, a `#tw-aframe-root > a-scene` host. The host is mounted inside the first detected TurboWarp stage wrapper or canvas parent, falling back to `document.body` only when no stage-like element is found.

The initial layer values are strings so the book/API can refine the vocabulary without changing the block shape:

- `above-stage`: A-Frame overlays the TurboWarp stage.
- `below-stage`: A-Frame stays behind the stage when the host CSS allows it.
- `camera-under-3d`: camera/video should sit below the 3D layer.

The initial mode values are also open strings:

- `3d`: ordinary embedded 3D scene.
- `camera`: camera-backed composition.
- `ar-fallback`: non-tracking 3D fallback for unsupported AR devices.
- `ar`: reserved for future marker or WebXR-backed AR.

After initialization, `when 3D scene ready` fires once.

## Scene graph

The graph is local to the extension. Supported node kinds map to A-Frame tags:

- primitives: `box`, `sphere`, `plane`, `circle`, `cone`, `cylinder`
- media: `image`, `image-plane`, `text`, `model`
- scene services: `light`, `camera`
- structure: `group`, `empty`, `primitive`

`position`, `rotation`, and other attributes are local attributes relative to each node parent. World-coordinate helpers are deliberately outside the first implementation.

## Selectors

The first selector subset is intentionally small:

- `#id`
- `.class`
- `[data-key=value]`
- `*`
- `@event` or `event target` after an event hat runs

Commands apply to all matches. Blocks that need one node use the first match in insertion order. This keeps multi-match behavior deterministic and easy to explain in Book 2.

## Templates and instances

Templates are JSON objects with this shape:

```json
{
  "type": "group",
  "id": "optional-child-id",
  "class": "monster",
  "data": {"zone": "field"},
  "attributes": {"position": "0 1 -3"},
  "children": []
}
```

`create template [TEMPLATE] as [INSTANCE] under [PARENT]` replaces the template root id with the explicit instance id and prefixes descendant ids with that instance id. It also adds `data-template` and `data-instance` values to the root. Instance id collisions are rejected. Deleting a parent deletes its descendants.

## YAML DSL

Block-built graphs can be exported with `3D scene YAML` and restored with `load 3D scene YAML [SOURCE]`. The YAML DSL uses the same node shape as templates but wraps it in a scene document:

```yaml
formatVersion: 1
options:
  layer: above-stage
  mode: 3d
root:
  attributes:
    embedded: "true"
    renderer: "alpha: true"
  children:
    - type: box
      id: card
      classes:
        - monster
      data:
        zone: field
      attributes:
        position: 0 1 -3
```

The root node remains `#scene`; a root `id` in YAML is ignored for identity purposes. Child ids written in YAML are preserved. Missing child ids are generated deterministically from the node type and insertion position.

The parsed YAML document is specified by `schemas/aframe-scene-yaml.schema.json`. The reusable node shape is specified by `schemas/aframe-template.schema.json`.

## Events

The runtime stores a small event queue for hat polling:

- `scene-ready`
- user events emitted by `emit 3D event [TYPE] from selector [SELECTOR] with data [DATA]`

`when event [TYPE] on selector [SELECTOR]` consumes the first matching queued event. `event target id` reports the most recently handled target.

Browser `click`, `tap`, `pointerenter`, and `pointerleave` events are converted into the same queue when their target node matches the selector watched by a hat block. Custom event types requested by hats are also attached to existing and future nodes. Events emitted by `emit 3D event` dispatch a DOM `CustomEvent` without re-queuing themselves.

## Collision Scope

Collision detection is not implemented in this first code slice. The intended first production model is:

- explicit selector or collision-group registration
- AABB or bounding sphere checks
- spatial hash or grid broad phase before considering octree complexity
- `enters`, `touches`, and `leaves` event states
- capped update frequency for classroom-scale card, zone, monster, and effect counts

## AR Scope

AR tracking is reserved for a later feature flag. The planned evaluation order is:

- WebXR for devices with reliable browser support
- AR.js for marker-based lessons
- MindAR for image-target experiments

Unsupported devices, camera denial, marker loss, jitter, and recognition failure must fall back to ordinary 3D mode or `ar-fallback` without breaking the lesson flow.

## Book 2 API Boundary

Book 2 should teach a small block set: scene creation, template loading, instance creation, selector operations, YAML DSL import/export, events, future collision groups, and future AR anchor attachment. A-Frame and Three.js internals stay in developer documentation unless the lesson explicitly moves into an advanced section.

## Rollback

If A-Frame integration becomes too heavy, the graph core can remain while the DOM backend is replaced with a thinner Three.js renderer. If AR recognition is unstable, AR remains experimental and the ordinary 3D card-game path stays the default. If collision checks are expensive, checks are limited to explicitly registered groups with lower update frequency.
