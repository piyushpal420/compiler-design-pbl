
function generateAssembly(tacJson) {
  console.log("Starting assembly generation...");
  let regCount = 1;
  let varToReg = {};
  const getNextReg = () => {
    const reg = `R${regCount++}`;
    console.log(`Allocating new register: ${reg}`);
    return reg;
  };

  let code = [];
  let paramQueue = [];

  for (const [index, instr] of tacJson.entries()) {
    const { op, arg1, arg2, result } = instr;
    console.log(`Processing instruction #${index + 1}:`, instr);

    const getOperand = operand => {
      if (operand == null) return '';
      if (varToReg[operand]) {
        console.log(`Operand '${operand}' mapped to register '${varToReg[operand]}'`);
        return varToReg[operand];
      }
      console.log(`Operand '${operand}' used as is`);
      return operand;
    };

    switch (op) {
      case "func":
        console.log(`Adding label for function: ${result}`);
        code.push(`LABEL ${result}`);
        break;

      case "=": {
        const reg = getNextReg();
        varToReg[result] = reg;
        console.log(`Assigning ${result} to register ${reg} with value from ${arg1}`);
        code.push(`MOV ${reg}, ${getOperand(arg1)}`);
        break;
      }

      case "+":
      case "-":
      case "*":
      case "/": {
        const reg1 = getOperand(arg1);
        const reg2 = getOperand(arg2);
        const destReg = getNextReg();
        varToReg[result] = destReg;
        const instrMap = { "+": "ADD", "-": "SUB", "*": "MUL", "/": "DIV" };
        console.log(`Generating ${instrMap[op]} instruction: ${destReg} = ${reg1} ${op} ${reg2}`);
        code.push(`${instrMap[op]} ${destReg}, ${reg1}, ${reg2}`);
        break;
      }

      case "param":
        const paramVal = getOperand(arg1);
        console.log(`Queueing parameter: ${paramVal}`);
        paramQueue.push(paramVal);
        break;

      case "call":
        if (arg1 === "printf") {
          const format = paramQueue.shift();
          const value  = paramQueue.shift();
          console.log(`Generating PRINT statement with format: ${format} and value: ${value}`);
          code.push(`PRINT ${format}, ${value}`);
        } else {
          console.log(`Generating CALL statement for function ${arg1} with params:`, paramQueue);
          paramQueue.forEach(p => code.push(`PARAM ${p}`));
          code.push(`CALL ${arg1}`);
        }
        paramQueue = [];
        break;

      case "return":
        const retVal = getOperand(arg1);
        console.log(`Generating RET instruction with value: ${retVal}`);
        code.push(`RET ${retVal}`);
        break;

      case "endfunc":
        console.log("End of function encountered.");
        break;

      default:
        console.warn(`Unknown operation encountered: ${op}`);
        code.push(`; Unknown operation: ${op}`);
    }
  }

  console.log("Assembly generation complete.");
  return code;
}

function displayAssemblyCode(assemblyCode) {
  const tbody = document.getElementById('targetCodeBody');
  if (!tbody) {
    console.error("Assembly table body element (#targetCodeBody) not found in DOM.");
    return;
  }

  tbody.innerHTML = '';

  assemblyCode.forEach(instr => {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.textContent = instr;
    tr.appendChild(td);
    tbody.appendChild(tr);
  });

  console.log("Assembly code displayed in table.");
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('generateAssemblyBtn');
  if (!btn) {
    console.error("Generate Assembly button not found in DOM.");
    return;
  }
  btn.addEventListener('click', () => {
    if (!window.lastTAC) {
      alert('Please generate TAC first.');
      return;
    }
    console.log("Generating assembly from TAC...");
    const assemblyCode = generateAssembly(window.lastTAC);
    displayAssemblyCode(assemblyCode);
  });
});
window.generateTargetCode = generateAssembly;