// super-three is A-Frame's build of Three.js and publishes no types of its own.
declare module 'super-three' {
  export * from 'three';
}

declare module 'super-three/addons/loaders/GLTFLoader.js' {
  export * from 'three/examples/jsm/loaders/GLTFLoader.js';
}
