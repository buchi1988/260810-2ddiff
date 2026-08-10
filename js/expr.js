const FUNCS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan, atan2: Math.atan2,
  exp: Math.exp, log: Math.log, log2: Math.log2, log10: Math.log10,
  sqrt: Math.sqrt, abs: Math.abs, pow: Math.pow,
  min: Math.min, max: Math.max, sign: Math.sign,
};

const CONSTS = { pi: Math.PI, e: Math.E };

function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "\t") { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i + 1;
      while (j < src.length && /[0-9.eE]/.test(src[j])) {
        if ((src[j] === "e" || src[j] === "E") && (src[j + 1] === "+" || src[j + 1] === "-")) j++;
        j++;
      }
      const text = src.slice(i, j);
      if (!/^\d*\.?\d+(?:[eE][+-]?\d+)?$/.test(text)) throw new Error(`不正な数値: "${text}"`);
      tokens.push({ type: "num", value: Number(text) });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i + 1;
      while (j < src.length && /[a-zA-Z0-9_]/.test(src[j])) j++;
      tokens.push({ type: "id", value: src.slice(i, j) });
      i = j;
      continue;
    }
    if ("+-*/^(),".includes(c)) {
      tokens.push({ type: c });
      i++;
      continue;
    }
    throw new Error(`不正な文字: "${c}"`);
  }
  return tokens;
}

function parse(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function parseExpr() {
    let node = parseTerm();
    while (peek() && (peek().type === "+" || peek().type === "-")) {
      const op = next().type;
      node = { type: "bin", op, left: node, right: parseTerm() };
    }
    return node;
  }

  function parseTerm() {
    let node = parseUnary();
    while (peek() && (peek().type === "*" || peek().type === "/")) {
      const op = next().type;
      node = { type: "bin", op, left: node, right: parseUnary() };
    }
    return node;
  }

  function parseUnary() {
    if (peek() && (peek().type === "+" || peek().type === "-")) {
      const op = next().type;
      return { type: "unary", op, arg: parseUnary() };
    }
    return parsePower();
  }

  function parsePower() {
    const base = parsePrimary();
    if (peek() && peek().type === "^") {
      next();
      const exp = parseUnary();
      return { type: "bin", op: "^", left: base, right: exp };
    }
    return base;
  }

  function parsePrimary() {
    const tok = peek();
    if (!tok) throw new Error("式が途中で終わっています");
    if (tok.type === "num") { next(); return { type: "num", value: tok.value }; }
    if (tok.type === "(") {
      next();
      const node = parseExpr();
      if (!peek() || peek().type !== ")") throw new Error("括弧が閉じていません");
      next();
      return node;
    }
    if (tok.type === "id") {
      next();
      if (peek() && peek().type === "(") {
        next();
        const args = [];
        if (peek() && peek().type !== ")") {
          args.push(parseExpr());
          while (peek() && peek().type === ",") { next(); args.push(parseExpr()); }
        }
        if (!peek() || peek().type !== ")") throw new Error("括弧が閉じていません");
        next();
        return { type: "call", name: tok.value, args };
      }
      return { type: "var", name: tok.value };
    }
    throw new Error(`予期しないトークン: "${tok.type}"`);
  }

  const ast = parseExpr();
  if (pos < tokens.length) throw new Error(`余分な文字が残っています: "${tokens[pos].type}"`);
  return ast;
}

function evalNode(node, t) {
  switch (node.type) {
    case "num": return node.value;
    case "unary": {
      const v = evalNode(node.arg, t);
      return node.op === "-" ? -v : v;
    }
    case "bin": {
      const a = evalNode(node.left, t);
      const b = evalNode(node.right, t);
      switch (node.op) {
        case "+": return a + b;
        case "-": return a - b;
        case "*": return a * b;
        case "/": return a / b;
        case "^": return Math.pow(a, b);
      }
      break;
    }
    case "var": {
      if (node.name === "t") return t;
      if (node.name in CONSTS) return CONSTS[node.name];
      throw new Error(`未定義の変数: "${node.name}"`);
    }
    case "call": {
      if (!(node.name in FUNCS)) throw new Error(`未定義の関数: "${node.name}"`);
      const args = node.args.map((a) => evalNode(a, t));
      return FUNCS[node.name](...args);
    }
  }
  throw new Error("式を評価できません");
}

// Compiles a math expression string into a function of t.
// Supports +-*/^, parentheses, the FUNCS above, constants pi/e, and variable t.
export function compileExpression(src) {
  const ast = parse(tokenize(src));
  const fn = (t) => evalNode(ast, t);
  // Validate immediately so syntax/runtime errors surface at apply time.
  const probe = fn(0.37);
  if (typeof probe !== "number") throw new Error("式の評価結果が数値になりません");
  return fn;
}
