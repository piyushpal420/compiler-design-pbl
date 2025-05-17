let tempCount = 0;
function newTemp() {
  return `t${tempCount++}`;
}

function generateTAC(ast) {
  const tac = [];
  tempCount = 0;

  function processExpression(node) 
  {
    if (!node) return null;

    switch (node.type) {
      case "Literal":
        return { type: "NUMBER", value: node.value };

      case "Identifier":
        return { type: "IDENTIFIER", value: node.name };

      case "BinaryExpression": {
        const left = processExpression(node.left);
        const right = processExpression(node.right);
        const temp = { type: "IDENTIFIER", value: newTemp() };
        tac.push({
          op: { type: "OPERATOR", value: node.operator },
          arg1: left,
          arg2: right,
          result: temp
        });
        return temp;
      }

      case "AssignmentExpression": {
        const right = processExpression(node.right);
        const left = { type: "IDENTIFIER", value: node.left.name };
        tac.push({
          op: { type: "OPERATOR", value: "=" },
          arg1: right,
          arg2: null,
          result: left
        });
        return left;
      }

    case "FunctionCall": {
      const funcName = node.name?.name || node.name || "anonymous_func";

      const args = Array.isArray(node.args)
        ? node.args.map(arg => processExpression(arg))
        : [];

      tac.push({
        op: { type: "KEYWORD", value: "call" },
        func: funcName,
        args: args
      });

      return null;
    }


      default:
        console.warn("Unhandled expression type:", node.type, JSON.stringify(node, null, 2));
        return { type: "UNKNOWN", value: "?" };

    }
  }

  function processNode(node) {
    if (!node) return;

    switch (node.type) {
      case "Program":
        node.body.forEach(processNode);
        break;

      case "FunctionDeclaration": {
        const funcName = node.id?.name || node.name || "anonymous_func";
        tac.push({ op: { type: "KEYWORD", value: "func" }, name: funcName });
        processNode(node.body);
        tac.push({ op: { type: "KEYWORD", value: "endfunc" }, name: funcName });
        break;
      }

      case "CompoundStatement":
        node.body.forEach(processNode);
        break;

      case "DeclarationStatement":
        node.variables.forEach(v => {
          if (v.initializer) {
            const exprResult = processExpression(v.initializer);
            tac.push({
              op: { type: "OPERATOR", value: "=" },
              arg1: exprResult,
              arg2: null,
              result: { type: "IDENTIFIER", value: v.name }
            });
          }
        });
        break;

      case "ExpressionStatement":
        processExpression(node.expression);
        break;

      case "ReturnStatement": {
        const retVal = processExpression(node.expression);
        tac.push({
          op: { type: "KEYWORD", value: "return" },
          value: retVal
        });
        break;
      }

      default:
        console.warn("Unhandled node type:", node.type);
    }
  }

  processNode(ast);
  return tac;
}
