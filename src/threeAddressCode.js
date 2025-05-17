let tempCount = 0;
function newTemp() {
  return `t${tempCount++}`;
}

// Helper: converts token object or string to readable string
function tokenToString(token) {
  if (!token) return "null";
  if (typeof token === "string") return token;
  if (token.value !== undefined) return `${token.value}`; // just show value
  return JSON.stringify(token);
}

function generateTAC(ast) {
  const tac = [];

  function processNode(node) {
    if (!node) return;

    switch (node.type) {
      case "Program":
        node.body.forEach(processNode);
        break;

      case "FunctionDeclaration":
        tac.push({ op: { type: "KEYWORD", value: "func" }, name: node.name });
        processNode(node.body);
        tac.push({ op: { type: "KEYWORD", value: "endfunc" }, name: node.name });
        break;

      case "CompoundStatement":
        node.body.forEach(processNode);
        break;

      case "DeclarationStatement":
        node.variables.forEach(v => {
          if (v.initializer) {
            let arg1;
            if (v.initializer.type === "Literal") {
              arg1 = { type: "NUMBER", value: v.initializer.value };
            } else if (v.initializer.type === "Identifier") {
              arg1 = { type: "IDENTIFIER", value: v.initializer.name };
            }
            tac.push({ 
              op: { type: "OPERATOR", value: "=" }, 
              arg1: arg1, 
              arg2: null, 
              result: { type: "IDENTIFIER", value: v.name } 
            });
          }
        });
        break;

      case "ExpressionStatement":
        if (node.expression.type === "Unknown" && node.expression.value.startsWith('+')) {
          const varName = node.expression.value.substring(1);
          tac.push({ 
            op: { type: "OPERATOR", value: "+" }, 
            arg1: { type: "IDENTIFIER", value: "c" }, 
            arg2: { type: "IDENTIFIER", value: varName }, 
            result: { type: "IDENTIFIER", value: "c" } 
          });
        }

        if (node.expression.type === "FunctionCall") {
          const args = node.expression.arguments.map(arg => {
            if (arg.type === "Literal") return { type: "NUMBER", value: arg.value };
            if (arg.type === "Identifier") return { type: "IDENTIFIER", value: arg.name };
            return { type: "UNKNOWN", value: "?" };
          });
          tac.push({ 
            op: { type: "KEYWORD", value: "call" }, 
            func: node.expression.name, 
            args 
          });
        }
        break;

      case "ReturnStatement":
        tac.push({ 
          op: { type: "KEYWORD", value: "return" }, 
          value: { type: "NUMBER", value: node.expression.value } 
        });
        break;

      default:
        console.warn("Unhandled node type:", node.type);
    }
  }

  processNode(ast);
  return tac;
}

// Hook to button click (no re-tokenization)
document.getElementById('tacBtn').addEventListener('click', () => {
  if (!window.lastAST) {
    alert("Please parse the code first.");
    return;
  }
  const tac = generateTAC(window.lastAST);
  //   // Download AST as JSON automatically
  // const blob = new Blob([JSON.stringify(tac, null, 2)], { type: 'application/json' });
  // const url = URL.createObjectURL(blob);
  // const a = document.createElement('a');
  // a.href = url;
  // a.download = 'tac.json';
  // a.style.display = 'none';
  // document.body.appendChild(a);
  // a.click();
  // document.body.removeChild(a);
  // URL.revokeObjectURL(url);
  // Convert TAC to readable string for display
  function tacToString(tac) {
    return tac.map(instr => {
      if (instr.op.value === "func" || instr.op.value === "endfunc") {
        return `${instr.op.value} ${instr.name}`;
      }
      if (instr.op.value === "call") {
        const argsStr = instr.args.map(tokenToString).join(", ");
        return `call ${instr.func}(${argsStr})`;
      }
      if (instr.op.value === "return") {
        return `return ${tokenToString(instr.value)}`;
      }
      // General 3-address form
      if ('result' in instr) {
        const arg1Str = tokenToString(instr.arg1);
        const arg2Str = tokenToString(instr.arg2);
        const resStr = tokenToString(instr.result);
        if (arg2Str === "null") {
          return `${resStr} = ${arg1Str}`;
        } else {
          return `${resStr} = ${arg1Str} ${instr.op.value} ${arg2Str}`;
        }
      }
      return JSON.stringify(instr);
    }).join('\n');
  }

  document.getElementById('tacDisplay').textContent = tacToString(tac);
});
