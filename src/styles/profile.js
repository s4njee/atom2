// StyleProfile contract:
//
// {
//   id:    'neon' | 'crystal' | 'toon' | 'painterly',
//   name:  string,                              // human-readable label
//   apply(viewer, meshes): void,                // activate; assign materials, lights, bg, post-processing
//   dispose(viewer, meshes): void,              // remove everything `apply` added
//   onMoleculeChanged(viewer, meshes): void,    // reapply materials to freshly built meshes
// }

export {};
