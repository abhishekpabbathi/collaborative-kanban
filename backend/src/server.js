require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

async function start() {
  const SQL = await initSqlJs({
    locateFile: file => require.resolve("sql.js/dist/" + file)
  });

  const dbPath = path.resolve(process.env.DB_PATH || path.join(__dirname, "../../database/app.sqlite"));
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = fs.existsSync(dbPath)
    ? new SQL.Database(fs.readFileSync(dbPath))
    : new SQL.Database();

  db.run("PRAGMA foreign_keys = ON");
  db.run(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id),
      name TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS memberships (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      role TEXT NOT NULL CHECK(role IN ('ORG_ADMIN','TENANT_ADMIN','MEMBER')),
      UNIQUE(user_id, tenant_id)
    );
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS columns (
      id TEXT PRIMARY KEY, board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      name TEXT NOT NULL, position INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY, column_id TEXT NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
      title TEXT NOT NULL, description TEXT DEFAULT '', position INTEGER DEFAULT 0,
      version INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
      user_id TEXT NOT NULL REFERENCES users(id), task_id TEXT,
      action TEXT NOT NULL, details TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);


  // Idempotent starter data for the primary Organization Admin workspace.
  function seedOrganizationAdminWorkspace() {
    const admin = one(
      `SELECT u.id AS userId,m.tenant_id AS tenantId
       FROM users u JOIN memberships m ON m.user_id=u.id
       WHERE lower(u.email)=? AND m.role='ORG_ADMIN' LIMIT 1`,
      ["collaborativekanban@gmail.com"]
    );
    if (!admin) return;

    const starter = [
      {
        board: "Product Launch",
        tasks: [
          ["Define product requirements", "Document user stories, acceptance criteria and MVP scope.", 0],
          ["Prepare sprint backlog", "Prioritize the next sprint and estimate development work.", 0],
          ["Review onboarding experience", "Identify friction in the workspace registration flow.", 1],
          ["Build responsive dashboard", "Implement navigation, board summaries and responsive layouts.", 1],
          ["Validate tenant permissions", "Verify workspace data remains isolated between tenants.", 2]
        ]
      },
      {
        board: "Website Redesign",
        tasks: [
          ["Audit current website", "Review content, navigation, accessibility and performance.", 0],
          ["Create wireframes", "Prepare desktop and mobile page layouts.", 0],
          ["Design component library", "Define reusable buttons, forms, cards and navigation.", 1],
          ["Implement responsive pages", "Build and test layouts across screen sizes.", 1],
          ["Run accessibility review", "Check keyboard navigation, contrast and semantic markup.", 2]
        ]
      },
      {
        board: "Marketing Campaign",
        tasks: [
          ["Define campaign goals", "Set target audience, objectives and success metrics.", 0],
          ["Prepare content calendar", "Plan campaign topics and publishing dates.", 0],
          ["Draft landing page copy", "Write clear copy and calls to action.", 1],
          ["Prepare launch assets", "Create campaign graphics and social media assets.", 1],
          ["Review campaign results", "Summarize engagement and conversion performance.", 2]
        ]
      }
    ];

    const existingMain = one(
      "SELECT id FROM boards WHERE tenant_id=? AND name=?",
      [admin.tenantId, "My First Board"]
    );
    if (existingMain) {
      const cols = rows("SELECT id,name FROM columns WHERE board_id=? ORDER BY position", [existingMain.id]);
      const defaults = [
        ["Plan project roadmap", "Define milestones, owners and delivery dates.", 0],
        ["Review user feedback", "Collect feedback and prioritize improvements.", 0],
        ["Build core features", "Complete the main product workflows.", 1],
        ["Test task management", "Verify create, edit, delete and drag-and-drop.", 1],
        ["Prepare project documentation", "Document setup, APIs and usage instructions.", 2],
        ["Complete release checklist", "Confirm quality checks before release.", 2]
      ];
      for (const [title, description, pos] of defaults) {
        const col = cols[pos];
        if (col && !one("SELECT id FROM tasks WHERE column_id=? AND title=?", [col.id, title])) {
          const taskId = id();
          db.run("INSERT INTO tasks(id,column_id,title,description,position) VALUES(?,?,?,?,?)",
            [taskId, col.id, title, description, 100 + pos]);
          log(admin.userId, admin.tenantId, taskId, "TASK_CREATED", "Starter workspace task: " + title);
        }
      }
    }

    for (const item of starter) {
      let board = one("SELECT id FROM boards WHERE tenant_id=? AND name=?", [admin.tenantId, item.board]);
      if (!board) {
        const boardId = id();
        db.run("INSERT INTO boards(id,tenant_id,name) VALUES(?,?,?)", [boardId, admin.tenantId, item.board]);
        ["To Do", "In Progress", "Done"].forEach((name, position) =>
          db.run("INSERT INTO columns(id,board_id,name,position) VALUES(?,?,?,?)",
            [id(), boardId, name, position])
        );
        board = { id: boardId };
      }
      const cols = rows("SELECT id FROM columns WHERE board_id=? ORDER BY position", [board.id]);
      item.tasks.forEach(([title, description, pos], index) => {
        const col = cols[pos];
        if (col && !one("SELECT id FROM tasks WHERE column_id=? AND title=?", [col.id, title])) {
          const taskId = id();
          db.run("INSERT INTO tasks(id,column_id,title,description,position) VALUES(?,?,?,?,?)",
            [taskId, col.id, title, description, index]);
          log(admin.userId, admin.tenantId, taskId, "TASK_CREATED", "Starter workspace task: " + title);
        }
      });
    }
    fs.writeFileSync(dbPath, Buffer.from(db.export()));
  }
  seedOrganizationAdminWorkspace();


  // Backward-compatible task metadata migration.
  for (const statement of [
    "ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'Medium'",
    "ALTER TABLE tasks ADD COLUMN due_date TEXT DEFAULT NULL"
  ]) {
    try { db.run(statement); } catch (error) {
      if (!String(error.message || error).toLowerCase().includes("duplicate column"))
        throw error;
    }
  }

  function save() {
    fs.writeFileSync(dbPath, Buffer.from(db.export()));
  }
  function rows(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const result = [];
    while (stmt.step()) result.push(stmt.getAsObject());
    stmt.free();
    return result;
  }
  function one(sql, params = []) {
    return rows(sql, params)[0] || null;
  }
  function id() {
    return require("crypto").randomUUID();
  }
  function log(userId, tenantId, taskId, action, details = "") {
    db.run(
      "INSERT INTO activity_logs(id,tenant_id,user_id,task_id,action,details) VALUES(?,?,?,?,?,?)",
      [id(), tenantId, userId, taskId, action, details]
    );
  }

  // Demo login accounts for deployment testing.
  async function ensureDemoAccounts() {
    const orgEmail = "collaborativekanban@gmail.com";
    const adminEmail = "anil@gmail.com";
    const memberEmail = "alex.morgan@collabkanban.demo";

    let org = one("SELECT id FROM organizations WHERE name=?", ["Organization Admin"]);
    if (!org) {
      org = { id: id() };
      db.run("INSERT INTO organizations(id,name) VALUES(?,?)",
        [org.id, "Organization Admin"]);
    }

    function ensureTenant(name) {
      let tenant = one(
        "SELECT id FROM tenants WHERE organization_id=? AND name=?",
        [org.id, name]
      );
      if (!tenant) {
        tenant = { id: id() };
        db.run("INSERT INTO tenants(id,organization_id,name) VALUES(?,?,?)",
          [tenant.id, org.id, name]);
      }
      return tenant;
    }

    const adminWorkspace = ensureTenant("Admin Workspace");
    const anilWorkspace = ensureTenant("Anil Workspace");

    async function ensureUser(name, email, password, tenant, role) {
      let user = one("SELECT id FROM users WHERE email=?", [email]);
      const hash = await bcrypt.hash(password, 12);

      if (user) {
        db.run("UPDATE users SET password=? WHERE id=?", [hash, user.id]);
      } else {
        user = { id: id() };
        db.run("INSERT INTO users(id,name,email,password) VALUES(?,?,?,?)",
          [user.id, name, email, hash]);
      }

      if (!one("SELECT id FROM memberships WHERE user_id=? AND tenant_id=?",
        [user.id, tenant.id])) {
        db.run(
          "INSERT INTO memberships(id,user_id,organization_id,tenant_id,role) VALUES(?,?,?,?,?)",
          [id(), user.id, org.id, tenant.id, role]
        );
      }
    }

    await ensureUser("Collaborative Kanban", orgEmail,
      "OrgDemo@2026-Kanban!", adminWorkspace, "ORG_ADMIN");
    await ensureUser("Anil", adminEmail,
      "AnilDemo@2026-Kanban!", anilWorkspace, "TENANT_ADMIN");
    await ensureUser("Alex Morgan", memberEmail,
      "MemberDemo@2026-Kanban!", anilWorkspace, "MEMBER");

    save();
    console.log("Demo accounts ready: ORG_ADMIN, TENANT_ADMIN, MEMBER");
  }

  await ensureDemoAccounts();
  seedOrganizationAdminWorkspace();

  const app = express();
  const server = http.createServer(app);
  const io = new (require("socket.io").Server)(server, {
    cors: { origin: process.env.FRONTEND_URL || "http://localhost:5173" }
  });
  if (process.env.NODE_ENV === "production" && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) throw new Error("A JWT_SECRET of at least 32 characters is required in production");
  const secret = process.env.JWT_SECRET || "local-demo-secret-change-before-deployment";

  app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (req, res) =>
    res.json({ status: "ok", service: "collaborative-kanban-api", database: "sqlite" })
  );

  function auth(req, res, next) {
    try {
      const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
      if (!token) return res.status(401).json({ error: "Authentication required" });
      req.user = jwt.verify(token, secret);
      next();
    } catch {
      res.status(401).json({ error: "Invalid or expired token" });
    }
  }

  function tenantAccess(req, res, next) {
    const tenantId = req.params.tenantId || req.body.tenantId;
    if (typeof tenantId !== "string" || !tenantId)
      return res.status(400).json({ error: "Workspace ID is required" });

    let membership = one(
      "SELECT * FROM memberships WHERE user_id=? AND tenant_id=?",
      [req.user.id, tenantId]
    );

    if (!membership) {
      const tenant = one("SELECT organization_id FROM tenants WHERE id=?", [tenantId]);
      const orgAdmin = tenant && one(
        "SELECT * FROM memberships WHERE user_id=? AND organization_id=? AND role='ORG_ADMIN'",
        [req.user.id, tenant.organization_id]
      );
      if (orgAdmin) membership = orgAdmin;
    }

    if (!membership) return res.status(403).json({ error: "Tenant access denied" });
    req.membership = membership;
    req.tenantId = tenantId;
    next();
  }

  function roleAccess(...allowed) {
    return (req, res, next) => {
      if (!req.membership || !allowed.includes(req.membership.role))
        return res.status(403).json({ error: "Insufficient permissions" });
      next();
    };
  }

  app.post("/api/auth/register", (req, res) => {
    return res.status(403).json({ error: "Public registration is disabled. Contact your Organization Admin." });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password, expectedRole } = req.body || {};
    const user = one("SELECT * FROM users WHERE email=?", [(email || "").toLowerCase()]);
    if (!user || !await bcrypt.compare(password || "", user.password))
      return res.status(401).json({ error: "Invalid email or password" });
    const membership = one("SELECT * FROM memberships WHERE user_id=? AND (? IS NULL OR role=?) LIMIT 1", [user.id, expectedRole || null, expectedRole || null]);
    if (!membership) return res.status(403).json({ error: "No workspace membership found" });
    if (expectedRole && membership.role !== expectedRole)
      return res.status(403).json({ error: "This account does not have the requested role" });
    const token = jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: "2h", issuer: "collaborative-kanban" });
    res.json({ token, role: membership.role, user: { id: user.id, name: user.name, email: user.email },
      tenantId: membership.tenant_id, organizationId: membership.organization_id });
  });

  app.get("/api/me", auth, (req, res) => {
    const user = one("SELECT id,name,email FROM users WHERE id=?", [req.user.id]);
    const memberships = rows(
      `SELECT m.role,m.tenant_id AS tenantId,m.organization_id AS organizationId,
       t.name AS tenantName,o.name AS organizationName
       FROM memberships m JOIN tenants t ON t.id=m.tenant_id
       JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=?`,
      [req.user.id]
    );
    res.json({ user, memberships });
  });

  app.post("/api/tenants/:tenantId/members", auth, tenantAccess, roleAccess("ORG_ADMIN", "TENANT_ADMIN"), async (req, res) => {
    try {
      const { name, email, password, role = "MEMBER" } = req.body || {};
      if (!name?.trim() || !email?.trim() || !["TENANT_ADMIN", "MEMBER"].includes(role))
        return res.status(400).json({ error: "Valid name, email and role are required" });
      if (req.membership.role === "TENANT_ADMIN" && role !== "MEMBER")
        return res.status(403).json({ error: "Tenant Admin can only add Members" });
      const normalizedEmail = email.trim().toLowerCase();
      let user = one("SELECT * FROM users WHERE email=?", [normalizedEmail]);
      if (user && one(
        "SELECT id FROM memberships WHERE user_id=? AND organization_id<>? LIMIT 1",
        [user.id, req.membership.organization_id]
      ))
        return res.status(403).json({ error: "This account belongs to another organization" });
      if (!user) {
        if (typeof password !== "string" || password.length < 12)
          return res.status(400).json({ error: "New accounts require a password of at least 12 characters" });
        const userId = id();
        const hash = await bcrypt.hash(password, 12);
        db.run("INSERT INTO users(id,name,email,password) VALUES(?,?,?,?)",
          [userId, name.trim(), normalizedEmail, hash]);
        user = one("SELECT * FROM users WHERE id=?", [userId]);
      }
      if (one("SELECT id FROM memberships WHERE user_id=? AND tenant_id=?", [user.id, req.tenantId]))
        return res.status(409).json({ error: "User is already a workspace member" });
      db.run("INSERT INTO memberships(id,user_id,organization_id,tenant_id,role) VALUES(?,?,?,?,?)",
        [id(), user.id, req.membership.organization_id, req.tenantId, role]);
      save();
      res.status(201).json({ user: { id: user.id, name: user.name, email: user.email }, role });
    } catch {
      res.status(500).json({ error: "Could not add workspace member" });
    }
  });


  // Organization Admin workspace management
  function organizationAdmin(req, res, next) {
    const membership = one(
      "SELECT * FROM memberships WHERE user_id=? AND role='ORG_ADMIN' LIMIT 1",
      [req.user.id]
    );
    if (!membership) return res.status(403).json({ error: "Organization Admin access required" });
    req.organizationMembership = membership;
    next();
  }

  app.get("/api/organization/workspaces", auth, organizationAdmin, (req, res) => {
    const workspaces = rows(
      `SELECT t.id,t.name,t.created_at,
        (SELECT COUNT(*) FROM memberships m WHERE m.tenant_id=t.id) AS memberCount,
        (SELECT COUNT(*) FROM boards b WHERE b.tenant_id=t.id) AS boardCount,
        (SELECT COUNT(*) FROM tasks k JOIN columns c ON c.id=k.column_id
          JOIN boards b ON b.id=c.board_id WHERE b.tenant_id=t.id) AS taskCount
       FROM tenants t WHERE t.organization_id=? ORDER BY t.created_at,t.name`,
      [req.organizationMembership.organization_id]
    );
    res.json(workspaces);
  });

  app.post("/api/organization/workspaces", auth, organizationAdmin, (req, res) => {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    if (!name) return res.status(400).json({ error: "Workspace name is required" });
    if (one("SELECT id FROM tenants WHERE organization_id=? AND lower(name)=lower(?)",
      [req.organizationMembership.organization_id, name]))
      return res.status(409).json({ error: "A workspace with this name already exists" });

    const tenantId = id();
    db.run("INSERT INTO tenants(id,organization_id,name) VALUES(?,?,?)",
      [tenantId, req.organizationMembership.organization_id, name]);
    save();
    res.status(201).json(one("SELECT * FROM tenants WHERE id=?", [tenantId]));
  });

  app.post("/api/organization/workspaces/:tenantId/admins", auth, organizationAdmin, async (req, res) => {
    try {
      const tenant = one(
        "SELECT id,organization_id FROM tenants WHERE id=? AND organization_id=?",
        [req.params.tenantId, req.organizationMembership.organization_id]
      );
      if (!tenant) return res.status(404).json({ error: "Workspace not found in your organization" });

      const { name, email, password } = req.body || {};
      if (!name?.trim() || !email?.trim())
        return res.status(400).json({ error: "Tenant Admin name and email are required" });

      const normalizedEmail = email.trim().toLowerCase();
      let user = one("SELECT * FROM users WHERE email=?", [normalizedEmail]);

      if (user && one(
        "SELECT id FROM memberships WHERE user_id=? AND organization_id<>? LIMIT 1",
        [user.id, tenant.organization_id]
      ))
        return res.status(403).json({ error: "This account belongs to another organization" });

      if (!user) {
        if (typeof password !== "string" || password.length < 12)
          return res.status(400).json({ error: "New accounts require a password of at least 12 characters" });
        const userId = id();
        const hash = await bcrypt.hash(password, 12);
        db.run("INSERT INTO users(id,name,email,password) VALUES(?,?,?,?)",
          [userId, name.trim(), normalizedEmail, hash]);
        user = one("SELECT * FROM users WHERE id=?", [userId]);
      }

      if (one("SELECT id FROM memberships WHERE user_id=? AND tenant_id=?", [user.id, tenant.id]))
        return res.status(409).json({ error: "This account already has a membership in this workspace" });

      db.run(
        "INSERT INTO memberships(id,user_id,organization_id,tenant_id,role) VALUES(?,?,?,?,?)",
        [id(), user.id, tenant.organization_id, tenant.id, "TENANT_ADMIN"]
      );
      save();
      res.status(201).json({
        user: { id: user.id, name: user.name, email: user.email },
        role: "TENANT_ADMIN",
        tenantId: tenant.id
      });
    } catch (error) {
      console.error("Tenant Admin assignment failed:", error);
      res.status(500).json({ error: "Could not assign Tenant Admin" });
    }
  });

  app.get("/api/tenants/:tenantId/boards", auth, tenantAccess, (req, res) => {
    const boards = rows("SELECT * FROM boards WHERE tenant_id=?", [req.tenantId]);
    res.json(boards.map(board => ({
      ...board,
      columns: rows("SELECT * FROM columns WHERE board_id=? ORDER BY position", [board.id])
        .map(column => ({
          ...column,
          tasks: rows("SELECT * FROM tasks WHERE column_id=? ORDER BY position", [column.id])
        }))
    })));
  });

  app.post("/api/tenants/:tenantId/boards", auth, tenantAccess, roleAccess("ORG_ADMIN", "TENANT_ADMIN"), (req, res) => {
    const boardId = id();
    db.run("INSERT INTO boards(id,tenant_id,name) VALUES(?,?,?)",
      [boardId, req.tenantId, req.body.name || "New Board"]);
    ["To Do", "In Progress", "Done"].forEach((name, position) =>
      db.run("INSERT INTO columns(id,board_id,name,position) VALUES(?,?,?,?)",
        [id(), boardId, name, position])
    );
    save();
    res.status(201).json(one("SELECT * FROM boards WHERE id=?", [boardId]));
  });


  // Board management
  app.patch("/api/tenants/:tenantId/boards/:boardId", auth, tenantAccess, roleAccess("ORG_ADMIN", "TENANT_ADMIN"), (req, res) => {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    if (!name) return res.status(400).json({ error: "Board name is required" });
    const board = one("SELECT id FROM boards WHERE id=? AND tenant_id=?", [req.params.boardId, req.tenantId]);
    if (!board) return res.status(404).json({ error: "Board not found" });
    db.run("UPDATE boards SET name=? WHERE id=?", [name, board.id]);
    save();
    res.json(one("SELECT * FROM boards WHERE id=?", [board.id]));
  });

  app.delete("/api/tenants/:tenantId/boards/:boardId", auth, tenantAccess, roleAccess("ORG_ADMIN", "TENANT_ADMIN"), (req, res) => {
    const board = one("SELECT id FROM boards WHERE id=? AND tenant_id=?", [req.params.boardId, req.tenantId]);
    if (!board) return res.status(404).json({ error: "Board not found" });
    const count = one("SELECT COUNT(*) AS total FROM boards WHERE tenant_id=?", [req.tenantId]).total;
    if (count <= 1) return res.status(400).json({ error: "Keep at least one board in the workspace" });
    db.run("DELETE FROM boards WHERE id=?", [board.id]);
    save();
    res.json({ success: true });
  });

  // Workspace members
  app.get("/api/tenants/:tenantId/members", auth, tenantAccess, (req, res) => {
    res.json(rows(
      `SELECT u.id,u.name,u.email,m.role
       FROM memberships m JOIN users u ON u.id=m.user_id
       WHERE m.tenant_id=? ORDER BY
       CASE m.role WHEN 'ORG_ADMIN' THEN 0 WHEN 'TENANT_ADMIN' THEN 1 ELSE 2 END,u.name`,
      [req.tenantId]
    ));
  });

  app.delete("/api/tenants/:tenantId/members/:userId", auth, tenantAccess, roleAccess("ORG_ADMIN", "TENANT_ADMIN"), (req, res) => {
    if (req.params.userId === req.user.id)
      return res.status(400).json({ error: "You cannot remove your own membership" });
    const target = one(
      "SELECT id,role FROM memberships WHERE user_id=? AND tenant_id=?",
      [req.params.userId, req.tenantId]
    );
    if (!target) return res.status(404).json({ error: "Member not found" });
    if (target.role === "ORG_ADMIN")
      return res.status(403).json({ error: "Organization Admin membership cannot be removed here" });
    if (req.membership.role === "TENANT_ADMIN" && target.role !== "MEMBER")
      return res.status(403).json({ error: "Tenant Admin can only remove Members" });
    db.run("DELETE FROM memberships WHERE id=?", [target.id]);
    save();
    res.json({ success: true });
  });


  // Kanban column management
  app.post("/api/tenants/:tenantId/boards/:boardId/columns", auth, tenantAccess, roleAccess("ORG_ADMIN", "TENANT_ADMIN"), (req, res) => {
    const board = one("SELECT id FROM boards WHERE id=? AND tenant_id=?", [req.params.boardId, req.tenantId]);
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    if (!board) return res.status(404).json({ error: "Board not found" });
    if (!name) return res.status(400).json({ error: "Column name is required" });
    const position = one("SELECT COALESCE(MAX(position),-1)+1 AS next FROM columns WHERE board_id=?", [board.id]).next;
    const columnId = id();
    db.run("INSERT INTO columns(id,board_id,name,position) VALUES(?,?,?,?)", [columnId, board.id, name, position]);
    save();
    res.status(201).json(one("SELECT * FROM columns WHERE id=?", [columnId]));
  });

  app.patch("/api/tenants/:tenantId/boards/:boardId/columns/:columnId", auth, tenantAccess, roleAccess("ORG_ADMIN", "TENANT_ADMIN"), (req, res) => {
    const column = one(
      "SELECT c.* FROM columns c JOIN boards b ON b.id=c.board_id WHERE c.id=? AND b.id=? AND b.tenant_id=?",
      [req.params.columnId, req.params.boardId, req.tenantId]
    );
    if (!column) return res.status(404).json({ error: "Column not found" });
    if (typeof req.body.name === "string" && req.body.name.trim()) {
      db.run("UPDATE columns SET name=? WHERE id=?", [req.body.name.trim(), column.id]);
    }
    if (Number.isInteger(req.body.position) && req.body.position >= 0) {
      db.run("UPDATE columns SET position=? WHERE id=?", [req.body.position, column.id]);
    }
    save();
    res.json(one("SELECT * FROM columns WHERE id=?", [column.id]));
  });

  app.delete("/api/tenants/:tenantId/boards/:boardId/columns/:columnId", auth, tenantAccess, roleAccess("ORG_ADMIN", "TENANT_ADMIN"), (req, res) => {
    const column = one(
      "SELECT c.* FROM columns c JOIN boards b ON b.id=c.board_id WHERE c.id=? AND b.id=? AND b.tenant_id=?",
      [req.params.columnId, req.params.boardId, req.tenantId]
    );
    if (!column) return res.status(404).json({ error: "Column not found" });
    const count = one("SELECT COUNT(*) AS total FROM columns WHERE board_id=?", [column.board_id]).total;
    if (count <= 1) return res.status(400).json({ error: "A board must keep at least one column" });
    const taskCount = one("SELECT COUNT(*) AS total FROM tasks WHERE column_id=?", [column.id]).total;
    if (taskCount) return res.status(400).json({ error: "Move or delete this column's tasks before deleting the column" });
    db.run("DELETE FROM columns WHERE id=?", [column.id]);
    save();
    res.json({ success: true });
  });

  app.post("/api/tenants/:tenantId/tasks", auth, tenantAccess, roleAccess("ORG_ADMIN", "TENANT_ADMIN"), (req, res) => {
    const { columnId, title, description = "", priority = "Medium", dueDate = null } = req.body;
    if (!["Low", "Medium", "High", "Urgent"].includes(priority))
      return res.status(400).json({ error: "Invalid task priority" });
    if (dueDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate))
      return res.status(400).json({ error: "Due date must use YYYY-MM-DD format" });
    const column = one(
      "SELECT c.id FROM columns c JOIN boards b ON b.id=c.board_id WHERE c.id=? AND b.tenant_id=?",
      [columnId, req.tenantId]
    );
    if (!column || !title?.trim()) return res.status(400).json({ error: "Valid columnId and title required" });
    const taskId = id();
    db.run("INSERT INTO tasks(id,column_id,title,description,priority,due_date) VALUES(?,?,?,?,?,?)",
      [taskId, columnId, title.trim(), description, priority, dueDate]);
    log(req.user.id, req.tenantId, taskId, "TASK_CREATED", title.trim());
    save();
    io.to(`tenant:${req.tenantId}`).emit("task:created", one("SELECT * FROM tasks WHERE id=?", [taskId]));
    res.status(201).json(one("SELECT * FROM tasks WHERE id=?", [taskId]));
  });

  app.patch("/api/tenants/:tenantId/tasks/:taskId", auth, tenantAccess, (req, res) => {
    const task = one(
      `SELECT t.* FROM tasks t JOIN columns c ON c.id=t.column_id
       JOIN boards b ON b.id=c.board_id WHERE t.id=? AND b.tenant_id=?`,
      [req.params.taskId, req.tenantId]
    );
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (!Number.isInteger(req.body.version) || req.body.version < 1)
      return res.status(400).json({ error: "A valid task version is required" });
    if (req.body.version !== task.version)
      return res.status(409).json({ error: "Version conflict", current: task });
    const title = req.body.title ?? task.title;
    const description = req.body.description ?? task.description;
    const columnId = req.body.columnId ?? task.column_id;
    const priority = req.body.priority ?? task.priority ?? "Medium";
    const dueDate = req.body.dueDate === undefined ? task.due_date : req.body.dueDate;
    if (!["Low", "Medium", "High", "Urgent"].includes(priority))
      return res.status(400).json({ error: "Priority must be Low, Medium, High or Urgent" });
    if (dueDate !== null && dueDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate))
      return res.status(400).json({ error: "Due date must use YYYY-MM-DD format" });
    const validColumn = one(
      "SELECT c.id FROM columns c JOIN boards b ON b.id=c.board_id WHERE c.id=? AND b.tenant_id=?",
      [columnId, req.tenantId]
    );
    if (!validColumn) return res.status(400).json({ error: "Invalid destination column" });
    db.run("UPDATE tasks SET title=?,description=?,column_id=?,priority=?,due_date=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=?",
      [title, description, columnId, priority, dueDate, task.id, req.body.version]);
    if (db.getRowsModified() !== 1) {
      const current = one("SELECT * FROM tasks WHERE id=?", [task.id]);
      return res.status(409).json({ error: "Version conflict", current });
    }
    log(req.user.id, req.tenantId, task.id, "TASK_UPDATED", title);
    save();
    const updated = one("SELECT * FROM tasks WHERE id=?", [task.id]);
    io.to(`tenant:${req.tenantId}`).emit("task:updated", updated);
    res.json(updated);
  });

  app.delete("/api/tenants/:tenantId/tasks/:taskId", auth, tenantAccess, roleAccess("ORG_ADMIN", "TENANT_ADMIN"), (req, res) => {
    const task = one(
      `SELECT t.* FROM tasks t JOIN columns c ON c.id=t.column_id
       JOIN boards b ON b.id=c.board_id WHERE t.id=? AND b.tenant_id=?`,
      [req.params.taskId, req.tenantId]
    );
    if (!task) return res.status(404).json({ error: "Task not found" });
    log(req.user.id, req.tenantId, task.id, "TASK_DELETED", task.title);
    db.run("DELETE FROM tasks WHERE id=?", [task.id]);
    save();
    io.to(`tenant:${req.tenantId}`).emit("task:deleted", { id: task.id });
    res.json({ success: true });
  });

  app.get("/api/tenants/:tenantId/activity", auth, tenantAccess, (req, res) => {
    res.json(rows(
      `SELECT a.*,u.name AS userName FROM activity_logs a
       JOIN users u ON u.id=a.user_id WHERE a.tenant_id=?
       ORDER BY a.created_at DESC LIMIT 100`,
      [req.tenantId]
    ));
  });

  io.use((socket, next) => {
    try {
      socket.user = jwt.verify(socket.handshake.auth?.token, secret);
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });
  io.on("connection", socket => {
    socket.on("tenant:join", tenantId => {
      if (typeof tenantId !== "string") return;
      const directMembership = one(
        "SELECT id FROM memberships WHERE user_id=? AND tenant_id=?",
        [socket.user.id, tenantId]
      );
      const tenant = one("SELECT organization_id FROM tenants WHERE id=?", [tenantId]);
      const orgAdmin = tenant && one(
        "SELECT id FROM memberships WHERE user_id=? AND organization_id=? AND role='ORG_ADMIN'",
        [socket.user.id, tenant.organization_id]
      );

      if (directMembership || orgAdmin) {
        socket.join(`tenant:${tenantId}`);
        socket.emit("tenant:joined", { tenantId });
      }
    });
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  const PORT = Number(process.env.PORT) || 5000;
  server.listen(PORT, "0.0.0.0", () =>
    console.log(`Collaborative Kanban API + Socket.IO ready on port ${PORT}`)
  );
}

start().catch(error => {
  console.error("Startup failed:", error);
  process.exit(1);
});
