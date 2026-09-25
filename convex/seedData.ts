export type SeedQuiz = {
  slug: string;
  prompt: string;
  description: string;
  language: "typescript" | "python";
  topic: "code-smell" | "antipattern" | "bad-practice";
  difficulty: "beginner" | "intermediate" | "advanced";
  options: { id: string; label: string }[];
  correctOptionId: string;
  explanation: string;
};

export const SEED_QUIZZES: SeedQuiz[] = [
  {
    slug: "ts-any-escape-hatch",
    prompt: "What is the main problem in this TypeScript function?",
    language: "typescript",
    topic: "bad-practice",
    difficulty: "beginner",
    description: `\`\`\`typescript
function parseUser(data: any) {
  return {
    id: data.id,
    name: data.name.toUpperCase(),
  };
}

const user = parseUser({ id: 1 });
console.log(user.name);
\`\`\``,
    options: [
      { id: "a", label: "toUpperCase() is slow on long names" },
      {
        id: "b",
        label: "any turns off type checking, so missing fields fail at runtime",
      },
      { id: "c", label: "The return object should be a class" },
      { id: "d", label: "id should be a string, never a number" },
    ],
    correctOptionId: "b",
    explanation:
      "`any` disables the compiler. `data.name` is not checked, so a missing field becomes a runtime crash. Prefer a real type or a schema parser.",
  },
  {
    slug: "py-n-plus-one-queries",
    prompt: "What problem will this code cause as the user list grows?",
    language: "python",
    topic: "antipattern",
    difficulty: "intermediate",
    description: `\`\`\`python
def load_order_counts(users):
    result = []
    for user in users:
        orders = db.query(
            "SELECT * FROM orders WHERE user_id = ?",
            user.id,
        )
        result.append((user.name, len(orders)))
    return result
\`\`\``,
    options: [
      { id: "a", label: "N+1 queries: one extra database round-trip per user" },
      { id: "b", label: "The tuple in append cannot hold a name and a count" },
      { id: "c", label: "len(orders) does not work on query results" },
      { id: "d", label: "The loop should use map() instead of for" },
    ],
    correctOptionId: "a",
    explanation:
      "This is the N+1 antipattern: one query for the list, then one query per item. Load the counts in a single query (join or GROUP BY) instead.",
  },
  {
    slug: "ts-magic-number",
    prompt: "What should you change first in this snippet?",
    language: "typescript",
    topic: "code-smell",
    difficulty: "beginner",
    description: `\`\`\`typescript
function scheduleRefresh(onRefresh: () => void) {
  setTimeout(onRefresh, 86400000);
}

function isAdult(age: number) {
  return age >= 18;
}
\`\`\``,
    options: [
      { id: "a", label: "isAdult should live in another file" },
      { id: "b", label: "setTimeout cannot accept an arrow function" },
      { id: "c", label: "86400000 is a magic number; name the delay" },
      { id: "d", label: "18 must be a float for ages with months" },
    ],
    correctOptionId: "c",
    explanation:
      "`86400000` hides meaning. A named constant like `ONE_DAY_MS` makes the delay obvious and easy to change.",
  },
  {
    slug: "ts-god-function",
    prompt: "What is the main design problem here?",
    language: "typescript",
    topic: "antipattern",
    difficulty: "advanced",
    description: `\`\`\`typescript
async function processOrder(order: Order) {
  if (!order.email.includes("@")) throw new Error("bad email");
  order.total = order.items.reduce((sum, item) => sum + item.price, 0);
  if (order.total > 100) order.total *= 0.9;
  await db.orders.insert(order);
  await email.send(order.email, "Thanks", renderReceipt(order));
  await metrics.increment("orders");
  cache.delete("orders");
  await audit.log("order", order.id);
}
\`\`\``,
    options: [
      { id: "a", label: "Email send must happen before insert" },
      { id: "b", label: "cache.delete is too fast to await" },
      { id: "c", label: "Throwing Error is outdated; use strings" },
      {
        id: "d",
        label: "One function validates, prices, saves, emails, and logs",
      },
    ],
    correctOptionId: "d",
    explanation:
      "This is a god function: too many jobs in one place. Split validation, pricing, persistence, and side effects so each piece can change and fail on its own.",
  },
  {
    slug: "py-mutable-default",
    prompt: "What goes wrong when this function is called more than once?",
    language: "python",
    topic: "bad-practice",
    difficulty: "beginner",
    description: `\`\`\`python
def add_item(item, items=[]):
    items.append(item)
    return items

first = add_item("a")
second = add_item("b")
\`\`\``,
    options: [
      { id: "a", label: "append cannot add strings to a list" },
      {
        id: "b",
        label: "The default list is created once and shared across calls",
      },
      { id: "c", label: "Python copies the list on every return" },
      {
        id: "d",
        label: "first and second are the same because strings are interned",
      },
    ],
    correctOptionId: "b",
    explanation:
      "Default arguments are evaluated once. `items=[]` is one shared list, so later calls keep old values. Use `None` and create a new list inside the function.",
  },
  {
    slug: "ts-boolean-blindness",
    prompt: "Why is this function hard to use correctly?",
    language: "typescript",
    topic: "code-smell",
    difficulty: "intermediate",
    description: `\`\`\`typescript
function createUser(
  name: string,
  admin: boolean,
  sendEmail: boolean,
  active: boolean,
) {
  return saveUser({ name, admin, sendEmail, active });
}

createUser("Ada", true, false, true);
\`\`\``,
    options: [
      { id: "a", label: "Boolean parameters hide meaning at the call site" },
      { id: "b", label: "saveUser cannot accept an object literal" },
      { id: "c", label: "Admin users must always receive email" },
      { id: "d", label: "The name argument should be optional" },
    ],
    correctOptionId: "a",
    explanation:
      "This is boolean blindness: `true, false, true` does not say which flag is which. An options object or named types makes each choice readable.",
  },
  {
    slug: "py-bare-except",
    prompt: "What is dangerous about this error handling?",
    language: "python",
    topic: "bad-practice",
    difficulty: "beginner",
    description: `\`\`\`python
def parse_settings(raw: str) -> dict:
    try:
        return json.loads(raw)
    except:
        return {}
\`\`\``,
    options: [
      { id: "a", label: "json.loads cannot parse an empty object" },
      { id: "b", label: "Returning dict is slower than returning None" },
      {
        id: "c",
        label: "A bare except catches too much, including system exits",
      },
      { id: "d", label: "raw should be bytes, not str" },
    ],
    correctOptionId: "c",
    explanation:
      "`except:` catches almost everything, including `KeyboardInterrupt` and bugs you should see. Catch `json.JSONDecodeError` (or `ValueError`) and fail in a clear way.",
  },
  {
    slug: "ts-feature-envy",
    prompt: "Where does this logic belong?",
    language: "typescript",
    topic: "code-smell",
    difficulty: "advanced",
    description: `\`\`\`typescript
function discount(order: Order) {
  const customer = order.customer;
  if (customer.tier === "gold" && customer.years > 5) {
    return order.total * 0.2;
  }
  if (customer.tier === "silver" && customer.years > 2) {
    return order.total * 0.1;
  }
  return 0;
}
\`\`\``,
    options: [
      { id: "a", label: "The 0.2 discount is too high for gold customers" },
      { id: "b", label: "order.total should be a string for money" },
      { id: "c", label: "if/else is not allowed in TypeScript" },
      {
        id: "d",
        label: "The function mostly uses Customer data, not Order behavior",
      },
    ],
    correctOptionId: "d",
    explanation:
      "This is feature envy: `discount` lives on orders but spends its time on customer fields. Move the tier rule to `Customer` (or a pricing policy) and keep `Order` focused.",
  },
  {
    slug: "ts-floating-promise",
    prompt: "What can fail in production with this submit handler?",
    language: "typescript",
    topic: "bad-practice",
    difficulty: "intermediate",
    description: `\`\`\`typescript
async function save(user: User) {
  await db.users.insert(user);
}

function onSubmit(user: User) {
  save(user);
  redirect("/done");
}
\`\`\``,
    options: [
      { id: "a", label: "redirect cannot run in a non-async function" },
      {
        id: "b",
        label:
          "save is not awaited, so redirect can happen before insert finishes",
      },
      { id: "c", label: "User must be serialized to JSON first" },
      {
        id: "d",
        label: "db.users.insert cannot be used inside async functions",
      },
    ],
    correctOptionId: "b",
    explanation:
      "`save(user)` returns a promise that nobody waits for. The page can redirect before the write completes, and insert errors are swallowed. Await it (and handle failure).",
  },
  {
    slug: "py-sql-string-format",
    prompt: "What is the main risk in this query?",
    language: "python",
    topic: "bad-practice",
    difficulty: "intermediate",
    description: `\`\`\`python
def find_user(user_id: str):
    query = f"SELECT * FROM users WHERE id = '{user_id}'"
    return db.execute(query)
\`\`\``,
    options: [
      { id: "a", label: "f-strings cannot include quotes" },
      { id: "b", label: "SELECT * is always slower than SELECT id" },
      { id: "c", label: "user_id should be an int, not a str" },
      { id: "d", label: "Building SQL with f-strings allows injection" },
    ],
    correctOptionId: "d",
    explanation:
      "If `user_id` comes from a user, they can close the quote and run extra SQL. Use a parameterized query: `WHERE id = ?` with a bound value.",
  },
  {
    slug: "ts-arrowhead-nesting",
    prompt: "What makes this function hard to follow?",
    language: "typescript",
    topic: "code-smell",
    difficulty: "intermediate",
    description: `\`\`\`typescript
function deliver(order: Order | null) {
  if (order) {
    if (order.paid) {
      if (order.address) {
        if (order.items.length > 0) {
          return ship(order);
        }
      }
    }
  }
  return null;
}
\`\`\``,
    options: [
      { id: "a", label: "Deep nesting; flatten with guard clauses" },
      { id: "b", label: "ship() must return null on success" },
      { id: "c", label: "Union types cannot be narrowed with if" },
      { id: "d", label: "items.length should be compared with ==" },
    ],
    correctOptionId: "a",
    explanation:
      "This arrowhead style hides the happy path. Return early for each missing condition (`if (!order) return null`) so the success case stays at the left margin.",
  },
  {
    slug: "py-missing-context-manager",
    prompt: "What resource bug can this function cause?",
    language: "python",
    topic: "code-smell",
    difficulty: "beginner",
    description: `\`\`\`python
def read_json(path: str):
    file = open(path)
    data = json.load(file)
    file.close()
    return data
\`\`\``,
    options: [
      { id: "a", label: "json.load cannot read from a file object" },
      { id: "b", label: "path should be a Path, never a str" },
      { id: "c", label: "If json.load raises, the file is never closed" },
      { id: "d", label: "close() deletes the file on disk" },
    ],
    correctOptionId: "c",
    explanation:
      "If `json.load` throws, `close()` never runs and the handle leaks. Use `with open(path) as file:` so the file closes on success and on failure.",
  },
  {
    slug: "ts-type-assertion-lie",
    prompt: "What does this assertion actually guarantee?",
    language: "typescript",
    topic: "bad-practice",
    difficulty: "intermediate",
    description: `\`\`\`typescript
type User = { id: string; email: string };

function fromRequest(body: unknown): User {
  return body as User;
}

const user = fromRequest(JSON.parse(raw));
sendEmail(user.email);
\`\`\``,
    options: [
      { id: "a", label: "JSON.parse always returns a User" },
      { id: "b", label: "as User checks the shape at runtime" },
      { id: "c", label: "unknown cannot be assigned without a type assertion" },
      {
        id: "d",
        label:
          "as User only silences the compiler; the payload may still be wrong",
      },
    ],
    correctOptionId: "d",
    explanation:
      "`as User` is not validation. It tells TypeScript to trust you. If `email` is missing, `sendEmail` still crashes. Parse with a schema (or real checks) at the trust boundary.",
  },
  {
    slug: "py-mutate-while-iterating",
    prompt: "What goes wrong in this loop?",
    language: "python",
    topic: "bad-practice",
    difficulty: "intermediate",
    description: `\`\`\`python
def drop_expired(items):
    for item in items:
        if item.expired:
            items.remove(item)
    return items
\`\`\``,
    options: [
      { id: "a", label: "Removing from a list while iterating skips items" },
      { id: "b", label: "expired must be compared with is True" },
      { id: "c", label: "for-loops cannot iterate custom objects" },
      { id: "d", label: "remove() only works on strings" },
    ],
    correctOptionId: "a",
    explanation:
      "Mutating a list while you iterate it shifts later items and you skip some. Build a new list (`[item for item in items if not item.expired]`) or iterate over a copy.",
  },
];
