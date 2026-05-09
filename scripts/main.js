// This is a poorly written code. Mostly Because I burnt out a little and just wanted to get done with it.
// If you want help understanding this code, you can ask me on Bedrock Addons Server.
// Made by Efficient123.

import { world, system } from "@minecraft/server";

let initialisedVars = {};
let availableFunc = {};

const funcHandler = async (invoker, player) => {
    const i = invoker.indexOf('(');
    if (i === -1) {
        world.sendMessage("§cNot a function.");
        return;
    }
    const funcName = invoker.slice(0, i);
    let args = invoker.slice(i);
    if (!args.startsWith('(') || !args.endsWith(')')) {
        world.sendMessage("§cNot a valid way to invoke a function.");
        return;
    }
    if (!(funcName in availableFunc)) {
        world.sendMessage("§cNot a function. Check your spelling?");
        return;
    }
    args = args.slice(1, args.length - 1);
    if (args.includes('(') || args.includes(')')) {
        world.sendMessage("§cInvalid arguments.");
        return;
    }
    let eachArg = args.split(',').map(arg => arg.trim());
    const funcInstance = availableFunc[funcName];
    if (funcInstance[0].length < eachArg.length) {
        world.sendMessage("§cToo many arguments.");
        return;
    }
    let funcArgs = funcInstance[0].map(arg => {
        return '/' + arg + '/';
    });

    const instructions = funcInstance[1];

    let toBeCompiled = [];
    instructions.forEach(line => {
        let newLine = line;
        eachArg.forEach((arg, i) => {
            newLine = newLine.replaceAll(funcArgs[i], arg);
        });
        toBeCompiled.push(newLine);
    });
    await compiler(toBeCompiled, player);
}

const say = (message) => {
    message = message.trim();
    let argument = message.slice(4, message.length - 1);
    let fullMsg = "";
    let argParts = argument.split('+');
    argParts = argParts.map(arg => arg.trim());
    argParts.forEach(msg => {
        if (msg.startsWith(`"`) && msg.endsWith(`"`)) {
            fullMsg += msg.slice(1, msg.length - 1);
        } else if (!isNaN(msg)) {
            fullMsg += msg;
        } else if (msg.split(" ").length === 1 && msg in initialisedVars) {
            fullMsg += String(initialisedVars[msg]);
        } else {
            world.sendMessage("§cInvalid arguments of say function.");
            return;
        };
    });
    world.sendMessage(fullMsg);
}

const initializeVars = async (line, player) => {
    line = line.split("=")
    if (line.length !== 2) {
        world.sendMessage("§cInvalid intialization of variable.");
        return;
    }
    const syntax = line[0].trim().split(' ');
    const message = line[1].trim();
    if (syntax.length !== 2) {
        world.sendMessage("§cInvalid intialization of variable.");
        return;
    }
    const name = syntax[1];
    if (!isNaN(name)) {
        world.sendMessage("§cVariable name cannot be a number.");
        return;
    }
    if (name.includes('(') || name.includes(')')) {
        world.sendMessage("§cVariable name cannot have ')' or '(' in them.");
        return;
    }
    if (message.trim() === 'readNext()') {
        return { read: true, name: name };
    }
    if (message.startsWith(`"`) && message.endsWith(`"`)) {
        initialisedVars[name] = message.slice(1, message.length - 1);
        return;
    }
    if (!message.includes('+') && !message.includes('-') && !message.includes('/') && !message.includes('*')) {
        if (!isNaN(message)) {
            initialisedVars[name] = Number(message);
        } else if (message.split(" ").length === 1 && message in initialisedVars) {
            initialisedVars[name] = initialisedVars[message];
        } else if (typeChecker(message) === 3) {
            await funcHandler(message, player);
        } else {
            world.sendMessage("§cInvalid intialization of variables.");
        }
    } else {
        const cond =
            (message.includes('+') ? 1 : 0) +
            (message.includes('-') ? 1 : 0) +
            (message.includes('*') ? 1 : 0) +
            (message.includes('/') ? 1 : 0)
        if (cond > 1) {
            world.sendMessage("§cOnly one operator is allowed.");
            return;
        }
        const operator = ['+', '-', '*', '/'].find(op => message.includes(op));
        const elements = message.split(operator);
        if (elements.length > 2) {
            world.sendMessage("§cOnly two numbers can be used.");
            return;
        }
        let num1 = elements[0].trim();
        let num2 = elements[1].trim();
        const num1type = typeChecker(num1);
        const num2type = typeChecker(num2);
        if (num1type === 1) {
            num1 = Number(num1);
        } else {
            num1 = getVar(num1);
        }
        if (num2type === 1) {
            num2 = Number(num2);
        } else {
            num2 = getVar(num2);
        }
        if (isNaN(num1) || isNaN(num2)) {
            world.sendMessage("§cCannot perform operations on non numbers.")
        }
        let result;
        switch (operator) {
            case '+': result = num1 + num2; break;
            case '-': result = num1 - num2; break;
            case '/': result = num1 / num2; break;
            case '*': result = num1 * num2; break;
        }
        initialisedVars[name] = result;
    }
}

const getVar = (val) => {
    if (val in initialisedVars) return initialisedVars[val];
    return "Not found.";
}

const typeChecker = (value) => {
    if (value.startsWith(`"`) && value.endsWith(`"`)) {
        return 0;
    } else if (!isNaN(value)) {
        return 1;
    } else if (!value.includes('(') && !value.includes(')')) {
        return 2;
    } else {
        return 3;
    }
}

const ifFunc = async (ifNest, player) => {
    let toBeCompiled = false;
    let cond = ifNest[0].slice(2).trim();
    if (!cond.startsWith('(') || !cond.endsWith(')')) {
        world.sendMessage('§cInvalid if statement syntax.');
        return;
    }
    cond = cond.slice(1, cond.length - 1);
    const count = (cond.includes('==') ? 1 : 0) + (cond.includes('>') ? 1 : 0) + (cond.includes('<') ? 1 : 0);

    if (count !== 1) {
        world.sendMessage('§cPlease provide exactly one comparison sign.');
        return;
    }
    let operator = ['==', '>', '<'].find(op => cond.includes(op))
    let value = cond.split(operator);
    let val1 = value[0].trim();
    let val2 = value[1].trim();
    let val1type = typeChecker(val1);
    let val2type = typeChecker(val2);

    if (val1type === 0) val1 = val1.slice(1, val1.length - 1);
    else if (val1type === 1) val1 = Number(val1);
    else val1 = getVar(val1);

    if (val2type === 0) val2 = val2.slice(1, val2.length - 1);
    else if (val2type === 1) val2 = Number(val2);
    else val2 = getVar(val2);

    switch (operator) {
        case '==': if (val1 === val2) toBeCompiled = true; break;
        case '>': if (Number(val1) > Number(val2)) toBeCompiled = true; break;
        case '<': if (Number(val1) < Number(val2)) toBeCompiled = true; break;
    }

    let codeToBeExecuted = [];
    let scope = 0;

    if (toBeCompiled) {
        for (let i = 1; i < ifNest.length; i++) {
            let line = ifNest[i].trim();
            if (line.startsWith('if ')) scope++;
            if (line === 'end') scope--;

            if (scope < 0 || (scope === 0 && line === 'else')) {
                await compiler(codeToBeExecuted, player);
                return;
            }
            codeToBeExecuted.push(ifNest[i]);
        }
    } else {
        let startPush = false;
        for (let i = 1; i < ifNest.length; i++) {
            let line = ifNest[i].trim();
            if (line === 'else' && scope === 0) {
                startPush = true;
                continue;
            }
            if (line.startsWith('if ')) scope++;
            if (line === 'end') scope--;

            if (startPush) {
                if (scope < 0) {
                    await compiler(codeToBeExecuted, player);
                    return;
                }
                codeToBeExecuted.push(ifNest[i])
            }
        }
    }
}

const fnFunc = (fnNest) => {
    let initial = fnNest[0].slice(2).trim();
    let i = initial.indexOf(' ');
    let name = initial.slice(0, i).trim();
    let args = initial.slice(i).trim();

    if (!args.startsWith('(') || !args.endsWith(')')) {
        world.sendMessage("§cInvalid function syntax.");
        return;
    }
    args = args.slice(1, args.length - 1);
    let eachArg = args.split(',').map(arg => arg.trim());
    let funcLines = fnNest.slice(1, fnNest.length - 1);
    availableFunc[name] = [eachArg, funcLines];
}

const repeat = async (lines, i, player) => {
    for (let k = 0; k < i; k++) {
        await compiler(lines, player);
    }
}

const repeatHandler = async (repNest, player) => {
    let iterations = repNest[0].slice(6).trim();
    if (!iterations.startsWith('(') || !iterations.endsWith(')')) {
        world.sendMessage("§cInvalid repeat syntax.");
        return;
    }
    iterations = iterations.slice(1, iterations.length - 1);
    iterations = initialisedVars[iterations] !== undefined ? initialisedVars[iterations] : iterations;

    if (isNaN(iterations)) {
        world.sendMessage("§cCannot iterate over a string.");
        return;
    }
    const toBeIterated = repNest.slice(1, repNest.length - 1);
    await repeat(toBeIterated, Number(iterations), player);
}

const listenMessage = (player) => {
    return new Promise((resolve) => {
        const sub = world.afterEvents.chatSend.subscribe((e) => {
            if (e.sender !== player) return;
            world.afterEvents.chatSend.unsubscribe(sub);
            resolve(e.message);
        });
    });
};

const compiler = async (pagesOrLines, player) => {
    // Check if input is book pages or raw lines
    let lines = Array.isArray(pagesOrLines) && pagesOrLines.length > 0 && !pagesOrLines[0].includes('\n') && pagesOrLines[0] !== ""
        ? pagesOrLines : parseBook(pagesOrLines);

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let trimmed = line.trim();

        if (trimmed.startsWith('say(')) {
            say(line);
        } else if (trimmed.startsWith('steve ')) {
            const varInvoke = await initializeVars(trimmed, player);
            if (varInvoke) {
                const input = await listenMessage(player);
                let constructor = isNaN(input) ? `steve ${varInvoke.name} = "${input}"` : `steve ${varInvoke.name} = ${input}`;
                await initializeVars(constructor, player);
            }
        } else if (trimmed.startsWith('if')) {
            let ifLines = [];
            let scope = 0;
            let iterations = 0;
            for (let j = i; j < lines.length; j++) {
                let part = lines[j].trim();
                if (part.startsWith('if ')) scope++;
                if (part === "end") scope--;

                ifLines.push(lines[j]);
                iterations++;
                if (scope === 0) break;
            }
            i += (iterations - 1); // Move index forward
            await ifFunc(ifLines, player);
        } else if (trimmed.startsWith('fn ')) {
            let funcLines = [];
            let scope = 0;
            let iterations = 0;
            for (let j = i; j < lines.length; j++) {
                let part = lines[j].trim();
                if (part.startsWith('fn ')) scope++;
                if (part === "fnEnd") scope--;

                funcLines.push(lines[j]);
                iterations++;
                if (scope === 0) break;
            }
            i += (iterations - 1);
            fnFunc(funcLines);
        } else if (trimmed.startsWith('repeat ')) {
            let repeatLines = [];
            let scope = 0;
            let iterations = 0;
            for (let j = i; j < lines.length; j++) {
                let part = lines[j].trim();
                if (part.startsWith('repeat ')) scope++;
                if (part === "rEnd") scope--;

                repeatLines.push(lines[j]);
                iterations++;
                if (scope === 0) break;
            }
            i += (iterations - 1);
            await repeatHandler(repeatLines, player);
        } else if (typeChecker(trimmed) === 3 && !trimmed.startsWith('fnEnd') && !trimmed.startsWith('rEnd') && trimmed !== 'end' && trimmed !== 'else') {
            await funcHandler(trimmed, player);
        }
    }
}

const parseBook = (pages) => {
    let lines = [];
    if (!pages) return [];
    pages.forEach(page => {
        lines.push(...page.split("\n"));
    });
    return lines;
}

world.afterEvents.chatSend.subscribe(async (event) => {
    const player = event.sender;
    const message = event.message;
    const equippable = player.getComponent("minecraft:equippable");
    const item = equippable.getEquipment("Mainhand");

    if (message === '!run') {
        if (player.playerPermissionLevel !== 2) {
            player.sendMessage("Sorry, you do not have permission.");
            return;
        }
        if (!item || item.typeId !== "minecraft:writable_book") {
            player.sendMessage("Hold a book and quill.");
            return;
        }
        const book = item.getComponent("minecraft:book");
        initialisedVars = {};
        availableFunc = {};
        await compiler(book.contents, player);
    }
});
