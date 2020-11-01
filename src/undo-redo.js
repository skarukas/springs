import editor from "./editor.js"
import SeqNote from "./SeqNote.js"
let stack = []

// basically a decorator that saves the action to the stack
// while the process is being completed, the subprocesses
// are saved to a substack so that they can be undone all 
// at once or individually
export function mutator(func, name="unknown") {
    return function(...args) {
        let action = addAction(func, name, ...args)

        // child process adds its actions to substack
        let temp = stack
        stack = action.stack
        let result = action.do()
        stack = temp
        return result
    }
}

let temp;
// a function to be called when a sequence of calls to `func`
//  is about to take place
export const macroActionStart = function (func, name="unknown") {
    let action = {
        name: "macro_" + name,
        do: undefined, // fix
        undo: macroUndo(func, name),
        stack: []
    }
    stack.push(action)
    temp = stack
    stack = action.stack
    console.log("start macro")
}

function macroUndo(fn, name) {
    let notes = editor.selection.filter(e => e instanceof SeqNote)
    
    if (name == "resizeRight") {
        let pairs = notes.map(e => [e, e.end]) 
        return () => {
            for (let [note, end] of pairs) note.end = end
        }
    } else if (name == "resizeLeft") {
        let pairs = notes.map(e => [e, e.start]) 
        return () => {
            for (let [note, start] of pairs) note.start = start
        }       
    } else if (name == "move") {
        let pairs = notes.map(e => [e, e.start, e.pitch])
        return () => {
            for (let [note, start, pitch] of pairs) {
                note.startMove = start
                note.pitch = pitch
            }
        }      
    } else if (name == "bend") {
        let pairs = notes.map(e => [e, e.pitch, e.bend]) 
        return () => {
            for (let [note, pitch, bend] of pairs) {
                note.pitch = pitch
                note.bend = bend
            }
        }   
    }
}

export const macroActionEnd = function () {
    if (temp) {
        stack = temp
        console.log("end macro")
        temp = undefined
    }
}



function addAction(func, name, ...args) {
    let action = {
        name,
        do: () => func(...args),
        undo: getUndo(func, ...args),
        stack: []
    }
    stack.push(action)
    return action
}

function getUndo(f, ...args) { 
    if (f == editor.addNote) {

    }
}

window.stack = stack