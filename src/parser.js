
let current = 0;


function isTypeSpecifier(token) {
  const types = ['int', 'char', 'float', 'double', 'void'];
  return token.type === 'KEYWORD' && types.includes(token.value);
}

function parse(tokens) {
  return parseProgram(tokens);
}

function parseProgram(tokens) {
  let body = [];
  current = 0;
  console.log("Starting parseProgram, total tokens:", tokens.length);

  while (current < tokens.length) {
    let token = tokens[current];

    if (token.type === 'COMMENT') {
      current++;
      continue;
    }

    console.log("parseProgram, current token:", token);
    if (token.type === 'PREPROCESSOR') {
      body.push({ type: 'PreprocessorDirective', value: token.value.trim() });
      current++;
    } else if (isTypeSpecifier(token)) {
      let funcNode = parseFunctionDefinition(tokens);
      if (funcNode) body.push(funcNode);
    } else {

      current++;
    }
  }
  return { type: 'Program', body };
}

function parseFunctionDefinition(tokens) {
  console.log("parseFunctionDefinition: starting at token:", tokens[current]);

  let returnType = tokens[current].value;
  current++;
  let funcName = tokens[current].value;
  current++;

  if (!tokens[current] || tokens[current].type !== 'OPEN_PAREN') {
    return { error: "Expected '(' after function name" };
  }
  current++; 

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
  current++;

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

function parseCompoundStatement(tokens) {
  console.log("parseCompoundStatement: starting at token:", tokens[current]);
  if (tokens[current].type !== 'OPEN_BRACE') {
    console.error("Expected '{' at start of compound statement", tokens[current]);
    return { error: "Expected '{' at beginning of compound statement" };
  }
  let compound = { type: 'CompoundStatement', body: [] };
  current++;

  while (current < tokens.length && tokens[current].type !== 'CLOSE_BRACE') {
    let stmt = parseStatement(tokens);
    if (stmt) compound.body.push(stmt);
  }
  if (tokens[current] && tokens[current].type === 'CLOSE_BRACE') {
    current++;
  } else {
    console.error("Expected '}' at end of compound statement", tokens[current]);
    return { error: "Expected '}' at end of compound statement" };
  }
  return compound;
}

function parseStatement(tokens) {
  let token = tokens[current];
  if (!token) return null;


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

    return parseDeclaration(tokens, true);
  } else if (token.type === 'OPEN_BRACE') {
    return parseCompoundStatement(tokens);
  } else {
    return parseExpressionStatement(tokens);
  }
}

function parseReturnStatement(tokens) {
  console.log("parseReturnStatement: starting at token:", tokens[current]);
  current++;
  let expr = parseExpression(tokens);
  if (tokens[current] && tokens[current].type === 'SEPARATOR' && tokens[current].value.trim() === ';') {
    current++;
  } else {
    console.error("Expected ';' after return statement", tokens[current]);
  }
  return { type: 'ReturnStatement', expression: expr };
}

function parseIfStatement(tokens) {
  console.log("parseIfStatement: starting at token:", tokens[current]);
  current++; 
  if (!tokens[current] || tokens[current].type !== 'OPEN_PAREN') {
    console.error("Expected '(' after if", tokens[current]);
    return { error: "Expected '(' after if" };
  }
  current++;
  let condition = parseExpression(tokens);
  if (!tokens[current] || tokens[current].type !== 'CLOSE_PAREN') {
    console.error("Expected ')' after if condition", tokens[current]);
    return { error: "Expected ')' after if condition" };
  }
  current++; 
  let thenStmt = parseStatement(tokens);
  let elseStmt = null;
  if (tokens[current] && tokens[current].type === 'KEYWORD' && tokens[current].value === 'else') {
    current++; 
    elseStmt = parseStatement(tokens);
  }
  return { type: 'IfStatement', condition, then: thenStmt, else: elseStmt };
}


function parseForStatement(tokens) {
  console.log("parseForStatement: starting at token:", tokens[current]);
  current++; 
  if (!tokens[current] || tokens[current].type !== 'OPEN_PAREN') {
    console.error("Expected '(' after for", tokens[current]);
    return { error: "Expected '(' after for" };
  }
  current++; 

  let initialization = null;
  if (tokens[current] && isTypeSpecifier(tokens[current])) {
    initialization = parseDeclaration(tokens, false);
  } else {
    initialization = parseExpression(tokens);
  }
  if (tokens[current] && tokens[current].type === 'SEPARATOR' && tokens[current].value.trim() === ';') {
    current++;
  } else {
    console.error("Expected ';' after for initialization", tokens[current]);
  }

  let condition = parseExpression(tokens);
  if (tokens[current] && tokens[current].type === 'SEPARATOR' && tokens[current].value.trim() === ';') {
    current++;
  } else {
    console.error("Expected ';' after for condition", tokens[current]);
  }

  let increment = parseExpression(tokens);
  if (!tokens[current] || tokens[current].type !== 'CLOSE_PAREN') {
    console.error("Expected ')' after for increment", tokens[current]);
    return { error: "Expected ')' after for increment" };
  }
  current++;

  let body = parseStatement(tokens);
  return {
    type: 'ForStatement',
    initialization,
    condition,
    increment,
    body
  };
}

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
      current++;
      initializer = parseExpression(tokens);
    }
    console.log("parseDeclaration: Adding variable", varName, "with initializer:", initializer);
    variables.push({ type: "VariableDeclarator", name: varName, initializer });
    console.log("parseDeclaration loop: checking next token:", tokens[current]);
    if (!tokens[current]) break;
    if (tokens[current].value.trim() === ',') {
      console.log("parseDeclaration: found comma, continuing to next variable");
      current++;
      continue;
    }
    if (expectSemicolon && tokens[current].type === 'SEPARATOR' && tokens[current].value.trim() === ';') {
      console.log("parseDeclaration: found semicolon, ending declaration");
      current++;
    }
    break;
  }
  return {
    type: 'DeclarationStatement',
    varType,
    variables
  };
}

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

  if ((token.type === 'SEPARATOR' && token.value.trim() === ';') || token.type === 'CLOSE_PAREN') {
    return null;
  }

  if (token.type === 'NUMBER' || token.type === 'STRING_LITERAL') {
    current++;
    return { type: 'Literal', value: token.value };
  }

  if (token.type === 'IDENTIFIER' || (token.type === 'KEYWORD' && !isTypeSpecifier(token))) {
    current++;
    let node = { type: 'Identifier', name: token.value };

    if (tokens[current] && tokens[current].type === 'OPEN_PAREN') {
      current++;
      let args = [];
      while (tokens[current] && tokens[current].type !== 'CLOSE_PAREN') {
        let arg = parseExpression(tokens);
        args.push(arg);
        if (tokens[current] && tokens[current].value.trim() === ',') {
          current++;
        }
      }
      if (tokens[current] && tokens[current].type === 'CLOSE_PAREN') {
        current++;
      } else {
        console.error("Expected ')' after function call arguments", tokens[current]);
      }
      return { type: 'FunctionCall', name: node.name, arguments: args };
    }
    return node;
  }

  if (token.type === 'OPEN_PAREN') {
    current++; 
    let expr = parseExpression(tokens);
    if (tokens[current] && tokens[current].type === 'CLOSE_PAREN') {
      current++;
    } else {
      console.error("Expected ')' after expression", tokens[current]);
    }
    return expr;
  }


  current++;
  return { type: 'Unknown', value: token.value };
}

function renderAST(node) {
  if (typeof node !== 'object' || node === null) {
    return `<span class="ast-leaf">${node}</span>`;
  }
  let html = '<ul>';
  if (Array.isArray(node)) {
    node.forEach(child => {
      html += `<li>${renderAST(child)}</li>`;
    });
  } else {
    html += `<li><span class="node-label">${node.type}</span>`;
    for (let key in node) {
      if (key === 'type') continue;
      html += `<ul><li><span class="node-key">${key}:</span> `;
      html += renderAST(node[key]);
      html += `</li></ul>`;
    }
    html += `</li>`;
  }
  html += '</ul>';
  return html;
}


document.getElementById('parseBtn').addEventListener('click', () => {
  const input = document.getElementById('codeInput').value;
  const tokens = tokenize(input); // from your lexer.js
  console.log("TOKENS:", tokens);
  const ast = parse(tokens);
  // // Download AST as JSON automatically
  // const blob = new Blob([JSON.stringify(ast, null, 2)], { type: 'application/json' });
  // const url = URL.createObjectURL(blob);
  // const a = document.createElement('a');
  // a.href = url;
  // a.download = 'ast.json';
  // a.style.display = 'none';
  // document.body.appendChild(a);
  // a.click();
  // document.body.removeChild(a);
  // URL.revokeObjectURL(url);
  window.lastAST = ast;
  console.log("AST:", ast);
  const astOutput = document.getElementById('astOutput');
  astOutput.innerHTML = renderAST(ast);
});