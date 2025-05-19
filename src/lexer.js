// lexer.js

const TokenType = {
  PREPROCESSOR: 'PREPROCESSOR',
  KEYWORD: 'KEYWORD',
  IDENTIFIER: 'IDENTIFIER',
  NUMBER: 'NUMBER',
  STRING_LITERAL: 'STRING_LITERAL',
  OPERATOR: 'OPERATOR',
  SEPARATOR: 'SEPARATOR',
  OPEN_PAREN: 'OPEN_PAREN',
  CLOSE_PAREN: 'CLOSE_PAREN',
  OPEN_BRACE: 'OPEN_BRACE',
  CLOSE_BRACE: 'CLOSE_BRACE',
  COMMENT: 'COMMENT',
  UNDEFINED: 'UNDEFINED'
};

const tokenRegex = {
  [TokenType.PREPROCESSOR]: /^#\s*\w+\s*(<[^>]+>|\"[^\"]+\")/,
  [TokenType.KEYWORD]:      /\b(int|char|float|double|if|else|for|while|return|void|include|define)\b/,
  [TokenType.IDENTIFIER]:   /\b[a-zA-Z_]\w*\b/,
  // keep \. in here for classifyLexeme, but we'll capture floats earlier in tokenize()
  [TokenType.NUMBER]:       /\b(0x[0-9A-Fa-f]+|\d+(\.\d+)?([eE][-+]?\d+)?)\b/,
  [TokenType.STRING_LITERAL]: /^"([^"\\]|\\.)*"/,
  [TokenType.OPERATOR]:     /^(==|!=|<=|>=|\+\+|--|->|&&|\|\||[-+*/%=<>&^|!~])/,
  // Removed the dot from separators:
  [TokenType.SEPARATOR]:    /^[;,:]/,
  [TokenType.OPEN_PAREN]:   /^[(]/,
  [TokenType.CLOSE_PAREN]:  /^[)]/,
  [TokenType.OPEN_BRACE]:   /^[{]/,
  [TokenType.CLOSE_BRACE]:  /^[}]/,
  [TokenType.COMMENT]:      /^\/\/.*|^\/\*[\s\S]*?\*\//
};

function classifyLexeme(lexeme) {
  for (const [type, regex] of Object.entries(tokenRegex)) {
    if (regex.test(lexeme)) return { type, value: lexeme };
  }
  return { type: TokenType.UNDEFINED, value: lexeme };
}

function tokenize(inputCode) {
  const tokens = [];

  // Extract multiline comments first
  inputCode = inputCode.replace(/\/\*[\s\S]*?\*\//g, match => {
    tokens.push({ type: TokenType.COMMENT, value: match });
    return ' '.repeat(match.length);
  });

  const lines = inputCode.split('\n');
  for (let line of lines) {
    let i = 0;

    // Preprocessor?
    if (/^\s*#/.test(line)) {
      tokens.push({ type: TokenType.PREPROCESSOR, value: line.trim() });
      continue;
    }

    while (i < line.length) {
      const ch = line[i];

      // Whitespace
      if (/\s/.test(ch)) { i++; continue; }

      // Single-line comment
      if (ch === '/' && line[i+1] === '/') {
        tokens.push({ type: TokenType.COMMENT, value: line.slice(i) });
        break;
      }

      // String literal
      if (ch === '"') {
        const match = line.slice(i).match(/^"([^"\\]|\\.)*"/);
        if (match) {
          tokens.push({ type: TokenType.STRING_LITERAL, value: match[0] });
          i += match[0].length;
        } else {
          tokens.push({ type: TokenType.UNDEFINED, value: '"' });
          i++;
        }
        continue;
      }

      // **New**: Floating‐point or integer literal (captures 3.14, 42, 6.02e23, etc.)
      {
        const numMatch = line.slice(i).match(/^[0-9]+(\.[0-9]+)?([eE][-+]?[0-9]+)?/);
        if (numMatch) {
          tokens.push({ type: TokenType.NUMBER, value: numMatch[0] });
          i += numMatch[0].length;
          continue;
        }
      }

      // Two-char operators
      const two = line.slice(i, i+2);
      if (tokenRegex[TokenType.OPERATOR].test(two)) {
        tokens.push({ type: TokenType.OPERATOR, value: two });
        i += 2;
        continue;
      }

      // Single-char operator
      if (tokenRegex[TokenType.OPERATOR].test(ch)) {
        tokens.push({ type: TokenType.OPERATOR, value: ch });
        i++;
        continue;
      }

      // Separator (; , :)
      if (tokenRegex[TokenType.SEPARATOR].test(ch)) {
        tokens.push({ type: TokenType.SEPARATOR, value: ch });
        i++;
        continue;
      }

      // Parens & braces
      if (tokenRegex[TokenType.OPEN_PAREN].test(ch)) {
        tokens.push({ type: TokenType.OPEN_PAREN, value: ch });
        i++;
        continue;
      }
      if (tokenRegex[TokenType.CLOSE_PAREN].test(ch)) {
        tokens.push({ type: TokenType.CLOSE_PAREN, value: ch });
        i++;
        continue;
      }
      if (tokenRegex[TokenType.OPEN_BRACE].test(ch)) {
        tokens.push({ type: TokenType.OPEN_BRACE, value: ch });
        i++;
        continue;
      }
      if (tokenRegex[TokenType.CLOSE_BRACE].test(ch)) {
        tokens.push({ type: TokenType.CLOSE_BRACE, value: ch });
        i++;
        continue;
      }

      // Identifiers, keywords, hex/int/float (fallback)
      let lexeme = '';
      while (i < line.length && /[A-Za-z0-9_]/.test(line[i])) {
        lexeme += line[i++];
      }
      if (lexeme) {
        tokens.push(classifyLexeme(lexeme));
      } else {
        tokens.push({ type: TokenType.UNDEFINED, value: ch });
        i++;
      }
    }
  }

  return tokens;
}

document.getElementById('tokenizeBtn').addEventListener('click', () => {
  const input = document.getElementById('codeInput').value;
  const tbody = document.getElementById('tokenTableBody');
  tbody.innerHTML = '';
  for (const tok of tokenize(input)) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${tok.type}</td><td>${tok.value}</td>`;
    tbody.appendChild(tr);
  }
});