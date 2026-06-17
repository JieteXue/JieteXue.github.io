const defaultCaseMode = "ignore-case";
const searchableScopes = new Set([
  "block",
  "bound",
  "content",
  "file",
  "ignore-case",
  "kind",
  "label",
  "line",
  "match-case",
  "path",
  "section",
  "status",
  "summary",
  "tag",
  "task",
  "task-done",
  "task-todo"
]);

const propertyAliases = new Map([
  ["tags", "tag"],
  ["line", "content"],
  ["block", "content"],
  ["section", "content"]
]);

export function compileColorGroupQuery(query, options = {}) {
  const source = String(query || "");
  const diagnostics = [];
  const tokens = tokenize(source, diagnostics);
  const parser = new Parser(tokens, diagnostics, options.defaultCaseMode || defaultCaseMode);
  const expression = parser.parse();
  return {
    ok: diagnostics.every((diagnostic) => diagnostic.severity !== "error"),
    query: source,
    expression,
    diagnostics
  };
}

export function evaluateColorGroupQuery(compiled, context, options = {}) {
  const result = typeof compiled === "string"
    ? compileColorGroupQuery(compiled, options)
    : compiled?.expression
      ? compiled
      : { expression: compiled, diagnostics: [] };

  if (!result.expression || result.expression.type === "empty") return false;
  if (result.diagnostics?.some((diagnostic) => diagnostic.severity === "error")) return false;
  return evaluateExpression(result.expression, normalizeContext(context), {
    caseMode: options.defaultCaseMode || defaultCaseMode
  });
}

export function resolveColorGroupColor(context, colorGroups = [], options = {}) {
  const normalizedContext = normalizeContext(context);

  for (const group of colorGroups || []) {
    if (!group || group.enabled === false || !String(group.query || "").trim()) continue;
    if (evaluateColorGroupQuery(group.query, normalizedContext, options)) {
      return {
        color: group.color,
        groupId: group.id
      };
    }
  }

  return {
    color: resolveFallbackColor(normalizedContext, options.fallbackColor),
    groupId: null
  };
}

export function applyColorGroupsToGraph(graph, colorGroups = [], options = {}) {
  const matches = new Map();
  const nodes = (graph.nodes || []).map((node) => {
    const context = options.getContext ? options.getContext(node) : { node };
    const result = resolveColorGroupColor(context, colorGroups, options);
    matches.set(node.id, result);
    return { ...node, color: result.color, colorGroupId: result.groupId };
  });

  return {
    ...graph,
    nodes,
    matches
  };
}

function tokenize(source, diagnostics) {
  const tokens = [];
  let index = 0;

  while (index < source.length) {
    const char = source[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: char, value: char, offset: index });
      index += 1;
      continue;
    }

    if (char === "\"") {
      const token = readQuoted(source, index, diagnostics);
      tokens.push(token);
      index = token.end;
      continue;
    }

    if (char === "/") {
      const token = readRegex(source, index, diagnostics);
      tokens.push(token);
      index = token.end;
      continue;
    }

    if (char === "[") {
      const token = readProperty(source, index, diagnostics);
      tokens.push(token);
      index = token.end;
      continue;
    }

    const start = index;
    while (index < source.length && !/\s/.test(source[index]) && source[index] !== "(" && source[index] !== ")") {
      index += 1;
    }
    const value = source.slice(start, index);
    tokens.push({
      type: value.toUpperCase() === "OR" ? "or" : "word",
      value,
      offset: start
    });
  }

  return tokens;
}

function readQuoted(source, start, diagnostics) {
  let index = start + 1;
  let value = "";

  while (index < source.length) {
    const char = source[index];
    if (char === "\\") {
      value += source[index + 1] || "";
      index += 2;
      continue;
    }
    if (char === "\"") {
      return { type: "phrase", value, offset: start, end: index + 1 };
    }
    value += char;
    index += 1;
  }

  diagnostics.push({ severity: "warning", message: "Unclosed quoted phrase.", offset: start });
  return { type: "phrase", value, offset: start, end: index };
}

function readRegex(source, start, diagnostics) {
  let index = start + 1;
  let pattern = "";

  while (index < source.length) {
    const char = source[index];
    if (char === "\\") {
      pattern += char + (source[index + 1] || "");
      index += 2;
      continue;
    }
    if (char === "/") {
      index += 1;
      let flags = "";
      while (index < source.length && /[a-z]/i.test(source[index])) {
        flags += source[index];
        index += 1;
      }
      try {
        return { type: "regex", value: new RegExp(pattern, flags), pattern, flags, offset: start, end: index };
      } catch (error) {
        diagnostics.push({ severity: "error", message: `Invalid regex: ${error.message}`, offset: start });
        return { type: "invalid", value: "", offset: start, end: index };
      }
    }
    pattern += char;
    index += 1;
  }

  diagnostics.push({ severity: "error", message: "Unclosed regex pattern.", offset: start });
  return { type: "invalid", value: "", offset: start, end: index };
}

function readProperty(source, start, diagnostics) {
  const end = source.indexOf("]", start + 1);
  if (end === -1) {
    diagnostics.push({ severity: "warning", message: "Unclosed property bracket.", offset: start });
    return { type: "property", value: source.slice(start + 1), offset: start, end: source.length };
  }
  return { type: "property", value: source.slice(start + 1, end), offset: start, end: end + 1 };
}

class Parser {
  constructor(tokens, diagnostics, caseMode) {
    this.tokens = tokens;
    this.diagnostics = diagnostics;
    this.caseMode = caseMode;
    this.index = 0;
  }

  parse() {
    if (this.tokens.length === 0) return { type: "empty" };
    const expression = this.parseOr();
    if (this.peek()) {
      this.diagnostics.push({ severity: "warning", message: `Unexpected token "${this.peek().value}".`, offset: this.peek().offset });
    }
    return expression;
  }

  parseOr() {
    const expressions = [this.parseAnd()];
    while (this.match("or")) {
      expressions.push(this.parseAnd());
    }
    return expressions.length === 1 ? expressions[0] : { type: "or", expressions };
  }

  parseAnd() {
    const expressions = [];
    while (this.peek() && this.peek().type !== ")" && this.peek().type !== "or") {
      expressions.push(this.parseUnary());
    }
    if (expressions.length === 0) return { type: "empty" };
    return expressions.length === 1 ? expressions[0] : { type: "and", expressions };
  }

  parseUnary() {
    const token = this.peek();
    if (token?.type === "word" && token.value.startsWith("-") && token.value.length > 1) {
      this.index += 1;
      return { type: "not", expression: this.termFromToken({ ...token, value: token.value.slice(1) }) };
    }
    return this.parsePrimary();
  }

  parsePrimary() {
    if (this.match("(")) {
      const expression = this.parseOr();
      if (!this.match(")")) {
        this.diagnostics.push({ severity: "warning", message: "Missing closing parenthesis.", offset: this.peek()?.offset });
      }
      return expression;
    }
    const token = this.tokens[this.index++];
    if (!token) return { type: "empty" };
    return this.termFromToken(token);
  }

  termFromToken(token) {
    if (token.type === "invalid") return { type: "invalid" };
    if (token.type === "property") return propertyExpression(token.value);
    if (token.type === "regex") return { type: "term", matcher: { type: "regex", value: token.value }, scope: "all", caseMode: this.caseMode };
    if (token.type === "phrase") return { type: "term", matcher: { type: "text", value: token.value }, scope: "all", caseMode: this.caseMode };

    const scoped = splitScope(token.value);
    if (scoped) {
      const caseMode = scoped.scope === "match-case" ? "match-case" : scoped.scope === "ignore-case" ? "ignore-case" : this.caseMode;
      const scope = scoped.scope === "match-case" || scoped.scope === "ignore-case" ? "all" : scoped.scope;
      const nested = scoped.value ? compileColorGroupQuery(scoped.value, { defaultCaseMode: caseMode }).expression : { type: "empty" };
      if (scoped.scope === "match-case" || scoped.scope === "ignore-case") return nested;
      return { type: "term", matcher: { type: "text", value: scoped.value }, scope, caseMode };
    }

    return { type: "term", matcher: { type: "text", value: token.value }, scope: "all", caseMode: this.caseMode };
  }

  match(type) {
    if (this.peek()?.type !== type) return false;
    this.index += 1;
    return true;
  }

  peek() {
    return this.tokens[this.index];
  }
}

function splitScope(value) {
  const colonIndex = value.indexOf(":");
  if (colonIndex <= 0) return null;
  const scope = value.slice(0, colonIndex).toLowerCase();
  if (!searchableScopes.has(scope)) return null;
  return {
    scope,
    value: value.slice(colonIndex + 1)
  };
}

function propertyExpression(value) {
  const colonIndex = value.indexOf(":");
  const rawName = colonIndex === -1 ? value : value.slice(0, colonIndex);
  const property = normalizeScope(rawName.trim());
  const propertyValue = colonIndex === -1 ? "" : value.slice(colonIndex + 1).trim();
  if (!property) return { type: "invalid" };
  if (!propertyValue) return { type: "property-exists", scope: property };
  return { type: "term", matcher: { type: "text", value: propertyValue }, scope: property, caseMode: defaultCaseMode };
}

function evaluateExpression(expression, context, state) {
  switch (expression.type) {
    case "empty":
      return false;
    case "invalid":
      return false;
    case "and":
      return expression.expressions.every((item) => evaluateExpression(item, context, state));
    case "or":
      return expression.expressions.some((item) => evaluateExpression(item, context, state));
    case "not":
      return !evaluateExpression(expression.expression, context, state);
    case "property-exists":
      return getScopeValues(context, expression.scope).some((value) => value !== "");
    case "term":
      return evaluateTerm(expression, context, state);
    default:
      return false;
  }
}

function evaluateTerm(expression, context) {
  const values = getScopeValues(context, expression.scope);
  if (expression.scope === "bound") {
    return values.some((value) => matchBoolean(value, expression.matcher.value));
  }
  return values.some((value) => matchValue(String(value), expression.matcher, expression.caseMode));
}

function matchValue(value, matcher, caseMode) {
  if (matcher.type === "regex") return matcher.value.test(value);
  const haystack = caseMode === "match-case" ? value : value.toLowerCase();
  const needle = caseMode === "match-case" ? String(matcher.value) : String(matcher.value).toLowerCase();
  return haystack.includes(needle);
}

function matchBoolean(value, expected) {
  const actual = toBoolean(value);
  const wanted = toBoolean(expected);
  return wanted === null ? String(value).toLowerCase().includes(String(expected).toLowerCase()) : actual === wanted;
}

function getScopeValues(context, rawScope) {
  const scope = normalizeScope(rawScope);
  const node = context.node || {};
  const properties = context.properties || {};

  if (scope === "all") {
    return [
      node.id,
      context.nodeId,
      node.label,
      node.kind,
      node.status,
      node.summary,
      context.file,
      context.path,
      context.content,
      ...(node.tags || []),
      ...Object.values(node.data || {}),
      ...Object.values(properties || {})
    ].flatMap(valueToStrings);
  }

  if (scope === "tag") return valueToStrings(node.tags || properties.tags || properties.tag).flatMap((tag) => [tag, tag.replace(/^#/, "")]);
  if (scope === "file") return valueToStrings(context.file || basename(context.path) || basename(node.id) || node.label);
  if (scope === "path") return valueToStrings(context.path || node.path || node.id || node.label);
  if (scope === "content") return valueToStrings(context.content || node.content || node.summary || node.label || node.tags);
  if (scope === "bound") return valueToStrings(properties.bound ?? node.bound ?? node.hasRuntimeBinding ?? node.data?.bound ?? node.data?.hasRuntimeBinding);
  if (scope === "task") return node.kind === "task" ? getScopeValues(context, "all") : [];
  if (scope === "task-todo") return node.kind === "task" && node.status !== "completed" ? getScopeValues(context, "all") : [];
  if (scope === "task-done") return node.kind === "task" && node.status === "completed" ? getScopeValues(context, "all") : [];

  return valueToStrings(properties[scope] ?? node[scope] ?? node.data?.[scope]);
}

function normalizeContext(context) {
  const node = context?.node || context || {};
  return {
    ...context,
    node,
    nodeId: context?.nodeId || node.id,
    content: context?.content ?? node.content ?? node.summary,
    file: context?.file ?? node.file,
    path: context?.path ?? node.path,
    properties: {
      ...(node.data || {}),
      ...(context?.properties || {})
    }
  };
}

function normalizeScope(scope) {
  const normalized = String(scope || "").trim().toLowerCase();
  return propertyAliases.get(normalized) || normalized;
}

function valueToStrings(value) {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.flatMap(valueToStrings);
  if (typeof value === "object") return Object.values(value).flatMap(valueToStrings);
  return [String(value)];
}

function toBoolean(value) {
  const normalized = String(value).toLowerCase();
  if (["1", "bound", "true", "yes"].includes(normalized)) return true;
  if (["0", "false", "no", "unbound"].includes(normalized)) return false;
  return null;
}

function basename(value) {
  return String(value || "").split(/[\\/]/).filter(Boolean).pop() || "";
}

function resolveFallbackColor(context, fallbackColor) {
  if (typeof fallbackColor === "function") return fallbackColor(context);
  return fallbackColor || context.node?.color || "#7dd3fc";
}
