// semantic.js

// Custom error class for semantic violations
class SemanticError extends Error {
  constructor(message, node = null) {
    super(message);
    this.name = 'SemanticError';
    this.node = node;
  }
}

// A simple symbol table supporting nested (lexical) scopes
class SymbolTable {
  constructor(parent = null) {
    this.parent = parent;
    this.table = new Map(); // name -> { kind, type, params?, varargs? }
  }

  define(name, entry) {
    if (this.table.has(name)) {
      throw new SemanticError(`'${name}' is already declared in this scope`);
    }
    this.table.set(name, entry);
  }

  lookup(name) {
    if (this.table.has(name)) {
      return this.table.get(name);
    }
    return this.parent ? this.parent.lookup(name) : null;
  }
}

/**
 * Perform semantic analysis on the given AST.
 * Returns an object { ast, errors }, where errors is an array of SemanticError.
 */
function semanticAnalyze(ast) {
  const errors = [];

  const globalScope = new SymbolTable();
  let currentScope = globalScope;
  let currentFunction = null;

  function visit(node) {
    if (!node) return null;

    switch (node.type) {

      case 'Program':
        // Predeclare printf as a varargs function: format + any number of args
        try {
          globalScope.define('printf', {
            kind: 'function',
            returnType: 'int',
            params: ['string_literal'],
            varargs: true
          });
        } catch (_) {}
        node.body.forEach(fn => visit(fn));
        break;

      case 'FunctionDeclaration': {
        // Declare the function
        try {
          currentScope.define(node.name, {
            kind: 'function',
            returnType: node.returnType,
            params: node.parameters.map(p => p.paramType)
          });
        } catch (e) {
          if (e instanceof SemanticError) errors.push(e);
        }

        // Enter its scope
        const outerFunction = currentFunction;
        const outerScope = currentScope;
        currentFunction = node;
        currentScope = new SymbolTable(outerScope);

        // Define parameters
        for (const param of node.parameters) {
          try {
            currentScope.define(param.paramName, {
              kind: 'parameter',
              type: param.paramType
            });
            param.inferredType = param.paramType;
          } catch (e) {
            if (e instanceof SemanticError) errors.push(e);
          }
        }

        visit(node.body);

        // Restore
        currentFunction = outerFunction;
        currentScope = outerScope;
        break;
      }

      case 'CompoundStatement': {
        const outer = currentScope;
        currentScope = new SymbolTable(outer);
        for (const stmt of node.body) visit(stmt);
        currentScope = outer;
        break;
      }

      case 'DeclarationStatement':
        for (const decl of node.variables) {
          try {
            currentScope.define(decl.name, {
              kind: 'variable',
              type: node.varType
            });
            decl.inferredType = node.varType;
          } catch (e) {
            if (e instanceof SemanticError) errors.push(e);
          }
          if (decl.initializer) {
            const it = visit(decl.initializer);
            if (it && it !== node.varType) {
              errors.push(new SemanticError(
                `Cannot initialize '${decl.name}' (type ${node.varType}) with type ${it}`,
                decl
              ));
            }
          }
        }
        break;

      case 'ReturnStatement': {
        const rt = visit(node.expression);
        if (currentFunction) {
          const expected = currentFunction.returnType;
          if (rt && rt !== expected) {
            errors.push(new SemanticError(
              `Return type mismatch in function '${currentFunction.name}': expected ${expected}, got ${rt}`,
              node
            ));
          }
        }
        return rt;
      }

      case 'IfStatement': {
        const ct = visit(node.condition);
        if (ct && ct !== 'int') {
          errors.push(new SemanticError(`If condition must be of type int`, node.condition));
        }
        visit(node.then);
        if (node.else) visit(node.else);
        break;
      }

      case 'ForStatement':
        if (node.initialization) visit(node.initialization);
        if (node.condition) {
          const c = visit(node.condition);
          if (c && c !== 'int') {
            errors.push(new SemanticError(`For condition must be of type int`, node.condition));
          }
        }
        if (node.increment) visit(node.increment);
        visit(node.body);
        break;

      case 'ExpressionStatement':
        return visit(node.expression);

      case 'AssignmentExpression': {
        const rt = visit(node.right);
        const lt = visit(node.left);
        if (lt && rt && lt !== rt) {
          errors.push(new SemanticError(
            `Assignment type mismatch: cannot assign ${rt} to ${lt}`,
            node
          ));
        }
        return lt;
      }

      case 'BinaryExpression': {
        const lt = visit(node.left);
        const rt = visit(node.right);
        if (lt && rt && lt !== rt) {
          errors.push(new SemanticError(
            `Type mismatch in binary '${node.operator}': ${lt} vs ${rt}`,
            node
          ));
        }
        node.inferredType = lt || rt;
        return node.inferredType;
      }

      case 'PrefixExpression':
      case 'PostfixExpression': {
        const at = visit(node.argument || node.left);
        if (at && at !== 'int') {
          errors.push(new SemanticError(
            `Operator '${node.operator}' requires int operand, got ${at}`,
            node
          ));
        }
        node.inferredType = 'int';
        return 'int';
      }

      case 'Identifier': {
        const sym = currentScope.lookup(node.name);
        if (!sym) {
          errors.push(new SemanticError(`'${node.name}' is not declared`, node));
          return null;
        }
        node.inferredType = sym.type;
        return sym.type;
      }

      case 'Literal': {
        // Distinguish string, float, int
        let t;
        if (/^".*"$/.test(node.value)) {
          t = 'string_literal';
        } else if (/\d+\.\d+([eE][+-]?\d+)?/.test(node.value)) {
          t = 'float';
        } else {
          t = 'int';
        }
        node.inferredType = t;
        return t;
      }

      case 'FunctionCall': {
        const fn = currentScope.lookup(node.name);
        if (!fn || fn.kind !== 'function') {
          errors.push(new SemanticError(`'${node.name}' is not a function`, node));
        } else {
          // only enforce count if not varargs
          if (!fn.varargs && node.arguments.length !== fn.params.length) {
            errors.push(new SemanticError(
              `Function '${node.name}' expects ${fn.params.length} args, got ${node.arguments.length}`,
              node
            ));
          }
          // type‐check only the fixed parameters
          for (let i = 0; i < fn.params.length; i++) {
            const arg = node.arguments[i];
            const at = visit(arg);
            const expected = fn.params[i];
            if (at && expected && at !== expected) {
              errors.push(new SemanticError(
                `Argument ${i+1} of '${node.name}' should be ${expected}, got ${at}`,
                arg
              ));
            }
          }
        }
        node.inferredType = fn ? fn.returnType : null;
        return node.inferredType;
      }

      default:
        // Recursively visit any child objects/arrays
        if (Array.isArray(node)) {
          node.forEach(visit);
        } else if (typeof node === 'object') {
          for (const k of Object.keys(node)) {
            if (k !== 'type' && node[k] && typeof node[k] === 'object') {
              visit(node[k]);
            }
          }
        }
        return node.inferredType || null;
    }
  }

  visit(ast);
  return { ast, errors };
}

// Export for CommonJS
if (typeof module !== 'undefined') {
  module.exports = { SemanticError, SymbolTable, semanticAnalyze };
}