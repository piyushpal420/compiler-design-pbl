// parser.js

let current = 0;  // Global index for iterating through tokens

// Helper: Check if a token is a type specifier (e.g., int, char, float, double, void)
function isTypeSpecifier(token) {
  const types = ['int', 'char', 'float', 'double', 'void'];
  return token.type === 'KEYWORD' && types.includes(token.value);
}

// -------------------------------------------------
// Main Parse Function
// -------------------------------------------------
function parse(tokens) {
  return parseProgram(tokens);
}

// -------------------------------------------------
// Parse the Entire Program
// -------------------------------------------------
function parseProgram(tokens) {
  let body = [];
  current = 0;
  console.log("Starting parseProgram, total tokens:", tokens.length);

  while (current < tokens.length) {
    let token = tokens[current];

    // --- SKIP COMMENTS AT TOP LEVEL ---
    if (token.type === 'COMMENT') {
      current++;
      continue;
    }

    // --- SKIP PREPROCESSOR DIRECTIVES (treat like comments) ---
    if (token.type === 'PREPROCESSOR') {
      current++;
      continue;
    }

    console.log("parseProgram, current token:", token);
    if (isTypeSpecifier(token)) {
      let funcNode = parseFunctionDefinition(tokens);
      if (funcNode) body.push(funcNode);
    } else {
      // Skip unrecognized tokens
      current++;
    }
  }
  return { type: 'Program', body };
}

// -------------------------------------------------
// Parse a Function Definition
// -------------------------------------------------
function parseFunctionDefinition(tokens) {
  console.log("parseFunctionDefinition: starting at token:", tokens[current]);

  let returnType = tokens[current].value;
  current++;
  let funcName = tokens[current].value;
  current++;

  // Expect '(' for the parameter list
  if (!tokens[current] || tokens[current].type !== 'OPEN_PAREN') {
    return { error: "Expected '(' after function name" };
  }
  current++; // Skip '('

  // Parse parameter list (simplified)
  let parameters = [];
  while (tokens[current] && tokens[current].value.trim() !== ')') {
    if (tokens[current].value.trim() === ',') {
      current++;
      continue;
    }
    if (isTypeSpecifier(tokens[current])) {
      let paramType = tokens[current].value;
      current++;
      let paramName = tokens[current] ? tokens[current].value : "<missing id>";
      current++;
      parameters.push({ type: 'Parameter', paramType, paramName });
    } else {
      current++;
    }
  }
  current++; // Skip ')'

  // Expect '{' to start the function body
  if (!tokens[current] || tokens[current].type !== 'OPEN_BRACE') {
    return { error: "Expected '{' at beginning of function body" };
  }
  let bodyNode = parseCompoundStatement(tokens);
  return {
    type: 'FunctionDeclaration',
    returnType,
    name: funcName,
    parameters,
    body: bodyNode
  };
}

// -------------------------------------------------
// Parse a Compound Statement (block "{ ... }")
// -------------------------------------------------
function parseCompoundStatement(tokens) {
  console.log("parseCompoundStatement: starting at token:", tokens[current]);
  if (tokens[current].type !== 'OPEN_BRACE') {
    console.error("Expected '{' at start of compound statement", tokens[current]);
    return { error: "Expected '{' at beginning of compound statement" };
  }
  let compound = { type: 'CompoundStatement', body: [] };
  current++; // Skip '{'

  while (current < tokens.length && tokens[current].type !== 'CLOSE_BRACE') {
    let stmt = parseStatement(tokens);
    if (stmt) compound.body.push(stmt);
  }
  if (tokens[current] && tokens[current].type === 'CLOSE_BRACE') {
    current++; // Skip '}'
  } else {
    console.error("Expected '}' at end of compound statement", tokens[current]);
    return { error: "Expected '}' at end of compound statement" };
  }
  return compound;
}

// -------------------------------------------------
// Parse a Single Statement
// -------------------------------------------------
function parseStatement(tokens) {
  let token = tokens[current];
  if (!token) return null;

  // --- SKIP COMMENTS INSIDE BLOCKS ---
  if (token.type === 'COMMENT') {
    current++;
    return null;
  }

  console.log("parseStatement: current token:", token);

  if (token.type === 'KEYWORD' && token.value === 'return') {
    return parseReturnStatement(tokens);
  } else if (token.type === 'KEYWORD' && token.value === 'if') {
    return parseIfStatement(tokens);
  } else if (token.type === 'KEYWORD' && token.value === 'for') {
    return parseForStatement(tokens);
  } else if (isTypeSpecifier(token)) {
    // Standalone declarations expect a trailing semicolon.
    return parseDeclaration(tokens, true);
  } else if (token.type === 'OPEN_BRACE') {
    return parseCompoundStatement(tokens);
  } else {
    return parseExpressionStatement(tokens);
  }
}

// -------------------------------------------------
// Parse a Return Statement: "return" expression ";"
// -------------------------------------------------
function parseReturnStatement(tokens) {
  current++;
  let expr = parseExpression(tokens);
  if (tokens[current] && tokens[current].type === 'SEPARATOR' && tokens[current].value.trim() === ';') {
    current++;
  } else {
    console.error("Expected ';' after return statement", tokens[current]);
  }
  return { type: 'ReturnStatement', expression: expr };
}

// -------------------------------------------------
// Parse an If Statement: "if" "(" condition ")" statement [ "else" statement ]
// -------------------------------------------------
function parseIfStatement(tokens) {
  console.log("parseIfStatement: starting at token:", tokens[current]);
  current++; // Skip 'if'
  if (!tokens[current] || tokens[current].type !== 'OPEN_PAREN') {
    console.error("Expected '(' after if", tokens[current]);
    return { error: "Expected '(' after if" };
  }
  current++; // Skip '('
  let condition = parseExpression(tokens);
  if (!tokens[current] || tokens[current].type !== 'CLOSE_PAREN') {
    console.error("Expected ')' after if condition", tokens[current]);
    return { error: "Expected ')' after if condition" };
  }
  current++; // Skip ')'
  let thenStmt = parseStatement(tokens);
  let elseStmt = null;
  if (tokens[current] && tokens[current].type === 'KEYWORD' && tokens[current].value === 'else') {
    current++; // Skip 'else'
    elseStmt = parseStatement(tokens);
  }
  return { type: 'IfStatement', condition, then: thenStmt, else: elseStmt };
}

// -------------------------------------------------
// Parse a For Statement: "for" "(" init ; condition ; increment ")" statement
// -------------------------------------------------
function parseForStatement(tokens) {
  console.log("parseForStatement: starting at token:", tokens[current]);
  current++; // Skip 'for'
  if (!tokens[current] || tokens[current].type !== 'OPEN_PAREN') {
    console.error("Expected '(' after for", tokens[current]);
    return { error: "Expected '(' after for" };
  }
  current++; // Skip '('

  // (1) Initialization: can be a declaration or an expression.
  let initialization = null;
  if (tokens[current] && isTypeSpecifier(tokens[current])) {
    initialization = parseDeclaration(tokens, false);
  } else {
    initialization = parseExpression(tokens);
  }
  if (tokens[current] && tokens[current].type === 'SEPARATOR' && tokens[current].value.trim() === ';') {
    current++; // Consume semicolon after init
  } else {
    console.error("Expected ';' after for initialization", tokens[current]);
  }

  // (2) Condition
  let condition = parseExpression(tokens);
  if (tokens[current] && tokens[current].type === 'SEPARATOR' && tokens[current].value.trim() === ';') {
    current++; // Consume semicolon after condition
  } else {
    console.error("Expected ';' after for condition", tokens[current]);
  }

  // (3) Increment
  let increment = parseExpression(tokens);
  if (!tokens[current] || tokens[current].type !== 'CLOSE_PAREN') {
    console.error("Expected ')' after for increment", tokens[current]);
    return { error: "Expected ')' after for increment" };
  }
  current++; // Skip ')'

  // (4) Loop body
  let body = parseStatement(tokens);
  return {
    type: 'ForStatement',
    initialization,
    condition,
    increment,
    body
  };
}

// -------------------------------------------------
// Parse a Declaration Statement
// -------------------------------------------------
function parseDeclaration(tokens, expectSemicolon) {
  console.log(">>> parseDeclaration: Starting at token:", tokens[current]);
  let varType = tokens[current].value;
  current++;
  const variables = [];
  while (true) {
    console.log("parseDeclaration loop: expecting identifier at token:", tokens[current]);
    if (!tokens[current] || tokens[current].type !== 'IDENTIFIER') {
      console.error("Expected identifier in declaration, got:", tokens[current]);
      break;
    }
    let varName = tokens[current].value;
    current++;
    let initializer = null;
    if (tokens[current] && tokens[current].value.trim() === '=') {
      console.log("parseDeclaration: found '=' at token:", tokens[current]);
      current++; // Skip '='
      initializer = parseExpression(tokens);
    }
    console.log("parseDeclaration: Adding variable", varName, "with initializer:", initializer);
    variables.push({ type: "VariableDeclarator", name: varName, initializer });
    console.log("parseDeclaration loop: checking next token:", tokens[current]);
    if (!tokens[current]) break;
    if (tokens[current].value.trim() === ',') {
      console.log("parseDeclaration: found comma, continuing to next variable");
      current++; // Skip comma
      continue;
    }
    if (expectSemicolon && tokens[current].type === 'SEPARATOR' && tokens[current].value.trim() === ';') {
      console.log("parseDeclaration: found semicolon, ending declaration");
      current++; // Consume semicolon if expected
    }
    break;
  }
  return {
    type: 'DeclarationStatement',
    varType,
    variables
  };
}

// -------------------------------------------------
// Parse an Expression Statement
// -------------------------------------------------
function parseExpressionStatement(tokens) {
  console.log("parseExpressionStatement: starting at token:", tokens[current]);
  let expr = parseExpression(tokens);
  if (tokens[current] && tokens[current].type === 'SEPARATOR' && tokens[current].value.trim() === ';') {
    current++;
  } else {
    console.error("Expected ';' after expression statement", tokens[current]);
  }
  return { type: 'ExpressionStatement', expression: expr };
}

// -------------------------------------------------
// Expression Parsing
// -------------------------------------------------
function parseExpression(tokens) {
  return parseAssignment(tokens);
}

function parseAssignment(tokens) {
  let left = parseEquality(tokens);
  if (tokens[current] && tokens[current].value.trim() === '=') {
    let op = tokens[current].value.trim();
    current++;
    let right = parseAssignment(tokens);
    return { type: 'AssignmentExpression', operator: op, left, right };
  }
  return left;
}

function parseEquality(tokens) {
  let left = parseRelational(tokens);
  while (tokens[current] &&
         (tokens[current].value.trim() === '==' || tokens[current].value.trim() === '!=')) {
    let op = tokens[current].value.trim();
    current++;
    let right = parseRelational(tokens);
    left = { type: 'BinaryExpression', operator: op, left, right };
  }
  return left;
}

function parseRelational(tokens) {
  let left = parseAdditive(tokens);
  while (tokens[current] && ['<', '>', '<=', '>='].includes(tokens[current].value.trim())) {
    let op = tokens[current].value.trim();
    current++;
    let right = parseAdditive(tokens);
    left = { type: 'BinaryExpression', operator: op, left, right };
  }
  return left;
}

function parseAdditive(tokens) {
  let left = parseMultiplicative(tokens);
  while (tokens[current] && 
        (tokens[current].value.trim() === '+' || tokens[current].value.trim() === '-')) {
    let op = tokens[current].value.trim();
    current++;
    let right = parseMultiplicative(tokens);
    left = { type: 'BinaryExpression', operator: op, left, right };
  }
  return left;
}

function parseMultiplicative(tokens) {
  let left = parseUnary(tokens);
  while (tokens[current] &&
         (tokens[current].value.trim() === '*' || 
          tokens[current].value.trim() === '/' || 
          tokens[current].value.trim() === '%')) {
    let op = tokens[current].value.trim();
    current++;
    let right = parseUnary(tokens);
    left = { type: 'BinaryExpression', operator: op, left, right };
  }
  return left;
}

function parseUnary(tokens) {
  if (tokens[current] &&
      (tokens[current].value.trim() === '++' || tokens[current].value.trim() === '--')) {
    let op = tokens[current].value.trim();
    current++;
    let argument = parseUnary(tokens);
    return { type: 'PrefixExpression', operator: op, argument };
  }
  return parsePostfix(tokens);
}

function parsePostfix(tokens) {
  let node = parsePrimary(tokens);
  while (tokens[current] &&
         (tokens[current].value.trim() === '++' || tokens[current].value.trim() === '--')) {
    let op = tokens[current].value.trim();
    current++;
    node = { type: 'PostfixExpression', operator: op, argument: node };
  }
  return node;
}

function parsePrimary(tokens) {
  let token = tokens[current];
  if (!token) return null;

  // Stop at semicolon or closing parenthesis
  if ((token.type === 'SEPARATOR' && token.value.trim() === ';') ||
      token.type === 'CLOSE_PAREN') {
    return null;
  }

  // Numeric or string literal
  if (token.type === 'NUMBER' || token.type === 'STRING_LITERAL') {
    current++;
    return { type: 'Literal', value: token.value };
  }

  // Identifier or function call
  if (token.type === 'IDENTIFIER' ||
      (token.type === 'KEYWORD' && !isTypeSpecifier(token))) {
    current++;
    let node = { type: 'Identifier', name: token.value };

    // Function call: if next token is '(' then parse arguments
    if (tokens[current] && tokens[current].type === 'OPEN_PAREN') {
      current++; // Skip '('
      let args = [];
      while (tokens[current] && tokens[current].type !== 'CLOSE_PAREN') {
        args.push(parseExpression(tokens));
        if (tokens[current] && tokens[current].value.trim() === ',') {
          current++; // Skip ','
        }
      }
      if (tokens[current] && tokens[current].type === 'CLOSE_PAREN') {
        current++; // Skip ')'
      } else {
        console.error("Expected ')' after function call arguments", tokens[current]);
      }

      // *** CRITICAL FIX: emit type "FunctionCall" ***
      return {
        type: 'FunctionCall',
        name: node.name,
        arguments: args
      };
    }

    return node;
  }

  // Parenthesized expression
  if (token.type === 'OPEN_PAREN') {
    current++; // Skip '('
    let expr = parseExpression(tokens);
    if (tokens[current] && tokens[current].type === 'CLOSE_PAREN') {
      current++; // Skip ')'
    } else {
      console.error("Expected ')' after expression", tokens[current]);
    }
    return expr;
  }

  // Fallback for unknown tokens
  current++;
  return { type: 'Unknown', value: token.value };
}


/* ── NEW: renderAST with collapsible markup ───────── */
function renderAST(node) {
  if (typeof node !== 'object' || node === null) {
    return `<span class="ast-leaf">${String(node)}</span>`;
  }

  if (Array.isArray(node)) {
    return node.map(renderAST).join('');
  }

  let html = `<li class="ast-node">
      <div class="node-header">
        <span class="caret">▸</span>
        <span class="node-label">${node.type}</span>
      </div>`;

  html += `<ul>`;
  for (const key of Object.keys(node)) {
    if (key === 'type') continue;
    html += `<li><span class="node-key">${key}:</span> ${renderAST(node[key])}</li>`;
  }
  html += `</ul></li>`;
  return html;
}

/* ── NEW: after injecting HTML, wire up clicks ──── */
function attachTreeInteractivity(rootElement) {
  rootElement.querySelectorAll('.ast-node > .node-header').forEach(header => {
    header.addEventListener('click', () => {
      const node = header.parentElement;
      node.classList.toggle('collapsed');
    });
  });
}

/* ── HOOK the "Parse" button ─────────────────────── */
document.getElementById('parseBtn').addEventListener('click', () => {
  const codeInput = document.getElementById('codeInput').value;
  const tokens    = tokenize(codeInput);       // from lexer.js
  const ast       = parse(tokens);             // from parser.js

  // 1) Render the AST into its own container
  const treeDiv = document.getElementById('astTree');
  treeDiv.innerHTML = `<ul>${renderAST(ast)}</ul>`;
  attachTreeInteractivity(treeDiv);

  // 2) Run semantic analysis
  const semErrors = semanticAnalyze(ast).errors;
  const errList   = document.getElementById('semErrors');
  if (semErrors.length === 0) {
    errList.innerHTML = `<li>No semantic errors!</li>`;
    errList.style.color = '#0f0';  // green text
  } else {
    errList.innerHTML = semErrors
      .map(e => `<li>${e.message}</li>`)
      .join('');
    errList.style.color = '#f66';  // red text
  }
});