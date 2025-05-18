// optimizer.js

function optimizeTAC(tac) {
  const optimized = [];
  const constants = new Map();

  tac.forEach(instr => {
    const opType = instr.op?.type;
    const opValue = instr.op?.value;

    // Push non-operator instructions directly
    if (opType !== 'OPERATOR') {
      optimized.push(instr);
      return;
    }

    const result = instr.result?.value;
    let arg1 = instr.arg1?.value;
    let arg2 = instr.arg2?.value;

    // Constant propagation
    if (constants.has(arg1)) arg1 = constants.get(arg1);
    if (constants.has(arg2)) arg2 = constants.get(arg2);

    // Constant folding
    if (["+", "-", "*", "/"].includes(opValue) && isNumeric(arg1) && isNumeric(arg2)) {
      const folded = eval(`${arg1} ${opValue} ${arg2}`);
      constants.set(result, folded.toString());
      optimized.push({
        op: { type: "OPERATOR", value: "=" },
        arg1: { type: "NUMBER", value: folded.toString() },
        arg2: null,
        result: instr.result
      });
      return;
    }

    // Constant assignment
    if (opValue === "=" && isNumeric(arg1)) {
      constants.set(result, arg1);
    }

    // Build updated instruction with propagated values
    const newInstr = {
      ...instr,
      arg1: arg1 !== undefined && arg1 !== null
        ? { type: isNumeric(arg1) ? "NUMBER" : "IDENTIFIER", value: arg1 }
        : null,
      arg2: arg2 !== undefined && arg2 !== null
        ? { type: isNumeric(arg2) ? "NUMBER" : "IDENTIFIER", value: arg2 }
        : null
    };

    optimized.push(newInstr);
  });

  return optimized;
}

function isNumeric(val) {
  return !isNaN(parseFloat(val)) && isFinite(val);
}

// Example usage
const fs = require('fs');

// Load TAC JSON
const tac = JSON.parse(fs.readFileSync('tac.json', 'utf8'));

// Run optimizer
const optimizedTAC = optimizeTAC(tac);

// Output optimized TAC
fs.writeFileSync('optimized_tac.json', JSON.stringify(optimizedTAC, null, 2));

console.log('✅ Optimized TAC saved to optimized_tac.json');
