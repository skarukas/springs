import editor from "./editor.js"
import style from "./style.js"
import { 
    mousePosn, 
    simpleBezierPath, 
    normAscendingInterval, 
    guessJIInterval, 
    parseIntervalText, 
    addMessage 
} from "./util.js"
import SeqNote from "./SeqNote.js";
import userPreferences from "./userPreferences.js"

const handlers = {};
export default handlers

let display = false; // this is problematic
handlers["note_group"] = {
    exited(e, note) {
        if (display && editor.action != editor.bend) {
            note.centDisplay.opacity(0);
            display = false;
        }
    },
    hovered(e, note) {
        if (editor.action != editor.bend) {
            note.centDisplay.opacity(1);
            display = true;
        }
        // added from attach handler
        if (editor.seqConnector.source && note != editor.seqConnector.source) {
            editor.seqConnector.destination = note;
            if (editor.action == editor.connector) {
                let intervalText;
                if (note.isConnectedTo(editor.seqConnector.source)) {
                    editor.setCursorStyle("not-allowed");
                } else {
                    let defaultInterval = guessJIInterval(editor.seqConnector.source.pitch, note.pitch)
                    intervalText = normAscendingInterval(defaultInterval).toString();

                    let {x, y} = editor.canvas.point(e.x, e.y)
                    editor.seqText.text(intervalText)
                        .center(x, y - 15)
                        .front()
                        .show();
                }
            }   
        }   
    },
    clicked(e, note) {
        if (e.metaKey || e.ctrlKey) {
            editor.toggleObjectInSelection(note); 
        } else {
            if (e.altKey) {
                editor.copySelection()
                editor.paste()
                editor.action = editor.move
            } else {
                console.log("note clik")
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
        editor.action = editor.resizeLeft;
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
            editor.action = editor.glisser;
            editor.seqConnector.source = note;
            let color = style.noteFill(note)
            let width = editor.zoomY
            editor.seqConnector.stroke({color, width})
                .opacity(0.6)
                .show();
            editor.glisser(editor.seqConnector, e)
        } else {
            editor.action = editor.resizeRight;
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
        let pt = editor.canvas.point(e.x, e.y);
        //let pt = mousePosn(e);
        //seqConnector.plot(pt.x, this.y + 0.5*this.height, pt.x, pt.y).show().front();
        let path = simpleBezierPath(
            {x: pt.x, y: note.y + 0.5*note.height}, 
            pt, 
            'vertical')
        editor.seqConnector.plot(path)
            .stroke(style.editorLine)
            .opacity(1)
            .show()
            /* .front(); */
        editor.seqConnector.source = note;
        editor.action = editor.connector;
    }
}


handlers["note_body"] = {
    exited(e, note) {
        editor.seqConnector.destination = null;
        if (editor.action != editor.bend) editor.setCursorStyle("default");
    },
    clicked(e, note) {
        if (e.shiftKey) {
            editor.action = editor.bend;
        } else {
            editor.action = editor.move;
        }
        note.centDisplay.opacity(1);
    },
    hovered(e, note) {
        if (e.shiftKey) editor.setCursorStyle("ns-resize");
        else editor.setCursorStyle("move");
        //editor.setConnectorDestination(e, note);
    }
}

handlers["edge_line"] = {
    clicked(e, edge) {
        if (e.metaKey || e.ctrlKey) editor.toggleObjectInSelection(edge); 
        else editor.selectObject(edge);
        e.stopPropagation()
    },
    hovered(e, edge) {
        edge.text.opacity(1)
    },
    exited(e, edge) {
        if (!userPreferences.alwaysShowEdges) edge.text.animate(100).opacity(0)
    },
    doubleClick(e, edge) {
        editor.typeEdit(null, edge)
    }
}

handlers["gliss_line"] = {
    clicked(e, gliss) {
        if (e.metaKey || e.ctrlKey) editor.toggleObjectInSelection(gliss); 
        else editor.selectObject(gliss);
        e.stopPropagation()
    }
}