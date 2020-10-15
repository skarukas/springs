import editor from "./editor.js"
import style from "./style.js"
import grid from "./grid.js"
import { mousePosn, simpleBezierPath, normAscendingInterval, guessJIInterval, parseIntervalText, addMessage } from "./util.js"
import SeqNote from "./seqNote.js";

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
                    intervalText = normAscendingInterval(guessJIInterval(editor.seqConnector.source.pitch, note.pitch)).toString();

                    let {x, y} = mousePosn(e)
                    editor.seqText.text(intervalText)
                        .center(x, y - 15)
                        .front()
                        .show();
                }
            }   
        }   
    },
    clicked(e, note) {
        if (e.metaKey || e.ctrlKey) editor.toggleObjectInSelection(note); 
        else {
            editor.selectObject(note);
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
        if (e.altKey) editor.setCursorStyle("all-scroll");
        else editor.setCursorStyle("col-resize");
    },
    exited(e, note) {
        if (editor.action != editor.resizeRight) editor.setCursorStyle("default");
    },
    clicked(e, note) {
        if (e.altKey) {
            editor.action = editor.glisser;
            editor.seqConnector.source = note;
            let color = style.noteFill(note)
            let width = editor.zoomY
            editor.seqConnector.stroke({color, width})
                .opacity(0.6)
                .insertAfter(grid.canvas) // failed attempt at getting it in the right layer :(
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
/*     hovered(e, note) {
        if (editor.seqConnector.source && note != editor.seqConnector.source) {
            editor.seqConnector.destination = note;
            if (editor.action == editor.connector) {
                let intervalText;
                if (note.isConnectedTo(editor.seqConnector.source)) {
                    editor.setCursor("not-allowed");
                } else {
                    intervalText = normAscendingInterval(guessJIInterval(editor.seqConnector.source.pitch, note.pitch)).toString();
                    //svgElement.style.cursor = "crosshair";
                                    
                    let {x, y} = mousePosn(e)
                    editor.seqText.text(intervalText)
                        .center(x, y - 15)
                        .front()
                        .show();
                }
            }
        }
    }, */
    clicked(e, note) {
        //let pt = canvas.point(e.x, e.y);
        let pt = mousePosn(e);
        //seqConnector.plot(pt.x, this.y + 0.5*this.height, pt.x, pt.y).show().front();
        editor.seqConnector.plot(simpleBezierPath({x: pt.x, y: note.y + 0.5*note.height}, pt, 'vertical'))
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
        if (e.altKey) editor.action = editor.bend;
        else {
            editor.action = editor.move;
        }
        note.centDisplay.opacity(1);
    },
    hovered(e, note) {
        if (e.altKey) editor.setCursorStyle("ns-resize");
        else editor.setCursorStyle("move");
        //editor.setConnectorDestination(e, note);
    }
}

handlers["edge_line"] = {
    clicked(e, edge) {
        editor.action = editor.move // hacky -- just to stop from being box select
        if (e.metaKey || e.ctrlKey) editor.toggleObjectInSelection(edge); 
        else editor.selectObject(edge);
    },
    hovered(e, edge) {
        edge.text.opacity(1)
    },
    exited(e, edge) {
        edge.text.animate(100).opacity(0)
    },
    doubleClick(e, edge) {
        editor.typeEdit(null, edge)
        /* let foreign = editor.canvas.foreignObject(editor.canvas.width(),editor.canvas.height())
            //.move(edge.midX, edge.midY)
            .front()
        let oldText = edge.text.text()
        let interval;
        let fadeDur = 200;
        let background = $(document.createElement('div'))
            .css({
                width: "100%",
                height: "100%",
                padding: 0,
                margin: 0,
                backgroundColor: 'white',
                opacity: 0.6
            }).on('mousedown', ø => {
                background.fadeOut(fadeDur,ø =>foreign.remove())
                input.fadeOut(fadeDur)
            }).hide().fadeIn(fadeDur)
            .appendTo(foreign.node)
        //$(foreign.node).css('background-color','red')


        let input = $(document.createElement('input'))
            .attr({
                type: 'text',
                size: 10,
                placeholder: oldText
            }).css({
                position: 'absolute',
                left: edge.midX,
                top: edge.midY,
                backgroundColor: 'rgba(255,255,255,0.6)',
                color: 'black',
                padding: 4,
            }).on('input', e => {
                input.attr('size', Math.min(input.val().length, 5))
                interval = parseIntervalText(input.val())
                if (interval) input.css('color', 'green')
                else input.css('color', 'black')
            }).on('keydown', e => {
                if (e.key == 'Enter' && interval) {
                    console.log('sub')
                    edge.updateInterval(interval)
                    foreign.remove()
                } else if (e.key == 'Escape') {
                    console.log('esc')
                    foreign.remove()
                }
                e.stopPropagation()
            }).appendTo(foreign.node)
            .hide().fadeIn(fadeDur)
            .trigger('focus') */
    }
}

