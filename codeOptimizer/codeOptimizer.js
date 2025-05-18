function optimizeTAC(tac) {
  const optimized = [];
  const constants = new Map();

  tac.forEach(instr => {
    const opType = instr.op?.type;
    const opValue = instr.op?.value;

    // Directly push non-operator (like func, return, endfunc, call)
    if (opType !== 'OPERATOR') {
      optimized.push(instr);
      return;
    }

    const result = instr.result?.value;
    let arg1 = instr.arg1?.value;
    let arg2 = instr.arg2?.value;

    // Propagate constants
    if (constants.has(arg1)) arg1 = constants.get(arg1);
    if (constants.has(arg2)) arg2 = constants.get(arg2);

    // Constant folding for arithmetic
    if (["+", "-", "*", "/"].includes(opValue) && isNumeric(arg1) && isNumeric(arg2)) {
      const computed = eval(`${arg1} ${opValue} ${arg2}`);
      constants.set(result, computed.toString());
      optimized.push({
        op: { type: "OPERATOR", value: "=" },
        arg1: { type: "NUMBER", value: computed.toString() },
        arg2: null,
        result: instr.result
      });
      return;
    }

    // Constant assignment
    if (opValue === "=" && isNumeric(arg1)) {
      constants.set(result, arg1);
    }

    // Propagate if arg1 is constant
    const newInstr = {
      ...instr,
      arg1: arg1 !== undefined ? { type: typeof arg1 === 'number' ? 'NUMBER' : 'IDENTIFIER', value: arg1 } : null,
      arg2: arg2 !== undefined ? { type: typeof arg2 === 'number' ? 'NUMBER' : 'IDENTIFIER', value: arg2 } : null,
    };

    optimized.push(newInstr);
  });

  return optimized;
}

function isNumeric(value) {
  return !isNaN(parseFloat(value)) && isFinite(value);
}


let threeAdrrCode=[
  {
    "op": {
      "type": "KEYWORD",
      "value": "func"
    },
    "name": "main"
  },
  {
    "op": {
      "type": "OPERATOR",
      "value": "="
    },
    "arg1": {
      "type": "NUMBER",
      "value": "100"
    },
    "arg2": null,
    "result": {
      "type": "IDENTIFIER",
      "value": "a"
    }
  },
  {
    "op": {
      "type": "OPERATOR",
      "value": "="
    },
    "arg1": {
      "type": "NUMBER",
      "value": "200"
    },
    "arg2": null,
    "result": {
      "type": "IDENTIFIER",
      "value": "b"
    }
  },
  {
    "op": {
      "type": "OPERATOR",
      "value": "="
    },
    "arg2": null,
    "result": {
      "type": "IDENTIFIER",
      "value": "c"
    }
  },
  {
    "op": {
      "type": "KEYWORD",
      "value": "call"
    },
    "func": "printf",
    "args": [
      {
        "type": "NUMBER",
        "value": "\"%d\\n\""
      },
      {
        "type": "IDENTIFIER",
        "value": "c"
      }
    ]
  },
  {
    "op": {
      "type": "KEYWORD",
      "value": "return"
    },
    "value": {
      "type": "NUMBER",
      "value": "0"
    }
  },
  {
    "op": {
      "type": "KEYWORD",
      "value": "endfunc"
    },
    "name": "main"
  }
]
// console.log(optimizeTAC(threeAdrrCode));