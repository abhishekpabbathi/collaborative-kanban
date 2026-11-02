
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
  const [boards, setBoards] = useState([]);
  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [page, setPage] = useState("board");
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const isTenantAdmin = session.role === "TENANT_ADMIN";
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
    ["task:created", "task:updated", "task:deleted"].forEach(event => socket.on(event, refresh));
    return () => {
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

  async function addTask() {
    if (!title.trim() || !columns.length || busy) return;
    const description = window.prompt("Task description:", "") ?? "";
    const priority = window.prompt("Priority: Low, Medium, High or Urgent", "Medium");
    if (!priority) return;
    if (!["Low", "Medium", "High", "Urgent"].includes(priority))
      return setError("Choose Low, Medium, High or Urgent.");
    const dueDate = window.prompt("Due date (YYYY-MM-DD), or leave blank:", "") || null;
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate))
      return setError("Enter the due date as YYYY-MM-DD.");
    setBusy(true);
    try {
      await taskAPI.create(session.tenantId, {
        columnId: columns[0].id,
        title: title.trim(),
        description,
        priority,
        dueDate
      });
      setTitle("");
      await loadBoards();
    } catch (e) {
      setError(e.response?.data?.error || "Task creation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function editTask(task) {
    const updated = window.prompt("Task title:", task.title);
    if (!updated?.trim()) return;
    const description = window.prompt("Task description:", task.description || "");
    if (description === null) return;
    const priority = window.prompt("Priority: Low, Medium, High or Urgent", task.priority || "Medium");
    if (!priority) return;
    if (!["Low", "Medium", "High", "Urgent"].includes(priority))
      return setError("Choose Low, Medium, High or Urgent.");
    const dueDate = window.prompt("Due date (YYYY-MM-DD), or leave blank:", task.due_date || "") || null;
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate))
      return setError("Enter the due date as YYYY-MM-DD.");
    try {
      await taskAPI.update(session.tenantId, task.id, {
        title: updated.trim(), description, priority, dueDate, version: task.version
      });
      await loadBoards();
    } catch (e) {
      setError(e.response?.data?.error || "Task update failed.");
      await loadBoards();
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

  async function moveTask(task, columnId) {
    if (!columnId || columnId === task.columnId) return;
    try {
      await taskAPI.update(session.tenantId, task.id, { columnId, version: task.version });
      await loadBoards();
    } catch (e) { setError(e.response?.data?.error || "Task move failed."); await loadBoards(); }
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
              {!isMember && <>
                <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()} placeholder="New task title..." className="w-48 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"/>
                <button disabled={busy || !columns.length} onClick={addTask} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><Plus size={16}/> Add task</button>
              </>}
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
                return <div key={column.id} onDragOver={e => e.preventDefault()} onDrop={e => {
                  e.preventDefault(); const task = tasks.find(t => t.id === e.dataTransfer.getData("text/plain")); if (task) moveTask(task, column.id);
                }} className="min-h-96 w-[320px] shrink-0 rounded-xl bg-slate-200/70 p-4">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <h4 className="font-semibold">{column.name} <span className="ml-1 text-sm text-slate-500">{list.length}</span></h4>
                    {!isMember && <div className="flex gap-2">
                      <button onClick={() => renameColumn(column)} title="Rename column" className="text-xs text-indigo-600">Rename</button>
                      <button onClick={() => deleteColumn(column)} title="Delete empty column" className="text-xs text-red-600">Delete</button>
                    </div>}
                  </div>
                  <div className="space-y-3">
                    {list.map(task => <article key={task.id} draggable onDragStart={e => e.dataTransfer.setData("text/plain", task.id)} className="cursor-grab rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex justify-between"><span className="rounded-full bg-indigo-50 px-2 py-1 text-xs text-indigo-600">Task</span><MoreHorizontal size={17} className="text-slate-400"/></div>
                      <h5 className="font-medium">{task.title}</h5>
                      {task.description && <p className="mt-2 text-sm text-slate-500">{task.description}</p>}
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className={`rounded-full px-2 py-1 ${task.priority === "Urgent" || task.priority === "High" ? "bg-red-50 text-red-700" : task.priority === "Low" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700"}`}>{task.priority || "Medium"} priority</span>
                        {task.due_date && <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">Due {task.due_date}</span>}
                      </div>
                      <div className="mt-3 flex gap-3"><button onClick={() => editTask(task)} className="text-xs text-indigo-600">Edit task</button>{!isMember && <button onClick={() => deleteTask(task)} className="text-xs text-red-600">Delete</button>}</div>
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

        {page === "activity" && <section className="min-h-0 flex-1 overflow-y-auto">
          <div className="mb-6"><p className="text-sm font-medium text-indigo-600">Workspace history</p><h3 className="mt-1 text-2xl font-bold text-slate-900">Activity</h3><p className="mt-1 text-sm text-slate-500">A record of recent changes made in this workspace.</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-5"><div className="mb-5 flex items-center justify-between"><h4 className="font-semibold text-slate-800">Recent updates</h4><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{activity.length} events</span></div>
            {activity.length ? <div className="space-y-5">{activity.map(item => <div key={item.id} className="flex gap-4"><span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600"><Activity size={17}/></span><div className="min-w-0 flex-1 border-b border-slate-100 pb-5 last:border-0"><p className="font-semibold capitalize text-slate-800">{item.action?.replaceAll("_", " ")}</p><p className="mt-1 text-sm text-slate-600">{item.details || "Workspace update"}</p><p className="mt-2 text-xs text-slate-400">{item.userName || "Workspace member"} · {item.created_at || ""}</p></div></div>)}</div> : <div className="py-10 text-center"><Activity size={28} className="mx-auto text-slate-300"/><p className="mt-3 font-semibold text-slate-700">No activity yet</p><p className="mt-1 text-sm text-slate-500">Workspace updates will appear here.</p></div>}
          </div>
        </section>}

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

  async function createWorkspace() {
    const name = window.prompt("New workspace name:");
    if (!name?.trim() || busy) return;
    setBusy(true);
    try {
      await organizationAPI.createWorkspace({ name: name.trim() });
      await loadWorkspaces();
    } catch (e) {
      setError(e.response?.data?.error || "Could not create workspace.");
    } finally {
      setBusy(false);
    }
  }

  async function assignAdmin(workspace) {
    const name = window.prompt(`Tenant Admin name for ${workspace.name}:`);
    if (!name?.trim()) return;
    const email = window.prompt("Tenant Admin email:");
    if (!email?.trim()) return;
    const password = window.prompt("Temporary password (minimum 12 characters) for a new account:");
    if (!password || password.length < 12) {
      setError("A password of at least 12 characters is required for a new account.");
      return;
    }
    setBusy(true);
    try {
      await organizationAPI.assignTenantAdmin(workspace.id, {
        name: name.trim(), email: email.trim(), password
      });
      await loadWorkspaces();
      setError("");
      window.alert("Tenant Admin assigned successfully.");
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white"><LayoutDashboard size={23}/></div>
            <div><h1 className="text-lg font-extrabold">Collaborative Kanban</h1><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Organization Admin Console</p></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right"><p className="text-sm font-semibold">{session.user?.name || "Organization Admin"}</p><p className="text-xs text-slate-500">{session.user?.email}</p></div>
            <button onClick={onLogout} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"><LogOut size={16}/> Sign out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-medium text-indigo-600">Organization overview</p><h2 className="mt-1 text-3xl font-bold">Workspace management</h2><p className="mt-2 text-sm text-slate-500">Create workspaces and assign a Tenant Admin to manage each workspace.</p></div>
          <button disabled={busy} onClick={createWorkspace} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"><Plus size={17}/> Create workspace</button>
        </div>

        {error && <div className="mb-5 flex items-center justify-between rounded-lg bg-red-50 p-3 text-sm text-red-700"><span>{error}</span><button onClick={() => setError("")}>Dismiss</button></div>}

        <section className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[["WORKSPACES", workspaces.length], ["MEMBERS", totals.members], ["BOARDS", totals.boards], ["TASKS", totals.tasks]].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold tracking-wide text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-indigo-700">{value}</p></div>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5"><div><h3 className="font-bold">Organization workspaces</h3><p className="mt-1 text-sm text-slate-500">Workspace-level access and usage</p></div><button onClick={loadWorkspaces} title="Refresh workspaces" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><RefreshCw size={18}/></button></div>
          {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading workspaces...</p> :
            workspaces.length ? <div className="divide-y divide-slate-100">
              {workspaces.map(workspace => (
                <article key={workspace.id} className="flex flex-wrap items-center justify-between gap-5 px-6 py-5">
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><FolderKanban size={22}/></span>
                    <div className="min-w-0"><h4 className="truncate font-semibold">{workspace.name}</h4><p className="mt-1 break-all font-mono text-xs text-slate-400">{workspace.id}</p><div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500"><span>{workspace.memberCount} members</span><span>{workspace.boardCount} boards</span><span>{workspace.taskCount} tasks</span></div></div>
                  </div>
                  <button disabled={busy} onClick={() => assignAdmin(workspace)} className="flex items-center gap-2 rounded-lg border border-indigo-200 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"><Users size={16}/> Assign Tenant Admin</button>
                </article>
              ))}
            </div> : <div className="px-6 py-14 text-center"><FolderKanban size={30} className="mx-auto text-slate-300"/><p className="mt-3 font-semibold">No workspaces found</p><p className="mt-1 text-sm text-slate-500">Create your first workspace to get started.</p></div>}
        </section>
      </main>
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
