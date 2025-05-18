
function isNumeric(val) {
    return !isNaN(parseFloat(val)) && isFinite(val);
}

function optimizeTAC(tac) {
    const optimized = [];
    const constants = new Map();

    tac.forEach(instr => {
        const opType = instr.op?.type;
        const opValue = instr.op?.value;

        if (opType !== 'OPERATOR') {
            optimized.push(instr);
            return;
        }

        const result = instr.result?.value;
        let arg1 = instr.arg1?.value;
        let arg2 = instr.arg2?.value;

        if (constants.has(arg1)) arg1 = constants.get(arg1);
        if (constants.has(arg2)) arg2 = constants.get(arg2);

        if (["+", "-", "*", "/"].includes(opValue) && isNumeric(arg1) && isNumeric(arg2)) {
            const folded = eval(`${arg1} ${opValue} ${arg2}`);
            constants.set(result, folded.toString());
            optimized.push({
                op: { type: "OPERATOR", value: "=" },
                arg1: { type: "NUMBER", value: folded.toString() },
                arg2: null,
                result: { type: "IDENTIFIER", value: result }
            });
            return;
        }

        if (opValue === "=" && isNumeric(arg1)) {
            constants.set(result, arg1);
        }

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

document.getElementById('optimizeBtn').addEventListener('click', () => {
    if (!window.lastTAC) {
        alert("Please generate TAC first.");
        return;
    }
    console.log("Clicked")
    const optimizedTAC = optimizeTAC(window.lastTAC);
    const tbody = document.getElementById('optimizedQuadrupleBody');
    tbody.innerHTML = '';

    optimizedTAC.forEach(instr => {
        const tr = document.createElement('tr');
        const op = extractValue(instr.op);
        const arg1 = extractValue(instr.arg1);
        const arg2 = extractValue(instr.arg2);
        const result = extractValue(instr.result);

        [op, arg1, arg2, result].forEach(text => {
            const td = document.createElement('td');
            td.textContent = text;
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
});
