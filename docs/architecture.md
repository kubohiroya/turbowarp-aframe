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

## Versioned Runtime Capability

The extension publishes `Scratch.vm.runtime.turbowarpAFrameCapability`. Version 2 is a narrow typed, frozen port containing `createScene`, `createNode`, `addClass`, `loadTemplate`, `createFromTemplate`, `setPosition`, `setRotation`, `setAttribute`, `setData`, `emitEvent`, `deleteSelector`, and `countSelector`, plus `loadVrm`, `setVrmBoneRotation`, `vrmBoneNames`, `vrmStatus`, `setVrmExpression`, and `vrmExpressionNames`. The expression operations, and later `setAttribute` and `setData`, were added to version 2 without changing its version, because they only add methods and a consumer checks for the methods it uses. `setAttribute` and `setData` exist so that a companion extension which needs to write A-Frame attributes, such as `turbowarp-ar` writing target pose and visibility, goes through this port instead of reaching into the DOM behind the extension's back. `createScene`, `createNode`, and `addClass` complete the set, so an extension that builds a whole scene from a description can do it through the port rather than only through blocks; `createFromTemplate` cannot stand in for them, because it prefixes child ids with the instance id and writes `template` and `instance` data keys, which a caller that owns its own ids does not want. Version 1, which had only the scene operations, was removed in 0.4.0 rather than kept beside version 2, so there is a single contract to keep correct.

Each port method delegates to the corresponding block handler. Consequently, block calls and composite-extension calls share casting, validation, selector matching, event queuing, and the extension-owned scene state. The port never exposes DOM elements, A-Frame/Three.js objects, or glTF internals.

Consumers must call `requireVersion(2)` before use. Any other version, including 1, throws instead of attempting compatibility fallback. `dispose()` removes the capability from the runtime, stops active animation playbacks, removes the scene host, and permanently invalidates references that a consumer retained before disposal. Repeated disposal is safe.

## Scene initialization

Before building the scene, `createScene` makes sure A-Frame 1.8.0 is on the page. It adds a script for `https://cdn.jsdelivr.net/npm/aframe@1.8.0/dist/aframe-v1.8.0.min.js` with a SHA-384 subresource integrity hash and `crossorigin="anonymous"`, so a changed file on the CDN is refused, and waits for it; the block resolves only after A-Frame is ready. Concurrent scenes share one load, and a failed or timed-out load (30 s) removes its script so the next call can try again. A page that already has A-Frame 1.8.0 loads nothing, which keeps an offline venue that serves its own copy working. Any other version on the page is refused, because a second A-Frame cannot run beside it and three-vrm is verified on the Three.js of 1.8.0 only. A-Frame is never bundled.

`createScene` creates a root `#scene` node and, when a browser DOM exists, a `#tw-aframe-root > a-scene` host. The host is mounted inside the first detected TurboWarp stage wrapper or canvas parent, falling back to `document.body` only when no stage-like element is found.

The layer vocabulary is closed, and `turbowarp-ar` uses the same two values for its camera background:

- `above-stage`: A-Frame overlays the TurboWarp stage.
- `below-stage`: A-Frame stays behind the stage when the host CSS allows it.

The block argument stays a plain string, so a project can pass anything; an unrecognized value falls back to `above-stage` instead of being stored as a layer the host cannot honor. On `above-stage` the host is given a stacking position one step above `turbowarp-ar`'s camera background, so a 3D scene renders over the camera image. `camera-under-3d` was listed here once and never implemented — the ordering it described is structural, not a value a caller can ask for.

The mode values, by contrast, are open strings that only describe intent:

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

## Events

The runtime stores a small event queue for hat polling:

- `scene-ready`
- user events emitted by `emit 3D event [TYPE] from selector [SELECTOR] with data [DATA]`

`when event [TYPE] on selector [SELECTOR]` consumes the first matching queued event. `event target id` reports the most recently handled target.

Browser `click`, `tap`, `pointerenter`, and `pointerleave` events are converted into the same queue when their target node matches the selector watched by a hat block. Custom event types requested by hats are also attached to existing and future nodes. Events emitted by `emit 3D event` dispatch a DOM `CustomEvent` without re-queuing themselves.

## Keyframe Animations

Animation clip definitions are stored separately from the scene graph. A clip has a name, duration in seconds, and typed keyframe tracks. The first supported track types are:

- `VectorKeyframeTrack` for `.position` and `.scale`
- `QuaternionKeyframeTrack` for `.quaternion`

Track `times` and `values` are passed as comma- or whitespace-separated number lists. Vector tracks require three values per keyframe. Quaternion tracks require four values per keyframe. Euler rotation helper blocks accept x/y/z triples in `degrees` or `radians` and convert them into quaternion values before storing the track.

Single-keyframe helper blocks provide the block-first authoring path. They insert one `.position`, `.scale`, or `.quaternion` keyframe at a time, keep keyframes sorted, and replace an existing keyframe when the clip, path, and time match. The comma-separated full-track blocks remain available for advanced users who already have Three.js-style arrays.

Playback is attached to matching nodes, not Scratch sprites. When browser DOM, A-Frame, and `AFRAME.THREE` are available, `play 3D animation clip` creates an `AnimationMixer` for each target node root `object3D`, starts a clip action, and updates active mixers through a small A-Frame bridge component on the scene. glTF bones, child object paths, material properties, blending, and cross-fade controls are left outside the first implementation. VRM humanoid bones are turned by the VRM blocks rather than by animation clips. In non-DOM test environments, the registry and validation behavior remain testable without constructing Three.js objects.

The existing `rotation` block remains degree-based because it writes A-Frame attributes. Quaternion animation uses Three.js object state and should be documented as separate from A-Frame Euler attribute rotation.

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

Book 2 should teach a small block set: scene creation, template loading, instance creation, selector operations, events, future collision groups, and future AR anchor attachment. A-Frame and Three.js internals stay in developer documentation unless the lesson explicitly moves into an advanced section.

## Rollback

If A-Frame integration becomes too heavy, the graph core can remain while the DOM backend is replaced with a thinner Three.js renderer. If AR recognition is unstable, AR remains experimental and the ordinary 3D card-game path stays the default. If collision checks are expensive, checks are limited to explicitly registered groups with lower update frequency.
