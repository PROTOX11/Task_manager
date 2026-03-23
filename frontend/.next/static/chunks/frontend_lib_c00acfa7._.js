(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/frontend/lib/api.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * HTTP client for the Express API.
 *
 * Browser (default): uses relative `/api/...` → Next.js rewrites to Express
 * (see `next.config.mjs` BACKEND_URL, default http://localhost:5000).
 *
 * Direct to Express: set NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
 * (no proxy; CORS must allow your Next origin).
 */ __turbopack_context__.s([
    "apiRequest",
    ()=>apiRequest,
    "clearToken",
    ()=>clearToken,
    "getToken",
    ()=>getToken,
    "setToken",
    ()=>setToken
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/frontend/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
const TOKEN_KEY = "token";
/** SSR / Node fallback when env is not set — same port as backend default */ const SERVER_FALLBACK_API = "http://localhost:5000/api";
function getApiBaseUrl() {
    var _process_env_NEXT_PUBLIC_API_BASE_URL;
    const fromEnv = (_process_env_NEXT_PUBLIC_API_BASE_URL = __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_PUBLIC_API_BASE_URL) === null || _process_env_NEXT_PUBLIC_API_BASE_URL === void 0 ? void 0 : _process_env_NEXT_PUBLIC_API_BASE_URL.trim();
    if (fromEnv) {
        return fromEnv.replace(/\/+$/, "");
    }
    if ("TURBOPACK compile-time truthy", 1) {
        return "/api";
    }
    //TURBOPACK unreachable
    ;
}
function getToken() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    return localStorage.getItem(TOKEN_KEY);
}
function setToken(token) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    localStorage.setItem(TOKEN_KEY, token);
}
function clearToken() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    localStorage.removeItem(TOKEN_KEY);
}
async function apiRequest(path) {
    let options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    const { auth = true, headers: customHeaders, ...init } = options;
    const token = getToken();
    const base = getApiBaseUrl();
    const normalizedPath = path.startsWith("/") ? path : "/".concat(path);
    const url = "".concat(base).concat(normalizedPath);
    const headers = new Headers(customHeaders);
    if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }
    if (auth && token) {
        headers.set("Authorization", "Bearer ".concat(token));
    }
    const response = await fetch(url, {
        ...init,
        headers
    });
    const data = await response.json().catch(()=>({}));
    if (!response.ok) {
        const message = typeof data === "object" && data !== null && "message" in data && typeof data.message === "string" ? data.message : "Request failed";
        throw new Error(message);
    }
    return data;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/frontend/lib/auth-context.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/lib/api.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
;
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(undefined);
const splitName = (name)=>{
    const parts = (name || "").trim().split(/\s+/);
    const firstName = parts[0] || "User";
    const lastName = parts.slice(1).join(" ") || "";
    return {
        firstName,
        lastName
    };
};
const mapApiUser = (user)=>{
    const { firstName, lastName } = splitName(user.name);
    return {
        id: user.id,
        email: user.email,
        firstName,
        lastName,
        role: user.role,
        createdAt: user.createdAt || new Date().toISOString()
    };
};
function AuthProvider(param) {
    let { children } = param;
    _s();
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuthProvider.useEffect": ()=>{
            const bootstrap = {
                "AuthProvider.useEffect.bootstrap": async ()=>{
                    const token = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getToken"])();
                    if (!token) {
                        setIsLoading(false);
                        return;
                    }
                    try {
                        const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])("/auth/profile");
                        setUser(mapApiUser(response.user));
                    } catch (e) {
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearToken"])();
                        setUser(null);
                    } finally{
                        setIsLoading(false);
                    }
                }
            }["AuthProvider.useEffect.bootstrap"];
            bootstrap();
        }
    }["AuthProvider.useEffect"], []);
    const login = async (email, password)=>{
        const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])("/auth/login", {
            method: "POST",
            body: JSON.stringify({
                email,
                password
            }),
            auth: false
        });
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setToken"])(response.token);
        setUser(mapApiUser(response.user));
    };
    const signup = async (data)=>{
        const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])("/auth/signup", {
            method: "POST",
            body: JSON.stringify({
                name: "".concat(data.firstName, " ").concat(data.lastName).trim(),
                email: data.email,
                password: data.password,
                role: "developer"
            }),
            auth: false
        });
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setToken"])(response.token);
        setUser(mapApiUser(response.user));
    };
    const signupAdmin = async (data)=>{
        const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])("/auth/signup/admin", {
            method: "POST",
            body: JSON.stringify({
                name: "".concat(data.firstName, " ").concat(data.lastName).trim(),
                email: data.email,
                password: data.password,
                paymentAmount: data.paymentAmount,
                paymentReference: data.paymentReference,
                paymentStatus: "paid"
            }),
            auth: false
        });
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setToken"])(response.token);
        setUser(mapApiUser(response.user));
    };
    const logout = ()=>{
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearToken"])();
        setUser(null);
    };
    const updateProfile = async (data)=>{
        if (user) {
            const name = "".concat(data.firstName || user.firstName, " ").concat(data.lastName || user.lastName).trim();
            const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])("/auth/profile", {
                method: "PUT",
                body: JSON.stringify({
                    name,
                    email: data.email || user.email
                })
            });
            setUser(mapApiUser(response.user));
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthContext.Provider, {
        value: {
            user,
            isLoading,
            login,
            signup,
            signupAdmin,
            logout,
            updateProfile
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/frontend/lib/auth-context.tsx",
        lineNumber: 155,
        columnNumber: 5
    }, this);
}
_s(AuthProvider, "YajQB7LURzRD+QP5gw0+K2TZIWA=");
_c = AuthProvider;
function useAuth() {
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
_s1(useAuth, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
var _c;
__turbopack_context__.k.register(_c, "AuthProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/frontend/lib/data-context.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DataProvider",
    ()=>DataProvider,
    "useData",
    ()=>useData
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$auth$2d$context$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/lib/auth-context.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/lib/api.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
;
;
const DataContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(undefined);
const splitName = (name)=>{
    const parts = (name || "").trim().split(/\s+/);
    return {
        firstName: parts[0] || "User",
        lastName: parts.slice(1).join(" ") || ""
    };
};
const mapApiUser = (user)=>{
    const { firstName, lastName } = splitName(user.name);
    return {
        id: (user.id || user._id || "").toString(),
        email: user.email,
        firstName,
        lastName,
        role: user.role === "admin" ? "admin" : "developer",
        createdAt: new Date().toISOString()
    };
};
const mapTaskStatus = (status)=>{
    if (status === "in-progress") return "in_progress";
    if (status === "review") return "review";
    if (status === "completed") return "done";
    return "todo";
};
const toApiTaskStatus = (status)=>{
    if (status === "in_progress") return "in-progress";
    if (status === "review") return "review";
    if (status === "done") return "completed";
    return "pending";
};
function DataProvider(param) {
    let { children } = param;
    _s();
    const { user } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$auth$2d$context$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    const [projects, setProjects] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [requests, setRequests] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const loadProjects = async ()=>{
        if (!user) return;
        const projectResponse = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])("/projects");
        const normalizedProjects = await Promise.all(projectResponse.projects.map(async (apiProject)=>{
            const projectId = apiProject._id.toString();
            const [panelResponse, taskResponse] = await Promise.all([
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])("/panels/project/".concat(projectId)),
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])("/tasks/project/".concat(projectId))
            ]);
            const tasksByPanel = {};
            const apiTasks = taskResponse.tasks || [];
            apiTasks.forEach((apiTask, index)=>{
                var _apiTask_panelId;
                const panelId = ((_apiTask_panelId = apiTask.panelId) === null || _apiTask_panelId === void 0 ? void 0 : _apiTask_panelId.toString()) || "";
                if (!tasksByPanel[panelId]) tasksByPanel[panelId] = [];
                tasksByPanel[panelId].push({
                    id: apiTask._id.toString(),
                    title: apiTask.title,
                    description: apiTask.description || "",
                    status: mapTaskStatus(apiTask.status),
                    priority: apiTask.priority || "medium",
                    assignee: apiTask.assignedDeveloper ? mapApiUser(apiTask.assignedDeveloper) : undefined,
                    reporter: apiTask.createdBy ? mapApiUser(apiTask.createdBy) : user,
                    panelId,
                    projectId,
                    dueDate: apiTask.deadline ? new Date(apiTask.deadline).toISOString() : undefined,
                    attachments: [],
                    comments: [],
                    subtasks: [],
                    order: index,
                    createdAt: apiTask.createdAt || new Date().toISOString(),
                    updatedAt: apiTask.updatedAt || new Date().toISOString()
                });
            });
            const owner = apiProject.createdBy ? mapApiUser(apiProject.createdBy) : user;
            const developerMembers = (apiProject.developers || []).map((dev)=>({
                    user: mapApiUser(dev),
                    role: "member",
                    joinedAt: new Date().toISOString()
                }));
            const members = [
                {
                    user: owner,
                    role: "owner",
                    joinedAt: new Date().toISOString()
                },
                ...developerMembers
            ];
            return {
                id: projectId,
                name: apiProject.name,
                description: apiProject.description || "",
                status: apiProject.status || "active",
                owner,
                members,
                panels: (panelResponse.panels || []).map((p)=>({
                        id: p._id.toString(),
                        name: p.name,
                        order: p.order || 0,
                        projectId,
                        tasks: tasksByPanel[p._id.toString()] || []
                    })),
                createdAt: apiProject.createdAt || new Date().toISOString(),
                updatedAt: apiProject.updatedAt || new Date().toISOString()
            };
        }));
        setProjects(normalizedProjects);
    };
    const loadRequests = async ()=>{
        if (!user) return;
        const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])("/requests/history");
        const normalized = (response.requests || []).map((r)=>{
            var _r_projectId__id, _r_projectId, _r_projectId1, _r_projectId2;
            return {
                id: r._id.toString(),
                project: {
                    id: ((_r_projectId = r.projectId) === null || _r_projectId === void 0 ? void 0 : (_r_projectId__id = _r_projectId._id) === null || _r_projectId__id === void 0 ? void 0 : _r_projectId__id.toString()) || "",
                    name: ((_r_projectId1 = r.projectId) === null || _r_projectId1 === void 0 ? void 0 : _r_projectId1.name) || "Project",
                    description: ((_r_projectId2 = r.projectId) === null || _r_projectId2 === void 0 ? void 0 : _r_projectId2.description) || "",
                    status: "active",
                    owner: user,
                    members: [],
                    panels: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                sender: r.senderId ? mapApiUser(r.senderId) : user,
                recipient: user,
                status: r.status,
                message: r.message,
                createdAt: r.createdAt || new Date().toISOString()
            };
        });
        setRequests(normalized);
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "DataProvider.useEffect": ()=>{
            if (!user) {
                setProjects([]);
                setRequests([]);
                return;
            }
            void Promise.all([
                loadProjects(),
                loadRequests()
            ]);
        }
    }["DataProvider.useEffect"], [
        user
    ]);
    const createProject = async (data)=>{
        const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])("/projects", {
            method: "POST",
            body: JSON.stringify({
                name: data.name,
                description: data.description,
                panels: [
                    {
                        name: "To Do"
                    },
                    {
                        name: "In Progress"
                    },
                    {
                        name: "Done"
                    }
                ]
            })
        });
        await loadProjects();
        return {
            id: response.project._id.toString(),
            name: response.project.name,
            description: response.project.description || "",
            status: response.project.status || "active",
            owner: user,
            members: [
                {
                    user: user,
                    role: "owner",
                    joinedAt: new Date().toISOString()
                }
            ],
            panels: [],
            createdAt: response.project.createdAt || new Date().toISOString(),
            updatedAt: response.project.updatedAt || new Date().toISOString()
        };
    };
    const updateProject = async (id, data)=>{
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])("/projects/".concat(id), {
            method: "PUT",
            body: JSON.stringify({
                name: data.name,
                description: data.description,
                status: data.status
            })
        });
        await loadProjects();
    };
    const deleteProject = async (id)=>{
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])("/projects/".concat(id), {
            method: "DELETE"
        });
        setProjects((prev)=>prev.filter((p)=>p.id !== id));
    };
    const addPanel = async (projectId, name)=>{
        const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])("/panels", {
            method: "POST",
            body: JSON.stringify({
                name,
                projectId
            })
        });
        await loadProjects();
        return {
            id: response.panel._id.toString(),
            name: response.panel.name,
            order: response.panel.order || 0,
            projectId,
            tasks: []
        };
    };
    const updatePanel = async (_projectId, panelId, name)=>{
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])("/panels/".concat(panelId), {
            method: "PUT",
            body: JSON.stringify({
                name
            })
        });
        await loadProjects();
    };
    const deletePanel = async (projectId, panelId)=>{
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])("/panels/".concat(panelId), {
            method: "DELETE"
        });
        setProjects((prev)=>prev.map((p)=>p.id === projectId ? {
                    ...p,
                    panels: p.panels.filter((panel)=>panel.id !== panelId)
                } : p));
    };
    const createTask = async (data)=>{
        var _response_task_panelId, _response_task_projectId;
        const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])("/tasks", {
            method: "POST",
            body: JSON.stringify({
                title: data.title,
                description: data.description,
                projectId: data.projectId,
                panelId: data.panelId,
                assignedDeveloper: data.assigneeId,
                priority: data.priority,
                deadline: data.dueDate
            })
        });
        await loadProjects();
        return {
            id: response.task._id.toString(),
            title: response.task.title,
            description: response.task.description || "",
            status: mapTaskStatus(response.task.status),
            priority: response.task.priority,
            reporter: user,
            panelId: ((_response_task_panelId = response.task.panelId) === null || _response_task_panelId === void 0 ? void 0 : _response_task_panelId.toString()) || data.panelId,
            projectId: ((_response_task_projectId = response.task.projectId) === null || _response_task_projectId === void 0 ? void 0 : _response_task_projectId.toString()) || data.projectId,
            dueDate: response.task.deadline ? new Date(response.task.deadline).toISOString() : undefined,
            attachments: [],
            comments: [],
            subtasks: [],
            order: 0,
            createdAt: response.task.createdAt || new Date().toISOString(),
            updatedAt: response.task.updatedAt || new Date().toISOString()
        };
    };
    const updateTask = async (taskId, data)=>{
        const payload = {};
        if (data.status) payload.status = toApiTaskStatus(data.status);
        if (data.priority) payload.priority = data.priority;
        if (data.title !== undefined) payload.title = data.title;
        if (data.description !== undefined) payload.description = data.description;
        if (data.panelId) payload.panelId = data.panelId;
        if (Object.keys(payload).length === 1 && payload.status) {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])("/tasks/".concat(taskId, "/status"), {
                method: "PATCH",
                body: JSON.stringify({
                    status: payload.status
                })
            });
        } else {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])("/tasks/".concat(taskId), {
                method: "PUT",
                body: JSON.stringify(payload)
            });
        }
        await loadProjects();
    };
    const deleteTask = async (taskId)=>{
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])("/tasks/".concat(taskId), {
            method: "DELETE"
        });
        setProjects((prev)=>prev.map((p)=>({
                    ...p,
                    panels: p.panels.map((panel)=>({
                            ...panel,
                            tasks: panel.tasks.filter((task)=>task.id !== taskId)
                        }))
                })));
    };
    const moveTask = async (taskId, newPanelId)=>{
        await updateTask(taskId, {
            panelId: newPanelId
        });
    };
    const addComment = async (taskId, content)=>{
        if (!user) return;
        const newComment = {
            id: "comment-".concat(Date.now()),
            content,
            author: user,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        setProjects((prev)=>prev.map((p)=>({
                    ...p,
                    panels: p.panels.map((panel)=>({
                            ...panel,
                            tasks: panel.tasks.map((task)=>task.id === taskId ? {
                                    ...task,
                                    comments: [
                                        ...task.comments,
                                        newComment
                                    ]
                                } : task)
                        }))
                })));
    };
    const toggleSubtask = async (taskId, subtaskId)=>{
        setProjects((prev)=>prev.map((p)=>({
                    ...p,
                    panels: p.panels.map((panel)=>({
                            ...panel,
                            tasks: panel.tasks.map((task)=>task.id === taskId ? {
                                    ...task,
                                    subtasks: task.subtasks.map((st)=>st.id === subtaskId ? {
                                            ...st,
                                            completed: !st.completed
                                        } : st)
                                } : task)
                        }))
                })));
    };
    const addSubtask = async (taskId, title)=>{
        const newSubtask = {
            id: "subtask-".concat(Date.now()),
            title,
            completed: false
        };
        setProjects((prev)=>prev.map((p)=>({
                    ...p,
                    panels: p.panels.map((panel)=>({
                            ...panel,
                            tasks: panel.tasks.map((task)=>task.id === taskId ? {
                                    ...task,
                                    subtasks: [
                                        ...task.subtasks,
                                        newSubtask
                                    ]
                                } : task)
                        }))
                })));
    };
    const sendInvitation = async (projectId, email, message)=>{
        if (!user) return;
        const project = projects.find((p)=>p.id === projectId);
        if (!project) return;
        const usersResponse = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])("/auth/users");
        const developer = (usersResponse.users || []).find((u)=>u.email === email);
        if (!developer) throw new Error("Developer not found");
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])("/projects/".concat(projectId, "/invite"), {
            method: "POST",
            body: JSON.stringify({
                developerId: developer._id,
                message
            })
        });
        await loadRequests();
    };
    const respondToRequest = async (requestId, accept)=>{
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])("/requests/".concat(requestId, "/").concat(accept ? "accept" : "reject"), {
            method: "PUT"
        });
        await Promise.all([
            loadProjects(),
            loadRequests()
        ]);
    };
    const getProjectById = (id)=>projects.find((p)=>p.id === id);
    const getTaskById = (id)=>{
        for (const project of projects){
            for (const panel of project.panels){
                const task = panel.tasks.find((t)=>t.id === id);
                if (task) return task;
            }
        }
        return undefined;
    };
    const getMyTasks = ()=>{
        if (!user) return [];
        const tasks = [];
        for (const project of projects){
            for (const panel of project.panels){
                for (const task of panel.tasks){
                    var _task_assignee;
                    if (((_task_assignee = task.assignee) === null || _task_assignee === void 0 ? void 0 : _task_assignee.id) === user.id || task.reporter.id === user.id) {
                        tasks.push(task);
                    }
                }
            }
        }
        return tasks;
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DataContext.Provider, {
        value: {
            projects,
            requests,
            createProject,
            updateProject,
            deleteProject,
            addPanel,
            updatePanel,
            deletePanel,
            createTask,
            updateTask,
            deleteTask,
            moveTask,
            addComment,
            toggleSubtask,
            addSubtask,
            sendInvitation,
            respondToRequest,
            getProjectById,
            getTaskById,
            getMyTasks
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/frontend/lib/data-context.tsx",
        lineNumber: 447,
        columnNumber: 5
    }, this);
}
_s(DataProvider, "oF21PasF2og6GQ1unoBZtjK1KDI=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$auth$2d$context$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"]
    ];
});
_c = DataProvider;
function useData() {
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(DataContext);
    if (context === undefined) {
        throw new Error("useData must be used within a DataProvider");
    }
    return context;
}
_s1(useData, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
var _c;
__turbopack_context__.k.register(_c, "DataProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=frontend_lib_c00acfa7._.js.map