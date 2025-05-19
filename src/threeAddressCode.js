let tempCount = 0;

function newTemp() {
  return `t${tempCount++}`;
}

function generateTAC(ast) {
  const tac = [];
  tempCount = 0;

  function processExpression(node) {
    if (!node) return null;

    switch (node.type) {
      case "Literal":
      case "NumberLiteral":
        return node.value;

      case "Identifier":
        return node.name;

      case "Unknown":
        if (typeof node.value === 'string') {
          return node.value.replace(/^[+\-*/]/, '');
        }
        return node.value;

      case "BinaryExpression": {
        const left = processExpression(node.left);
        const right = processExpression(node.right);
        const temp = newTemp();
        tac.push({ op: node.operator, arg1: left, arg2: right, result: temp });
        return temp;
      }

      case "AssignmentExpression": {
        const right = processExpression(node.right);
        const leftName = node.left?.name || node.left?.value;
        tac.push({ op: "=", arg1: right, arg2: null, result: leftName });
        return leftName;
      }

      case "FunctionCall":
      case "CallExpression": {
        let funcName = typeof node.name === 'string'
          ? node.name
          : node.name?.name || node.callee?.name || 'anonymous_func';

        const argsArr = Array.isArray(node.args)
          ? node.args
          : Array.isArray(node.arguments)
            ? node.arguments
            : [];

        argsArr.forEach(argNode => {
          const val = processExpression(argNode);
          tac.push({ op: 'param', arg1: val, arg2: null, result: null });
        });
        
        tac.push({ op: 'call', arg1: funcName, arg2: null, result: null });
        return null;
      }

      default:
        console.warn('Unhandled expr type:', node.type);
        return null;
    }
  }

  function processNode(node) {
    if (!node) return;

    switch (node.type) {
      case 'Program':
        node.body.forEach(processNode);
        break;

      case 'FunctionDeclaration': {
        const name = node.id?.name || node.name || 'anonymous_func';
        tac.push({ op: 'func', arg1: null, arg2: null, result: name });
        processNode(node.body);
        tac.push({ op: 'endfunc', arg1: null, arg2: null, result: name });
        break;
      }

      case 'BlockStatement':
      case 'CompoundStatement':
        node.body.forEach(processNode);
        break;

      case 'VariableDeclaration':
      case 'DeclarationStatement': {
        const decls = node.declarations || node.variables || [];
        decls.forEach(d => {
          const init = d.init || d.initializer;
          if (init) {
            const val = processExpression(init);
            const varName = d.id?.name || d.name;
            tac.push({ op: '=', arg1: val, arg2: null, result: varName });
          }
        });
        break;
      }

      case 'ExpressionStatement':
        processExpression(node.expression);
        break;

      case 'ReturnStatement': {
        const expr = node.argument || node.expression;
        const val = processExpression(expr);
        tac.push({ op: 'return', arg1: val, arg2: null, result: null });
        break;
      }

      default:
        console.warn('Unhandled node type:', node.type);
    }
  }

  processNode(ast);
  return tac;
}

window.generateTAC = generateTAC;

