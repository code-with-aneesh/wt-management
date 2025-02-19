

export const index = 3;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/about/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/3.BmAOQg8j.js","_app/immutable/chunks/BozpCfWT.js","_app/immutable/chunks/CuJqhRe4.js","_app/immutable/chunks/gJvsq2ZE.js"];
export const stylesheets = [];
export const fonts = [];
