function isNumeric(val) {
  return !isNaN(parseFloat(val)) && isFinite(val);
}

function optimizeTAC(tac) {
  console.log('THree Address Code : ',tac);
  const optimized = [];
  const constantMap = {}; // to hold constants

  //console.log('Starting optimization on TAC:', JSON.stringify(tac, null, 2));

  for (let instr of tac) {
    console.log('Processing instruction:', instr);

    // Constant folding for binary operations with support for constant propagation
    if (['+', '-', '*', '/'].includes(instr.op)) {
      // Look up constant values if args are variables
      const arg1Val = !isNaN(instr.arg1) ? instr.arg1 : constantMap[instr.arg1];
      const arg2Val = !isNaN(instr.arg2) ? instr.arg2 : constantMap[instr.arg2];

      if (arg1Val !== undefined && arg2Val !== undefined) {
        const val1 = parseFloat(arg1Val);
        const val2 = parseFloat(arg2Val);
        let result;

        switch (instr.op) {
          case '+': result = val1 + val2; break;
          case '-': result = val1 - val2; break;
          case '*': result = val1 * val2; break;
          case '/': result = val1 / val2; break;
        }

        // Replace with assignment of constant result
        optimized.push({ op: '=', arg1: result.toString(), arg2: null, result: instr.result });
        constantMap[instr.result] = result.toString();

        console.log(`Constant folding: folded ${val1} ${instr.op} ${val2} = ${result}`);
        continue;
      }
    }

    // Constant propagation for assignments
    if (instr.op === '=' && constantMap[instr.arg1]) {
      console.log(`Constant propagation: replacing ${instr.arg1} with ${constantMap[instr.arg1]}`);
      optimized.push({ ...instr, arg1: constantMap[instr.arg1] });
      constantMap[instr.result] = constantMap[instr.arg1];
      continue;
    }

    // Otherwise, push the original instruction
    optimized.push(instr);
  }

  //console.log('Optimization result:', JSON.stringify(optimized, null, 2));
  return optimized;
}

function eliminateDeadCode(tac) {
  const used = new Set();

  //console.log('Starting dead code elimination on TAC:', JSON.stringify(tac, null, 2));

  // Start with variables used in return, param, call, etc.
  tac.forEach(instr => {
    if (typeof instr.arg1 === 'string') used.add(instr.arg1);
    if (typeof instr.arg2 === 'string') used.add(instr.arg2);
    if (instr.op === 'return' && typeof instr.arg1 === 'string') {
      used.add(instr.arg1);
    }
  });

  const resultUsed = new Set();

  // Traverse backwards: retain only instructions whose result is used
  const filtered = [];
  for (let i = tac.length - 1; i >= 0; i--) {
    const instr = tac[i];
    if (!instr.result || used.has(instr.result) || ['param', 'call', 'return', 'func', 'endfunc'].includes(instr.op)) {
      filtered.unshift(instr);
      // Mark arguments of this instruction as used
      if (typeof instr.arg1 === 'string') used.add(instr.arg1);
      if (typeof instr.arg2 === 'string') used.add(instr.arg2);
    }
  }

  //console.log('Dead code eliminated TAC:', JSON.stringify(filtered, null, 2));
  return filtered;
}
function extractValue(field) {
  if (!field) return '';
  if (Array.isArray(field)) {
    return field.map(f => f?.value || '').join(', ');
  }
  if (typeof field === 'object' && 'value' in field) {
    return field.value;
  }
  return String(field);
}

function download(x, y)
  {
    
    // Download AST as JSON automatically
    const blob = new Blob([JSON.stringify(x, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = y+'.json';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('optimizeBtn');
  if (!btn) {
    console.warn('Optimize button not found in the DOM');
    return;
  }

  btn.addEventListener('click', () => {
    console.log(window)
    if (!window.lastTAC || !Array.isArray(window.lastTAC)) {
      alert('No TAC found in window.tac');
      return;
    }

    const optimized = optimizeTAC(window.lastTAC);
    const finalTAC = eliminateDeadCode(optimized);
    // download(finalTAC,'OptimizedCode')
    window.finalOptimizedCode=finalTAC;

    const tbody = document.getElementById('optimizedQuadrupleBody');
    if (!tbody) {
      console.warn('Table body #optimizedQuadrupleBody not found');
      return;
    }
    tbody.innerHTML = '';

    finalTAC.forEach(instr => {
      const row = document.createElement('tr');
      ['op', 'arg1', 'arg2', 'result'].forEach(key => {
        const cell = document.createElement('td');
        cell.textContent = instr[key] != null ? instr[key] : '';
        row.appendChild(cell);
      });
      tbody.appendChild(row);
    });
  });
});

// input for code Optimization 

// #include <stdio.h>

// int main() {
//     int t0 = 3 + 5;
//     int x = t0;
//     int t1 = x + 7;
//     int y = t1;
//     int c = 42;  // Assume c is some value to be printed
//     printf("%d\n", c);
//     return 0;
// }

// output 
// #include <stdio.h>

// int main() {
//     int c = 42;
//     printf("%d\n", c);
//     return 0;
// }
