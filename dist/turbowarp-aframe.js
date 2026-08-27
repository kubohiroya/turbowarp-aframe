// Name: TurboWarp-A-Frame
// ID: turbowarpaframe
// Description: A TurboWarp extension for declarative A-Frame scene graphs.
// By: Hiroya Kubo
// License: MPL-2.0

(function (Scratch) {
  'use strict';

  const extensionConfig = {
    id: "turbowarpaframe",
    name: "TurboWarp-A-Frame",
    docsURI: "https://kubohiroya.github.io/turbowarp-aframe/",
    blockIconURI: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0OCI+PHJlY3QgeD0iNiIgeT0iOCIgd2lkdGg9IjM2IiBoZWlnaHQ9IjMyIiByeD0iNCIgZmlsbD0iIzEyMTgyNiIvPjxwYXRoIGQ9Ik0xNCAzMmw5LTE4IDkgMThoLTRsLTItNWgtNmwtMiA1aC00Wm03LjQtOGgzLjJsLTEuNi00LjEtMS42IDQuMVoiIGZpbGw9IiM0Q0ZGQjAiLz48Y2lyY2xlIGN4PSIzNiIgY3k9IjE0IiByPSI0IiBmaWxsPSIjRkZBQjE5Ii8+PC9zdmc+"
  };
  const extensionName = "TurboWarp-A-Frame";
  const blocks = /* @__PURE__ */ JSON.parse('[{"opcode":"createScene","blockType":"COMMAND","text":"create 3D scene with layer [LAYER] mode [MODE]","description":"Initializes the A-Frame scene host and emits the scene ready event.","arguments":{"LAYER":{"type":"STRING","defaultValue":"above-stage"},"MODE":{"type":"STRING","defaultValue":"3d"}}},{"opcode":"loadTemplate","blockType":"COMMAND","text":"load template [ID] from JSON [SOURCE]","description":"Stores a declarative scene graph template for later instantiation.","arguments":{"ID":{"type":"STRING","defaultValue":"monster"},"SOURCE":{"type":"STRING","defaultValue":"{\\"type\\":\\"box\\",\\"id\\":\\"body\\",\\"attributes\\":{\\"color\\":\\"#4cffb0\\"}}"}}},{"opcode":"createNode","blockType":"COMMAND","text":"create [TYPE] node id [ID] under [PARENT]","description":"Creates a primitive, model, text, light, camera, or group node.","arguments":{"TYPE":{"type":"STRING","defaultValue":"box"},"ID":{"type":"STRING","defaultValue":"card"},"PARENT":{"type":"STRING","defaultValue":"#scene"}}},{"opcode":"createFromTemplate","blockType":"COMMAND","text":"create template [TEMPLATE] as [INSTANCE] under [PARENT]","description":"Instantiates a stored template under the first node matching the parent selector.","arguments":{"TEMPLATE":{"type":"STRING","defaultValue":"monster"},"INSTANCE":{"type":"STRING","defaultValue":"monster-1"},"PARENT":{"type":"STRING","defaultValue":"#scene"}}},{"opcode":"setPosition","blockType":"COMMAND","text":"set selector [SELECTOR] position x [X] y [Y] z [Z]","description":"Sets local position on every node matching the selector.","arguments":{"SELECTOR":{"type":"STRING","defaultValue":"#card"},"X":{"type":"NUMBER","defaultValue":0},"Y":{"type":"NUMBER","defaultValue":1},"Z":{"type":"NUMBER","defaultValue":-3}}},{"opcode":"moveBy","blockType":"COMMAND","text":"move selector [SELECTOR] by x [X] y [Y] z [Z]","description":"Offsets local position on every node matching the selector.","arguments":{"SELECTOR":{"type":"STRING","defaultValue":"#card"},"X":{"type":"NUMBER","defaultValue":0},"Y":{"type":"NUMBER","defaultValue":0},"Z":{"type":"NUMBER","defaultValue":1}}},{"opcode":"setRotation","blockType":"COMMAND","text":"set selector [SELECTOR] rotation x [X] y [Y] z [Z]","description":"Sets local Euler rotation in degrees on every node matching the selector.","arguments":{"SELECTOR":{"type":"STRING","defaultValue":"#card"},"X":{"type":"NUMBER","defaultValue":0},"Y":{"type":"NUMBER","defaultValue":45},"Z":{"type":"NUMBER","defaultValue":0}}},{"opcode":"addClass","blockType":"COMMAND","text":"add class [CLASS] to selector [SELECTOR]","description":"Adds a CSS-style class to every node matching the selector.","arguments":{"CLASS":{"type":"STRING","defaultValue":"monster"},"SELECTOR":{"type":"STRING","defaultValue":"#card"}}},{"opcode":"setData","blockType":"COMMAND","text":"set selector [SELECTOR] data [KEY] to [VALUE]","description":"Sets a data-* value on every node matching the selector.","arguments":{"SELECTOR":{"type":"STRING","defaultValue":"#card"},"KEY":{"type":"STRING","defaultValue":"zone"},"VALUE":{"type":"STRING","defaultValue":"field"}}},{"opcode":"setAttribute","blockType":"COMMAND","text":"set selector [SELECTOR] attribute [NAME] to [VALUE]","description":"Sets an A-Frame component or HTML attribute on every node matching the selector.","arguments":{"SELECTOR":{"type":"STRING","defaultValue":"#card"},"NAME":{"type":"STRING","defaultValue":"visible"},"VALUE":{"type":"STRING","defaultValue":"true"}}},{"opcode":"deleteSelector","blockType":"COMMAND","text":"delete selector [SELECTOR]","description":"Deletes every non-root node matching the selector and its descendants.","arguments":{"SELECTOR":{"type":"STRING","defaultValue":"#card"}}},{"opcode":"countSelector","blockType":"REPORTER","text":"count selector [SELECTOR]","description":"Returns the number of nodes matching a limited selector.","arguments":{"SELECTOR":{"type":"STRING","defaultValue":".monster"}}},{"opcode":"eventTargetId","blockType":"REPORTER","text":"event target id","description":"Returns the id of the most recently handled 3D event target.","arguments":{}},{"opcode":"emitEvent","blockType":"COMMAND","text":"emit 3D event [TYPE] from selector [SELECTOR] with data [DATA]","description":"Queues and dispatches a 3D event from the first node matching the selector.","arguments":{"TYPE":{"type":"STRING","defaultValue":"attack"},"SELECTOR":{"type":"STRING","defaultValue":"#card"},"DATA":{"type":"STRING","defaultValue":"{}"}}},{"opcode":"whenSceneReady","blockType":"HAT","text":"when 3D scene ready","description":"Fires once after create 3D scene initializes the scene host.","arguments":{}},{"opcode":"whenEventOnSelector","blockType":"HAT","text":"when event [TYPE] on selector [SELECTOR]","description":"Fires when a queued 3D event of the given type targets a node matching the selector.","arguments":{"TYPE":{"type":"STRING","defaultValue":"attack"},"SELECTOR":{"type":"STRING","defaultValue":".monster"}}},{"opcode":"createAnimationClip","blockType":"COMMAND","text":"create 3D animation clip [NAME] duration [DURATION]","description":"Creates or replaces a Three.js AnimationClip definition.","arguments":{"NAME":{"type":"STRING","defaultValue":"wave"},"DURATION":{"type":"NUMBER","defaultValue":-1}}},{"opcode":"deleteAnimationClip","blockType":"COMMAND","text":"delete 3D animation clip [NAME]","description":"Deletes a stored 3D animation clip definition and stops its active actions.","arguments":{"NAME":{"type":"STRING","defaultValue":"wave"}}},{"opcode":"addVectorKeyframeTrack","blockType":"COMMAND","text":"add vector keyframe track to clip [CLIP] path [PATH] times [TIMES] values [VALUES]","description":"Adds a Three.js VectorKeyframeTrack definition with x y z values.","arguments":{"CLIP":{"type":"STRING","defaultValue":"move-up"},"PATH":{"type":"STRING","defaultValue":".position"},"TIMES":{"type":"STRING","defaultValue":"0,0.5,1"},"VALUES":{"type":"STRING","defaultValue":"0,1,-3, 0,1.5,-3, 0,1,-3"}}},{"opcode":"addQuaternionKeyframeTrack","blockType":"COMMAND","text":"add quaternion keyframe track to clip [CLIP] path [PATH] times [TIMES] values [VALUES]","description":"Adds a Three.js QuaternionKeyframeTrack definition with x y z w values.","arguments":{"CLIP":{"type":"STRING","defaultValue":"wave"},"PATH":{"type":"STRING","defaultValue":".quaternion"},"TIMES":{"type":"STRING","defaultValue":"0,0.5,1"},"VALUES":{"type":"STRING","defaultValue":"0,0,0,1, 0,0,0.389,0.921, 0,0,0,1"}}},{"opcode":"addEulerRotationKeyframeTrack","blockType":"COMMAND","text":"add euler rotation keyframe track to clip [CLIP] path [PATH] times [TIMES] values [VALUES] unit [UNIT]","description":"Adds a quaternion track converted from Euler x y z rotation values.","arguments":{"CLIP":{"type":"STRING","defaultValue":"wave"},"PATH":{"type":"STRING","defaultValue":".quaternion"},"TIMES":{"type":"STRING","defaultValue":"0,0.25,0.5,0.75,1"},"VALUES":{"type":"STRING","defaultValue":"0,0,0, 0,0,0.8, 0,0,0, 0,0,-0.8, 0,0,0"},"UNIT":{"type":"STRING","defaultValue":"radians"}}},{"opcode":"addPositionKeyframe","blockType":"COMMAND","text":"add position keyframe to clip [CLIP] at [TIME] x [X] y [Y] z [Z]","description":"Adds or replaces one position keyframe on the clip.","arguments":{"CLIP":{"type":"STRING","defaultValue":"move-up"},"TIME":{"type":"NUMBER","defaultValue":0},"X":{"type":"NUMBER","defaultValue":0},"Y":{"type":"NUMBER","defaultValue":1},"Z":{"type":"NUMBER","defaultValue":-3}}},{"opcode":"addScaleKeyframe","blockType":"COMMAND","text":"add scale keyframe to clip [CLIP] at [TIME] x [X] y [Y] z [Z]","description":"Adds or replaces one scale keyframe on the clip.","arguments":{"CLIP":{"type":"STRING","defaultValue":"pulse"},"TIME":{"type":"NUMBER","defaultValue":0},"X":{"type":"NUMBER","defaultValue":1},"Y":{"type":"NUMBER","defaultValue":1},"Z":{"type":"NUMBER","defaultValue":1}}},{"opcode":"addEulerRotationKeyframe","blockType":"COMMAND","text":"add euler rotation keyframe to clip [CLIP] at [TIME] x [X] y [Y] z [Z] unit [UNIT]","description":"Adds or replaces one Euler rotation keyframe converted to quaternion values.","arguments":{"CLIP":{"type":"STRING","defaultValue":"wave"},"TIME":{"type":"NUMBER","defaultValue":0},"X":{"type":"NUMBER","defaultValue":0},"Y":{"type":"NUMBER","defaultValue":0},"Z":{"type":"NUMBER","defaultValue":0.8},"UNIT":{"type":"STRING","defaultValue":"radians"}}},{"opcode":"playAnimationClip","blockType":"COMMAND","text":"play 3D animation clip [CLIP] on selector [SELECTOR] loop [LOOP]","description":"Plays a stored 3D animation clip on every matching node.","arguments":{"CLIP":{"type":"STRING","defaultValue":"wave"},"SELECTOR":{"type":"STRING","defaultValue":"#leftArm"},"LOOP":{"type":"BOOLEAN","defaultValue":true}}},{"opcode":"stopAnimationClip","blockType":"COMMAND","text":"stop 3D animation clip [CLIP] on selector [SELECTOR]","description":"Stops a stored 3D animation clip on every matching node.","arguments":{"CLIP":{"type":"STRING","defaultValue":"wave"},"SELECTOR":{"type":"STRING","defaultValue":"#leftArm"}}},{"opcode":"pauseAnimationClip","blockType":"COMMAND","text":"pause 3D animation clip [CLIP] on selector [SELECTOR]","description":"Pauses a stored 3D animation clip on every matching node.","arguments":{"CLIP":{"type":"STRING","defaultValue":"wave"},"SELECTOR":{"type":"STRING","defaultValue":"#leftArm"}}},{"opcode":"resumeAnimationClip","blockType":"COMMAND","text":"resume 3D animation clip [CLIP] on selector [SELECTOR]","description":"Resumes a paused 3D animation clip on every matching node.","arguments":{"CLIP":{"type":"STRING","defaultValue":"wave"},"SELECTOR":{"type":"STRING","defaultValue":"#leftArm"}}},{"opcode":"setAnimationTimeScale","blockType":"COMMAND","text":"set 3D animation clip [CLIP] on selector [SELECTOR] time scale [SCALE]","description":"Sets the playback speed for a stored 3D animation clip on every matching node.","arguments":{"CLIP":{"type":"STRING","defaultValue":"wave"},"SELECTOR":{"type":"STRING","defaultValue":"#leftArm"},"SCALE":{"type":"NUMBER","defaultValue":1}}},{"opcode":"isAnimationClipPlaying","blockType":"BOOLEAN","text":"is 3D animation clip [CLIP] playing on selector [SELECTOR]?","description":"Reports whether any matching node has the stored 3D animation clip playing.","arguments":{"CLIP":{"type":"STRING","defaultValue":"wave"},"SELECTOR":{"type":"STRING","defaultValue":"#leftArm"}}}]');
  const definitions = {
    extensionName,
    blocks
  };
  const blockDefinitions = definitions.blocks;
  const ROOT_ID = "scene";
  const DOM_EVENT_TYPES = ["click", "tap", "pointerenter", "pointerleave"];
  const TEMPLATE_NODE_KEYS = /* @__PURE__ */ new Set([
    "attributes",
    "children",
    "class",
    "classes",
    "data",
    "id",
    "type"
  ]);
  class TurboWarpAFrameExtension {
    constructor() {
      this.nodes = /* @__PURE__ */ new Map();
      this.templates = /* @__PURE__ */ new Map();
      this.animationClips = /* @__PURE__ */ new Map();
      this.animationPlaybacks = /* @__PURE__ */ new Map();
      this.eventQueue = [];
      this.domEventTypes = new Set(DOM_EVENT_TYPES);
      this.runtimeId = `twaframe-${Math.random().toString(36).slice(2)}`;
      this.sceneOptions = { layer: "above-stage", mode: "3d" };
      this.rootElement = null;
      this.sceneReadyPending = false;
      this.lastEvent = null;
      this.resetGraph();
    }
    getInfo() {
      return {
        id: extensionConfig.id,
        name: Scratch.translate(definitions.extensionName),
        docsURI: extensionConfig.docsURI,
        blockIconURI: extensionConfig.blockIconURI,
        blocks: blockDefinitions.map((block) => this.toScratchBlock(block))
      };
    }
    createScene(args) {
      this.sceneOptions = {
        layer: Scratch.Cast.toString(args.LAYER) || "above-stage",
        mode: Scratch.Cast.toString(args.MODE) || "3d"
      };
      this.resetGraph();
      this.rootElement = this.createSceneElement();
      const root = this.requireNode(ROOT_ID);
      root.element = this.rootElement;
      this.applyNodeToElement(root);
      this.sceneReadyPending = true;
      this.enqueueEvent({ type: "scene-ready", targetId: ROOT_ID, data: "{}" });
    }
    loadTemplate(args) {
      const id = this.normalizeId(Scratch.Cast.toString(args.ID));
      const template = this.parseTemplate(Scratch.Cast.toString(args.SOURCE));
      this.templates.set(id, template);
    }
    createNode(args) {
      const parent = this.firstMatch(Scratch.Cast.toString(args.PARENT)) ?? this.requireNode(ROOT_ID);
      this.addNode(
        {
          type: Scratch.Cast.toString(args.TYPE),
          id: Scratch.Cast.toString(args.ID)
        },
        parent.id
      );
    }
    createFromTemplate(args) {
      const templateId = this.normalizeId(Scratch.Cast.toString(args.TEMPLATE));
      const instanceId = this.normalizeId(Scratch.Cast.toString(args.INSTANCE));
      const template = this.templates.get(templateId);
      if (template === void 0) {
        throw new Error(`Unknown A-Frame template: ${templateId}`);
      }
      const parent = this.firstMatch(Scratch.Cast.toString(args.PARENT)) ?? this.requireNode(ROOT_ID);
      const rootTemplate = {
        ...template,
        id: instanceId,
        data: { ...template.data, template: templateId, instance: instanceId }
      };
      this.addNodeTree(rootTemplate, parent.id, instanceId);
    }
    setPosition(args) {
      this.setVec3Attribute(Scratch.Cast.toString(args.SELECTOR), "position", this.argsToVec3(args));
    }
    moveBy(args) {
      const delta = this.argsToVec3(args);
      for (const node of this.matches(Scratch.Cast.toString(args.SELECTOR))) {
        const current = this.parseVec3(node.attributes.get("position"));
        this.setVec3(node, "position", {
          x: current.x + delta.x,
          y: current.y + delta.y,
          z: current.z + delta.z
        });
      }
    }
    setRotation(args) {
      this.setVec3Attribute(Scratch.Cast.toString(args.SELECTOR), "rotation", this.argsToVec3(args));
    }
    addClass(args) {
      const className = this.normalizeToken(Scratch.Cast.toString(args.CLASS));
      if (className.length === 0) return;
      for (const node of this.matches(Scratch.Cast.toString(args.SELECTOR))) {
        node.classes.add(className);
        this.applyNodeToElement(node);
      }
    }
    setData(args) {
      const key = this.normalizeDataKey(Scratch.Cast.toString(args.KEY));
      const value = Scratch.Cast.toString(args.VALUE);
      if (key.length === 0) return;
      for (const node of this.matches(Scratch.Cast.toString(args.SELECTOR))) {
        node.data.set(key, value);
        this.applyNodeToElement(node);
      }
    }
    setAttribute(args) {
      const name = this.normalizeAttributeName(Scratch.Cast.toString(args.NAME));
      const value = Scratch.Cast.toString(args.VALUE);
      if (name.length === 0) return;
      for (const node of this.matches(Scratch.Cast.toString(args.SELECTOR))) {
        node.attributes.set(name, value);
        this.applyNodeToElement(node);
      }
    }
    deleteSelector(args) {
      const targets = this.matches(Scratch.Cast.toString(args.SELECTOR)).filter(
        (node) => node.id !== ROOT_ID
      );
      for (const node of targets) {
        if (this.nodes.has(node.id)) {
          this.deleteNode(node.id);
        }
      }
    }
    countSelector(args) {
      return this.matches(Scratch.Cast.toString(args.SELECTOR)).length;
    }
    eventTargetId() {
      return this.lastEvent?.targetId ?? "";
    }
    emitEvent(args) {
      const target = this.firstMatch(Scratch.Cast.toString(args.SELECTOR));
      if (target === void 0) return;
      this.enqueueEvent({
        type: Scratch.Cast.toString(args.TYPE),
        targetId: target.id,
        data: Scratch.Cast.toString(args.DATA)
      });
    }
    whenSceneReady() {
      if (!this.sceneReadyPending) return false;
      this.sceneReadyPending = false;
      this.lastEvent = { type: "scene-ready", targetId: ROOT_ID, data: "{}" };
      return true;
    }
    whenEventOnSelector(args) {
      const type = Scratch.Cast.toString(args.TYPE);
      const selector = Scratch.Cast.toString(args.SELECTOR);
      this.domEventTypes.add(type);
      this.attachDomEventType(type);
      const index = this.eventQueue.findIndex((event2) => {
        if (event2.type !== type) return false;
        const target = this.nodes.get(event2.targetId);
        return target !== void 0 && this.matchesSelector(target, selector);
      });
      if (index < 0) return false;
      const [event] = this.eventQueue.splice(index, 1);
      this.lastEvent = event ?? null;
      return event !== void 0;
    }
    createAnimationClip(args) {
      const name = this.normalizeId(Scratch.Cast.toString(args.NAME));
      const duration = Scratch.Cast.toNumber(args.DURATION);
      if (!Number.isFinite(duration) || duration < -1) {
        throw new TypeError("Animation clip duration must be -1 or a non-negative number.");
      }
      this.stopClipEverywhere(name);
      this.animationClips.set(name, {
        name,
        duration,
        tracks: []
      });
    }
    deleteAnimationClip(args) {
      const name = this.normalizeId(Scratch.Cast.toString(args.NAME));
      this.stopClipEverywhere(name);
      this.animationClips.delete(name);
    }
    addVectorKeyframeTrack(args) {
      this.addKeyframeTrack(args, "vector");
    }
    addQuaternionKeyframeTrack(args) {
      this.addKeyframeTrack(args, "quaternion");
    }
    addEulerRotationKeyframeTrack(args) {
      const times = this.parseNumberList(Scratch.Cast.toString(args.TIMES), "times");
      const eulerValues = this.parseNumberList(Scratch.Cast.toString(args.VALUES), "values");
      this.validateTrackNumbers(times, eulerValues, 3);
      const unit = this.normalizeEulerUnit(Scratch.Cast.toString(args.UNIT));
      const values = [];
      for (let index = 0; index < eulerValues.length; index += 3) {
        values.push(
          ...this.eulerToQuaternion(
            eulerValues[index] ?? 0,
            eulerValues[index + 1] ?? 0,
            eulerValues[index + 2] ?? 0,
            unit
          )
        );
      }
      this.pushKeyframeTrack({
        clipName: this.normalizeId(Scratch.Cast.toString(args.CLIP)),
        path: Scratch.Cast.toString(args.PATH),
        trackType: "quaternion",
        times,
        values
      });
    }
    addPositionKeyframe(args) {
      this.insertVectorKeyframe(args, ".position");
    }
    addScaleKeyframe(args) {
      this.insertVectorKeyframe(args, ".scale");
    }
    addEulerRotationKeyframe(args) {
      const unit = this.normalizeEulerUnit(Scratch.Cast.toString(args.UNIT));
      this.insertKeyframe({
        clipName: this.normalizeId(Scratch.Cast.toString(args.CLIP)),
        path: ".quaternion",
        trackType: "quaternion",
        time: Scratch.Cast.toNumber(args.TIME),
        values: this.eulerToQuaternion(
          Scratch.Cast.toNumber(args.X),
          Scratch.Cast.toNumber(args.Y),
          Scratch.Cast.toNumber(args.Z),
          unit
        )
      });
    }
    playAnimationClip(args) {
      const clipName = this.normalizeId(Scratch.Cast.toString(args.CLIP));
      const clip = this.requireAnimationClip(clipName);
      if (clip.tracks.length === 0) {
        throw new Error(`3D animation clip has no keyframe tracks: ${clipName}`);
      }
      const loop = Scratch.Cast.toBoolean(args.LOOP);
      for (const node of this.matches(Scratch.Cast.toString(args.SELECTOR))) {
        const playback = this.createPlayback(node, clip, loop);
        this.animationPlaybacks.set(this.playbackKey(node.id, clipName), playback);
      }
      this.ensureAnimationTickBridge();
    }
    stopAnimationClip(args) {
      const clipName = this.normalizeId(Scratch.Cast.toString(args.CLIP));
      for (const node of this.matches(Scratch.Cast.toString(args.SELECTOR))) {
        this.stopPlayback(this.playbackKey(node.id, clipName), true);
      }
    }
    pauseAnimationClip(args) {
      const clipName = this.normalizeId(Scratch.Cast.toString(args.CLIP));
      for (const node of this.matches(Scratch.Cast.toString(args.SELECTOR))) {
        const playback = this.animationPlaybacks.get(this.playbackKey(node.id, clipName));
        if (playback === void 0) continue;
        playback.paused = true;
        if (playback.action !== null) {
          playback.action.paused = true;
        }
      }
    }
    resumeAnimationClip(args) {
      const clipName = this.normalizeId(Scratch.Cast.toString(args.CLIP));
      for (const node of this.matches(Scratch.Cast.toString(args.SELECTOR))) {
        const playback = this.animationPlaybacks.get(this.playbackKey(node.id, clipName));
        if (playback === void 0 || !playback.active) continue;
        playback.paused = false;
        if (playback.action !== null) {
          playback.action.paused = false;
          playback.action.play?.();
        }
      }
    }
    setAnimationTimeScale(args) {
      const clipName = this.normalizeId(Scratch.Cast.toString(args.CLIP));
      const scale = Scratch.Cast.toNumber(args.SCALE);
      if (!Number.isFinite(scale)) {
        throw new TypeError("Animation time scale must be a finite number.");
      }
      for (const node of this.matches(Scratch.Cast.toString(args.SELECTOR))) {
        const playback = this.animationPlaybacks.get(this.playbackKey(node.id, clipName));
        if (playback === void 0) continue;
        playback.timeScale = scale;
        if (playback.action !== null) {
          playback.action.timeScale = scale;
        }
      }
    }
    isAnimationClipPlaying(args) {
      const clipName = this.normalizeId(Scratch.Cast.toString(args.CLIP));
      return this.matches(Scratch.Cast.toString(args.SELECTOR)).some((node) => {
        const playback = this.animationPlaybacks.get(this.playbackKey(node.id, clipName));
        return playback?.active === true && playback.paused === false;
      });
    }
    testStepAnimations(args) {
      this.updateAnimationMixers(Scratch.Cast.toNumber(args.DELTA) / 1e3);
    }
    snapshot() {
      return {
        options: this.sceneOptions,
        animationClips: [...this.animationClips.values()].map((clip) => ({
          name: clip.name,
          duration: clip.duration,
          tracks: clip.tracks.map((track) => ({
            type: track.type,
            path: track.path,
            times: [...track.times],
            values: [...track.values]
          }))
        })),
        animationPlaybacks: [...this.animationPlaybacks.values()].map((playback) => ({
          nodeId: playback.nodeId,
          clipName: playback.clipName,
          loop: playback.loop,
          active: playback.active,
          playing: playback.active && !playback.paused,
          paused: playback.paused,
          timeScale: playback.timeScale,
          hasMixer: playback.mixer !== null
        })),
        nodes: [...this.nodes.values()].map((node) => ({
          id: node.id,
          type: node.type,
          parentId: node.parentId,
          children: [...node.children],
          classes: [...node.classes].sort(),
          data: Object.fromEntries([...node.data.entries()].sort()),
          attributes: Object.fromEntries([...node.attributes.entries()].sort())
        }))
      };
    }
    resetGraph() {
      for (const key of [...this.animationPlaybacks.keys()]) {
        this.stopPlayback(key, true);
      }
      this.nodes.clear();
      this.nodes.set(ROOT_ID, {
        id: ROOT_ID,
        type: "scene",
        parentId: null,
        children: [],
        classes: /* @__PURE__ */ new Set(),
        data: /* @__PURE__ */ new Map(),
        attributes: /* @__PURE__ */ new Map([
          ["embedded", "true"],
          ["renderer", "alpha: true"]
        ]),
        element: null
      });
      this.eventQueue.length = 0;
      this.lastEvent = null;
    }
    addNodeTree(template, parentId, fallbackId) {
      const node = this.addNode({ ...template, id: fallbackId }, parentId);
      for (const [index, child] of (template.children ?? []).entries()) {
        const childId = child.id ?? child.type ?? String(index + 1);
        this.addNodeTree(child, node.id, `${node.id}-${this.normalizeId(childId)}`);
      }
      return node;
    }
    addNode(template, parentId) {
      const id = this.normalizeId(template.id ?? template.type ?? "node");
      if (id === ROOT_ID || this.nodes.has(id)) {
        throw new Error(`Duplicate A-Frame node id: ${id}`);
      }
      const parent = this.requireNode(parentId);
      const node = {
        id,
        type: this.normalizeNodeType(template.type ?? "group"),
        parentId,
        children: [],
        classes: new Set(this.normalizeClasses(template)),
        data: new Map(this.normalizeRecord(template.data, this.normalizeDataKey.bind(this))),
        attributes: new Map(
          this.normalizeRecord(template.attributes, this.normalizeAttributeName.bind(this))
        ),
        element: this.createElementForType(template.type ?? "group")
      };
      this.nodes.set(id, node);
      parent.children.push(id);
      this.attachElement(parent, node);
      this.attachNodeEventListeners(node);
      this.applyNodeToElement(node);
      return node;
    }
    deleteNode(id) {
      const node = this.requireNode(id);
      for (const childId of [...node.children]) {
        this.deleteNode(childId);
      }
      if (node.parentId !== null) {
        const parent = this.requireNode(node.parentId);
        parent.children = parent.children.filter((childId) => childId !== id);
      }
      node.element?.remove();
      this.nodes.delete(id);
      for (const key of [...this.animationPlaybacks.keys()]) {
        if (key.startsWith(`${id}:`)) {
          this.stopPlayback(key, true);
        }
      }
    }
    matches(selector) {
      const normalized = selector.trim();
      if (normalized.length === 0 || normalized === "*") return [...this.nodes.values()];
      return [...this.nodes.values()].filter((node) => this.matchesSelector(node, normalized));
    }
    firstMatch(selector) {
      return this.matches(selector)[0];
    }
    matchesSelector(node, selector) {
      if (selector === "@event" || selector === "event target") {
        return this.lastEvent?.targetId === node.id;
      }
      if (selector.startsWith("#")) return node.id === this.normalizeId(selector.slice(1));
      if (selector.startsWith(".")) return node.classes.has(this.normalizeToken(selector.slice(1)));
      const dataMatch = selector.match(/^\[data-([a-zA-Z0-9_-]+)=["']?([^"'\]]+)["']?\]$/);
      if (dataMatch !== null) {
        const [, key, value] = dataMatch;
        return node.data.get(this.normalizeDataKey(key ?? "")) === value;
      }
      return node.id === this.normalizeId(selector);
    }
    enqueueEvent(event) {
      this.pushEvent(event);
      const target = this.nodes.get(event.targetId);
      const element = target?.element;
      if (element !== null && element !== void 0) {
        element.dispatchEvent(
          new CustomEvent(event.type, {
            detail: { data: event.data, targetId: event.targetId, twAframeSynthetic: true }
          })
        );
      }
    }
    pushEvent(event) {
      this.eventQueue.push(event);
    }
    createSceneElement() {
      if (typeof document === "undefined") return null;
      const existing = document.getElementById("tw-aframe-root");
      existing?.remove();
      const host = document.createElement("div");
      host.id = "tw-aframe-root";
      host.dataset["twAframeLayer"] = this.sceneOptions.layer;
      host.dataset["twAframeMode"] = this.sceneOptions.mode;
      host.style.position = "absolute";
      host.style.inset = "0";
      host.style.pointerEvents = "auto";
      host.style.zIndex = this.sceneOptions.layer === "below-stage" ? "0" : "10";
      const scene = document.createElement("a-scene");
      host.append(scene);
      const mount = this.findStageMount();
      mount.append(host);
      return scene;
    }
    createElementForType(type) {
      if (typeof document === "undefined") return null;
      return document.createElement(this.tagForType(this.normalizeNodeType(type)));
    }
    attachElement(parent, child) {
      if (parent.element === null || child.element === null) return;
      parent.element.append(child.element);
    }
    attachDomEventType(type) {
      for (const node of this.nodes.values()) {
        this.attachNodeEventListener(node, type);
      }
    }
    attachNodeEventListeners(node) {
      for (const type of this.domEventTypes) {
        this.attachNodeEventListener(node, type);
      }
    }
    attachNodeEventListener(node, type) {
      const element = node.element;
      if (element === null) return;
      const listenerKey = `twAframeListener${type}`;
      const elementWithState = element;
      if (elementWithState[listenerKey]) return;
      element.addEventListener(type, (event) => {
        if (event.target !== element) return;
        const detail = this.eventDetail(event);
        if (detail["twAframeSynthetic"] === true) return;
        this.pushEvent({
          type,
          targetId: node.id,
          data: JSON.stringify(detail)
        });
      });
      elementWithState[listenerKey] = true;
    }
    eventDetail(event) {
      if ("detail" in event && typeof event.detail === "object" && event.detail !== null) {
        return event.detail;
      }
      return {};
    }
    findStageMount() {
      const selectors = [
        '[class*="stage_stage-wrapper"]',
        '[class*="stage-wrapper"]',
        '[class*="stage"]',
        "#scratch-stage",
        "canvas"
      ];
      for (const selector of selectors) {
        const match = document.querySelector(selector);
        const mount = match instanceof HTMLCanvasElement ? match.parentElement : match;
        if (mount instanceof HTMLElement) {
          const style = getComputedStyle(mount);
          if (style.position === "static") {
            mount.style.position = "relative";
          }
          return mount;
        }
      }
      return document.body;
    }
    applyNodeToElement(node) {
      if (node.element === null) return;
      node.element.id = node.id;
      node.element.setAttribute("class", [...node.classes].sort().join(" "));
      for (const [key, value] of node.data) {
        node.element.setAttribute(`data-${key}`, value);
      }
      for (const [name, value] of node.attributes) {
        node.element.setAttribute(name, value);
      }
    }
    addKeyframeTrack(args, trackType) {
      const times = this.parseNumberList(Scratch.Cast.toString(args.TIMES), "times");
      const values = this.parseNumberList(Scratch.Cast.toString(args.VALUES), "values");
      this.validateTrackNumbers(times, values, trackType === "vector" ? 3 : 4);
      this.pushKeyframeTrack({
        clipName: this.normalizeId(Scratch.Cast.toString(args.CLIP)),
        path: Scratch.Cast.toString(args.PATH),
        trackType,
        times,
        values
      });
    }
    insertVectorKeyframe(args, path) {
      this.insertKeyframe({
        clipName: this.normalizeId(Scratch.Cast.toString(args.CLIP)),
        path,
        trackType: "vector",
        time: Scratch.Cast.toNumber(args.TIME),
        values: [
          Scratch.Cast.toNumber(args.X),
          Scratch.Cast.toNumber(args.Y),
          Scratch.Cast.toNumber(args.Z)
        ]
      });
    }
    insertKeyframe({
      clipName,
      path,
      trackType,
      time,
      values
    }) {
      if (!Number.isFinite(time) || time < 0) {
        throw new TypeError("Animation keyframe time must be a non-negative number.");
      }
      if (values.some((value) => !Number.isFinite(value))) {
        throw new TypeError("Animation keyframe values must be finite numbers.");
      }
      const stride = trackType === "vector" ? 3 : 4;
      if (values.length !== stride) {
        throw new TypeError(`Animation keyframe must contain ${stride} values.`);
      }
      const clip = this.requireAnimationClip(clipName);
      const normalizedPath = this.normalizeTrackPath(path, trackType);
      let track = clip.tracks.find(
        (item) => item.type === trackType && item.path === normalizedPath
      );
      if (track === void 0) {
        track = { type: trackType, path: normalizedPath, times: [], values: [] };
        clip.tracks.push(track);
      }
      const insertAt = track.times.findIndex((existingTime) => existingTime >= time);
      const valueInsertAt = (insertAt < 0 ? track.times.length : insertAt) * stride;
      if (insertAt >= 0 && track.times[insertAt] === time) {
        track.values.splice(valueInsertAt, stride, ...values);
        return;
      }
      const timeInsertAt = insertAt < 0 ? track.times.length : insertAt;
      track.times.splice(timeInsertAt, 0, time);
      track.values.splice(valueInsertAt, 0, ...values);
    }
    pushKeyframeTrack({
      clipName,
      path,
      trackType,
      times,
      values
    }) {
      const clip = this.requireAnimationClip(clipName);
      const normalizedPath = this.normalizeTrackPath(path, trackType);
      clip.tracks.push({
        type: trackType,
        path: normalizedPath,
        times: [...times],
        values: [...values]
      });
    }
    parseNumberList(source, label) {
      const trimmed = source.trim();
      if (trimmed.length === 0) {
        throw new TypeError(`Animation ${label} must contain at least one number.`);
      }
      const values = trimmed.split(/[\s,]+/).filter((part) => part.length > 0).map((part) => Number(part));
      if (values.length === 0 || values.some((value) => !Number.isFinite(value))) {
        throw new TypeError(`Animation ${label} must contain only finite numbers.`);
      }
      return values;
    }
    validateTrackNumbers(times, values, stride) {
      if (times.length === 0) {
        throw new TypeError("Animation track times must not be empty.");
      }
      for (let index = 1; index < times.length; index += 1) {
        if ((times[index] ?? 0) < (times[index - 1] ?? 0)) {
          throw new TypeError("Animation track times must be sorted in ascending order.");
        }
      }
      const expectedValues = times.length * stride;
      if (values.length !== expectedValues) {
        throw new TypeError(
          `Animation track values length must be ${expectedValues} for ${times.length} keyframes.`
        );
      }
    }
    normalizeTrackPath(path, trackType) {
      const normalized = path.trim();
      const allowed = trackType === "vector" ? /* @__PURE__ */ new Set([".position", ".scale"]) : /* @__PURE__ */ new Set([".quaternion"]);
      if (!allowed.has(normalized)) {
        throw new TypeError(
          `Animation ${trackType} track path must be one of: ${[...allowed].join(", ")}.`
        );
      }
      return normalized;
    }
    eulerToQuaternion(x, y, z, unit) {
      const scale = unit === "degrees" ? Math.PI / 180 : 1;
      const halfX = x * scale / 2;
      const halfY = y * scale / 2;
      const halfZ = z * scale / 2;
      const c1 = Math.cos(halfX);
      const c2 = Math.cos(halfY);
      const c3 = Math.cos(halfZ);
      const s1 = Math.sin(halfX);
      const s2 = Math.sin(halfY);
      const s3 = Math.sin(halfZ);
      return [
        s1 * c2 * c3 + c1 * s2 * s3,
        c1 * s2 * c3 - s1 * c2 * s3,
        c1 * c2 * s3 + s1 * s2 * c3,
        c1 * c2 * c3 - s1 * s2 * s3
      ];
    }
    normalizeEulerUnit(value) {
      const unit = value.trim().toLowerCase();
      if (unit !== "radians" && unit !== "degrees") {
        throw new TypeError("Euler rotation keyframe unit must be radians or degrees.");
      }
      return unit;
    }
    createPlayback(node, clip, loop) {
      const key = this.playbackKey(node.id, clip.name);
      this.stopPlayback(key, true);
      const playback = {
        nodeId: node.id,
        clipName: clip.name,
        loop,
        active: false,
        paused: false,
        timeScale: 1,
        mixer: null,
        action: null
      };
      const mixer = this.createMixer(node, clip, loop);
      if (mixer !== null) {
        playback.mixer = mixer.mixer;
        playback.action = mixer.action;
        playback.active = true;
      }
      return playback;
    }
    createMixer(node, clip, loop) {
      const object3D = this.object3DForNode(node);
      const THREE = this.getThree();
      if (object3D === null || THREE === null) return null;
      const threeClip = this.toThreeAnimationClip(THREE, clip);
      const mixer = new THREE.AnimationMixer(object3D);
      const action = mixer.clipAction(threeClip);
      if (action.setLoop !== void 0) {
        action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
      }
      action.paused = false;
      action.timeScale = 1;
      action.play?.();
      return { mixer, action };
    }
    toThreeAnimationClip(THREE, clip) {
      const tracks = clip.tracks.map((track) => {
        if (track.type === "vector") {
          return new THREE.VectorKeyframeTrack(track.path, track.times, track.values);
        }
        return new THREE.QuaternionKeyframeTrack(track.path, track.times, track.values);
      });
      return new THREE.AnimationClip(clip.name, clip.duration, tracks);
    }
    object3DForNode(node) {
      const element = node.element;
      return element?.object3D ?? null;
    }
    stopPlayback(key, remove) {
      const playback = this.animationPlaybacks.get(key);
      if (playback === void 0) return;
      playback.action?.stop?.();
      playback.mixer?.stopAllAction?.();
      playback.active = false;
      playback.paused = false;
      if (remove) {
        this.animationPlaybacks.delete(key);
      }
    }
    stopClipEverywhere(clipName) {
      for (const [key, playback] of [...this.animationPlaybacks.entries()]) {
        if (playback.clipName === clipName) {
          this.stopPlayback(key, true);
        }
      }
    }
    updateAnimationMixers(deltaTime) {
      if (!Number.isFinite(deltaTime) || deltaTime < 0) return;
      for (const playback of this.animationPlaybacks.values()) {
        if (!playback.active || playback.paused) continue;
        playback.mixer?.update(deltaTime * playback.timeScale);
      }
    }
    ensureAnimationTickBridge() {
      const scene = this.rootElement;
      if (scene === null || this.getThree() === null) return;
      const AFRAME = this.getAFrame();
      if (AFRAME === null) return;
      const runtimes = this.animationRuntimeRegistry();
      runtimes.set(this.runtimeId, this);
      if (AFRAME.components?.["tw-animation-runtime"] === void 0) {
        AFRAME.registerComponent("tw-animation-runtime", {
          schema: { id: { type: "string" } },
          tick(_time, timeDelta) {
            const extension = animationRuntimeRegistry().get(this.data.id);
            extension?.updateAnimationMixers(timeDelta / 1e3);
          }
        });
      }
      scene.setAttribute("tw-animation-runtime", `id: ${this.runtimeId}`);
    }
    animationRuntimeRegistry() {
      return animationRuntimeRegistry();
    }
    getAFrame() {
      const value = globalThis.AFRAME;
      return value ?? null;
    }
    getThree() {
      return this.getAFrame()?.THREE ?? null;
    }
    playbackKey(nodeId, clipName) {
      return `${nodeId}:${clipName}`;
    }
    requireAnimationClip(name) {
      const clip = this.animationClips.get(name);
      if (clip === void 0) {
        throw new Error(`Unknown 3D animation clip: ${name}`);
      }
      return clip;
    }
    setVec3Attribute(selector, name, value) {
      for (const node of this.matches(selector)) {
        this.setVec3(node, name, value);
      }
    }
    setVec3(node, name, value) {
      node.attributes.set(name, `${value.x} ${value.y} ${value.z}`);
      this.applyNodeToElement(node);
    }
    argsToVec3(args) {
      return {
        x: Scratch.Cast.toNumber(args.X),
        y: Scratch.Cast.toNumber(args.Y),
        z: Scratch.Cast.toNumber(args.Z)
      };
    }
    parseVec3(value) {
      if (value === void 0) return { x: 0, y: 0, z: 0 };
      const [x = 0, y = 0, z = 0] = value.split(/\s+/).map((part) => Number(part));
      return { x, y, z };
    }
    parseTemplate(source) {
      const value = JSON.parse(source);
      this.validateTemplateNode(value, "template");
      return value;
    }
    validateTemplateNode(value, path) {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new TypeError(`A-Frame ${path} must be an object.`);
      }
      const node = value;
      for (const key of Object.keys(node)) {
        if (!TEMPLATE_NODE_KEYS.has(key)) {
          throw new TypeError(`A-Frame ${path}.${key} is not supported.`);
        }
      }
      this.validateOptionalString(node["type"], `${path}.type`);
      this.validateOptionalString(node["id"], `${path}.id`);
      this.validateTemplateClass(node["class"], `${path}.class`);
      this.validateOptionalStringArray(node["classes"], `${path}.classes`);
      this.validateStringRecord(node["data"], `${path}.data`);
      this.validateStringRecord(node["attributes"], `${path}.attributes`);
      const children = node["children"];
      if (children === void 0) return;
      if (!Array.isArray(children)) {
        throw new TypeError(`A-Frame ${path}.children must be an array.`);
      }
      children.forEach((child, index) => {
        this.validateTemplateNode(child, `${path}.children[${index}]`);
      });
    }
    validateTemplateClass(value, path) {
      if (value === void 0 || typeof value === "string") return;
      if (Array.isArray(value) && value.every((item) => typeof item === "string")) return;
      throw new TypeError(`A-Frame ${path} must be a string or string array.`);
    }
    validateOptionalStringArray(value, path) {
      if (value === void 0) return;
      if (Array.isArray(value) && value.every((item) => typeof item === "string")) return;
      throw new TypeError(`A-Frame ${path} must be a string array.`);
    }
    validateOptionalString(value, path) {
      if (value === void 0 || typeof value === "string") return;
      throw new TypeError(`A-Frame ${path} must be a string.`);
    }
    validateStringRecord(value, path) {
      if (value === void 0) return;
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new TypeError(`A-Frame ${path} must be an object.`);
      }
      for (const [key, recordValue] of Object.entries(value)) {
        if (key.trim().length === 0) {
          throw new TypeError(`A-Frame ${path} keys must be non-empty strings.`);
        }
        if (recordValue === void 0) {
          throw new TypeError(`A-Frame ${path}.${key} must not be undefined.`);
        }
      }
    }
    normalizeClasses(template) {
      const classes = [
        ...Array.isArray(template.class) ? template.class : String(template.class ?? "").split(/\s+/),
        ...template.classes ?? []
      ];
      return classes.map((value) => this.normalizeToken(value)).filter((value) => value.length > 0);
    }
    normalizeRecord(value, normalizeKey) {
      return Object.entries(value ?? {}).map(([key, recordValue]) => [
        normalizeKey(key),
        String(recordValue)
      ]);
    }
    normalizeNodeType(value) {
      const type = this.normalizeToken(value);
      return type.length === 0 ? "group" : type;
    }
    normalizeId(value) {
      return this.normalizeToken(value) || "node";
    }
    normalizeToken(value) {
      return value.trim().replace(/[^a-zA-Z0-9_-]/g, "-");
    }
    normalizeDataKey(value) {
      return this.normalizeToken(value).toLowerCase();
    }
    normalizeAttributeName(value) {
      return value.trim().replace(/[^a-zA-Z0-9_:-]/g, "-");
    }
    tagForType(type) {
      const tags = {
        box: "a-box",
        camera: "a-camera",
        circle: "a-circle",
        cone: "a-cone",
        cylinder: "a-cylinder",
        empty: "a-entity",
        group: "a-entity",
        image: "a-image",
        "image-plane": "a-image",
        light: "a-light",
        model: "a-entity",
        plane: "a-plane",
        primitive: "a-entity",
        scene: "a-scene",
        sphere: "a-sphere",
        text: "a-text"
      };
      return tags[type] ?? "a-entity";
    }
    requireNode(id) {
      const node = this.nodes.get(id);
      if (node === void 0) {
        throw new Error(`Unknown A-Frame node: ${id}`);
      }
      return node;
    }
    toScratchBlock(block) {
      return {
        opcode: block.opcode,
        blockType: Scratch.BlockType[block.blockType],
        text: Scratch.translate(block.text),
        arguments: Object.fromEntries(
          Object.entries(block.arguments).map(([name, argument]) => [
            name,
            {
              type: Scratch.ArgumentType[argument.type],
              defaultValue: argument.defaultValue
            }
          ])
        )
      };
    }
  }
  function animationRuntimeRegistry() {
    const globalState = globalThis;
    globalState.__twAframeAnimationRuntimes ?? (globalState.__twAframeAnimationRuntimes = /* @__PURE__ */ new Map());
    return globalState.__twAframeAnimationRuntimes;
  }
  if (!Scratch.extensions.unsandboxed) {
    throw new Error(`${extensionConfig.name} must run unsandboxed.`);
  }
  Scratch.extensions.register(new TurboWarpAFrameExtension());

})(Scratch);
