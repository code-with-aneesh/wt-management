export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.png"]),
	mimeTypes: {".png":"image/png"},
	_: {
		client: {start:"_app/immutable/entry/start.DvGhb78u.js",app:"_app/immutable/entry/app.NsyVYC0A.js",imports:["_app/immutable/entry/start.DvGhb78u.js","_app/immutable/chunks/DmK5ua7S.js","_app/immutable/chunks/CuJqhRe4.js","_app/immutable/chunks/4PfatVtW.js","_app/immutable/entry/app.NsyVYC0A.js","_app/immutable/chunks/CuJqhRe4.js","_app/immutable/chunks/DEJYKv9C.js","_app/immutable/chunks/DMivAUOO.js","_app/immutable/chunks/BozpCfWT.js","_app/immutable/chunks/DxW18Q2D.js","_app/immutable/chunks/4PfatVtW.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js'))
		],
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/about",
				pattern: /^\/about\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/dashboard",
				pattern: /^\/dashboard\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
