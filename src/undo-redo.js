import editor from "./editor.js"
import SeqNote from "./SeqNote.js"
import { addMessage } from "./util.js"
let undoStack = []
let redoStack = []

// basically a decorator that saves the action to the stack
// while the process is being completed, the subprocesses
// are saved to a substack so that they can be undone all 
// at once or individually
export function mutator(func, name="unknown") {
    return function(...args) {
        redoStack = []
        let action = addAction(func, name, ...args)

        // child process adds its actions to substack
        let temp = undoStack
        undoStack = action.stack
        let result = action.do()
        undoStack = temp
        return result
    }
}

let tempStack;
let tempAction;
// a function to be called when a sequence of calls to `func`
//  is about to take place
export const macroActionStart = function (func, name="unknown") {
    redoStack = []
    name = "macro_" + name
    let action = {
        name,
        undo: macroUndo(name),
        stack: []
    }
    undoStack.push(action)
    tempStack = undoStack
    tempAction = action
    undoStack = action.stack
    console.log("start macro")
}

function macroUndo(name) {
    let notes = editor.selection.filter(e => e instanceof SeqNote)
    let pairs
    switch (name) {
        case "macro_resizeRight":
            pairs = notes.map(e => [e, e.end]) 
            return () => {
                for (let [note, end] of pairs) note.end = end
            }
        case "macro_resizeLeft":
            pairs = notes.map(e => [e, e.start]) 
            return () => {
                for (let [note, start] of pairs) note.start = start
            }       
        case "macro_move":
            notes = editor.selectionForest.concat(notes)
            pairs = notes.map(e => [e, e.start, e.pitch])
            return () => {
                for (let [note, start, pitch] of pairs) {
                    note.startMove = start
                    note.pitch = pitch
                }
            }      
        case "macro_bend":
            pairs = notes.map(e => [e, e.pitch, e.bend]) 
            return () => {
                for (let [note, pitch, bend] of pairs) {
                    note.pitch = pitch
                    note.bend = bend
                }
            }   
    }
}

export const macroActionEnd = function () {
    if (tempStack) {
        undoStack = tempStack
        tempStack = undefined
        tempAction.do = macroUndo(tempAction.name)
    }
}



function addAction(func, name, ...args) {
    let action = {
        name,
        do: () => func(...args),
        stack: []
    }
    action.undo = getUndo(action, ...args),
    undoStack.push(action)
    return action
}

function getUndo(action, ...args) { 
    let notes;
    let pairs;
    switch (action.name) {
        case "resetBend":
            notes = args.filter(e => e instanceof SeqNote)
            pairs = notes.map(e => [e, e.pitch, e.bend]) 
            return () => {
                for (let [note, pitch, bend] of pairs) {
                    note.pitch = pitch
                    note.bend = bend
                }
            }  
        case "disconnect":
            let interval = args[0].getIntervalTo(args[1])
            return () => {
                editor.connect(args[0], args[1], interval)
                undoStack.pop()
            }
        case "connect":
            notes = args.filter(e => e instanceof SeqNote)
            pairs = notes.map(e => [e, e.pitch, e.bend]) 
            return () => {
                editor.disconnect(args[0], args[1])
                for (let [note, pitch, bend] of pairs) {
                    note.pitch = pitch
                    note.bend = bend
                }
                undoStack.pop()
            }
        case "tuneAsPartials":
            return () => action.stack.map(a => a.undo())
        case "delete":
        case "addNote":
        case "addGliss":
        case "divide":
        case "pasteJSON":
        case "paste":
        case "clearAllData":
        case "addCompressedData":
        case "transpose":
        default:
            return () => {
                addMessage("Unable to undo", 'orange')
            }
    }
}

export function undo() {
    let action = undoStack.pop()
    if (action) {
        action.undo()
        redoStack.push(action)
    } else {
        addMessage("Nothing to undo", "orange")
    }
    return action
}

export function redo() {
    let action = redoStack.pop()
    if (action) {
        action.do()
        undoStack.push(action)
    } else {
        addMessage("Nothing to redo", "orange")
    }
    return action
}

window.undo = undo
window.redo = redo
window.stack = undoStack
window.redoStack = redoStack