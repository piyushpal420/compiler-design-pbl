function generateAssembly(tacJson) {
  console.log("Starting assembly generation...");
  let regCount = 1;
  let varToReg = {};
  let getNextReg = () => {
    const reg = `R${regCount++}`;
    console.log(`Allocating new register: ${reg}`);
    return reg;
  };
  let code = [];
  let paramQueue = [];

  for (const [index, instr] of tacJson.entries()) {
    const { op, arg1, arg2, result } = instr;
    console.log(`Processing instruction #${index + 1}:`, instr);

    const getOperand = (operand) => {
      if (operand == null) return '';
      const reg = varToReg[operand];
      if (reg) {
        console.log(`Operand '${operand}' mapped to register '${reg}'`);
        return reg;
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
        let instruction = {
          "+": "ADD",
          "-": "SUB",
          "*": "MUL",
          "/": "DIV"
        }[op];
        console.log(`Generating ${instruction} instruction: ${destReg} = ${reg1} ${op} ${reg2}`);
        code.push(`${instruction} ${destReg}, ${reg1}, ${reg2}`);
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
          const value = paramQueue.shift();
          console.log(`Generating PRINT statement with format: ${format} and value: ${value}`);
          code.push(`PRINT ${format}, ${value}`);
        } else {
          console.log(`Generating CALL statement for function ${arg1} with params:`, paramQueue);
          paramQueue.forEach(param => {
            code.push(`PARAM ${param}`);
          });
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
        // Optional: code.push("; end of function");
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
  const tbody = document.getElementById('assemblyBody');
  if (!tbody) {
    console.error("Assembly table body element (#assemblyBody) not found in DOM.");
    return;
  }
  tbody.innerHTML = ''; // Clear previous output

  assemblyCode.forEach((instr, idx) => {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.textContent = instr;
    tr.appendChild(td);
    tbody.appendChild(tr);
  });

  console.log("Assembly code displayed in table.");
}

// Button click handler to generate and display assembly code from lastTAC
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('generateAssemblyBtn').addEventListener('click', () => {
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

