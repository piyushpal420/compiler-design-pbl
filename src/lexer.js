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
  [TokenType.KEYWORD]: /\b(int|char|float|double|if|else|for|while|return|void|include|define)\b/,
  [TokenType.IDENTIFIER]: /\b[a-zA-Z_]\w*\b/,
  [TokenType.NUMBER]: /\b(0x[0-9A-Fa-f]+|\d+(\.\d+)?([eE][-+]?\d+)?)\b/,
  [TokenType.STRING_LITERAL]: /^"([^"\\]|\\.)*"/,
  [TokenType.OPERATOR]: /^(==|!=|<=|>=|\+\+|--|->|&&|\|\||[-+*/%=<>&^|!~])/,
  [TokenType.SEPARATOR]: /^[;,.:]/,
  [TokenType.OPEN_PAREN]: /^[(]/,
  [TokenType.CLOSE_PAREN]: /^[)]/,
  [TokenType.OPEN_BRACE]: /^[{]/,  
  [TokenType.CLOSE_BRACE]: /^[}]/,
  [TokenType.COMMENT]: /^\/\/.*|^\/\*[\s\S]*?\*\//
};

function classifyLexeme(lexeme){
  for (const [type, regex] of Object.entries(tokenRegex)){
    if (regex.test(lexeme)) return { type, value: lexeme };
  }
  return { type: TokenType.UNDEFINED, value: lexeme };
}

function tokenize(inputCode) 
{
  const tokens = [];
  inputCode = inputCode.replace(/\/\*[\s\S]*?\*\//g, match => {
    tokens.push({ type: TokenType.COMMENT, value: match });
    return ' '.repeat(match.length);
  });

  const lines = inputCode.split('\n');

  for (let line of lines) {
    let i = 0;
    if (/^\s*#/.test(line)) {
      const match = line.trim();
      tokens.push({ type: TokenType.PREPROCESSOR, value: match });
      continue;
    }

    while (i < line.length) {
      if (/\s/.test(line[i])) {
        i++;
        continue;
      }
      if (line[i] === '/' && line[i + 1] === '/') {
        const comment = line.slice(i);
        tokens.push({ type: TokenType.COMMENT, value: comment });
        break;
      }
      if (line[i] === '"') {
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
      const twoChar = line.slice(i, i + 2);
      if (tokenRegex[TokenType.OPERATOR].test(twoChar)) {
        tokens.push({ type: TokenType.OPERATOR, value: twoChar });
        i += 2;
        continue;
      }

      const oneChar = line[i];
      if (tokenRegex[TokenType.OPERATOR].test(oneChar)) {
        tokens.push({ type: TokenType.OPERATOR, value: oneChar });
        i++;
        continue;
      }
      if (tokenRegex[TokenType.SEPARATOR].test(oneChar)) {
        tokens.push({ type: TokenType.SEPARATOR, value: oneChar });
        i++;
        continue;
      }
      if (tokenRegex[TokenType.OPEN_PAREN].test(oneChar)) {
        tokens.push({ type: TokenType.OPEN_PAREN, value: oneChar });
        i++;
        continue;
      }
      if (tokenRegex[TokenType.CLOSE_PAREN].test(oneChar)) {
        tokens.push({ type: TokenType.CLOSE_PAREN, value: oneChar });
        i++;
        continue;
      }
      if (tokenRegex[TokenType.OPEN_BRACE].test(oneChar)) {
        tokens.push({ type: TokenType.OPEN_BRACE, value: oneChar });
        i++;
        continue;
      }
      if (tokenRegex[TokenType.CLOSE_BRACE].test(oneChar)) {
        tokens.push({ type: TokenType.CLOSE_BRACE, value: oneChar });
        i++;
        continue;
      }
      let lexeme = '';
      while (i < line.length && /[a-zA-Z0-9_]/.test(line[i])) {
        lexeme += line[i++];
      }

      if (lexeme.length > 0) {
        tokens.push(classifyLexeme(lexeme));
      } else {

        tokens.push({ type: TokenType.UNDEFINED, value: oneChar });
        i++;
      }
    }
  }

  return tokens;
}

document.getElementById('tokenizeBtn').addEventListener('click', () => {
  const input = document.getElementById('codeInput').value;
  const tokenTable = document.getElementById('tokenTableBody');
  tokenTable.innerHTML = "";

  const tokens = tokenize(input);
  for (let token of tokens) {
    const row = document.createElement('tr');
    const typeCell = document.createElement('td');
    const valueCell = document.createElement('td');
    typeCell.textContent = token.type;
    valueCell.textContent = token.value;
    row.appendChild(typeCell);
    row.appendChild(valueCell);
    tokenTable.appendChild(row);
  }
});