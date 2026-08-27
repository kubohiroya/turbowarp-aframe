import {extensionConfig} from './config';
import definitions from './block-definitions.json';
import {parse as parseYaml, stringify as stringifyYaml} from 'yaml';

type BlockTypeName = 'COMMAND' | 'REPORTER' | 'HAT';
type ArgumentTypeName = 'STRING' | 'NUMBER';
type Vec3 = {x: number; y: number; z: number};

interface DefinitionArgument {
  type: ArgumentTypeName;
  defaultValue?: string | number;
}

interface BlockDefinition {
  opcode: string;
  blockType: BlockTypeName;
  text: string;
  description: string;
  arguments: Record<string, DefinitionArgument>;
}

interface TemplateNode {
  type?: string;
  id?: string;
  class?: string | string[];
  classes?: string[];
  data?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
  children?: TemplateNode[];
}

interface SceneNode {
  id: string;
  type: string;
  parentId: string | null;
  children: string[];
  classes: Set<string>;
  data: Map<string, string>;
  attributes: Map<string, string>;
  element: Element | null;
}

interface SceneEvent {
  type: string;
  targetId: string;
  data: string;
}

interface SceneOptions {
  layer: string;
  mode: string;
}

interface SceneYamlDocument {
  formatVersion: 1;
  options?: Partial<SceneOptions>;
  root: TemplateNode;
}

const blockDefinitions = definitions.blocks as readonly BlockDefinition[];
const ROOT_ID = 'scene';
const DOM_EVENT_TYPES = ['click', 'tap', 'pointerenter', 'pointerleave'] as const;
const TEMPLATE_NODE_KEYS = new Set([
  'attributes',
  'children',
  'class',
  'classes',
  'data',
  'id',
  'type'
]);
const SCENE_YAML_KEYS = new Set(['formatVersion', 'options', 'root']);
const SCENE_OPTION_KEYS = new Set(['layer', 'mode']);

export class TurboWarpAFrameExtension implements TurboWarpExtension {
  private readonly nodes = new Map<string, SceneNode>();
  private readonly templates = new Map<string, TemplateNode>();
  private readonly eventQueue: SceneEvent[] = [];
  private readonly domEventTypes = new Set<string>(DOM_EVENT_TYPES);
  private sceneOptions: SceneOptions = {layer: 'above-stage', mode: '3d'};
  private rootElement: Element | null = null;
  private sceneReadyPending = false;
  private lastEvent: SceneEvent | null = null;

  public constructor() {
    this.resetGraph();
  }

  public getInfo(): Record<string, unknown> {
    return {
      id: extensionConfig.id,
      name: Scratch.translate(definitions.extensionName),
      docsURI: extensionConfig.docsURI,
      blockIconURI: extensionConfig.blockIconURI,
      blocks: blockDefinitions.map((block) => this.toScratchBlock(block))
    };
  }

  public createScene(args: {LAYER: unknown; MODE: unknown}): void {
    this.sceneOptions = {
      layer: Scratch.Cast.toString(args.LAYER) || 'above-stage',
      mode: Scratch.Cast.toString(args.MODE) || '3d'
    };
    this.resetGraph();
    this.rootElement = this.createSceneElement();
    const root = this.requireNode(ROOT_ID);
    root.element = this.rootElement;
    this.applyNodeToElement(root);
    this.sceneReadyPending = true;
    this.enqueueEvent({type: 'scene-ready', targetId: ROOT_ID, data: '{}'});
  }

  public loadTemplate(args: {ID: unknown; SOURCE: unknown}): void {
    const id = this.normalizeId(Scratch.Cast.toString(args.ID));
    const template = this.parseTemplate(Scratch.Cast.toString(args.SOURCE));
    this.templates.set(id, template);
  }

  public createNode(args: {TYPE: unknown; ID: unknown; PARENT: unknown}): void {
    const parent = this.firstMatch(Scratch.Cast.toString(args.PARENT)) ?? this.requireNode(ROOT_ID);
    this.addNode(
      {
        type: Scratch.Cast.toString(args.TYPE),
        id: Scratch.Cast.toString(args.ID)
      },
      parent.id
    );
  }

  public createFromTemplate(args: {TEMPLATE: unknown; INSTANCE: unknown; PARENT: unknown}): void {
    const templateId = this.normalizeId(Scratch.Cast.toString(args.TEMPLATE));
    const instanceId = this.normalizeId(Scratch.Cast.toString(args.INSTANCE));
    const template = this.templates.get(templateId);
    if (template === undefined) {
      throw new Error(`Unknown A-Frame template: ${templateId}`);
    }
    const parent = this.firstMatch(Scratch.Cast.toString(args.PARENT)) ?? this.requireNode(ROOT_ID);
    const rootTemplate: TemplateNode = {
      ...template,
      id: instanceId,
      data: {...template.data, template: templateId, instance: instanceId}
    };
    this.addNodeTree(rootTemplate, parent.id, instanceId);
  }

  public setPosition(args: {SELECTOR: unknown; X: unknown; Y: unknown; Z: unknown}): void {
    this.setVec3Attribute(Scratch.Cast.toString(args.SELECTOR), 'position', this.argsToVec3(args));
  }

  public moveBy(args: {SELECTOR: unknown; X: unknown; Y: unknown; Z: unknown}): void {
    const delta = this.argsToVec3(args);
    for (const node of this.matches(Scratch.Cast.toString(args.SELECTOR))) {
      const current = this.parseVec3(node.attributes.get('position'));
      this.setVec3(node, 'position', {
        x: current.x + delta.x,
        y: current.y + delta.y,
        z: current.z + delta.z
      });
    }
  }

  public setRotation(args: {SELECTOR: unknown; X: unknown; Y: unknown; Z: unknown}): void {
    this.setVec3Attribute(Scratch.Cast.toString(args.SELECTOR), 'rotation', this.argsToVec3(args));
  }

  public addClass(args: {CLASS: unknown; SELECTOR: unknown}): void {
    const className = this.normalizeToken(Scratch.Cast.toString(args.CLASS));
    if (className.length === 0) return;
    for (const node of this.matches(Scratch.Cast.toString(args.SELECTOR))) {
      node.classes.add(className);
      this.applyNodeToElement(node);
    }
  }

  public setData(args: {SELECTOR: unknown; KEY: unknown; VALUE: unknown}): void {
    const key = this.normalizeDataKey(Scratch.Cast.toString(args.KEY));
    const value = Scratch.Cast.toString(args.VALUE);
    if (key.length === 0) return;
    for (const node of this.matches(Scratch.Cast.toString(args.SELECTOR))) {
      node.data.set(key, value);
      this.applyNodeToElement(node);
    }
  }

  public setAttribute(args: {SELECTOR: unknown; NAME: unknown; VALUE: unknown}): void {
    const name = this.normalizeAttributeName(Scratch.Cast.toString(args.NAME));
    const value = Scratch.Cast.toString(args.VALUE);
    if (name.length === 0) return;
    for (const node of this.matches(Scratch.Cast.toString(args.SELECTOR))) {
      node.attributes.set(name, value);
      this.applyNodeToElement(node);
    }
  }

  public deleteSelector(args: {SELECTOR: unknown}): void {
    const targets = this.matches(Scratch.Cast.toString(args.SELECTOR)).filter(
      (node) => node.id !== ROOT_ID
    );
    for (const node of targets) {
      if (this.nodes.has(node.id)) {
        this.deleteNode(node.id);
      }
    }
  }

  public loadSceneYaml(args: {SOURCE: unknown}): void {
    const document = this.parseSceneYaml(Scratch.Cast.toString(args.SOURCE));
    this.preflightSceneYaml(document);
    this.sceneOptions = {
      layer: document.options?.layer ?? 'above-stage',
      mode: document.options?.mode ?? '3d'
    };
    this.resetGraph();
    this.rootElement = this.createSceneElement();
    const root = this.requireNode(ROOT_ID);
    root.element = this.rootElement;
    this.applyTemplateToRoot(root, document.root);
    this.applyNodeToElement(root);
    for (const [index, child] of (document.root.children ?? []).entries()) {
      const fallbackId = this.sceneNodeFallbackId(child, ROOT_ID, index);
      this.addSceneNodeTree(child, ROOT_ID, fallbackId);
    }
    this.sceneReadyPending = true;
    this.enqueueEvent({type: 'scene-ready', targetId: ROOT_ID, data: '{}'});
  }

  public sceneYaml(): string {
    return stringifyYaml(
      {
        formatVersion: 1,
        options: this.sceneOptions,
        root: this.nodeToTemplate(this.requireNode(ROOT_ID))
      },
      {lineWidth: 0}
    );
  }

  public countSelector(args: {SELECTOR: unknown}): number {
    return this.matches(Scratch.Cast.toString(args.SELECTOR)).length;
  }

  public eventTargetId(): string {
    return this.lastEvent?.targetId ?? '';
  }

  public emitEvent(args: {TYPE: unknown; SELECTOR: unknown; DATA: unknown}): void {
    const target = this.firstMatch(Scratch.Cast.toString(args.SELECTOR));
    if (target === undefined) return;
    this.enqueueEvent({
      type: Scratch.Cast.toString(args.TYPE),
      targetId: target.id,
      data: Scratch.Cast.toString(args.DATA)
    });
  }

  public whenSceneReady(): boolean {
    if (!this.sceneReadyPending) return false;
    this.sceneReadyPending = false;
    this.lastEvent = {type: 'scene-ready', targetId: ROOT_ID, data: '{}'};
    return true;
  }

  public whenEventOnSelector(args: {TYPE: unknown; SELECTOR: unknown}): boolean {
    const type = Scratch.Cast.toString(args.TYPE);
    const selector = Scratch.Cast.toString(args.SELECTOR);
    this.domEventTypes.add(type);
    this.attachDomEventType(type);
    const index = this.eventQueue.findIndex((event) => {
      if (event.type !== type) return false;
      const target = this.nodes.get(event.targetId);
      return target !== undefined && this.matchesSelector(target, selector);
    });
    if (index < 0) return false;
    const [event] = this.eventQueue.splice(index, 1);
    this.lastEvent = event ?? null;
    return event !== undefined;
  }

  public snapshot(): Record<string, unknown> {
    return {
      options: this.sceneOptions,
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

  private resetGraph(): void {
    this.nodes.clear();
    this.nodes.set(ROOT_ID, {
      id: ROOT_ID,
      type: 'scene',
      parentId: null,
      children: [],
      classes: new Set(),
      data: new Map(),
      attributes: new Map([
        ['embedded', 'true'],
        ['renderer', 'alpha: true']
      ]),
      element: null
    });
    this.eventQueue.length = 0;
    this.lastEvent = null;
  }

  private addNodeTree(template: TemplateNode, parentId: string, fallbackId: string): SceneNode {
    const node = this.addNode({...template, id: fallbackId}, parentId);
    for (const [index, child] of (template.children ?? []).entries()) {
      const childId = child.id ?? child.type ?? String(index + 1);
      this.addNodeTree(child, node.id, `${node.id}-${this.normalizeId(childId)}`);
    }
    return node;
  }

  private addSceneNodeTree(template: TemplateNode, parentId: string, fallbackId: string): SceneNode {
    const node = this.addNode({...template, id: template.id ?? fallbackId}, parentId);
    for (const [index, child] of (template.children ?? []).entries()) {
      const childId = this.sceneNodeFallbackId(child, node.id, index);
      this.addSceneNodeTree(child, node.id, childId);
    }
    return node;
  }

  private addNode(template: TemplateNode, parentId: string): SceneNode {
    const id = this.normalizeId(template.id ?? template.type ?? 'node');
    if (id === ROOT_ID || this.nodes.has(id)) {
      throw new Error(`Duplicate A-Frame node id: ${id}`);
    }
    const parent = this.requireNode(parentId);
    const node: SceneNode = {
      id,
      type: this.normalizeNodeType(template.type ?? 'group'),
      parentId,
      children: [],
      classes: new Set(this.normalizeClasses(template)),
      data: new Map(this.normalizeRecord(template.data, this.normalizeDataKey.bind(this))),
      attributes: new Map(
        this.normalizeRecord(template.attributes, this.normalizeAttributeName.bind(this))
      ),
      element: this.createElementForType(template.type ?? 'group')
    };
    this.nodes.set(id, node);
    parent.children.push(id);
    this.attachElement(parent, node);
    this.attachNodeEventListeners(node);
    this.applyNodeToElement(node);
    return node;
  }

  private deleteNode(id: string): void {
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
  }

  private matches(selector: string): SceneNode[] {
    const normalized = selector.trim();
    if (normalized.length === 0 || normalized === '*') return [...this.nodes.values()];
    return [...this.nodes.values()].filter((node) => this.matchesSelector(node, normalized));
  }

  private firstMatch(selector: string): SceneNode | undefined {
    return this.matches(selector)[0];
  }

  private matchesSelector(node: SceneNode, selector: string): boolean {
    if (selector === '@event' || selector === 'event target') {
      return this.lastEvent?.targetId === node.id;
    }
    if (selector.startsWith('#')) return node.id === this.normalizeId(selector.slice(1));
    if (selector.startsWith('.')) return node.classes.has(this.normalizeToken(selector.slice(1)));
    const dataMatch = selector.match(/^\[data-([a-zA-Z0-9_-]+)=["']?([^"'\]]+)["']?\]$/);
    if (dataMatch !== null) {
      const [, key, value] = dataMatch;
      return node.data.get(this.normalizeDataKey(key ?? '')) === value;
    }
    return node.id === this.normalizeId(selector);
  }

  private enqueueEvent(event: SceneEvent): void {
    this.pushEvent(event);
    const target = this.nodes.get(event.targetId);
    const element = target?.element;
    if (element !== null && element !== undefined) {
      element.dispatchEvent(
        new CustomEvent(event.type, {
          detail: {data: event.data, targetId: event.targetId, twAframeSynthetic: true}
        })
      );
    }
  }

  private pushEvent(event: SceneEvent): void {
    this.eventQueue.push(event);
  }

  private createSceneElement(): Element | null {
    if (typeof document === 'undefined') return null;
    const existing = document.getElementById('tw-aframe-root');
    existing?.remove();

    const host = document.createElement('div');
    host.id = 'tw-aframe-root';
    host.dataset['twAframeLayer'] = this.sceneOptions.layer;
    host.dataset['twAframeMode'] = this.sceneOptions.mode;
    host.style.position = 'absolute';
    host.style.inset = '0';
    host.style.pointerEvents = 'auto';
    host.style.zIndex = this.sceneOptions.layer === 'below-stage' ? '0' : '10';

    const scene = document.createElement('a-scene');
    host.append(scene);
    const mount = this.findStageMount();
    mount.append(host);
    return scene;
  }

  private createElementForType(type: string): Element | null {
    if (typeof document === 'undefined') return null;
    return document.createElement(this.tagForType(this.normalizeNodeType(type)));
  }

  private attachElement(parent: SceneNode, child: SceneNode): void {
    if (parent.element === null || child.element === null) return;
    parent.element.append(child.element);
  }

  private attachDomEventType(type: string): void {
    for (const node of this.nodes.values()) {
      this.attachNodeEventListener(node, type);
    }
  }

  private attachNodeEventListeners(node: SceneNode): void {
    for (const type of this.domEventTypes) {
      this.attachNodeEventListener(node, type);
    }
  }

  private attachNodeEventListener(node: SceneNode, type: string): void {
    const element = node.element;
    if (element === null) return;
    const listenerKey = `twAframeListener${type}`;
    const elementWithState = element as Element & Record<string, boolean>;
    if (elementWithState[listenerKey]) return;
    element.addEventListener(type, (event) => {
      if (event.target !== element) return;
      const detail = this.eventDetail(event);
      if (detail['twAframeSynthetic'] === true) return;
      this.pushEvent({
        type,
        targetId: node.id,
        data: JSON.stringify(detail)
      });
    });
    elementWithState[listenerKey] = true;
  }

  private eventDetail(event: Event): Record<string, unknown> {
    if ('detail' in event && typeof event.detail === 'object' && event.detail !== null) {
      return event.detail as Record<string, unknown>;
    }
    return {};
  }

  private findStageMount(): HTMLElement {
    const selectors = [
      '[class*="stage_stage-wrapper"]',
      '[class*="stage-wrapper"]',
      '[class*="stage"]',
      '#scratch-stage',
      'canvas'
    ];
    for (const selector of selectors) {
      const match = document.querySelector(selector);
      const mount = match instanceof HTMLCanvasElement ? match.parentElement : match;
      if (mount instanceof HTMLElement) {
        const style = getComputedStyle(mount);
        if (style.position === 'static') {
          mount.style.position = 'relative';
        }
        return mount;
      }
    }
    return document.body;
  }

  private applyNodeToElement(node: SceneNode): void {
    if (node.element === null) return;
    node.element.id = node.id;
    node.element.setAttribute('class', [...node.classes].sort().join(' '));
    for (const [key, value] of node.data) {
      node.element.setAttribute(`data-${key}`, value);
    }
    for (const [name, value] of node.attributes) {
      node.element.setAttribute(name, value);
    }
  }

  private setVec3Attribute(selector: string, name: string, value: Vec3): void {
    for (const node of this.matches(selector)) {
      this.setVec3(node, name, value);
    }
  }

  private setVec3(node: SceneNode, name: string, value: Vec3): void {
    node.attributes.set(name, `${value.x} ${value.y} ${value.z}`);
    this.applyNodeToElement(node);
  }

  private argsToVec3(args: {X: unknown; Y: unknown; Z: unknown}): Vec3 {
    return {
      x: Scratch.Cast.toNumber(args.X),
      y: Scratch.Cast.toNumber(args.Y),
      z: Scratch.Cast.toNumber(args.Z)
    };
  }

  private parseVec3(value: string | undefined): Vec3 {
    if (value === undefined) return {x: 0, y: 0, z: 0};
    const [x = 0, y = 0, z = 0] = value.split(/\s+/).map((part) => Number(part));
    return {x, y, z};
  }

  private parseTemplate(source: string): TemplateNode {
    const value: unknown = JSON.parse(source);
    this.validateTemplateNode(value, 'template');
    return value as TemplateNode;
  }

  private parseSceneYaml(source: string): SceneYamlDocument {
    const value: unknown = parseYaml(source);
    this.validateSceneYamlDocument(value);
    return value;
  }

  private validateSceneYamlDocument(value: unknown): asserts value is SceneYamlDocument {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new TypeError('A-Frame scene YAML must be an object.');
    }
    const document = value as Record<string, unknown>;
    for (const key of Object.keys(document)) {
      if (!SCENE_YAML_KEYS.has(key)) {
        throw new TypeError(`A-Frame scene YAML ${key} is not supported.`);
      }
    }
    if (document['formatVersion'] !== 1) {
      throw new TypeError('A-Frame scene YAML formatVersion must be 1.');
    }
    if (document['options'] !== undefined) {
      if (
        typeof document['options'] !== 'object' ||
        document['options'] === null ||
        Array.isArray(document['options'])
      ) {
        throw new TypeError('A-Frame scene YAML options must be an object.');
      }
      const options = document['options'] as Record<string, unknown>;
      for (const key of Object.keys(options)) {
        if (!SCENE_OPTION_KEYS.has(key)) {
          throw new TypeError(`A-Frame scene YAML options.${key} is not supported.`);
        }
      }
      this.validateOptionalString(options['layer'], 'scene.options.layer');
      this.validateOptionalString(options['mode'], 'scene.options.mode');
    }
    this.validateTemplateNode(document['root'], 'scene.root');
  }

  private preflightSceneYaml(document: SceneYamlDocument): void {
    const ids = new Set<string>([ROOT_ID]);
    for (const [index, child] of (document.root.children ?? []).entries()) {
      this.collectSceneNodeIds(child, ROOT_ID, index, ids);
    }
  }

  private collectSceneNodeIds(
    template: TemplateNode,
    parentId: string,
    index: number,
    ids: Set<string>
  ): void {
    const id = this.normalizeId(template.id ?? this.sceneNodeFallbackId(template, parentId, index));
    if (id === ROOT_ID || ids.has(id)) {
      throw new Error(`Duplicate A-Frame node id in scene YAML: ${id}`);
    }
    ids.add(id);
    for (const [childIndex, child] of (template.children ?? []).entries()) {
      this.collectSceneNodeIds(child, id, childIndex, ids);
    }
  }

  private sceneNodeFallbackId(template: TemplateNode, parentId: string, index: number): string {
    const type = this.normalizeId(template.type ?? 'node');
    return `${parentId}-${type}-${index + 1}`;
  }

  private applyTemplateToRoot(root: SceneNode, template: TemplateNode): void {
    root.classes = new Set(this.normalizeClasses(template));
    root.data = new Map(this.normalizeRecord(template.data, this.normalizeDataKey.bind(this)));
    root.attributes = new Map([
      ['embedded', 'true'],
      ['renderer', 'alpha: true'],
      ...this.normalizeRecord(template.attributes, this.normalizeAttributeName.bind(this))
    ]);
  }

  private nodeToTemplate(node: SceneNode): TemplateNode {
    const template: TemplateNode = {
      type: node.type,
      id: node.id
    };
    if (node.classes.size > 0) {
      template.classes = [...node.classes].sort();
    }
    if (node.data.size > 0) {
      template.data = Object.fromEntries([...node.data.entries()].sort());
    }
    if (node.attributes.size > 0) {
      template.attributes = Object.fromEntries([...node.attributes.entries()].sort());
    }
    if (node.children.length > 0) {
      template.children = node.children.map((childId) => this.nodeToTemplate(this.requireNode(childId)));
    }
    return template;
  }

  private validateTemplateNode(value: unknown, path: string): asserts value is TemplateNode {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new TypeError(`A-Frame ${path} must be an object.`);
    }
    const node = value as Record<string, unknown>;
    for (const key of Object.keys(node)) {
      if (!TEMPLATE_NODE_KEYS.has(key)) {
        throw new TypeError(`A-Frame ${path}.${key} is not supported.`);
      }
    }
    this.validateOptionalString(node['type'], `${path}.type`);
    this.validateOptionalString(node['id'], `${path}.id`);
    this.validateTemplateClass(node['class'], `${path}.class`);
    this.validateOptionalStringArray(node['classes'], `${path}.classes`);
    this.validateStringRecord(node['data'], `${path}.data`);
    this.validateStringRecord(node['attributes'], `${path}.attributes`);
    const children = node['children'];
    if (children === undefined) return;
    if (!Array.isArray(children)) {
      throw new TypeError(`A-Frame ${path}.children must be an array.`);
    }
    children.forEach((child, index) => {
      this.validateTemplateNode(child, `${path}.children[${index}]`);
    });
  }

  private validateTemplateClass(value: unknown, path: string): void {
    if (value === undefined || typeof value === 'string') return;
    if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return;
    throw new TypeError(`A-Frame ${path} must be a string or string array.`);
  }

  private validateOptionalStringArray(value: unknown, path: string): void {
    if (value === undefined) return;
    if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return;
    throw new TypeError(`A-Frame ${path} must be a string array.`);
  }

  private validateOptionalString(value: unknown, path: string): void {
    if (value === undefined || typeof value === 'string') return;
    throw new TypeError(`A-Frame ${path} must be a string.`);
  }

  private validateStringRecord(value: unknown, path: string): void {
    if (value === undefined) return;
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new TypeError(`A-Frame ${path} must be an object.`);
    }
    for (const [key, recordValue] of Object.entries(value)) {
      if (key.trim().length === 0) {
        throw new TypeError(`A-Frame ${path} keys must be non-empty strings.`);
      }
      if (recordValue === undefined) {
        throw new TypeError(`A-Frame ${path}.${key} must not be undefined.`);
      }
    }
  }

  private normalizeClasses(template: TemplateNode): string[] {
    const classes = [
      ...(Array.isArray(template.class) ? template.class : String(template.class ?? '').split(/\s+/)),
      ...(template.classes ?? [])
    ];
    return classes.map((value) => this.normalizeToken(value)).filter((value) => value.length > 0);
  }

  private normalizeRecord(
    value: Record<string, unknown> | undefined,
    normalizeKey: (key: string) => string
  ): Array<[string, string]> {
    return Object.entries(value ?? {}).map(([key, recordValue]) => [
      normalizeKey(key),
      String(recordValue)
    ]);
  }

  private normalizeNodeType(value: string): string {
    const type = this.normalizeToken(value);
    return type.length === 0 ? 'group' : type;
  }

  private normalizeId(value: string): string {
    return this.normalizeToken(value) || 'node';
  }

  private normalizeToken(value: string): string {
    return value.trim().replace(/[^a-zA-Z0-9_-]/g, '-');
  }

  private normalizeDataKey(value: string): string {
    return this.normalizeToken(value).toLowerCase();
  }

  private normalizeAttributeName(value: string): string {
    return value.trim().replace(/[^a-zA-Z0-9_:-]/g, '-');
  }

  private tagForType(type: string): string {
    const tags: Record<string, string> = {
      box: 'a-box',
      camera: 'a-camera',
      circle: 'a-circle',
      cone: 'a-cone',
      cylinder: 'a-cylinder',
      empty: 'a-entity',
      group: 'a-entity',
      image: 'a-image',
      'image-plane': 'a-image',
      light: 'a-light',
      model: 'a-entity',
      plane: 'a-plane',
      primitive: 'a-entity',
      scene: 'a-scene',
      sphere: 'a-sphere',
      text: 'a-text'
    };
    return tags[type] ?? 'a-entity';
  }

  private requireNode(id: string): SceneNode {
    const node = this.nodes.get(id);
    if (node === undefined) {
      throw new Error(`Unknown A-Frame node: ${id}`);
    }
    return node;
  }

  private toScratchBlock(block: BlockDefinition): Record<string, unknown> {
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
