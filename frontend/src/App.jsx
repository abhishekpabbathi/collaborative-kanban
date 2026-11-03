
import { useEffect, useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {
  LayoutDashboard, Plus, Search, Bell, Settings, MoreHorizontal,
  CalendarDays, UserRound, CheckCircle2, LogOut, RefreshCw,
  Activity, Trash2, Pencil, Users, FolderKanban,
  Eye, EyeOff, LockKeyhole, Mail, ArrowRight
} from "lucide-react";
import { authAPI, boardAPI, taskAPI, memberAPI, activityAPI, organizationAPI } from "./services/api";
import { connectSocket, disconnectSocket } from "./services/socket";

function AuthScreen({ onLogin, expectedRole, roleLabel }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await authAPI.login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        expectedRole
      });
      onLogin(response.data);
    } catch (err) {
      setError(err.response?.data?.error || "Unable to sign in. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-5 py-10">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl"/>
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl"/>
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl lg:grid-cols-2">
        <section className="hidden flex-col justify-between bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-950 p-12 text-white lg:flex">
          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10"><LayoutDashboard size={28}/></div>
            <p className="mt-10 text-xs font-bold uppercase tracking-[0.25em] text-indigo-200">Collaborative Kanban</p>
            <h1 className="mt-4 max-w-sm text-4xl font-bold leading-tight">Make teamwork feel effortless.</h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-indigo-100/80">Organize your work, keep tasks moving and stay connected with your workspace.</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-indigo-100/70"><CheckCircle2 size={18}/> Your work, organized in one place.</div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-12">
          <form onSubmit={submit} className="w-full max-w-md">
            <div className="mb-9 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white"><LayoutDashboard size={24}/></div>
              <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Collaborative Kanban</h1>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">{roleLabel}</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">Welcome back</h2>
            <p className="mt-2 text-sm text-slate-500">Sign in with the email and password provided by your workspace administrator.</p>

            <label className="mt-8 block text-sm font-semibold text-slate-700">Email address</label>
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10">
              <Mail size={18} className="shrink-0 text-slate-400"/>
              <input required type="email" autoComplete="username" placeholder="you@example.com"
                className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-slate-400"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/>
            </div>

            <label className="mt-5 block text-sm font-semibold text-slate-700">Password</label>
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10">
              <LockKeyhole size={18} className="shrink-0 text-slate-400"/>
              <input required type={showPassword ? "text" : "password"} autoComplete="current-password"
                placeholder="Enter your password" className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-slate-400"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}/>
              <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Hide password" : "Show password"} className="shrink-0 text-slate-400 hover:text-indigo-600">
                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>

            {error && <div role="alert" className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

            <button disabled={busy} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
              {busy ? "Signing in..." : "Sign in to workspace"} {!busy && <ArrowRight size={17}/>}
            </button>
            <p className="mt-6 text-center text-xs leading-5 text-slate-400">Having trouble signing in? Contact your workspace administrator.</p>
          </form>
        </section>
      </div>
    </main>
  );
}

function Dashboard({ session, onLogout }) {
  const [activityFilter, setActivityFilter] = useState("ALL");
  const [activitySearch, setActivitySearch] = useState("");

  const [boards, setBoards] = useState([]);
  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [page, setPage] = useState("board");
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: "", description: "", priority: "Medium",
    dueDate: "", assigneeId: "", labels: "", columnId: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const isTenantAdmin = session.role === "TENANT_ADMIN";
  const filteredActivity = activity.filter(item => {
    const action = String(item.action || "").toUpperCase();
    const matchesCategory = activityFilter === "ALL" ||
      (activityFilter === "TASKS" && action.includes("TASK")) ||
      (activityFilter === "BOARDS" && (action.includes("BOARD") || action.includes("COLUMN"))) ||
      (activityFilter === "MEMBERS" && (action.includes("MEMBER") || action.includes("INVITE")));
    const text = [item.action, item.details, item.userName, item.user_name].join(" ").toLowerCase();
    return matchesCategory && text.includes(activitySearch.toLowerCase());
  });

  const isMember = session.role === "MEMBER";

  const loadBoards = useCallback(async () => {
    try {
      const response = await boardAPI.list(session.tenantId);
      const list = response.data || [];
      setBoards(list);
      setBoard(current => list.find(item => item.id === current?.id) || list[0] || null);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || "Could not load workspace boards.");
      setLoading(false);
    }
  }, [session.tenantId]);

  const loadMembers = useCallback(async () => {
    try { const r = await memberAPI.list(session.tenantId); setMembers(r.data || []); }
    catch (e) { setError(e.response?.data?.error || "Could not load members."); }
  }, [session.tenantId]);

  const loadActivity = useCallback(async () => {
    try { const r = await activityAPI.list(session.tenantId); setActivity(r.data || []); }
    catch (e) { setError(e.response?.data?.error || "Could not load activity."); }
  }, [session.tenantId]);

  useEffect(() => {
    loadBoards();
    const socket = connectSocket(session.token, session.tenantId);
    const refresh = () => loadBoards();
    socket.on("connect", refresh);
    ["task:created", "task:updated", "task:deleted"].forEach(event => socket.on(event, refresh));
    return () => {
      socket.off("connect", refresh);
      ["task:created", "task:updated", "task:deleted"].forEach(event => socket.off(event, refresh));
      disconnectSocket();
    };
  }, [loadBoards, session.token, session.tenantId]);

  useEffect(() => {
    if (!board) { setColumns([]); setTasks([]); return; }
    setColumns(board.columns || []);
    setTasks((board.columns || []).flatMap(column => (column.tasks || []).map(task => ({
      ...task, columnId: column.id
    }))));
  }, [board]);

  useEffect(() => {
    if (page === "members") loadMembers();
    if (page === "activity") loadActivity();
  }, [page, loadMembers, loadActivity]);

  async function openTaskModal(task = null) {
    setError("");
    await loadMembers();
    setEditingTask(task);
    setTaskForm({
      title: task?.title || "",
      description: task?.description || "",
      priority: task?.priority || "Medium",
      dueDate: task?.due_date || "",
      assigneeId: task?.assignee_id || "",
      labels: (task?.labels || []).join(", "),
      columnId: task?.columnId || columns[0]?.id || ""
    });
    setTaskModalOpen(true);
  }

  async function addTask() {
    await openTaskModal();
  }

  async function editTask(task) {
    await openTaskModal(task);
  }

  async function submitTask(e) {
    e.preventDefault();
    if (busy) return;

    const cleanTitle = taskForm.title.trim();
    const dueDate = taskForm.dueDate || null;
    const labels = [...new Set(
      taskForm.labels.split(",").map(label => label.trim()).filter(Boolean)
    )];

    if (!cleanTitle) return setError("Enter a task title.");
    if (!["Low", "Medium", "High", "Urgent"].includes(taskForm.priority))
      return setError("Choose a valid priority.");
    if (dueDate && !/^\\d{4}-\\d{2}-\\d{2}$/.test(dueDate))
      return setError("Enter a valid due date.");
    if (labels.length > 10 || labels.some(label => label.length > 30))
      return setError("Use up to 10 labels, each no longer than 30 characters.");
    if (!editingTask && !taskForm.columnId)
      return setError("Choose a board column.");

    setBusy(true);
    setError("");

    try {
      const data = {
        title: cleanTitle,
        description: taskForm.description.trim(),
        priority: taskForm.priority,
        dueDate,
        assigneeId: taskForm.assigneeId || null,
        labels
      };

      if (editingTask) {
        await taskAPI.update(session.tenantId, editingTask.id, {
          ...data,
          version: editingTask.version
        });
      } else {
        await taskAPI.create(session.tenantId, {
          ...data,
          columnId: taskForm.columnId
        });
      }

      setTaskModalOpen(false);
      setEditingTask(null);
      setTitle("");
      await loadBoards();
    } catch (e) {
      setError(e.response?.data?.error || (editingTask
        ? "Task update failed."
        : "Task creation failed."));
    } finally {
      setBusy(false);
    }
  }

  async function addColumn() {
    if (!board) return;
    const name = window.prompt("New column name:");
    if (!name?.trim()) return;
    try {
      await boardAPI.addColumn(session.tenantId, board.id, { name: name.trim() });
      await loadBoards();
    } catch (e) {
      setError(e.response?.data?.error || "Could not add column.");
    }
  }

  async function renameColumn(column) {
    const name = window.prompt("Rename column:", column.name);
    if (!name?.trim() || name.trim() === column.name) return;
    try {
      await boardAPI.updateColumn(session.tenantId, board.id, column.id, { name: name.trim() });
      await loadBoards();
    } catch (e) {
      setError(e.response?.data?.error || "Could not rename column.");
    }
  }

  async function deleteColumn(column) {
    if (!window.confirm(`Delete column "${column.name}"? It must be empty first.`)) return;
    try {
      await boardAPI.deleteColumn(session.tenantId, board.id, column.id);
      await loadBoards();
    } catch (e) {
      setError(e.response?.data?.error || "Could not delete column.");
    }
  }

  async function deleteTask(task) {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    try { await taskAPI.delete(session.tenantId, task.id); await loadBoards(); }
    catch (e) { setError(e.response?.data?.error || "Task deletion failed."); }
  }

  async function moveTask(task, columnId, position) {
    if (!columnId || !Number.isInteger(position)) return;
    if (columnId === task.columnId && position === task.position) return;
    try {
      await taskAPI.update(session.tenantId, task.id, {
        columnId, position, version: task.version
      });
      await loadBoards();
    } catch (e) {
      setError(e.response?.data?.error || "Task move failed.");
      await loadBoards();
    }
  }

  async function createBoard() {
    const name = window.prompt("New board name:");
    if (!name?.trim()) return;
    try { await boardAPI.create(session.tenantId, { name: name.trim() }); await loadBoards(); }
    catch (e) { setError(e.response?.data?.error || "Could not create board."); }
  }

  async function renameBoard() {
    if (!board) return;
    const name = window.prompt("Rename board:", board.name);
    if (!name?.trim() || name.trim() === board.name) return;
    try { await boardAPI.update(session.tenantId, board.id, { name: name.trim() }); await loadBoards(); }
    catch (e) { setError(e.response?.data?.error || "Could not rename board."); }
  }

  async function deleteBoard() {
    if (!board || !window.confirm(`Delete board "${board.name}" and all its tasks?`)) return;
    try { await boardAPI.delete(session.tenantId, board.id); setBoard(null); await loadBoards(); }
    catch (e) { setError(e.response?.data?.error || "Could not delete board."); }
  }

  async function inviteMember() {
    const name = window.prompt("Member name:");
    if (!name?.trim()) return;
    const email = window.prompt("Member email:");
    if (!email?.trim()) return;
    const role = isTenantAdmin ? "MEMBER" : window.prompt("Role: MEMBER or TENANT_ADMIN", "MEMBER");
    if (!["MEMBER", "TENANT_ADMIN"].includes(role))
      return setError("Enter MEMBER or TENANT_ADMIN.");
    const password = window.prompt("Temporary password (minimum 12 characters) for a new account:");
    if (!password || password.length < 12)
      return setError("A password of at least 12 characters is required for a new account.");
    try {
      await memberAPI.invite(session.tenantId, { name: name.trim(), email: email.trim(), role, password });
      await loadMembers();
      setError("");
    } catch (e) {
      setError(e.response?.data?.error || "Could not add member.");
    }
  }

  async function removeMember(member) {
    if (!window.confirm(`Remove ${member.name} from this workspace?`)) return;
    try { await memberAPI.remove(session.tenantId, member.id); await loadMembers(); }
    catch (e) { setError(e.response?.data?.error || "Could not remove member."); }
  }

  const nav = [
    ["board", "My Boards", LayoutDashboard],
    ["tasks", "My Tasks", CalendarDays],
    ...(!isMember ? [["members", "Members", Users]] : []),
    ["activity", "Activity", Activity],
    ["settings", "Settings", Settings]
  ];
  const allTasks = boards.flatMap(b => (b.columns || []).flatMap(c => (c.tasks || []).map(t => ({ ...t, boardName: b.name, columnName: c.name }))));
  const visibleTasks = tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="p-10 text-slate-600">Loading workspace...</div>;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-slate-50 text-slate-900">
      <aside className="flex h-dvh w-64 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white">
        <div className="shrink-0 border-b border-slate-100 px-5 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm"><LayoutDashboard size={23}/></div>
            <div className="min-w-0"><h1 className="truncate text-base font-extrabold tracking-tight text-slate-900">Collaborative</h1><p className="text-xs text-slate-500">Kanban Workspace</p></div>
          </div>
          <div className="mt-6 flex items-center justify-between rounded-xl bg-indigo-50 px-3 py-3">
            <div className="min-w-0"><p className="text-[10px] font-bold tracking-widest text-indigo-500">WORKSPACE ROLE</p><p className="mt-1 truncate text-sm font-semibold text-indigo-900">{session.role?.replaceAll("_", " ") || "MEMBER"}</p></div>
            <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-indigo-700">{boards.length} boards</span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <p className="mb-3 px-3 text-[10px] font-bold tracking-widest text-slate-400">WORKSPACE</p>
          <nav className="space-y-1">
            {nav.map(([id, label, Icon]) => <button key={id} onClick={() => setPage(id)}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${page === id ? "bg-indigo-600 font-semibold text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
              <Icon size={18} className={page === id ? "text-white" : "text-slate-400 group-hover:text-indigo-600"}/><span className="flex-1">{label}</span>
              {page === id && <span className="h-1.5 w-1.5 rounded-full bg-white"/>}
            </button>)}
          </nav>

          <div className="mb-3 mt-8 flex items-center justify-between px-3">
            <p className="text-[10px] font-bold tracking-widest text-slate-400">YOUR BOARDS</p>
            {!isMember && <button onClick={createBoard} title="Create board" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"><Plus size={17}/></button>}
          </div>
          <div className="space-y-1">
            {boards.map((item, index) => <button key={item.id} onClick={() => { setBoard(item); setPage("board"); }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${board?.id === item.id && page === "board" ? "bg-indigo-50 font-semibold text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`}>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${board?.id === item.id && page === "board" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}><FolderKanban size={15}/></span>
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              {board?.id === item.id && page === "board" && <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"/>}
            </button>)}
            {!boards.length && <p className="px-3 py-2 text-xs text-slate-400">No boards yet</p>}
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-100 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">{session.user?.name?.slice(0,1)?.toUpperCase() || "U"}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{session.user?.name || "Workspace user"}</p><p className="truncate text-xs text-slate-500">{session.user?.email || ""}</p></div>
          </div>
          <button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"><LogOut size={17}/> Sign out</button>
        </div>
      </aside>

      <main className="flex h-dvh min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-5 md:p-8">
        <header className="mb-7 flex shrink-0 flex-wrap items-center justify-between gap-4">
          <div><p className="text-sm text-slate-500">{isTenantAdmin ? "Tenant Admin / Workspace Management" : "Workspace"} / {nav.find(n => n[0] === page)?.[1]}</p><h2 className="mt-1 text-2xl font-bold">{page === "board" ? board?.name || "Boards" : nav.find(n => n[0] === page)?.[1]}</h2></div>
          <div className="flex items-center gap-4"><button onClick={loadBoards} title="Refresh"><RefreshCw size={19}/></button><Bell size={20} className="text-slate-500"/><span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">{session.user?.name?.slice(0,1)?.toUpperCase() || "ME"}</span></div>
        </header>

        {error && <div className="mb-5 flex items-center justify-between rounded-lg bg-red-50 p-3 text-sm text-red-700"><span>{error}</span><button onClick={() => setError("")}>Dismiss</button></div>}

        {isTenantAdmin && page === "board" && <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold tracking-wide text-slate-500">WORKSPACE BOARDS</p>
            <p className="mt-2 text-3xl font-bold text-indigo-700">{boards.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold tracking-wide text-slate-500">TOTAL TASKS</p>
            <p className="mt-2 text-3xl font-bold text-indigo-700">{allTasks.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold tracking-wide text-slate-500">MEMBER MANAGEMENT</p>
            <p className="mt-2 text-sm text-slate-600">Add and manage workspace Members.</p>
            <button onClick={() => setPage("members")} className="mt-2 text-sm font-semibold text-indigo-600">Manage members →</button>
          </div>
        </section>}

        {page === "board" && <>
          <section className="mb-6 flex shrink-0 flex-wrap items-center justify-between gap-3">
            <div><h3 className="text-lg font-semibold">{isMember ? "My workspace tasks" : "Team board"}</h3><p className="text-sm text-slate-500">{isMember ? "View tasks, update details and move work between columns." : "Changes are saved to your workspace"}</p></div>
            <div className="flex flex-wrap gap-2">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." className="w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"/>
              <button disabled={busy || !columns.length} onClick={addTask} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><Plus size={16}/> Add task</button>
              {!isMember && <>
                <button onClick={addColumn} disabled={!board} className="rounded-lg border bg-white px-3 py-2 text-sm">Add column</button>
                <button onClick={renameBoard} disabled={!board} className="rounded-lg border bg-white px-3 py-2 text-sm">Rename</button>
                <button onClick={deleteBoard} disabled={!board || boards.length <= 1} className="rounded-lg border bg-white px-3 py-2 text-sm text-red-600">Delete board</button>
              </>}
            </div>
          </section>
          {!board ? <div className="rounded-xl bg-white p-8 text-center text-slate-500"><p>No board selected.</p>{!isMember && <button onClick={createBoard} className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-white">Create board</button>}</div> :
            <div className="min-h-0 flex-1 overflow-auto overscroll-contain"><section className="flex min-w-max items-start gap-5">
              {columns.map(column => {
                const list = visibleTasks.filter(task => task.columnId === column.id);
                const orderedTasks = tasks
                  .filter(task => task.columnId === column.id)
                  .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
                return <div key={column.id} onDragOver={e => e.preventDefault()} onDrop={e => {
                  e.preventDefault();
                  const task = tasks.find(t => t.id === e.dataTransfer.getData("text/plain"));
                  if (task) moveTask(task, column.id, orderedTasks.length);
                }} className="min-h-96 w-[320px] shrink-0 rounded-xl bg-slate-200/70 p-4">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <h4 className="font-semibold">{column.name} <span className="ml-1 text-sm text-slate-500">{list.length}</span></h4>
                    {!isMember && <div className="flex gap-2">
                      <button onClick={() => renameColumn(column)} title="Rename column" className="text-xs text-indigo-600">Rename</button>
                      <button onClick={() => deleteColumn(column)} title="Delete empty column" className="text-xs text-red-600">Delete</button>
                    </div>}
                  </div>
                  <div className="space-y-3">
                    {list.map(task => <article key={task.id} draggable
                      onDragStart={e => e.dataTransfer.setData("text/plain", task.id)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        const dragged = tasks.find(t => t.id === e.dataTransfer.getData("text/plain"));
                        if (!dragged || dragged.id === task.id) return;
                        const sourceIndex = orderedTasks.findIndex(t => t.id === dragged.id);
                        const targetIndex = orderedTasks.findIndex(t => t.id === task.id);
                        const position = sourceIndex !== -1 && sourceIndex < targetIndex
                          ? targetIndex - 1
                          : targetIndex;
                        moveTask(dragged, column.id, position);
                      }}
                      className="cursor-grab rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex justify-between"><span className="rounded-full bg-indigo-50 px-2 py-1 text-xs text-indigo-600">Task</span><MoreHorizontal size={17} className="text-slate-400"/></div>
                      <h5 className="font-medium">{task.title}</h5>
                      {task.description && <p className="mt-2 text-sm text-slate-500">{task.description}</p>}
                      {(task.assignee_name || task.labels?.length > 0) && <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                        {task.assignee_name && <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">Assigned: {task.assignee_name}</span>}
                        {(task.labels || []).map(label => <span key={label} className="rounded-full bg-violet-50 px-2 py-1 text-violet-700">{label}</span>)}
                      </div>}
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className={`rounded-full px-2 py-1 ${task.priority === "Urgent" || task.priority === "High" ? "bg-red-50 text-red-700" : task.priority === "Low" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700"}`}>{task.priority || "Medium"} priority</span>
                        {task.due_date && <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">Due {task.due_date}</span>}
                      </div>
                      <div className="mt-3 flex gap-3"><button onClick={() => editTask(task)} className="text-xs text-indigo-600">Edit task</button><button onClick={() => deleteTask(task)} className="text-xs text-red-600">Delete</button></div>
                      <div className="mt-5 flex justify-end"><CheckCircle2 size={17} className={column.name === "Done" ? "text-green-600" : "text-slate-300"}/></div>
                    </article>)}
                    {!list.length && <p className="py-8 text-center text-sm text-slate-400">Drop tasks here</p>}
                  </div>
                </div>;
              })}
            </section></div>}
        </>}

        {page === "tasks" && <section className="min-h-0 flex-1 overflow-y-auto">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-sm font-medium text-indigo-600">Workspace overview</p><h3 className="mt-1 text-2xl font-bold text-slate-900">All tasks</h3><p className="mt-1 text-sm text-slate-500">Track work across all your boards in one place.</p></div>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-5 py-3"><p className="text-xs font-medium text-indigo-600">TOTAL TASKS</p><p className="mt-1 text-2xl font-bold text-indigo-900">{allTasks.length}</p></div>
          </div>
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><Search size={18} className="shrink-0 text-slate-400"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by task, board or status..." className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"/></div>
          {allTasks.filter(t => [t.title, t.boardName, t.columnName].some(v => String(v || "").toLowerCase().includes(search.toLowerCase()))).length ? <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {allTasks.filter(t => [t.title, t.boardName, t.columnName].some(v => String(v || "").toLowerCase().includes(search.toLowerCase()))).map(t => <article key={t.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md">
              <div className="flex items-start justify-between gap-3"><h4 className="font-semibold text-slate-800">{t.title}</h4><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${t.columnName === "Done" ? "bg-emerald-50 text-emerald-700" : t.columnName === "In Progress" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>{t.columnName}</span></div>
              {t.description && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{t.description}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs"><span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1.5 font-medium text-indigo-700"><FolderKanban size={13}/>{t.boardName}</span><span className={`rounded-lg px-2.5 py-1.5 font-medium ${t.priority === "Urgent" || t.priority === "High" ? "bg-rose-50 text-rose-700" : t.priority === "Low" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700"}`}>{t.priority || "Medium"} priority</span>{t.due_date && <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-slate-600"><CalendarDays size={13}/>{t.due_date}</span>}</div>
            </article>)}
          </div> : <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><Search size={28} className="mx-auto text-slate-300"/><p className="mt-3 font-semibold text-slate-700">{allTasks.length ? "No matching tasks" : "No tasks yet"}</p><p className="mt-1 text-sm text-slate-500">{allTasks.length ? "Try another search term." : "Create a task from one of your boards to see it here."}</p></div>}
        </section>}

        {page === "members" && <section className="min-h-0 flex-1 overflow-y-auto">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-indigo-600">People and access</p><h3 className="mt-1 text-2xl font-bold text-slate-900">Workspace members</h3><p className="mt-1 text-sm text-slate-500">{isTenantAdmin ? "Add and manage Members in your assigned workspace." : "Manage the people who can access this workspace."}</p></div>{!isMember && <button onClick={inviteMember} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"><Plus size={17}/> {isTenantAdmin ? "Add workspace member" : "Invite member"}</button>}</div>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2"><div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold tracking-wide text-slate-500">TOTAL MEMBERS</p><p className="mt-1 text-2xl font-bold text-slate-900">{members.length}</p></div><div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold tracking-wide text-slate-500">WORKSPACE BOARDS</p><p className="mt-1 text-2xl font-bold text-slate-900">{boards.length}</p></div></div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-4"><h4 className="font-semibold text-slate-800">People in this workspace</h4></div>
            {members.length ? members.map(member => <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 last:border-0"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-bold text-indigo-700">{member.name?.slice(0,1)?.toUpperCase() || "U"}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{member.name}</p><p className="truncate text-xs text-slate-500">{member.email}</p></div></div><div className="flex items-center gap-3"><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{member.role?.replaceAll("_", " ")}</span>{!isMember && member.id !== session.user?.id && member.role !== "ORG_ADMIN" && <button onClick={() => removeMember(member)} title="Remove member" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={17}/></button>}</div></div>) : <div className="px-5 py-12 text-center"><Users size={28} className="mx-auto text-slate-300"/><p className="mt-3 font-semibold text-slate-700">No members found</p><p className="mt-1 text-sm text-slate-500">Workspace members will appear here.</p></div>}
          </div>
        </section>}

        {page === "activity" && <section className="min-h-0 flex-1 space-y-6 overflow-y-auto">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-indigo-600">Workspace management / Activity</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900">Workspace Activity</h3>
              <p className="mt-1 text-sm text-slate-500">Monitor updates and changes across your workspace.</p>
            </div>
            <button onClick={loadActivity} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-indigo-50">
              <Activity size={16}/> Refresh activity
            </button>
          </div>
          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white shadow-sm">
            <p className="text-xs font-semibold tracking-widest text-indigo-100">WORKSPACE OVERVIEW</p>
            <h4 className="mt-2 text-2xl font-bold">Your team's progress, all in one place.</h4>
            <p className="mt-2 text-sm text-indigo-100">Follow board changes, task updates and team activity.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold text-slate-500">TOTAL EVENTS</p><p className="mt-2 text-3xl font-bold text-slate-900">{activity.length}</p><p className="mt-1 text-xs text-slate-400">Recorded workspace updates</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold text-slate-500">WORKSPACE BOARDS</p><p className="mt-2 text-3xl font-bold text-slate-900">{boards.length}</p><p className="mt-1 text-xs text-slate-400">Boards in this workspace</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold text-slate-500">TEAM MEMBERS</p><p className="mt-2 text-3xl font-bold text-slate-900">{members.length}</p><p className="mt-1 text-xs text-slate-400">People in this workspace</p></div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div><h4 className="text-lg font-bold text-slate-900">Recent updates</h4><p className="mt-1 text-sm text-slate-500">A timeline of changes made by your team.</p></div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5"><Search size={17} className="text-slate-400"/><input value={activitySearch} onChange={e => setActivitySearch(e.target.value)} placeholder="Search activity..." className="w-full bg-transparent text-sm outline-none sm:w-48"/></div>
                <div className="flex flex-wrap gap-2">{["ALL","TASKS","BOARDS","MEMBERS"].map(value => <button key={value} onClick={() => setActivityFilter(value)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${activityFilter === value ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{value === "ALL" ? "All" : value.charAt(0) + value.slice(1).toLowerCase()}</button>)}</div>
              </div>
            </div>
            <div className="mt-6">
              {filteredActivity.length ? <div className="divide-y divide-slate-100">{filteredActivity.map((item,index) => <div key={item.id || index} className="flex gap-4 py-5 first:pt-0 last:pb-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Activity size={19}/></span>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold capitalize text-slate-800">{String(item.action || "Workspace update").replaceAll("_"," ").toLowerCase()}</p><span className="text-xs text-slate-400">{item.created_at || "Recent update"}</span></div><p className="mt-1 text-sm leading-6 text-slate-600">{item.details || "A workspace update was recorded."}</p><p className="mt-2 text-xs font-medium text-slate-400">{item.userName || item.user_name || "Workspace member"}</p></div>
              </div>)}</div> : <div className="rounded-xl bg-slate-50 px-5 py-14 text-center"><Activity size={30} className="mx-auto text-indigo-400"/><h4 className="mt-4 font-bold text-slate-800">{activity.length ? "No matching activity" : "Your workspace is ready!"}</h4><p className="mt-2 text-sm text-slate-500">{activity.length ? "Try another search or filter." : "Workspace changes will appear here when your team creates boards, updates tasks or manages members."}</p>{activity.length > 0 && <button onClick={() => {setActivitySearch("");setActivityFilter("ALL");}} className="mt-4 text-sm font-semibold text-indigo-600">Clear filters</button>}</div>}
            </div>
            <div className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-400">Showing {filteredActivity.length} of {activity.length} workspace events</div>
          </div>
        </section>}

        {taskModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <form onSubmit={submitTask} className="my-auto w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{editingTask ? "Edit task" : "Create task"}</h3>
                <p className="mt-1 text-sm text-slate-500">Add details and assign workspace members.</p>
              </div>
              <button type="button" onClick={() => setTaskModalOpen(false)} className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Task title *</label>
                <input autoFocus required maxLength={200} value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="Enter task title" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"/>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
                <textarea rows={3} value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the task..." className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"/>
              </div>

              {!editingTask && <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Board column *</label>
                <select required value={taskForm.columnId} onChange={e => setTaskForm(f => ({ ...f, columnId: e.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
                  {columns.map(column => <option key={column.id} value={column.id}>{column.name}</option>)}
                </select>
              </div>}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Priority</label>
                  <select value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
                    {["Low", "Medium", "High", "Urgent"].map(value => <option key={value}>{value}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Due date</label>
                  <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"/>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Assign to</label>
                <select value={taskForm.assigneeId} onChange={e => setTaskForm(f => ({ ...f, assigneeId: e.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
                  <option value="">Unassigned</option>
                  {members.map(member => <option key={member.id} value={member.id}>{member.name} ({member.email})</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Labels</label>
                <input value={taskForm.labels} onChange={e => setTaskForm(f => ({ ...f, labels: e.target.value }))} placeholder="Design, Bug, Feature (comma separated)" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"/>
                <p className="mt-1 text-xs text-slate-400">Up to 10 labels, maximum 30 characters each.</p>
              </div>
            </div>

            <div className="mt-7 flex justify-end gap-3">
              <button type="button" disabled={busy} onClick={() => setTaskModalOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={busy} className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{busy ? "Saving..." : editingTask ? "Save changes" : "Create task"}</button>
            </div>
          </form>
        </div>}

        {page === "settings" && <section className="min-h-0 flex-1 overflow-y-auto">
          <div className="mb-6"><p className="text-sm font-medium text-indigo-600">Workspace preferences</p><h3 className="mt-1 text-2xl font-bold text-slate-900">Settings</h3><p className="mt-1 text-sm text-slate-500">View your account and workspace information.</p></div>
          <div className="grid max-w-3xl grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5"><div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><UserRound size={19}/></span><div><h4 className="font-semibold text-slate-800">Your account</h4><p className="text-xs text-slate-500">Signed-in profile details</p></div></div><dl className="space-y-4 text-sm"><div><dt className="text-xs font-medium text-slate-400">FULL NAME</dt><dd className="mt-1 font-semibold text-slate-800">{session.user?.name || "Not available"}</dd></div><div><dt className="text-xs font-medium text-slate-400">EMAIL ADDRESS</dt><dd className="mt-1 break-all font-semibold text-slate-800">{session.user?.email || "Not available"}</dd></div><div><dt className="text-xs font-medium text-slate-400">ACCESS ROLE</dt><dd className="mt-1"><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{session.role?.replaceAll("_", " ") || "Not available"}</span></dd></div></dl></div>
            <div className="rounded-xl border border-slate-200 bg-white p-5"><div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><FolderKanban size={19}/></span><div><h4 className="font-semibold text-slate-800">Workspace details</h4><p className="text-xs text-slate-500">Current workspace overview</p></div></div><dl className="space-y-4 text-sm"><div><dt className="text-xs font-medium text-slate-400">TOTAL BOARDS</dt><dd className="mt-1 font-semibold text-slate-800">{boards.length}</dd></div><div><dt className="text-xs font-medium text-slate-400">TOTAL TASKS</dt><dd className="mt-1 font-semibold text-slate-800">{allTasks.length}</dd></div><div><dt className="text-xs font-medium text-slate-400">WORKSPACE ID</dt><dd className="mt-1 break-all font-mono text-xs text-slate-600">{session.tenantId || "Not available"}</dd></div></dl></div>
          </div>
          <p className="mt-5 max-w-3xl rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">Organization and workspace editing are not enabled yet. This page currently displays your existing account and workspace details.</p>
        </section>}

      </main>
    </div>
  );
}


function OrgAdminDashboard({ session, onLogout }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [adminForm, setAdminForm] = useState({ name: "", email: "", password: "" });

  const loadWorkspaces = useCallback(async () => {
    try {
      const response = await organizationAPI.workspaces();
      setWorkspaces(response.data || []);
      setError("");
    } catch (e) {
      setError(e.response?.data?.error || "Could not load organization workspaces.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadWorkspaces(); }, [loadWorkspaces]);

  async function createWorkspace(e) {
    e.preventDefault();
    if (!newWorkspaceName.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await organizationAPI.createWorkspace({ name: newWorkspaceName.trim() });
      setNewWorkspaceName("");
      setShowCreate(false);
      await loadWorkspaces();
    } catch (e) {
      setError(e.response?.data?.error || "Could not create workspace.");
    } finally {
      setBusy(false);
    }
  }

  async function assignAdmin(e) {
    e.preventDefault();
    if (!selectedWorkspace || busy) return;
    if (adminForm.password.length < 12) {
      setError("Use a temporary password with at least 12 characters.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await organizationAPI.assignTenantAdmin(selectedWorkspace.id, {
        name: adminForm.name.trim(),
        email: adminForm.email.trim(),
        password: adminForm.password
      });
      setSelectedWorkspace(null);
      setAdminForm({ name: "", email: "", password: "" });
      await loadWorkspaces();
    } catch (e) {
      setError(e.response?.data?.error || "Could not assign Tenant Admin.");
    } finally {
      setBusy(false);
    }
  }

  const totals = workspaces.reduce((acc, workspace) => ({
    members: acc.members + Number(workspace.memberCount || 0),
    boards: acc.boards + Number(workspace.boardCount || 0),
    tasks: acc.tasks + Number(workspace.taskCount || 0)
  }), { members: 0, boards: 0, tasks: 0 });

  const maxTaskCount = Math.max(1, ...workspaces.map(w => Number(w.taskCount || 0)));

  const filteredWorkspaces = workspaces.filter(workspace =>
    String(workspace.name || "").toLowerCase().includes(search.toLowerCase()) ||
    String(workspace.id || "").toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { label: "Workspaces", value: workspaces.length, icon: FolderKanban, color: "bg-indigo-50 text-indigo-600" },
    { label: "Members", value: totals.members, icon: Users, color: "bg-sky-50 text-sky-600" },
    { label: "Boards", value: totals.boards, icon: LayoutDashboard, color: "bg-violet-50 text-violet-600" },
    { label: "Tasks", value: totals.tasks, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600" }
  ];

  return (
    <div className="min-h-dvh overflow-x-hidden bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm"><LayoutDashboard size={22}/></div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-extrabold tracking-tight">Collaborative Kanban</h1>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600">Organization Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{session.user?.name || "Organization Admin"}</p>
              <p className="text-xs text-slate-500">{session.user?.email}</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
              {session.user?.name?.slice(0, 1)?.toUpperCase() || "A"}
            </span>
            <button onClick={onLogout} className="flex cursor-pointer items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 shadow-sm transition-all hover:border-red-600 hover:bg-red-600 hover:text-white hover:shadow-md">
              <LogOut size={16}/><span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 pb-12 sm:px-8">
        <section className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-indigo-600">Organization overview</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Workspace management</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">Manage workspaces, monitor activity, and assign administrators.</p>
          </div>
          <button disabled={busy} onClick={() => { setError(""); setShowCreate(true); }} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50">
            <Plus size={18}/> Create workspace
          </button>
        </section>

        {error && <div role="alert" className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button onClick={() => setError("")} className="font-semibold hover:underline">Dismiss</button></div>}

        <section className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <article key={label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500">{label}</p>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}><Icon size={19}/></span>
              </div>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{value.toLocaleString()}</p>
              <p className="mt-1 text-[11px] font-medium text-slate-400">Across your organization</p>

            </article>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><FolderKanban size={18}/></span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Your workspaces</h3>
                  <p className="mt-1 text-xs text-slate-500">Live workspace, member, board and task records</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 sm:w-64">
                <Search size={17} className="shrink-0 text-slate-400"/>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workspaces..." className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400"/>
              </div>
              <button onClick={loadWorkspaces} title="Refresh workspaces" className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-indigo-600"><RefreshCw size={18}/></button>
            </div>
          </div>

          {loading ? <div className="p-12 text-center text-sm text-slate-500">Loading organization workspaces...</div> :
            filteredWorkspaces.length ? <div className="grid max-h-[560px] grid-cols-1 gap-4 overflow-y-auto overscroll-contain p-5 pr-3 sm:p-6 lg:grid-cols-2">
              {filteredWorkspaces.map(workspace => (
                <article key={workspace.id} className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:bg-indigo-50/30 hover:shadow-lg focus-within:border-indigo-300 focus-within:shadow-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><FolderKanban size={21}/></span>
                      <div className="min-w-0">
                        <h4 className="truncate font-bold text-slate-900">{workspace.name}</h4>
                        <p className="mt-1 truncate font-mono text-[11px] text-slate-400">{workspace.id}</p>
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-[11px] font-bold text-indigo-700">Workspace</span>
                  </div>
                  <div className="my-5 grid grid-cols-3 divide-x divide-slate-100 rounded-xl bg-slate-50 py-3">
                    {[["Members", workspace.memberCount], ["Boards", workspace.boardCount], ["Tasks", workspace.taskCount]].map(([label, value]) => (
                      <div key={label} className="px-2 text-center">
                        <p className="text-lg font-bold text-slate-900">{Number(value || 0)}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mb-5">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600">Task volume</span>
                      <span className="font-bold tabular-nums text-slate-800">{Number(workspace.taskCount || 0).toLocaleString()} tasks</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500" style={{ width: `${Math.round(Number(workspace.taskCount || 0) / maxTaskCount * 100)}%` }}/>
                    </div>
                  </div>
                  <button disabled={busy} onClick={() => { setError(""); setSelectedWorkspace(workspace); }} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-indigo-600 bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-700 hover:bg-indigo-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-50">
                    <Users size={16}/> Assign Tenant Admin
                  </button>
                </article>
              ))}
            </div> : <div className="px-6 py-16 text-center">
              <FolderKanban size={32} className="mx-auto text-slate-300"/>
              <p className="mt-3 font-semibold text-slate-700">{workspaces.length ? "No matching workspaces" : "No workspaces yet"}</p>
              <p className="mt-1 text-sm text-slate-500">{workspaces.length ? "Try a different search." : "Create your first workspace to get started."}</p>
            </div>}
        </section>
      </main>

      {(showCreate || selectedWorkspace) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4" onMouseDown={e => { if (e.target === e.currentTarget && !busy) { setShowCreate(false); setSelectedWorkspace(null); } }}>
          <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">{showCreate ? "New workspace" : "Workspace access"}</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">{showCreate ? "Create workspace" : "Assign Tenant Admin"}</h3>
                <p className="mt-1 text-sm text-slate-500">{showCreate ? "Give your team a dedicated place to collaborate." : `Set an administrator for ${selectedWorkspace?.name}.`}</p>
              </div>
              <button disabled={busy} onClick={() => { setShowCreate(false); setSelectedWorkspace(null); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">✕</button>
            </div>

            {showCreate ? (
              <form onSubmit={createWorkspace}>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Workspace name</label>
                <input autoFocus required maxLength={80} value={newWorkspaceName} onChange={e => setNewWorkspaceName(e.target.value)} placeholder="e.g. Product Team" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"/>
                <div className="mt-6 flex justify-end gap-3">
                  <button type="button" disabled={busy} onClick={() => setShowCreate(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                  <button disabled={busy || !newWorkspaceName.trim()} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{busy ? "Creating..." : "Create workspace"}</button>
                </div>
              </form>
            ) : (
              <form onSubmit={assignAdmin} className="space-y-4">
                <div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Admin full name</label><input required value={adminForm.name} onChange={e => setAdminForm({ ...adminForm, name: e.target.value })} placeholder="Enter full name" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"/></div>
                <div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Email address</label><input required type="email" value={adminForm.email} onChange={e => setAdminForm({ ...adminForm, email: e.target.value })} placeholder="admin@example.com" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"/></div>
                <div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Temporary password</label><input required minLength={12} type="password" value={adminForm.password} onChange={e => setAdminForm({ ...adminForm, password: e.target.value })} placeholder="At least 12 characters" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"/><p className="mt-1 text-xs text-slate-400">Use at least 12 characters.</p></div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" disabled={busy} onClick={() => setSelectedWorkspace(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                  <button disabled={busy || !adminForm.name.trim() || !adminForm.email.trim() || adminForm.password.length < 12} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{busy ? "Assigning..." : "Assign admin"}</button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(() => ({
    token: sessionStorage.getItem("kanban_token"),
    tenantId: sessionStorage.getItem("kanban_tenant"),
    role: sessionStorage.getItem("kanban_role"),
    user: JSON.parse(sessionStorage.getItem("kanban_user") || "null")
  }));

  function handleLogin(data) {
    sessionStorage.setItem("kanban_token", data.token);
    sessionStorage.setItem("kanban_tenant", data.tenantId);
    sessionStorage.setItem("kanban_role", data.role);
    sessionStorage.setItem("kanban_user", JSON.stringify(data.user || null));
    setSession({ token: data.token, tenantId: data.tenantId, role: data.role, user: data.user || null });
  }

  function logout() {
    disconnectSocket();
    ["kanban_token", "kanban_tenant", "kanban_role", "kanban_user"].forEach(key => sessionStorage.removeItem(key));
    setSession({ token: null, tenantId: null, role: null, user: null });
  }

  const roles = [
    { path: "/login", role: "MEMBER", label: "Member Portal" },
    { path: "/tenant-admin/login", role: "TENANT_ADMIN", label: "Workspace Admin" },
    { path: "/org-admin/login", role: "ORG_ADMIN", label: "Organization Admin" }
  ];

  return <BrowserRouter><Routes>
    {roles.map(item => <Route key={item.path} path={item.path} element={
      session.token && session.tenantId && session.role === item.role
        ? (item.role === "ORG_ADMIN" ? <OrgAdminDashboard session={session} onLogout={logout}/> : <Dashboard session={session} onLogout={logout}/>)
        : <AuthScreen onLogin={handleLogin} expectedRole={item.role} roleLabel={item.label}/>
    }/> )}
    <Route path="/" element={session.token && session.tenantId && session.role
      ? <Navigate to={session.role === "ORG_ADMIN" ? "/org-admin/login" : session.role === "TENANT_ADMIN" ? "/tenant-admin/login" : "/login"} replace/>
      : <Navigate to="/login" replace/>}/>
    <Route path="*" element={<Navigate to="/login" replace/>}/>
  </Routes></BrowserRouter>;
}
