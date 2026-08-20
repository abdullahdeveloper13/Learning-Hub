// Detailed lecture note content for every seeded lesson.
// Keyed by course slug -> module index -> lesson index.

export const notesContent = {
  "complete-web-development-bootcamp": [
    {
      title: "Semantic page structure",
      overview:
        "Semantic HTML gives every part of a web page a meaningful role instead of a generic <div>. Search engines, screen readers, and other developers all benefit when the structure of a document matches its actual content.",
      concepts: [
        "Semantic tags such as <header>, <nav>, <main>, <article>, <section>, <aside>, and <footer> describe the purpose of each region of the page.",
        "A document should have exactly one <main> element containing the primary content of the page.",
        "<article> is for self-contained content that could be republished on its own; <section> groups related content under a common theme.",
        "Use heading levels <h1> through <h6> as an outline, with a single <h1> per page and no skipped levels.",
        "Landmark regions let assistive technology jump directly to navigation, search, main content, or complementary information.",
        "Semantic HTML is the foundation of accessibility and SEO: the DOM carries meaning that CSS classes alone cannot express.",
      ],
      example:
        '<header>\n  <h1>My Course</h1>\n  <nav aria-label="Main"><a href="/">Home</a></nav>\n</header>\n<main>\n  <article>\n    <h2>Lesson one</h2>\n    <p>Meaningful structure beats div soup.</p>\n  </article>\n</main>\n<footer>Copyright 2026</footer>',
      summary:
        "Semantic elements communicate the structure and meaning of your page to browsers, search engines, and screen readers. Build the outline with headings, use landmarks for navigation and content, and reserve <div> for styling-only containers.",
      practice: [
        "Convert a page built with nested <div> elements into semantic landmarks.",
        "Add a single <h1> and a logical heading outline to a sample page.",
        "Run a Lighthouse accessibility audit and confirm landmark structure is recognized.",
      ],
    },
    {
      title: "Responsive layouts with Flexbox and Grid",
      overview:
        "Flexbox and Grid are the two modern CSS layout engines. Flexbox lays out content along a single axis, while Grid gives you two-dimensional control over rows and columns. Knowing when to use each is the key to responsive design.",
      concepts: [
        "Flexbox arranges items along a main axis (row or column) and handles alignment and distribution with justify-content and align-items.",
        "Grid defines explicit rows and columns with grid-template-columns and grid-template-rows, then places items into cells.",
        "Use flex when the layout is a simple row or column; use grid when you need a full two-dimensional layout.",
        "Responsive breakpoints (@media) let layouts reflow at different viewport widths instead of squeezing.",
        "Modern techniques such as minmax(), auto-fit, and fr units remove the need for many breakpoints.",
        "Common patterns: sticky headers (flex), card grids (grid), and content-plus-sidebar layouts (grid areas).",
      ],
      example:
        ".cards {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));\n  gap: 16px;\n}\n.navbar {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}",
      summary:
        "Flexbox excels at one-dimensional alignment while Grid handles complex two-dimensional layouts. Combined with auto-fit/minmax, you can build layouts that adapt fluidly to any screen size.",
      practice: [
        "Rebuild a simple navbar with Flexbox and center items on both axes.",
        "Create a responsive card grid that goes from one column on mobile to three on desktop.",
        "Use grid areas to arrange a header, sidebar, main, and footer without extra markup.",
      ],
    },
    {
      title: "Accessible forms and navigation",
      overview:
        "Forms and navigation are the interactive heart of most websites. Accessibility here means every label is programmatically connected to its control, keyboard users can operate everything, and focus is always visible.",
      concepts: [
        "Every input needs a <label> connected via for/id, or wrapped inside the label element.",
        "Use fieldset/legend to group related controls such as radio buttons or checkboxes.",
        "Convey errors with both color and text, and use aria-describedby to link error messages to the field.",
        "Navigation links must be reachable by keyboard and show a clear visible focus state.",
        "Use <button> for actions and <a> for navigation; never fake a button with a div.",
        "Respect native HTML behavior before adding JavaScript: required, min/max, type, and autocomplete improve usability for free.",
      ],
      example:
        '<form>\n  <label for="email">Email address</label>\n  <input id="email" type="email" required\n         autocomplete="email"\n         aria-describedby="email-error" />\n  <p id="email-error" role="alert">Enter a valid email.</p>\n</form>',
      summary:
        "Accessible forms connect labels to inputs, group related fields, and explain errors clearly. Accessible navigation stays keyboard-operable with visible focus and uses the correct semantic elements.",
      practice: [
        "Write a form where every field has a programmatically connected label.",
        "Group a set of radio options with fieldset/legend and test it with a screen reader.",
        "Tab through a page using only the keyboard and verify the focus ring is always visible.",
      ],
    },
    {
      title: "Variables, functions, and control flow",
      overview:
        "JavaScript programs are built from variables that store data, functions that package behavior, and control flow statements that decide what runs. This lesson covers the fundamentals you will use in every program.",
      concepts: [
        "let and const are the modern variable declarations; const is the default unless you need to reassign.",
        "Functions capture behavior and can take parameters and return values; arrow functions provide a concise syntax.",
        "Comparison operators and logical operators (&&, ||, !) drive conditional logic.",
        "if/else, switch, and the ternary operator choose between code paths.",
        "Loops (for, while, for...of) repeat work; map/filter/reduce replace most hand-written loops.",
        "Scope determines where a variable is visible; prefer function and block scope over globals.",
      ],
      example:
        "const prices = [12, 45, 8];\nconst total = prices\n  .filter(p => p > 10)\n  .reduce((sum, p) => sum + p, 0);\n\nfunction classify(score) {\n  if (score >= 90) return 'A';\n  if (score >= 80) return 'B';\n  return 'C';\n}",
      summary:
        "Variables hold state, functions package reusable behavior, and control flow directs execution. Mastering these fundamentals and the array methods built on them makes everything else in JavaScript easier.",
      practice: [
        "Rewrite a for loop using map and filter to transform an array.",
        "Write a function that validates a score and returns a grade using early returns.",
        "Explain the difference between let, const, and var and when each is appropriate.",
      ],
    },
    {
      title: "DOM events and browser APIs",
      overview:
        "The Document Object Model is how JavaScript sees and changes the page. Events let you respond to user interaction, and browser APIs give you access to the platform: the network, storage, geolocation, and more.",
      concepts: [
        "querySelector and createElement are the core tools for reading and building the DOM.",
        "addEventListener attaches behavior to clicks, submits, key presses, and dozens of other events.",
        "Event bubbling and delegation let you handle many elements with a single listener on a parent.",
        "The DOMContentLoaded and load events control when your scripts safely run.",
        "Browser APIs like fetch, localStorage, and navigator expose platform capabilities through JavaScript.",
        "Avoid inline onclick attributes; keep behavior in separate, testable modules.",
      ],
      example:
        "const list = document.querySelector('#todos');\nlist.addEventListener('click', (e) => {\n  if (e.target.matches('button.delete')) {\n    e.target.closest('li').remove();\n  }\n});",
      summary:
        "The DOM is your live view of the page; events connect user actions to your code. Delegation, proper event listeners, and the modern browser APIs turn static HTML into an interactive application.",
      practice: [
        "Build a todo list that adds and removes items without reloading the page.",
        "Use event delegation to handle clicks on dynamically added buttons.",
        "Persist the todo list across reloads using localStorage.",
      ],
    },
    {
      title: "Async JavaScript and fetch",
      overview:
        "JavaScript is single-threaded, so slow work must not block the page. Promises and async/await let you handle network requests, timers, and file I/O without freezing the interface.",
      concepts: [
        "A Promise represents a value that may not be ready yet; .then/.catch chain reactions to it.",
        "async/await is syntactic sugar over promises that reads like synchronous code.",
        "fetch(url) returns a promise for a Response; call .json() or .text() to read the body.",
        "Always handle errors: failed requests reject, so wrap await in try/catch.",
        "The event loop, microtasks, and macrotasks determine when callbacks actually run.",
        "AbortController lets you cancel an in-flight request, useful for search-as-you-type.",
      ],
      example:
        "async function loadCourses() {\n  try {\n    const res = await fetch('/api/courses');\n    if (!res.ok) throw new Error(res.status);\n    return await res.json();\n  } catch (err) {\n    console.error('Failed to load', err);\n    return [];\n  }\n}",
      summary:
        "Asynchronous JavaScript keeps the UI responsive while the network and other slow operations run. fetch with async/await and proper error handling is the modern way to talk to APIs.",
      practice: [
        "Fetch a list of items from an API and render them into the DOM.",
        "Add a loading state and an error state to the same request.",
        "Use Promise.all to load two independent resources concurrently.",
      ],
    },
    {
      title: "Components, props, and state",
      overview:
        "React applications are trees of components. Props flow data down from parents, state holds data that changes over time, and together they make the UI a pure function of your data.",
      concepts: [
        "A component is a function that returns JSX describing the UI.",
        "Props are read-only inputs passed from a parent; a component must not modify its own props.",
        "State is data owned by a component that can change; updating it re-renders the component.",
        "The useState hook returns the current value and an updater; updaters are async and batched.",
        "Lift state up to the closest common ancestor when several components share it.",
        "Derived values belong in regular variables, not state; avoid duplicating the same data in multiple places.",
      ],
      example:
        "function Counter() {\n  const [count, setCount] = useState(0);\n  return (\n    <button onClick={() => setCount(c => c + 1)}>\n      Count: {count}\n    </button>\n  );\n}",
      summary:
        "Components, props, and state form React's mental model. Props pass data down, state owns mutable data, and re-renders keep the screen in sync with your data model.",
      practice: [
        "Split a page into components and pass data between them via props.",
        "Convert a mutable value to state and observe how the UI updates.",
        "Lift shared state to a common parent so two sibling components stay in sync.",
      ],
    },
    {
      title: "Forms, validation, and effects",
      overview:
        "Forms are how users give your app data. Controlled inputs put React in charge of form state, validation catches bad input early, and effects let components synchronize with the outside world.",
      concepts: [
        "A controlled input derives its value from state and updates that state on change.",
        "Validation can run as the user types, on blur, or on submit; show errors near the field.",
        "useEffect runs side effects (fetching, subscriptions, timers) after render.",
        "The dependency array controls when an effect re-runs; empty means mount-only, omitted means every render.",
        "Always clean up effects that create subscriptions or timers to avoid leaks.",
        "Use useCallback/useMemo sparingly to keep referential stability where it matters.",
      ],
      example:
        "useEffect(() => {\n  const timer = setInterval(() => setNow(new Date()), 1000);\n  return () => clearInterval(timer); // cleanup\n}, []);",
      summary:
        "Controlled forms keep validation close to the input, and effects handle the external world without touching render. Cleanup functions prevent stale timers and subscriptions.",
      practice: [
        "Build a controlled form with live validation and inline error messages.",
        "Fetch data on mount using useEffect and handle the loading state.",
        "Write an effect with a cleanup function and confirm no warnings in the console.",
      ],
    },
    {
      title: "Reusable UI patterns",
      overview:
        "Great React code is composed of small, focused components that can be reused everywhere. Consistency, clear props, and composition over inheritance keep the codebase maintainable.",
      concepts: [
        "Compose primitives into larger components instead of copying and pasting markup.",
        "Design component APIs around clear props and sensible defaults.",
        "Use children prop and slots to let parents inject content.",
        "Keep components presentational when possible; lift logic into hooks or containers.",
        "Name components for what they render and keep files small.",
        "Extract repeated logic into custom hooks (useLocalStorage, useDebounce, useFetch).",
      ],
      example:
        "function Card({ title, children, actions }) {\n  return (\n    <div className=\"card\">\n      <h3>{title}</h3>\n      <div>{children}</div>\n      {actions}\n    </div>\n  );\n}",
      summary:
        "Reusable UI patterns come from composition, clear props, and extracted hooks. Small focused components with flexible children render consistently and are easy to maintain.",
      practice: [
        "Refactor three similar blocks in your app into one reusable component.",
        "Extract a useDebounce hook and use it in a search input.",
        "Review a component's props and give them sensible defaults.",
      ],
    },
    {
      title: "Routing and server rendering",
      overview:
        "Next.js routes are files. The App Router introduces layouts, nested routes, and server components so that most of your page can render on the server and ship as HTML.",
      concepts: [
        "Files in the app/ directory become routes; folder names become URL segments.",
        "layout.tsx wraps child routes and persists across navigation, keeping shared UI efficient.",
        "page.tsx renders the specific route; loading.tsx and error.tsx add states per route.",
        "Dynamic routes use [param] folders, read via the params prop.",
        "Server Components render on the server by default: they can read databases directly and send less JavaScript.",
        "Client Components add 'use client' for interactivity such as onClick and useState.",
      ],
      example:
        "app/\n  layout.tsx        # shared shell\n  dashboard/\n    layout.tsx      # dashboard shell\n    page.tsx        # /dashboard\n    [id]/page.tsx   # /dashboard/:id",
      summary:
        "File-based routing makes every page predictable. The App Router composes layouts and pages, and Server Components shift rendering to the server so clients download less code.",
      practice: [
        "Create a route with a nested layout and two pages.",
        "Add a dynamic [id] route and read the params prop.",
        "Move one data-fetching component to a Server Component and confirm it renders server-side.",
      ],
    },
    {
      title: "API handlers and mutations",
      overview:
        "Next.js route handlers let you define API endpoints inside your app. Mutations update the database in response to user actions, and revalidation keeps the UI fresh.",
      concepts: [
        "Route handlers are files named route.ts that export GET, POST, PUT, DELETE functions.",
        "They receive a Request and return a Response or NextResponse.json.",
        "Validate input with a schema library before touching the database.",
        "Mutations in Server Actions or API routes run server-side where secrets stay safe.",
        "revalidatePath/revalidateTag invalidate cached data so the UI reflects the mutation.",
        "Follow REST conventions and return meaningful status codes and error shapes.",
      ],
      example:
        "export async function POST(req: Request) {\n  const body = await req.json();\n  const parsed = schema.safeParse(body);\n  if (!parsed.success) {\n    return NextResponse.json({ error: parsed.error }, { status: 400 });\n  }\n  const lesson = await db.insert(lessons).values(parsed.data).returning();\n  revalidatePath('/lessons');\n  return NextResponse.json(lesson[0], { status: 201 });\n}",
      summary:
        "Route handlers give you real API endpoints in your Next.js app. Validating input, writing mutations server-side, and revalidating caches keeps data correct and pages current.",
      practice: [
        "Create a route handler that creates a resource with validation.",
        "Wire a form submission to the handler and update the UI after success.",
        "Add revalidation so list pages reflect newly created data.",
      ],
    },
    {
      title: "Data fetching patterns",
      overview:
        "Where and how you fetch data changes your app's performance and correctness. Server Components fetch during render, while caching and streaming keep results fast and interactive.",
      concepts: [
        "Fetch in Server Components to read databases and APIs during server render.",
        "Use fetch with cache options or a data library like TanStack Query for client data.",
        "Parallel requests with Promise.all reduce total latency; avoid waterfall fetches.",
        "Streaming with loading.tsx shows UI immediately while slower parts finish.",
        "Cache data that rarely changes; revalidate periodically or on mutation.",
        "Handle empty, loading, and error states explicitly in the UI.",
      ],
      example:
        "// Server Component - no client fetch needed\nasync function Dashboard() {\n  const [courses, stats] = await Promise.all([\n    db.query.courses.findMany(),\n    db.query.enrollments.count(),\n  ]);\n  return <DashboardView courses={courses} stats={stats} />;\n}",
      summary:
        "Data fetching belongs as close to the server as possible. Server Components, parallel requests, caching, and streaming give fast pages with explicit loading and error states.",
      practice: [
        "Fetch two resources in parallel with Promise.all in a Server Component.",
        "Add a loading.tsx file and observe the streaming behavior.",
        "Set a cache/revalidation policy on a slow endpoint.",
      ],
    },
    {
      title: "Relational data modeling",
      overview:
        "Relational databases organize data into tables with relationships. Good modeling prevents duplicates, keeps data consistent, and makes queries simple and fast.",
      concepts: [
        "Tables have a primary key (usually an auto-incrementing id) that uniquely identifies rows.",
        "Foreign keys reference rows in other tables and enforce referential integrity.",
        "One-to-many: one course has many lessons; store the foreign key on the many side.",
        "Many-to-many needs a join table (e.g., students_courses) with two foreign keys.",
        "Normalize to remove redundancy, but denormalize selectively for performance.",
        "Index columns you filter or join on; indexes speed reads at the cost of slower writes.",
      ],
      example:
        "CREATE TABLE courses (\n  id SERIAL PRIMARY KEY,\n  title TEXT NOT NULL,\n  price NUMERIC(8,2)\n);\nCREATE TABLE lessons (\n  id SERIAL PRIMARY KEY,\n  course_id INTEGER REFERENCES courses(id),\n  title TEXT NOT NULL,\n  position INTEGER\n);",
      summary:
        "Relational modeling centers on primary keys, foreign keys, and well-defined relationships. A normalized schema with the right indexes keeps data consistent and queries fast.",
      practice: [
        "Model a course with modules, lessons, and students including a join table.",
        "Draw the relationships and identify which side holds each foreign key.",
        "Add an index to a column you filter on and explain the trade-off.",
      ],
    },
    {
      title: "User registration and sessions",
      overview:
        "Authentication proves who a user is. Registration stores a credential securely, and sessions carry that identity across requests without asking for the password again.",
      concepts: [
        "Never store plaintext passwords; hash them with bcrypt or argon2 and add a salt.",
        "Sessions come in two styles: opaque tokens stored server-side, or signed stateless tokens (JWT).",
        "Store the hashed session token or JWT in an httpOnly, secure cookie.",
        "Set sensible cookie flags: HttpOnly, Secure, SameSite, and an expiry.",
        "Provide account recovery and a logout path that invalidates the session.",
        "Rate-limit login and registration to slow down brute force and abuse.",
      ],
      example:
        "const hash = await bcrypt.hash(password, 12);\n// store hash, not password\nconst token = jwt.sign({ sub: user.id }, SECRET, { expiresIn: '7d' });\nres.cookie('session', token, { httpOnly: true, secure: true, sameSite: 'lax' });",
      summary:
        "Secure registration hashes passwords with salt. Sessions carry identity via httpOnly cookies or signed tokens, and careful cookie flags plus rate limiting protect the whole flow.",
      practice: [
        "Implement registration with hashed passwords and a login endpoint.",
        "Issue an httpOnly session cookie on login and verify it on a protected route.",
        "Add rate limiting to the auth endpoints.",
      ],
    },
    {
      title: "Authorization and RBAC",
      overview:
        "Authorization decides what an authenticated user may do. Role-based access control (RBAC) groups permissions into roles so you can grant and revoke access simply.",
      concepts: [
        "Authentication proves identity; authorization grants capability.",
        "RBAC models roles (student, instructor, admin) and assigns permissions to roles.",
        "Middleware or route guards check authorization before running the handler.",
        "Enforce checks on the server, never trust client-side flags.",
        "Check ownership (is this the resource owner?) in addition to roles.",
        "Fail closed: deny by default and allow explicitly.",
      ],
      example:
        "if (req.user.role !== 'admin' && req.user.id !== course.instructorId) {\n  return res.status(403).json({ error: 'Forbidden' });\n}\n// only owners and admins may edit this course",
      summary:
        "Authorization with RBAC keeps roles and permissions explicit. Enforce checks server-side, verify ownership, and fail closed to keep protected resources safe.",
      practice: [
        "Add a student and instructor role with different allowed endpoints.",
        "Protect a route so only the resource owner can edit it.",
        "Write a test that confirms a forbidden request returns 403.",
      ],
    },
    {
      title: "Environment variables and secrets",
      overview:
        "Configuration differs between environments, and secrets must never reach the client or the repository. Environment variables separate config from code.",
      concepts: [
        ".env files hold local config and are excluded from git (gitignore).",
        "Prefix VITE_ to expose a variable to a Vite client build; everything else stays server-only.",
        "Secrets like API keys and database URLs belong in the deployment platform's settings, not in code.",
        "Validate that required variables exist at startup and fail fast with a clear message.",
        "Never log secrets; redact them in request logs.",
        "Use a single source of truth for config to avoid drift between environments.",
      ],
      example:
        "// .env (never committed)\nDATABASE_URL=postgres://...\nJWT_SECRET=change-me-now\n\n// server only\nconst secret = process.env.JWT_SECRET;\n// never accessible in the browser bundle",
      summary:
        "Environment variables keep secrets out of code and out of the client. Validate required variables at boot, keep client-facing vars explicitly prefixed, and never log secrets.",
      practice: [
        "Move hard-coded credentials in your app into environment variables.",
        "Verify no secrets appear in the built client bundle.",
        "Add startup validation for all required variables.",
      ],
    },
    {
      title: "Build optimization",
      overview:
        "A fast build produces a fast site. Splitting code, compressing assets, and trimming dependencies shrink what users download and how long the build takes.",
      concepts: [
        "Code-split large routes with dynamic import() so users only load what they need.",
        "Bundle analyzers (vite-bundle-visualizer) reveal the largest dependencies.",
        "Compress images and serve them in modern formats (webp/avif) at the right sizes.",
        "Tree-shaking removes unused exports when imports are kept pure.",
        "Cache assets with content hashes so browsers reuse unchanged files.",
        "Preload critical assets and defer non-critical scripts.",
      ],
      example:
        "// dynamic import for a heavy route\nconst Reports = lazy(() => import('./Reports'));\n\n// or in Next.js\nconst Reports = dynamic(() => import('./Reports'), {\n  loading: () => <Spinner />,\n});",
      summary:
        "Build optimization is about shipping less and caching well. Code-splitting, image compression, tree-shaking, and hashed assets make pages load faster on slow connections.",
      practice: [
        "Split your heaviest route with a dynamic import and measure the chunk sizes.",
        "Run a bundle analyzer and replace or remove the largest unnecessary dependency.",
        "Compress hero images and verify format and dimensions in the network tab.",
      ],
    },
    {
      title: "Production monitoring checklist",
      overview:
        "Once deployed, you need visibility. Logging, structured errors, health checks, and alerting tell you what broke before users complain.",
      concepts: [
        "Log structured data (JSON) with request IDs so you can correlate an error to a request.",
        "Centralize logs and errors; store them where they are searchable.",
        "Health checks (/healthz) let load balancers and uptime monitors confirm the app is alive.",
        "Track the core metrics: errors, latency, throughput, and saturation.",
        "Alert on symptoms users feel (high error rate, p95 latency) rather than raw counts.",
        "Capture unhandled promise rejections and process crashes explicitly.",
      ],
      example:
        "app.use((err, req, res, next) => {\n  req.log.error({ err, route: req.originalUrl }, 'Unhandled error');\n  const status = err.status || 500;\n  res.status(status).json({\n    error: status >= 500 ? 'Internal server error' : err.message,\n  });\n});",
      summary:
        "Monitoring turns outages into debugging sessions. Structured logs with request IDs, health checks, and symptom-based alerting keep a production app observable.",
      practice: [
        "Add a request ID to your logs and trace one failing request.",
        "Create a /healthz endpoint and confirm a 200 JSON response.",
        "Set up an alert on the error rate rather than individual exceptions.",
      ],
    },
  ],
  "python-programming-beginner-to-advanced": [
    {
      title: "Installing Python and running scripts",
      overview:
        "Python is an interpreted language: the python interpreter reads and runs your source files. This lesson covers installation, running your first program, and the tooling you will use every day.",
      concepts: [
        "Install Python 3 from python.org or your package manager; check with python --version.",
        "Scripts are plain text files with a .py extension; run them with python hello.py.",
        "The interactive REPL is perfect for quick experiments: type python and code directly.",
        "The print() function sends output to the terminal.",
        "Virtual environments isolate project dependencies with python -m venv .venv.",
        "A package manager (pip) installs third-party libraries; requirements.txt records them.",
      ],
      example:
        "# hello.py\nname = input(\"What is your name? \")\nprint(f\"Hello, {name}!\")\n\n# run it\n$ python hello.py\nWhat is your name? Ada\nHello, Ada!",
      summary:
        "Python turns plain-text scripts into programs through its interpreter. A virtual environment and pip keep each project's dependencies isolated and reproducible.",
      practice: [
        "Install Python and confirm the version from a terminal.",
        "Write a script that asks for your name and greets you.",
        "Create a virtual environment and install a library into it.",
      ],
    },
    {
      title: "Variables, types, and expressions",
      overview:
        "Variables name values in your program. Python is dynamically typed, so any name can hold any type, but knowing the core types keeps your data predictable.",
      concepts: [
        "Assign values with = ; names are case-sensitive and conventionally use snake_case.",
        "Core types: int, float, str, bool, list, dict, tuple, set, and None.",
        "type() reveals the type of any value; use isinstance() for checks.",
        "Strings support indexing, slicing, f-strings, and dozens of methods.",
        "Expressions combine values with operators; order follows standard precedence.",
        "Immutability matters: strings and tuples are immutable, lists and dicts are mutable.",
      ],
      example:
        "price = 19.99\ncount = 3\nlabel = f\"Total: {price * count:.2f}\"\nprint(label)  # Total: 59.97\n\nitems = [\"a\", \"b\", \"c\"]\nprint(items[1:])  # ['b', 'c']",
      summary:
        "Variables name values; types describe what a value can do. Strings, numbers, and containers cover most data, and f-strings make formatting readable.",
      practice: [
        "Write expressions that combine strings and numbers and format the output.",
        "Slice a list and a string and predict the results.",
        "Use type() to inspect the types of a few values you create.",
      ],
    },
    {
      title: "Control flow and loops",
      overview:
        "Control flow lets programs make decisions and repeat work. if/elif/else branches and for/while loops are the basic grammar of every Python program.",
      concepts: [
        "if, elif, and else evaluate conditions in order and run the first true branch.",
        "Boolean operators and, or, not combine conditions; in tests membership.",
        "for loops iterate over any iterable: lists, strings, dicts, ranges.",
        "range(n) produces the numbers 0..n-1; enumerate() adds indexes.",
        "while loops repeat until a condition is false; guard against infinite loops.",
        "break exits a loop early; continue skips to the next iteration.",
      ],
      example:
        "for i, fruit in enumerate([\"apple\", \"banana\", \"cherry\"]):\n    if i == 1:\n        continue\n    print(i, fruit)\n\nscores = [85, 92, 47]\ngrade = \"Pass\" if all(s >= 50 for s in scores) else \"Fail\"",
      summary:
        "Conditionals route execution and loops repeat it. Combined with range, enumerate, and break/continue, they express nearly any iteration logic.",
      practice: [
        "Print the first 10 even numbers with a for loop.",
        "Rewrite a while loop as a for loop and compare readability.",
        "Write a function that returns the max value without using max().",
      ],
    },
    {
      title: "Functions and scope",
      overview:
        "Functions package logic under a name with parameters and return values. Scope rules decide which names are visible where, keeping your code organized and predictable.",
      concepts: [
        "def defines a function; parameters receive arguments; return sends a result back.",
        "Default arguments, keyword arguments, and *args/**kwargs give flexible call sites.",
        "Every function returns something; a missing return yields None.",
        "Local variables are created inside the function and vanish when it ends.",
        "Global scope is readable but mutable only via the global keyword; prefer passing data in.",
        "Type hints (def add(a: int, b: int) -> int) document intent and enable tooling.",
      ],
      example:
        "def area(width: float, height: float) -> float:\n    return width * height\n\ndef describe(width, height, unit=\"m\"):\n    print(f\"{width} x {height} {unit}\")\n\ndescribe(width=2, height=3)  # 2 x 3 m",
      summary:
        "Functions make code reusable and testable. Clear signatures, sensible defaults, and understanding of scope keep behavior predictable.",
      practice: [
        "Write a function with a default argument and call it with keyword arguments.",
        "Add type hints to a function and verify them with a type checker.",
        "Explain what a function returns when it has no return statement.",
      ],
    },
    {
      title: "Lists, dictionaries, sets, and tuples",
      overview:
        "Collections hold many values. Choosing the right container is a design decision: lists are ordered, dicts map keys to values, sets store unique items, and tuples are fixed.",
      concepts: [
        "Lists are ordered and mutable: append, extend, insert, remove, sort, and slicing.",
        "Dicts map hashable keys to values; d[k] or d.get(k, default) read them safely.",
        "Sets store unique, unordered items; & | - perform set algebra.",
        "Tuples are immutable sequences often used for fixed records and function returns.",
        "Choose the container by the operation: lookup -> dict, uniqueness -> set, order -> list.",
        "Comprehensions build new collections concisely from existing iterables.",
      ],
      example:
        "grades = [88, 92, 79]\nsummary = {\n    \"max\": max(grades),\n    \"passed\": all(g >= 50 for g in grades),\n}\nunique_tags = {\"python\", \"web\", \"python\", \"api\"}\nprint(unique_tags)  # {'web', 'python', 'api'}",
      summary:
        "Lists, dicts, sets, and tuples each model a different shape of data. Matching the container to the problem makes code shorter, safer, and faster.",
      practice: [
        "Remove duplicates from a list using a set.",
        "Build a dict that counts the frequency of each letter in a word.",
        "Use a tuple to return multiple values from a function.",
      ],
    },
    {
      title: "Comprehensions and iteration",
      overview:
        "Comprehensions construct lists, dicts, and sets from iterables in a single readable expression. The iterator protocol powers loops, generator expressions, and lazy processing.",
      concepts: [
        "A list comprehension is [expr for item in iterable if condition].",
        "Dict comprehensions build key/value pairs: {k: v for ...}.",
        "Set comprehensions deduplicate automatically.",
        "Generator expressions use parentheses and yield items lazily, saving memory.",
        "The built-in functions zip, map, filter, sorted, and enumerate compose with iteration.",
        "Iterators are single-use; lists are reusable; generators produce values on demand.",
      ],
      example:
        "nums = range(1, 11)\nsquares = [n * n for n in nums if n % 2 == 0]\nprint(squares)  # [4, 16, 36, 64, 100]\n\npairs = {k: v for k, v in zip(\"abc\", [1, 2, 3])}\n# {'a': 1, 'b': 2, 'c': 3}",
      summary:
        "Comprehensions express transforms in one readable line, and generators process large data lazily. Together they replace most loops with clear, efficient expressions.",
      practice: [
        "Rewrite a for-loop that builds a list as a comprehension.",
        "Build a dict of counts using a dict comprehension.",
        "Use a generator expression inside sum() to add even squares lazily.",
      ],
    },
    {
      title: "Classes and objects",
      overview:
        "Object-oriented programming groups data and the functions that operate on it into classes. Instances of a class carry their own state and behavior.",
      concepts: [
        "class defines a blueprint; __init__ sets up each new instance.",
        "Methods are functions defined on the class and receive self as the instance.",
        "Instance attributes live on self; class attributes are shared by all instances.",
        "Property descriptors let you compute attributes and add validation.",
        "__str__ and __repr__ control how objects print and display.",
        "Encapsulation hides internal details behind a public interface.",
      ],
      example:
        "class BankAccount:\n    def __init__(self, owner, balance=0):\n        self.owner = owner\n        self._balance = balance\n\n    def deposit(self, amount):\n        self._balance += amount\n        return self._balance\n\n    def __str__(self):\n        return f\"{self.owner}: ${self._balance}\"",
      summary:
        "Classes bundle state and behavior into reusable objects. __init__ sets up instances, methods operate on them, and dunder methods integrate with Python's syntax.",
      practice: [
        "Define a class with __init__, two methods, and a __str__.",
        "Create several instances and verify they keep independent state.",
        "Add a property with validation to one of the attributes.",
      ],
    },
    {
      title: "Composition and inheritance",
      overview:
        "Inheritance shares behavior across similar classes; composition builds complex objects from simpler ones. Prefer composition, use inheritance for clear is-a relationships.",
      concepts: [
        "class Child(Parent) inherits methods and attributes from the parent.",
        "super().__init__() lets subclasses initialize the parent part of themselves.",
        "Override methods to specialize behavior while keeping the interface.",
        "Composition means an object holds other objects: a Course has many Lesson objects.",
        "Composition is more flexible and avoids deep inheritance chains.",
        "Mixins package small reusable behaviors that can be combined.",
      ],
      example:
        "class BaseUser:\n    def __init__(self, name):\n        self.name = name\n    def permissions(self):\n        return []\n\nclass Student(BaseUser):\n    def permissions(self):\n        return [\"view_course\", \"submit_assignment\"]\n\nclass Course:\n    def __init__(self, title):\n        self.title = title\n        self.lessons = []  # composition",
      summary:
        "Inheritance specializes behavior for is-a relationships; composition assembles behavior for has-a relationships. Favoring composition keeps hierarchies shallow and flexible.",
      practice: [
        "Create a Student and Instructor that inherit from a BaseUser and override permissions().",
        "Model a Course that composes multiple Lesson objects.",
        "Refactor a deep inheritance chain into composition.",
      ],
    },
    {
      title: "Error handling patterns",
      overview:
        "Errors are part of running code. Python's exceptions let you anticipate failure, respond to it, and clean up resources, instead of letting the program crash.",
      concepts: [
        "try/except catches exceptions; except Exception as e names the error.",
        "Match the exception type: ValueError for bad values, KeyError for missing keys, etc.",
        "else runs only when no exception occurred; finally always runs for cleanup.",
        "Raise your own errors with raise ValueError(\"message\") and custom exception classes.",
        "Don't catch and silence errors; log, translate, or re-raise.",
        "EAFP (ask for forgiveness) vs LBYL (look before you leap) are the two styles.",
      ],
      example:
        "def divide(a, b):\n    if b == 0:\n        raise ValueError(\"Cannot divide by zero\")\n    return a / b\n\ntry:\n    result = divide(10, 0)\nexcept ValueError as err:\n    print(\"Invalid input:\", err)\nfinally:\n    print(\"Done\")",
      summary:
        "Exceptions communicate failure and let you handle it gracefully. Precise except clauses, finally for cleanup, and raising clear errors keep programs predictable.",
      practice: [
        "Wrap a fragile operation in try/except and print a friendly message.",
        "Raise a custom exception and catch it by type.",
        "Use finally to close a file or connection on success and failure.",
      ],
    },
    {
      title: "Reading and writing files",
      overview:
        "Files persist data between runs. Python's open() plus the with statement makes reading and writing text and structured data safe and simple.",
      concepts: [
        "open(path, mode) supports r (read), w (write), a (append), and b (binary) modes.",
        "with open(...) as f guarantees the file closes even on error.",
        "f.read(), f.readline(), and iterating over f handle different sizes of data.",
        "Write with f.write() or print(..., file=f); use writelines() for lists.",
        "json.dump/json.load convert Python data to and from JSON.",
        "Paths come from the pathlib module for robust, cross-platform handling.",
      ],
      example:
        "import json\n\nwith open(\"notes.txt\", \"w\") as f:\n    f.write(\"line one\\n\")\n\nwith open(\"config.json\") as f:\n    config = json.load(f)\n\nwith open(\"config.json\", \"w\") as f:\n    json.dump(config, f, indent=2)",
      summary:
        "The with statement and open() read and write files safely. JSON keeps structured data portable, and pathlib makes paths reliable across operating systems.",
      practice: [
        "Write a list of lines to a file and read them back.",
        "Load a JSON file, modify it, and save it back.",
        "Use pathlib to build a path and confirm it resolves correctly.",
      ],
    },
    {
      title: "Calling REST APIs",
      overview:
        "REST APIs let programs exchange data over HTTP. The requests library turns a URL into typed Python data, and understanding status codes keeps calls robust.",
      concepts: [
        "HTTP methods map to actions: GET reads, POST creates, PUT/PATCH update, DELETE removes.",
        "requests.get(url) returns a Response; .status_code and .json() read it.",
        "Pass parameters with params=, headers with headers=, and bodies with json=.",
        "Handle errors: raise_for_status() raises for 4xx/5xx responses.",
        "Add timeouts so a slow API cannot hang your program forever.",
        "Respect APIs: use auth tokens, handle rate limits, and retry transient failures.",
      ],
      example:
        "import requests\n\nres = requests.get(\n    \"https://api.github.com/repos/python/cpython/issues\",\n    params={\"state\": \"open\", \"per_page\": 5},\n    timeout=10,\n)\nres.raise_for_status()\nissues = res.json()\nprint(len(issues), \"open issues\")",
      summary:
        "The requests library makes REST calls a few lines of code. Checking status, setting timeouts, and handling errors turn flaky calls into dependable data pipelines.",
      practice: [
        "Fetch data from a public API and print a field from the response.",
        "Add params and headers to a request and inspect the URL that was sent.",
        "Wrap a call in try/except and add a timeout.",
      ],
    },
    {
      title: "SQLite and PostgreSQL basics",
      overview:
        "Databases store data durably. SQLite is a file-based database for small apps; PostgreSQL is a full server for production. Both speak SQL and integrate with Python.",
      concepts: [
        "SQLite is embedded in Python via the sqlite3 module; no server required.",
        "Create tables with CREATE TABLE and insert with INSERT INTO ... VALUES.",
        "Parameterized queries (? placeholders) prevent SQL injection.",
        "SELECT, WHERE, ORDER BY, and JOIN query data with precision.",
        "PostgreSQL adds concurrency, advanced types, and is used via a driver like psycopg.",
        "ORMs (SQLAlchemy, Drizzle, Prisma) map tables to objects and manage migrations.",
      ],
      example:
        "import sqlite3\n\nconn = sqlite3.connect(\"app.db\")\nconn.execute(\"CREATE TABLE IF NOT EXISTS courses (id INTEGER PRIMARY KEY, title TEXT)\")\nconn.execute(\"INSERT INTO courses (title) VALUES (?)\", (\"Python\",))\nconn.commit()\n\nfor row in conn.execute(\"SELECT * FROM courses ORDER BY id\"):\n    print(row)",
      summary:
        "SQLite stores data in a single file; PostgreSQL scales to production. Parameterized queries keep data safe, and ORMs make schemas and queries maintainable.",
      practice: [
        "Create a SQLite table and insert three rows with parameters.",
        "Query rows with a WHERE filter and ORDER BY.",
        "Compare when you would choose SQLite versus PostgreSQL.",
      ],
    },
    {
      title: "Unit tests with pytest",
      overview:
        "Tests verify that code behaves as expected and catch regressions. pytest is the standard Python framework: write plain functions that assert outcomes.",
      concepts: [
        "Test functions named test_* in files named test_*.py are discovered automatically.",
        "assert checks an expectation; pytest reports failures with rich diffs.",
        "Fixtures provide setup/teardown for tests that need data or resources.",
        "Parametrize runs the same test with multiple inputs.",
        "Monkeypatch or mock replaces external calls so tests run fast and offline.",
        "Aim for tests that are fast, isolated, and deterministic.",
      ],
      example:
        "def add(a, b):\n    return a + b\n\n# test_add.py\nimport pytest\nfrom mymath import add\n\n@pytest.mark.parametrize(\"a,b,expected\", [(1, 2, 3), (0, 0, 0), (-1, 1, 0)])\ndef test_add(a, b, expected):\n    assert add(a, b) == expected",
      summary:
        "pytest turns assertions into a reliable safety net. Discovered automatically, extended by fixtures and parametrize, tests keep features working as you change code.",
      practice: [
        "Write tests for a small function using pytest.",
        "Add a fixture that supplies test data and a parametrize case.",
        "Run pytest and confirm failures point at the exact assertion.",
      ],
    },
    {
      title: "Debugging strategies",
      overview:
        "Bugs are inevitable; debugging is a skill. Reading tracebacks, narrowing the problem, and using the right tools fix most issues quickly.",
      concepts: [
        "Read the traceback bottom-up: the last line names the exception and location.",
        "Reproduce the bug with the smallest possible input before fixing.",
        "Print or log intermediate values to verify assumptions; better, use pdb.",
        "pdb (breakpoint()) pauses execution and lets you inspect state interactively.",
        "Split a failing expression into steps to isolate which part breaks.",
        "Write a failing test for the bug, then fix until the test passes.",
      ],
      example:
        "def process(items):\n    breakpoint()   # pause here to inspect items\n    return [i * 2 for i in items]\n\n# pdb commands:\n# (Pdb) items\n# (Pdb) n   (next)\n# (Pdb) q   (quit)",
      summary:
        "Debugging is systematic: read the traceback, minimize the repro, and inspect state. breakpoint() and failing tests turn mystery crashes into quick fixes.",
      practice: [
        "Introduce a bug, read the traceback, and fix it from the message alone.",
        "Use breakpoint() to inspect variables mid-function.",
        "Write a regression test for a bug you fixed.",
      ],
    },
    {
      title: "Packaging reusable code",
      overview:
        "Packaging turns your code into something installable and reusable. A pyproject.toml plus a standard layout lets others pip install your library.",
      concepts: [
        "Organize code into a package: a directory with __init__.py (or src layout).",
        "pyproject.toml declares metadata, dependencies, and build settings.",
        "Publish locally with pip install -e . to develop against your package.",
        "Upload to PyPI with build and twine for public distribution.",
        "Semantic versioning (major.minor.patch) communicates breaking changes.",
        "Document the public API so consumers know what is stable.",
      ],
      example:
        "# pyproject.toml\n[project]\nname = \"mytoolbox\"\nversion = \"0.1.0\"\nrequires-python = \">=3.11\"\ndependencies = [\"requests>=2.31\"]\n\n# install locally\n$ pip install -e .",
      summary:
        "Packaging gives your code a name, version, and install command. A src layout, pyproject.toml, and versioning make libraries reusable across projects.",
      practice: [
        "Turn a script into a package with a src layout.",
        "Declare metadata and dependencies in pyproject.toml.",
        "Install it locally with pip install -e . and import it from another directory.",
      ],
    },
    {
      title: "Automation script project",
      overview:
        "Automation scripts replace repetitive manual work. A well-structured script takes inputs, performs a task, and reports results clearly.",
      concepts: [
        "Start from a real pain point: what do you do by hand more than once?",
        "Accept inputs via arguments (argparse or sys.argv) and configuration files.",
        "Validate inputs and fail with clear messages early.",
        "Structure the script with small functions: parse, process, output.",
        "Log progress so a long run is auditable.",
        "Handle partial failure: process what works, report what failed.",
      ],
      example:
        "import argparse\n\nparser = argparse.ArgumentParser(description=\"Rename files by pattern\")\nparser.add_argument(\"pattern\")\nparser.add_argument(\"--dry-run\", action=\"store_true\")\nargs = parser.parse_args()\n\n# with args.pattern and args.dry_run, walk files and rename",
      summary:
        "An automation script turns repeated manual steps into one command. Clear input handling, small functions, and logging keep it robust for daily use.",
      practice: [
        "Identify a repetitive task and script it end to end.",
        "Add a --dry-run flag that prints what would happen.",
        "Write a test for the core processing function.",
      ],
    },
    {
      title: "API data dashboard",
      overview:
        "Dashboards gather data from several sources and present it usefully. Fetching, cleaning, and aggregating data from APIs is the core of many products.",
      concepts: [
        "Define the question first: what decision should the dashboard inform?",
        "Fetch from multiple endpoints and normalize the responses into one shape.",
        "Clean data: drop nulls, fix types, and remove outliers before aggregating.",
        "Aggregate with grouping and counting to reveal patterns.",
        "Cache or persist results so repeated views don't hammer the API.",
        "Present results with charts and clear labels.",
      ],
      example:
        "import requests\n\ndef fetch_repos(org):\n    res = requests.get(f\"https://api.github.com/orgs/{org}/repos\", timeout=10)\n    res.raise_for_status()\n    return [{\"name\": r[\"name\"], \"stars\": r[\"stargazers_count\"]} for r in res.json()]\n\ndef top_repos(org, limit=5):\n    repos = fetch_repos(org)\n    return sorted(repos, key=lambda r: r[\"stars\"], reverse=True)[:limit]",
      summary:
        "Dashboards convert raw API responses into decisions. Normalize, clean, aggregate, and present — with caching so the data source isn't overused.",
      practice: [
        "Fetch two endpoints and merge their data into a single structure.",
        "Clean a messy dataset by dropping nulls and fixing types.",
        "Compute and print a top-N ranking from the cleaned data.",
      ],
    },
    {
      title: "Command-line app capstone",
      overview:
        "A command-line application is a complete program you ship: it parses arguments, manages state, handles errors, and has tests. This capstone ties the course together.",
      concepts: [
        "Design the user interface: commands, flags, and help text.",
        "Organize code into modules: cli, core logic, and storage.",
        "Persist state (files, SQLite) so the app survives restarts.",
        "Handle errors gracefully and exit with meaningful status codes.",
        "Write tests for the core logic independent of the terminal.",
        "Document installation and usage in a README.",
      ],
      example:
        "import argparse\n\ndef main():\n    parser = argparse.ArgumentParser(prog=\"tasks\")\n    sub = parser.add_subparsers(dest=\"command\", required=True)\n    add = sub.add_parser(\"add\"); add.add_argument(\"title\")\n    ls = sub.add_parser(\"list\")\n    args = parser.parse_args()\n\n    if args.command == \"add\":\n        print(f\"Added: {args.title}\")\n    elif args.command == \"list\":\n        print(\"(no tasks)\")\n\nif __name__ == \"__main__\":\n    main()",
      summary:
        "The capstone assembles argument parsing, modular code, persistence, and tests into a usable CLI app. It is a complete small product you can run, test, and share.",
      practice: [
        "Build a task tracker CLI with add, list, and complete commands.",
        "Persist tasks to a JSON file or SQLite.",
        "Add tests for the core task logic and a README.",
      ],
    },
  ],
  "ai-machine-learning-masterclass": [
    {
      title: "What AI systems can and cannot do",
      overview:
        "AI systems recognize patterns and make predictions from data. This lesson sets realistic expectations: what modern AI excels at, where it fails, and why understanding limits matters.",
      concepts: [
        "Most modern AI is statistical pattern matching trained on large datasets.",
        "AI excels at perception, language, and prediction where patterns exist at scale.",
        "Models are narrow: a model trained for one task cannot generalize to unrelated tasks.",
        "Hallucinations, bias, and fragility are failure modes of pattern matching, not bugs to ignore.",
        "Correlation learned from data is not causation; models reflect their training data.",
        "Human oversight is required for high-stakes decisions.",
      ],
      example:
        "Use cases where AI is strong:\n- Detecting spam, translating language, recommending content\n- Image and speech recognition\n- Predicting churn, fraud, and demand\n\nWhere AI is weak:\n- Common-sense reasoning, planning, long-horizon goals\n- Rare edge cases absent from training data\n- Tasks requiring genuine understanding of cause and effect",
      summary:
        "AI is powerful pattern matching, not intelligence. It thrives on large, patterned datasets and struggles with reasoning, novelty, and causation. Know the difference before applying it.",
      practice: [
        "List three tasks where AI would help and three where it would mislead.",
        "Identify a failure mode (bias, hallucination) in a real AI product.",
        "Write one sentence describing what your model actually learns from data.",
      ],
    },
    {
      title: "ML project lifecycle",
      overview:
        "Machine learning projects follow a lifecycle: define the problem, gather and prepare data, train and evaluate, then deploy and monitor. Skipping steps causes silent failures.",
      concepts: [
        "Start with a well-defined business or product problem, not a model.",
        "Choose a metric that matches the decision the model supports.",
        "Prepare data: clean, label, split into train/validation/test sets.",
        "Train baseline models first, then iterate with better features and algorithms.",
        "Evaluate honestly on held-out data, not the data used to train.",
        "Deploy, monitor drift, and retrain as real-world data changes.",
      ],
      example:
        "Lifecycle checklist:\n1. Problem definition and success metric\n2. Data collection and labeling\n3. EDA, cleaning, and feature engineering\n4. Train/validate/test split\n5. Baseline -> iterate -> select\n6. Evaluate on test set\n7. Deploy, monitor, retrain",
      summary:
        "A disciplined lifecycle turns an idea into a working model. Define the metric, split data honestly, iterate, and monitor after deployment so the model stays correct.",
      practice: [
        "Write a one-page project brief: problem, metric, data source.",
        "Split a small dataset and confirm no leakage between sets.",
        "Sketch the monitoring plan for a deployed model.",
      ],
    },
    {
      title: "Responsible AI basics",
      overview:
        "Responsible AI means building systems that are fair, transparent, private, and accountable. Ethics are a design requirement, not an afterthought.",
      concepts: [
        "Bias: models learn biases present in training data; audit for disparate impact.",
        "Fairness: define who is affected and how, and measure outcomes across groups.",
        "Transparency: document data, decisions, and limitations; explain model behavior.",
        "Privacy: minimize data collection, anonymize, and honor data rights.",
        "Accountability: designate humans responsible for outcomes and escalations.",
        "Safety: test adversarial cases and monitor for harm after deployment.",
      ],
      example:
        "Bias check example:\nmodel = load_model(\"hiring\")\nfor group in [\"women\", \"men\", \"minority\", \"majority\"]:\n    score = model.predict(sample_by_group(group))\n    print(group, score.mean())\n# Compare acceptance rates across groups before shipping",
      summary:
        "Responsible AI balances capability with fairness, transparency, privacy, and accountability. Audit data, document limits, and keep humans responsible for outcomes.",
      practice: [
        "Document who your model affects and what could go wrong.",
        "Run a simple bias check across demographic groups in your data.",
        "Write a model card summarizing data, metric, and limitations.",
      ],
    },
    {
      title: "Notebook workflow",
      overview:
        "Jupyter notebooks combine code, text, and visualizations for exploratory analysis. A clean notebook workflow makes analysis reproducible and shareable.",
      concepts: [
        "Notebooks are documents of cells: Markdown explains, code executes, output records results.",
        "Run cells top-to-bottom; a clean restart-and-run-again proves reproducibility.",
        "Use Markdown headings, explanations, and conclusions so the notebook reads as a report.",
        "Keep notebooks for exploration; move production code into .py modules.",
        "Pin dependency versions and seed random generators for stable results.",
        "Use version control even for notebooks (review notebooks, not just code).",
      ],
      example:
        "# 1. Setup\nimport pandas as pd\nimport matplotlib.pyplot as plt\n\n# 2. Load data\ndf = pd.read_csv(\"courses.csv\")\n\n# 3. Explore\nprint(df.describe())\n\n# 4. Analyze\nplt.hist(df[\"price\"])\nplt.show()",
      summary:
        "Notebooks blend code, prose, and charts for exploration. Clear Markdown, reproducible order, and moving finished logic to modules keep them useful and trustworthy.",
      practice: [
        "Restart the kernel and run all cells; fix anything that breaks.",
        "Add Markdown headings and a conclusion to a notebook.",
        "Extract one repeated analysis into a reusable .py function.",
      ],
    },
    {
      title: "Data cleaning with pandas",
      overview:
        "Real data is messy. pandas provides the tools to load, inspect, and clean tabular data: missing values, wrong types, duplicates, and outliers.",
      concepts: [
        "DataFrames are labeled tables; read_csv loads them from files.",
        "df.info(), df.describe(), and df.isna().sum() reveal the shape and health of data.",
        "Handle missing values by dropping (dropna) or filling (fillna) based on context.",
        "Convert and validate types with astype and pd.to_datetime.",
        "Remove duplicate rows with drop_duplicates.",
        "Detect outliers with describe(), boxplots, and domain knowledge before deciding.",
      ],
      example:
        "import pandas as pd\n\ndf = pd.read_csv(\"sales.csv\")\ndf[\"date\"] = pd.to_datetime(df[\"date\"])\ndf = df.drop_duplicates()\ndf = df.dropna(subset=[\"amount\"])\ndf[\"amount\"] = df[\"amount\"].astype(float)\nprint(df.isna().sum())",
      summary:
        "Cleaning turns messy raw data into a reliable table. Inspect with describe/isna, then fix missing values, types, duplicates, and outliers with clear, documented decisions.",
      practice: [
        "Load a dataset and report its missing values and dtypes.",
        "Clean it: drop duplicates, fix dates, and handle nulls.",
        "Document each cleaning decision in a notebook cell.",
      ],
    },
    {
      title: "Visualizing datasets",
      overview:
        "Visualization exposes patterns, distributions, and problems before modeling. matplotlib and seaborn build the charts that drive analysis.",
      concepts: [
        "Histograms reveal distributions and outliers; boxplots compare groups.",
        "Scatter plots expose relationships between two numeric variables.",
        "Bar and line charts compare categories and trends over time.",
        "Correlation heatmaps summarize relationships across many columns.",
        "Label axes, add titles, and use color deliberately; a chart must stand alone.",
        "Visualize before modeling and after to validate assumptions.",
      ],
      example:
        "import matplotlib.pyplot as plt\nimport seaborn as sns\n\nsns.histplot(df[\"price\"], bins=30)\nplt.title(\"Course price distribution\")\nplt.show()\n\nsns.scatterplot(data=df, x=\"duration_hours\", y=\"enrollments\")\nplt.show()",
      summary:
        "Charts make data legible. Distributions, comparisons, and correlations guide cleaning and feature decisions — always visualize before you model.",
      practice: [
        "Plot the distribution of a numeric column and note the shape.",
        "Build a scatter plot of two variables and describe the relationship.",
        "Create a correlation heatmap for a multi-column dataset.",
      ],
    },
    {
      title: "Regression models",
      overview:
        "Regression predicts a continuous number from features. Linear regression is the interpretable baseline; regularization and non-linear models extend it.",
      concepts: [
        "Linear regression fits y = w0 + w1*x1 + ... + wn*xn by minimizing squared error.",
        "Coefficients measure the expected change in the target per unit of a feature.",
        "Mean squared error (MSE) and R-squared evaluate fit; compare against a baseline.",
        "Regularization (Ridge/Lasso) shrinks coefficients and prevents overfitting.",
        "One-hot encode categorical features; scale numeric features for some algorithms.",
        "Watch for correlated features (multicollinearity) which destabilize coefficients.",
      ],
      example:
        "from sklearn.linear_model import LinearRegression\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.metrics import mean_squared_error, r2_score\n\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\nmodel = LinearRegression().fit(X_train, y_train)\ny_pred = model.predict(X_test)\nprint(r2_score(y_test, y_pred), mean_squared_error(y_test, y_pred))",
      summary:
        "Regression predicts continuous outcomes with interpretable coefficients. Evaluate with MSE and R-squared, regularize to avoid overfitting, and always test on held-out data.",
      practice: [
        "Train a linear regression and interpret one coefficient.",
        "Compare plain linear vs a regularized model on held-out data.",
        "Plot predictions vs actuals and discuss the spread.",
      ],
    },
    {
      title: "Classification models",
      overview:
        "Classification assigns inputs to categories. Logistic regression, decision trees, and random forests are the standard tools, evaluated with accuracy, precision, and recall.",
      concepts: [
        "Logistic regression outputs class probabilities via the sigmoid function.",
        "Decision trees split on features to separate classes; random forests average many trees.",
        "Accuracy hides problems on imbalanced data; use precision, recall, and F1.",
        "The confusion matrix shows exactly which classes get confused.",
        "ROC/PR curves let you trade precision against recall via a threshold.",
        "Class imbalance needs resampling or class weights, not just accuracy.",
      ],
      example:
        "from sklearn.ensemble import RandomForestClassifier\nfrom sklearn.metrics import classification_report, confusion_matrix\n\nmodel = RandomForestClassifier(n_estimators=200, random_state=42)\nmodel.fit(X_train, y_train)\ny_pred = model.predict(X_test)\nprint(classification_report(y_test, y_pred))\nprint(confusion_matrix(y_test, y_pred))",
      summary:
        "Classification predicts categories. Choose the right model, evaluate with precision/recall on imbalanced data, and read the confusion matrix to understand real mistakes.",
      practice: [
        "Train a random forest and report precision and recall per class.",
        "Explain when accuracy is misleading and what to use instead.",
        "Plot the confusion matrix and identify the most common error.",
      ],
    },
    {
      title: "Feature engineering",
      overview:
        "Features are the inputs a model learns from. Feature engineering transforms raw data into predictors that make patterns easy to learn.",
      concepts: [
        "Clean features matter more than clever algorithms; good features beat bigger models.",
        "Create derived features: ratios, differences, aggregations, and date parts.",
        "Encode categorical data with one-hot encoding or label encoding.",
        "Scale numeric features for distance-based models with StandardScaler.",
        "Missing values become features: a missing flag can itself be predictive.",
        "Select features by importance and domain knowledge; remove noise.",
      ],
      example:
        "df[\"revenue_per_hour\"] = df[\"revenue\"] / df[\"hours\"]\ndf[\"signup_weekday\"] = df[\"signup_date\"].dt.dayofweek\ndf[\"is_weekend\"] = df[\"signup_weekday\"].isin([5, 6]).astype(int)\n\ndf = pd.get_dummies(df, columns=[\"plan\"], prefix=\"plan\")",
      summary:
        "Feature engineering converts raw data into learnable predictors. Derived ratios, proper encoding, scaling, and informative missing-value flags often improve models more than algorithm choice.",
      practice: [
        "Create three derived features from a dataset and justify each.",
        "One-hot encode a categorical column and inspect the result.",
        "Compare model performance with and without your new features.",
      ],
    },
    {
      title: "Clustering concepts",
      overview:
        "Clustering finds groups in unlabeled data. K-means partitions data into k clusters by proximity; evaluating cluster quality is part of the workflow.",
      concepts: [
        "K-means assigns points to the nearest centroid and iteratively refines centroids.",
        "Choose k with the elbow method or silhouette score rather than guessing.",
        "Scale features before clustering so distances are meaningful.",
        "The inertia (within-cluster distance) decreases as k grows; the elbow shows the trade-off.",
        "Clusters reflect the chosen features and scale; they are descriptive, not causal.",
        "Visualize clusters with PCA or t-SNE for inspection.",
      ],
      example:
        "from sklearn.cluster import KMeans\nfrom sklearn.preprocessing import StandardScaler\n\nX_scaled = StandardScaler().fit_transform(X)\nmodel = KMeans(n_clusters=4, n_init=10, random_state=42)\nlabels = model.fit_predict(X_scaled)\nprint(model.inertia_)",
      summary:
        "Clustering surfaces structure in unlabeled data. Pick k deliberately with the elbow or silhouette, scale features first, and treat clusters as descriptive groupings.",
      practice: [
        "Run K-means for several values of k and plot the elbow curve.",
        "Scale the data and re-run; describe how results change.",
        "Silhouette-score the clusters and pick the best k.",
      ],
    },
    {
      title: "Dimensionality reduction",
      overview:
        "High-dimensional data is hard to visualize and noisy to model. Dimensionality reduction compresses features while keeping the essential structure.",
      concepts: [
        "PCA finds orthogonal directions of maximum variance and projects data onto them.",
        "The explained-variance ratio shows how much information each component carries.",
        "PCA is a linear method; t-SNE and UMAP capture non-linear structure for visualization.",
        "Reduction helps visualization, speed, and removing correlated noise.",
        "Keep enough components to retain most variance; the elbow of the scree plot guides you.",
        "PCA components are linear combinations of features; interpret with caution.",
      ],
      example:
        "from sklearn.decomposition import PCA\n\npca = PCA(n_components=2)\nprojected = pca.fit_transform(X_scaled)\nprint(pca.explained_variance_ratio_)  # [0.52, 0.18] for two components\n\nimport matplotlib.pyplot as plt\nplt.scatter(projected[:, 0], projected[:, 1], c=labels)\nplt.show()",
      summary:
        "Dimensionality reduction compresses features for visualization and modeling. PCA captures linear variance; t-SNE/UMAP reveal non-linear structure. Always check explained variance.",
      practice: [
        "Run PCA and plot the explained variance for each component.",
        "Project a dataset to 2D and color by a cluster label.",
        "Explain the trade-off of keeping fewer components.",
      ],
    },
    {
      title: "Interpreting patterns",
      overview:
        "A model's patterns should make sense. Interpretation methods reveal which features drive predictions, so you can validate, explain, and trust the model.",
      concepts: [
        "Feature importance (from tree models) ranks inputs by their contribution.",
        "Coefficients in linear models give direction and magnitude of effect.",
        "Partial dependence plots show how a feature changes predictions on average.",
        "SHAP values explain individual predictions and feature contributions.",
        "Interpretation catches data bugs and unintended shortcuts.",
        "Explain to stakeholders in plain language, not just numbers.",
      ],
      example:
        "from sklearn.ensemble import RandomForestClassifier\nfrom sklearn.inspection import permutation_importance\n\nmodel.fit(X_train, y_train)\nperm = permutation_importance(model, X_test, y_test, n_repeats=10, random_state=42)\nimport numpy as np\nfor i in np.argsort(perm.importances_mean)[::-1]:\n    print(X.columns[i], round(perm.importances_mean[i], 4))",
      summary:
        "Interpretation turns a black box into an explainable decision. Feature importance, coefficients, and SHAP reveal drivers and catch bugs before trusting predictions.",
      practice: [
        "Rank features by importance for a trained model.",
        "Generate SHAP values for one prediction and explain it.",
        "Write a plain-language explanation of what the model relies on.",
      ],
    },
    {
      title: "Perceptrons and activation functions",
      overview:
        "Neural networks begin with the perceptron: a weighted sum of inputs passed through an activation function. Stacking these units with non-linear activations builds deep networks.",
      concepts: [
        "A neuron computes z = sum(w_i * x_i) + b and passes it through an activation.",
        "Activation functions introduce non-linearity; without them, layers collapse to one.",
        "Sigmoid/tanh squash outputs; ReLU keeps positive inputs and is the common default.",
        "Softmax turns raw scores into class probabilities for classification.",
        "Layers connect: input layer, hidden layers, output layer.",
        "Weights are learned via backpropagation and gradient descent.",
      ],
      example:
        "import numpy as np\n\ndef relu(z):\n    return np.maximum(0, z)\n\ndef layer(x, W, b):\n    return relu(x @ W + b)\n\nx = np.array([[0.1, 0.5, 0.3]])\nW = np.random.randn(3, 4) * 0.1\nb = np.zeros(4)\nhidden = layer(x, W, b)\nprint(hidden)",
      summary:
        "Neurons compute weighted sums passed through activations. Non-linear activations like ReLU let networks express complex functions, and layered composition is what makes them deep.",
      practice: [
        "Implement a single neuron and compute its output for a few inputs.",
        "Compare sigmoid and ReLU on the same input values.",
        "Explain why removing all activations would collapse the network.",
      ],
    },
    {
      title: "Training loops",
      overview:
        "Training adjusts weights to reduce loss. The loop — forward pass, loss, backward pass, update — repeats over batches until the model converges.",
      concepts: [
        "The forward pass computes predictions; the loss measures the error.",
        "Backpropagation computes gradients of the loss with respect to every weight.",
        "Gradient descent updates weights opposite to the gradient scaled by a learning rate.",
        "Stochastic/mini-batch descent updates on subsets for speed and stability.",
        "The learning rate controls step size: too large diverges, too small crawls.",
        "Track training and validation loss per epoch to detect under/overfitting.",
      ],
      example:
        "import torch\n\noptimizer = torch.optim.SGD(model.parameters(), lr=0.01)\nloss_fn = torch.nn.MSELoss()\n\nfor epoch in range(100):\n    y_pred = model(X)\n    loss = loss_fn(y_pred, y)\n    optimizer.zero_grad()\n    loss.backward()\n    optimizer.step()\n    print(epoch, loss.item())",
      summary:
        "The training loop moves weights down the loss landscape. Backpropagation, a tuned learning rate, and monitoring both training and validation loss produce a model that generalizes.",
      practice: [
        "Train a small network and plot loss per epoch.",
        "Try two learning rates and compare convergence.",
        "Watch for divergence (loss exploding) and fix the learning rate.",
      ],
    },
    {
      title: "Overfitting and regularization",
      overview:
        "Overfitting means memorizing training data instead of learning patterns, so test performance suffers. Regularization adds constraints that keep models simple.",
      concepts: [
        "Overfitting shows as low training loss but high validation loss.",
        "Underfitting is the opposite: high error everywhere; the model is too simple.",
        "More data, fewer parameters, and early stopping all fight overfitting.",
        "L1/L2 regularization penalize large weights, pulling them toward zero.",
        "Dropout randomly turns off neurons during training as a form of ensemble averaging.",
        "Data augmentation creates more training examples by transforming existing ones.",
      ],
      example:
        "import torch.nn as nn\n\nmodel = nn.Sequential(\n    nn.Linear(20, 64),\n    nn.ReLU(),\n    nn.Dropout(0.3),       # regularization\n    nn.Linear(64, 1),\n)\n\n# Early stopping: stop when validation loss stops improving",
      summary:
        "Overfitting is memorization; regularization is the cure. Validation loss, dropout, weight penalties, early stopping, and more data keep models learning patterns instead of noise.",
      practice: [
        "Train a model and identify where train and validation loss diverge.",
        "Add dropout and compare validation performance.",
        "Use early stopping and report the epoch you stopped at.",
      ],
    },
    {
      title: "Model evaluation report",
      overview:
        "An evaluation report is the deliverable that makes a model trustworthy. It states the metric, methodology, results, limitations, and a recommendation in one document.",
      concepts: [
        "Report the exact metric and how the train/validation/test split was made.",
        "Show results on the held-out test set, never on training data.",
        "Include baselines (random, majority, simple heuristic) for context.",
        "Document limitations: data coverage, failure modes, and edge cases.",
        "Recommend a decision: ship, iterate, or stop — with reasons.",
        "Keep the report reproducible so results can be regenerated.",
      ],
      example:
        "Evaluation report outline:\n1. Problem and success metric\n2. Data summary and split\n3. Baseline results\n4. Model results (test set)\n5. Error analysis and confusion matrix\n6. Limitations and risks\n7. Recommendation",
      summary:
        "An evaluation report converts model results into a decision. State metrics and method, compare to baselines, document limits, and make a clear, honest recommendation.",
      practice: [
        "Produce a one-page evaluation report for a model you trained.",
        "Add a baseline comparison to your results.",
        "List two limitations and how you would address them.",
      ],
    },
    {
      title: "AI assistant prototype",
      overview:
        "Building an AI assistant prototype connects a model to a real product surface. Retrieval, prompts, and guardrails turn a raw model into something useful.",
      concepts: [
        "Define the assistant's scope and persona before writing prompts.",
        "Retrieval-augmented generation (RAG) grounds answers in your documents.",
        "Design prompts with clear instructions, context, and expected format.",
        "Chain the steps: retrieve relevant context, then generate a grounded answer.",
        "Add guardrails: refuse out-of-scope requests and cite sources.",
        "Evaluate responses with a small test set and iterate on prompts.",
      ],
      example:
        "def answer(query):\n    chunks = retrieve(query)          # RAG\n    prompt = build_prompt(query, chunks)\n    return call_model(prompt)         # grounded answer\n\n# Guardrail example\nif not is_on_topic(query):\n    return \"I can only answer questions about this course.\"",
      summary:
        "An assistant prototype combines retrieval, prompt design, and guardrails. Ground answers in documents, keep scope tight, and evaluate responses to iterate toward reliability.",
      practice: [
        "Define the assistant's scope and a sample of test questions.",
        "Add retrieval so answers cite source content.",
        "Test five out-of-scope requests and confirm they are refused.",
      ],
    },
    {
      title: "Deployment readiness checklist",
      overview:
        "Moving a model to production is engineering, not just science. A deployment checklist covers the API, monitoring, data pipeline, and rollback plan.",
      concepts: [
        "Expose the model behind a versioned API with input validation.",
        "Set up monitoring: prediction latency, request volume, and error rate.",
        "Detect data drift and prediction drift after deployment.",
        "Automate retraining on fresh data and validate before replacing the model.",
        "Plan rollback: keep the previous model version available and switchable.",
        "Document the runbook: what to do when metrics go wrong.",
      ],
      example:
        "Deployment checklist:\n- Model versioned and reproducible (code + data + config)\n- API validates input and returns errors clearly\n- Logging for latency, errors, and drift\n- Retraining pipeline scheduled and tested\n- Rollback path tested\n- Runbook written and owners assigned",
      summary:
        "Production ML is about reliability, not just accuracy. Versioned models, monitoring for drift, automated retraining, and a tested rollback path keep deployments safe.",
      practice: [
        "Write a deployment checklist tailored to your model.",
        "Add drift monitoring to the serving endpoint plan.",
        "Document the rollback procedure step by step.",
      ],
    },
  ],
};

// Topic-related YouTube video for every seeded lesson.
// Keyed by course slug -> lesson index (same order as notesContent).
export const lessonVideos = {
  "complete-web-development-bootcamp": [
    "kX3TfdUqpuU",
    "p0bGHP-PXD4",
    "ffxwEyBcdf0",
    "hdI2bqOjy3c",
    "oRqQsKIrYzM",
    "PYxnWzrk5fA",
    "nTeuhbP7wdE",
    "UvH70UkbyfE",
    "N_WgBU3S9W8",
    "gePnVTM_nSI",
    "6MoYy62E4rw",
    "PAXWRgEo7Ns",
    "kyGVhx5LwXw",
    "mbsmsi7l3r4",
    "aY5Mq-3UemY",
    "hZUNMYU4Kzo",
    "_0ZFrMWsWZY",
    "r8UvWSX3KA8",
  ],
  "python-programming-beginner-to-advanced": [
    "YYXdXT2l-Gg",
    "OFrLs22MDAw",
    "Zp5MuPOtsSY",
    "9Os0o3wzS_I",
    "R-HLU9Fl5ug",
    "3dt4OGnU5sM",
    "ZDa-Z5JzLYM",
    "RSl87lqOXDE",
    "NIWwJbo-9_8",
    "Uh2ebFW8OYM",
    "tb8gHvYlCFs",
    "pd-0G0MigUA",
    "cHYq1MRoyI0",
    "cokP4XAhcwo",
    "v6tALyc4C10",
    "916TXUN3nPU",
    "pLU7ZLPhyX8",
    "aGy7U5ItLRk",
  ],
  "ai-machine-learning-masterclass": [
    "6_D6OPuDIis",
    "OMNHrfhdf0k",
    "wmyVODy_WD8",
    "HW29067qVWk",
    "oad9tVEsfI0",
    "UO98lJQ3QGI",
    "nk2CQITm_eo",
    "yIYKR4sgzI8",
    "6WDFfaYtN6s",
    "4b5d3muPQmA",
    "FgakZw6K1QQ",
    "Vfnv1_bBqNg",
    "aircAruvnKk",
    "sDv4f4s2SB8",
    "EuBBz3bI-aA",
    "Kdsp6soqA7o",
    "sVcwVQRHIc8",
    "7Xjrp9j9bLw",
  ],
};