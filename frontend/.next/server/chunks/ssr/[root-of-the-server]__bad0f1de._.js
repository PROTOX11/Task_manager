module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[project]/frontend/lib/auth-context.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
;
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(undefined);
// Demo users for the application
const DEMO_USERS = [
    {
        id: "1",
        email: "admin@demo.com",
        password: "admin123",
        firstName: "Admin",
        lastName: "User",
        role: "admin",
        createdAt: new Date().toISOString()
    },
    {
        id: "2",
        email: "user@demo.com",
        password: "user123",
        firstName: "John",
        lastName: "Doe",
        role: "user",
        createdAt: new Date().toISOString()
    }
];
function AuthProvider({ children }) {
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        // Check for stored user on mount
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
    }, []);
    const login = async (email, password)=>{
        // Simulate API delay
        await new Promise((resolve)=>setTimeout(resolve, 500));
        const foundUser = DEMO_USERS.find((u)=>u.email === email && u.password === password);
        if (!foundUser) {
            throw new Error("Invalid email or password");
        }
        const { password: _, ...userWithoutPassword } = foundUser;
        setUser(userWithoutPassword);
        localStorage.setItem("user", JSON.stringify(userWithoutPassword));
    };
    const signup = async (data)=>{
        // Simulate API delay
        await new Promise((resolve)=>setTimeout(resolve, 500));
        // Check if user already exists
        if (DEMO_USERS.some((u)=>u.email === data.email)) {
            throw new Error("Email already exists");
        }
        const newUser = {
            id: String(DEMO_USERS.length + 1),
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            role: "user",
            createdAt: new Date().toISOString()
        };
        setUser(newUser);
        localStorage.setItem("user", JSON.stringify(newUser));
    };
    const logout = ()=>{
        setUser(null);
        localStorage.removeItem("user");
    };
    const updateProfile = (data)=>{
        if (user) {
            const updatedUser = {
                ...user,
                ...data
            };
            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthContext.Provider, {
        value: {
            user,
            isLoading,
            login,
            signup,
            logout,
            updateProfile
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/frontend/lib/auth-context.tsx",
        lineNumber: 112,
        columnNumber: 5
    }, this);
}
function useAuth() {
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
}),
"[project]/frontend/lib/data-context.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DataProvider",
    ()=>DataProvider,
    "useData",
    ()=>useData
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$auth$2d$context$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/lib/auth-context.tsx [app-ssr] (ecmascript)");
"use client";
;
;
;
const DataContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(undefined);
// Initial demo data
const createInitialData = (currentUser)=>{
    if (!currentUser) return {
        projects: [],
        requests: []
    };
    const demoUser2 = {
        id: "2",
        email: "user@demo.com",
        firstName: "John",
        lastName: "Doe",
        role: "user",
        createdAt: new Date().toISOString()
    };
    const projects = [
        {
            id: "proj-1",
            name: "Website Redesign",
            description: "Complete redesign of the company website with modern UI/UX",
            status: "active",
            owner: currentUser,
            members: [
                {
                    user: currentUser,
                    role: "owner",
                    joinedAt: new Date().toISOString()
                }
            ],
            panels: [
                {
                    id: "panel-1",
                    name: "To Do",
                    order: 0,
                    projectId: "proj-1",
                    tasks: [
                        {
                            id: "task-1",
                            title: "Design homepage mockup",
                            description: "Create initial mockup for the homepage redesign",
                            status: "todo",
                            priority: "high",
                            reporter: currentUser,
                            panelId: "panel-1",
                            projectId: "proj-1",
                            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                            attachments: [],
                            comments: [],
                            subtasks: [
                                {
                                    id: "st-1",
                                    title: "Research competitors",
                                    completed: true
                                },
                                {
                                    id: "st-2",
                                    title: "Create wireframes",
                                    completed: false
                                }
                            ],
                            order: 0,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        }
                    ]
                },
                {
                    id: "panel-2",
                    name: "In Progress",
                    order: 1,
                    projectId: "proj-1",
                    tasks: [
                        {
                            id: "task-2",
                            title: "Set up project structure",
                            description: "Initialize the project with Next.js and configure Tailwind CSS",
                            status: "in_progress",
                            priority: "medium",
                            assignee: currentUser,
                            reporter: currentUser,
                            panelId: "panel-2",
                            projectId: "proj-1",
                            attachments: [],
                            comments: [
                                {
                                    id: "comment-1",
                                    content: "Started working on this today",
                                    author: currentUser,
                                    createdAt: new Date().toISOString(),
                                    updatedAt: new Date().toISOString()
                                }
                            ],
                            subtasks: [],
                            order: 0,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        }
                    ]
                },
                {
                    id: "panel-3",
                    name: "Review",
                    order: 2,
                    projectId: "proj-1",
                    tasks: []
                },
                {
                    id: "panel-4",
                    name: "Done",
                    order: 3,
                    projectId: "proj-1",
                    tasks: [
                        {
                            id: "task-3",
                            title: "Project kickoff meeting",
                            description: "Initial meeting to discuss project goals and timeline",
                            status: "done",
                            priority: "low",
                            reporter: currentUser,
                            panelId: "panel-4",
                            projectId: "proj-1",
                            attachments: [],
                            comments: [],
                            subtasks: [],
                            order: 0,
                            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                            updatedAt: new Date().toISOString()
                        }
                    ]
                }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: "proj-2",
            name: "Mobile App Development",
            description: "Build a cross-platform mobile application",
            status: "active",
            owner: currentUser,
            members: [
                {
                    user: currentUser,
                    role: "owner",
                    joinedAt: new Date().toISOString()
                }
            ],
            panels: [
                {
                    id: "panel-5",
                    name: "Backlog",
                    order: 0,
                    projectId: "proj-2",
                    tasks: [
                        {
                            id: "task-4",
                            title: "User authentication flow",
                            description: "Implement login, signup, and password reset",
                            status: "todo",
                            priority: "urgent",
                            reporter: currentUser,
                            panelId: "panel-5",
                            projectId: "proj-2",
                            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                            attachments: [],
                            comments: [],
                            subtasks: [],
                            order: 0,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        }
                    ]
                },
                {
                    id: "panel-6",
                    name: "In Development",
                    order: 1,
                    projectId: "proj-2",
                    tasks: []
                },
                {
                    id: "panel-7",
                    name: "Completed",
                    order: 2,
                    projectId: "proj-2",
                    tasks: []
                }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];
    const requests = [
        {
            id: "req-1",
            project: projects[0],
            sender: demoUser2,
            recipient: currentUser,
            status: "pending",
            message: "I would like to join your website redesign project!",
            createdAt: new Date().toISOString()
        }
    ];
    return {
        projects,
        requests
    };
};
function DataProvider({ children }) {
    const { user } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$auth$2d$context$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAuth"])();
    const [projects, setProjects] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [requests, setRequests] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [initialized, setInitialized] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    // Initialize data when user changes
    if (user && !initialized) {
        const initial = createInitialData(user);
        setProjects(initial.projects);
        setRequests(initial.requests);
        setInitialized(true);
    }
    if (!user && initialized) {
        setProjects([]);
        setRequests([]);
        setInitialized(false);
    }
    const createProject = (data)=>{
        if (!user) throw new Error("Not authenticated");
        const newProject = {
            id: `proj-${Date.now()}`,
            name: data.name,
            description: data.description,
            status: "active",
            owner: user,
            members: [
                {
                    user,
                    role: "owner",
                    joinedAt: new Date().toISOString()
                }
            ],
            panels: [
                {
                    id: `panel-${Date.now()}-1`,
                    name: "To Do",
                    order: 0,
                    projectId: "",
                    tasks: []
                },
                {
                    id: `panel-${Date.now()}-2`,
                    name: "In Progress",
                    order: 1,
                    projectId: "",
                    tasks: []
                },
                {
                    id: `panel-${Date.now()}-3`,
                    name: "Done",
                    order: 2,
                    projectId: "",
                    tasks: []
                }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        newProject.panels = newProject.panels.map((p)=>({
                ...p,
                projectId: newProject.id
            }));
        setProjects((prev)=>[
                ...prev,
                newProject
            ]);
        return newProject;
    };
    const updateProject = (id, data)=>{
        setProjects((prev)=>prev.map((p)=>p.id === id ? {
                    ...p,
                    ...data,
                    updatedAt: new Date().toISOString()
                } : p));
    };
    const deleteProject = (id)=>{
        setProjects((prev)=>prev.filter((p)=>p.id !== id));
    };
    const addPanel = (projectId, name)=>{
        const newPanel = {
            id: `panel-${Date.now()}`,
            name,
            order: 0,
            projectId,
            tasks: []
        };
        setProjects((prev)=>prev.map((p)=>{
                if (p.id === projectId) {
                    const maxOrder = Math.max(...p.panels.map((panel)=>panel.order), -1);
                    return {
                        ...p,
                        panels: [
                            ...p.panels,
                            {
                                ...newPanel,
                                order: maxOrder + 1
                            }
                        ],
                        updatedAt: new Date().toISOString()
                    };
                }
                return p;
            }));
        return newPanel;
    };
    const updatePanel = (projectId, panelId, name)=>{
        setProjects((prev)=>prev.map((p)=>{
                if (p.id === projectId) {
                    return {
                        ...p,
                        panels: p.panels.map((panel)=>panel.id === panelId ? {
                                ...panel,
                                name
                            } : panel),
                        updatedAt: new Date().toISOString()
                    };
                }
                return p;
            }));
    };
    const deletePanel = (projectId, panelId)=>{
        setProjects((prev)=>prev.map((p)=>{
                if (p.id === projectId) {
                    return {
                        ...p,
                        panels: p.panels.filter((panel)=>panel.id !== panelId),
                        updatedAt: new Date().toISOString()
                    };
                }
                return p;
            }));
    };
    const createTask = (data)=>{
        if (!user) throw new Error("Not authenticated");
        const newTask = {
            id: `task-${Date.now()}`,
            title: data.title,
            description: data.description,
            status: "todo",
            priority: data.priority,
            reporter: user,
            panelId: data.panelId,
            projectId: data.projectId,
            dueDate: data.dueDate,
            attachments: [],
            comments: [],
            subtasks: [],
            order: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        setProjects((prev)=>prev.map((p)=>{
                if (p.id === data.projectId) {
                    return {
                        ...p,
                        panels: p.panels.map((panel)=>{
                            if (panel.id === data.panelId) {
                                const maxOrder = Math.max(...panel.tasks.map((t)=>t.order), -1);
                                return {
                                    ...panel,
                                    tasks: [
                                        ...panel.tasks,
                                        {
                                            ...newTask,
                                            order: maxOrder + 1
                                        }
                                    ]
                                };
                            }
                            return panel;
                        }),
                        updatedAt: new Date().toISOString()
                    };
                }
                return p;
            }));
        return newTask;
    };
    const updateTask = (taskId, data)=>{
        setProjects((prev)=>prev.map((p)=>({
                    ...p,
                    panels: p.panels.map((panel)=>({
                            ...panel,
                            tasks: panel.tasks.map((task)=>task.id === taskId ? {
                                    ...task,
                                    ...data,
                                    updatedAt: new Date().toISOString()
                                } : task)
                        }))
                })));
    };
    const deleteTask = (taskId)=>{
        setProjects((prev)=>prev.map((p)=>({
                    ...p,
                    panels: p.panels.map((panel)=>({
                            ...panel,
                            tasks: panel.tasks.filter((task)=>task.id !== taskId)
                        }))
                })));
    };
    const moveTask = (taskId, newPanelId)=>{
        setProjects((prev)=>prev.map((p)=>{
                let taskToMove;
                // Find and remove the task from its current panel
                const updatedPanels = p.panels.map((panel)=>{
                    const taskIndex = panel.tasks.findIndex((t)=>t.id === taskId);
                    if (taskIndex !== -1) {
                        taskToMove = {
                            ...panel.tasks[taskIndex],
                            panelId: newPanelId
                        };
                        return {
                            ...panel,
                            tasks: panel.tasks.filter((t)=>t.id !== taskId)
                        };
                    }
                    return panel;
                });
                // Add the task to the new panel
                if (taskToMove) {
                    return {
                        ...p,
                        panels: updatedPanels.map((panel)=>{
                            if (panel.id === newPanelId) {
                                return {
                                    ...panel,
                                    tasks: [
                                        ...panel.tasks,
                                        taskToMove
                                    ]
                                };
                            }
                            return panel;
                        }),
                        updatedAt: new Date().toISOString()
                    };
                }
                return p;
            }));
    };
    const addComment = (taskId, content)=>{
        if (!user) return;
        const newComment = {
            id: `comment-${Date.now()}`,
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
    const toggleSubtask = (taskId, subtaskId)=>{
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
    const addSubtask = (taskId, title)=>{
        const newSubtask = {
            id: `subtask-${Date.now()}`,
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
    const sendInvitation = (projectId, email, message)=>{
        if (!user) return;
        const project = projects.find((p)=>p.id === projectId);
        if (!project) return;
        const newRequest = {
            id: `req-${Date.now()}`,
            project,
            sender: user,
            recipient: {
                id: `user-${Date.now()}`,
                email,
                firstName: email.split("@")[0],
                lastName: "",
                role: "user",
                createdAt: new Date().toISOString()
            },
            status: "pending",
            message,
            createdAt: new Date().toISOString()
        };
        setRequests((prev)=>[
                ...prev,
                newRequest
            ]);
    };
    const respondToRequest = (requestId, accept)=>{
        setRequests((prev)=>prev.map((r)=>r.id === requestId ? {
                    ...r,
                    status: accept ? "accepted" : "rejected"
                } : r));
        if (accept) {
            const request = requests.find((r)=>r.id === requestId);
            if (request && user) {
                setProjects((prev)=>prev.map((p)=>{
                        if (p.id === request.project.id) {
                            return {
                                ...p,
                                members: [
                                    ...p.members,
                                    {
                                        user: request.sender,
                                        role: "member",
                                        joinedAt: new Date().toISOString()
                                    }
                                ]
                            };
                        }
                        return p;
                    }));
            }
        }
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
                    if (task.assignee?.id === user.id || task.reporter.id === user.id) {
                        tasks.push(task);
                    }
                }
            }
        }
        return tasks;
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(DataContext.Provider, {
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
        lineNumber: 612,
        columnNumber: 5
    }, this);
}
function useData() {
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(DataContext);
    if (context === undefined) {
        throw new Error("useData must be used within a DataProvider");
    }
    return context;
}
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/dynamic-access-async-storage.external.js [external] (next/dist/server/app-render/dynamic-access-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/dynamic-access-async-storage.external.js", () => require("next/dist/server/app-render/dynamic-access-async-storage.external.js"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__bad0f1de._.js.map