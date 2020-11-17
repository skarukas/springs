import editor from "./editor.js"
import style from "./style.js"
import { 
    simpleBezierPath, 
    normAscendingInterval, 
    guessJIInterval, 
} from "./util.js"
import SeqNote from "./SeqNote.js";
import userPreferences from "./userPreferences.js"
import { macroActionStart } from "./undo-redo.js"

const handlers = {};
export default handlers

/* 
    Each handler may include the following methods:
        - exited(e, obj)
        - entered(e, obj)
        - hovered(e, obj)
        - clicked(e, obj)
        - doubleClicked(e, obj)
    Each method is passed the mouse event `e` and the object to modify.
*/

let display = false;
handlers["note_group"] = {
    exited(e, note) {
        /* hide number of cents */
        if (display && editor.action != editor.bend) {
            note.centDisplay.opacity(0);
            display = false;
        }
    },
    hovered(e, note) {
        /* show number of cents */
        if (editor.action != editor.bend) {
            note.centDisplay.opacity(1);
            display = true;
        }

        // make note a destination for connection
        if (editor.seqConnector.source && note != editor.seqConnector.source) {
            editor.seqConnector.destination = note;
            if (editor.action == editor.connector) {
                let intervalText;
                if (note.isConnectedTo(editor.seqConnector.source)) {
                    /* No cycles allowed */
                    editor.setCursorStyle("not-allowed");
                } else {
                    /* Display the potential new interval */
                    let defaultInterval = guessJIInterval(editor.seqConnector.source.pitch, note.pitch)
                    intervalText = normAscendingInterval(defaultInterval).toString();

                    let {x, y} = editor.canvas.point(e.x, e.y)
                    editor.seqText.text(intervalText)
                        .center(x, y - 15)
                        .front()
                        .show();
                }
            } else if (editor.action == editor.measurer) {
                /* Measure the distance between the two notes */
                let text = editor.seqConnector.source.getIntervalTo(note).toString();
                let {x, y} = editor.canvas.point(e.x, e.y)
                editor.seqText.text(text)
                    .center(x, y - 15)
                    .front()
                    .show();
            }
        }   
    },
    clicked(e, note) {
        if (e.metaKey || e.ctrlKey) {
            /* Ctrl-click adds or removes an object from selection */
            editor.toggleObjectInSelection(note);
        } else if (editor.tool == "ruler") {
            /* Begin measuring with the ruler */
            editor.clickStart = editor.canvas.point(e.x, e.y);
            editor.action = editor.measurer;
            editor.seqConnector.source = note;
            editor.seqConnector.stroke({color: 'black', width: 3})
                .opacity(0.6)
                .front()
                .show();
            editor.measurer(editor.seqConnector, e)
        } else {
            if (e.altKey) {
                /* Alt-drag = immediate copy/paste */
                editor.copySelection()
                editor.paste()
                editor.action = editor.move
            } else {
                /* Clicking: just select a note */
                editor.selectObject(note);
            }
            let notes = editor.selection.filter(e => e instanceof SeqNote)
            editor.selectionForest = editor.getAllConnected(notes)
        }
    }
}


handlers["note_left_handle"] = {
    entered(e, note) {
        editor.setCursorStyle("col-resize");
    },
    exited(e, note) {
        if (editor.action != editor.resizeLeft) editor.setCursorStyle("default");
    },
    clicked(e, note) {
        /* Resize */
        editor.action = editor.resizeLeft;
        editor.selectObject(note)
        macroActionStart(editor.resizeLeft, "resizeLeft")
    }
}


handlers["note_right_handle"] = {
    entered(e, note) {
        if (e.shiftKey) editor.setCursorStyle("all-scroll");
        else editor.setCursorStyle("col-resize");
    },
    exited(e, note) {
        if (editor.action != editor.resizeRight) editor.setCursorStyle("default");
    },
    clicked(e, note) {
        if (e.shiftKey) {
            /* Create a gliss from this note */
            editor.action = editor.glisser;
            editor.seqConnector.source = note;
            let color = style.noteFill(note)
            let width = editor.zoomY
            editor.seqConnector.stroke({color, width})
                .opacity(0.6)
                .show();
            editor.glisser(editor.seqConnector, e)
        } else {
            /* Resize */
            editor.action = editor.resizeRight;
            editor.selectObject(note)
            macroActionStart(editor.resizeRight, "resizeRight")
        }
    }
}


handlers["note_attach"] = {
    entered(e, note) {
        editor.setCursorStyle("crosshair");
    },
    exited(e, note) {
        if (!editor.seqConnector.visible()) editor.setCursorStyle("default"); // use editor.action
        else editor.setCursorStyle("crosshair");
    },
    clicked(e, note) {
        /* Drag to connect to another note */
        let pt = editor.canvas.point(e.x, e.y);
        let path = simpleBezierPath(
            {x: pt.x, y: note.y + 0.5*note.height}, 
            pt, 
            'vertical')
        editor.seqConnector.plot(path)
            .stroke(style.editorLine)
            .opacity(1)
            .show()
        editor.seqConnector.source = note;
        editor.action = editor.connector;
    }
}


handlers["note_body"] = {
    exited(e, note) {
        editor.seqConnector.destination = null;
        if (editor.action != editor.bend) editor.setCursorStyle("default");
    },
    hovered(e, note) {
        if (e.shiftKey) editor.setCursorStyle("ns-resize");
        else editor.setCursorStyle("move");
    },
    clicked(e, note) {
        if (e.shiftKey) {
            /* Shift-drag = bend */
            editor.action = editor.bend;
            editor.selectObject(note)
            macroActionStart(editor.bend, "bend")
        } else {
            /* Drag = move */
            editor.action = editor.move;
            editor.selectObject(note)
            macroActionStart(editor.move, "move")
        }
        note.centDisplay.opacity(1);
    }
}

handlers["edge_line"] = {
    hovered(e, edge) {
        /* Show interval size */
        edge.text.opacity(1)
    },
    exited(e, edge) {
        /* Hide interval size */
        if (!userPreferences.alwaysShowEdges) edge.text.animate(100).opacity(0)
    },
    clicked(e, edge) {
        if (e.metaKey || e.ctrlKey) editor.toggleObjectInSelection(edge); 
        else editor.selectObject(edge);
        e.stopPropagation()
    },
    doubleClicked(e, edge) {
        editor.typeEdit(null, edge)
    }
}

handlers["gliss_line"] = {
    hovered(e, gliss) {
        editor.setCursorStyle("ns-resize");
    },
    exited(e, gliss) {
        if (editor.action != editor.glissEasing) editor.setCursorStyle("auto");
    },
    clicked(e, gliss) {
        if (e.metaKey || e.ctrlKey) {
            editor.toggleObjectInSelection(gliss); 
        } else {
            /* Drag = adjust easing */
            editor.selectObject(gliss)
            editor.action = editor.glissEasing
            macroActionStart(editor.glissEasing, "glissEasing")
        }
        e.stopPropagation()
    },
}