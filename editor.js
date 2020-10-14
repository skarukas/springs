import keyboard from "./keyboard.js";
import SeqNote from "./seqNote.js";
import SeqEdge from "./seqEdge.js";
import SeqGliss from "./seqGliss.js";
import grid from "./grid.js"
import ruler from "./ruler.js"
import handlers from "./handlers.js"
import { pitchName, addMessage, disableMouseEvents, mousePosn, simpleBezierPath } from "./util.js"
import style from "./style.js";

const editor = {};
export default editor;

let pianoRollElement = document.getElementById('piano-roll');

editor.notes = [];
editor.edges = [];
editor.glisses = [];
editor.selection = [];
editor.action = null;
editor.grid = 1;
editor.zoomX = 8;
editor.zoomY = 16;
editor.width = 1024;
editor.numKeys = 128;
editor.selectedObject = null;

const svg = SVG()
    .addTo('#piano-roll')
    .size(editor.zoomX * editor.width, editor.zoomY * editor.numKeys);

editor.draw = function() {

    editor.canvas = svg.group()
    .mousemove(e => {
        switch (editor.action) {
            case editor.move:
            case editor.bend:
            case editor.resizeLeft:
            case editor.resizeRight:
                editor.applyToSelection(editor.action, e)
                break;
            case editor.boxSelect:
                editor.boxSelect(editor.selectBox, e);
                break;
            case editor.connector:
            case editor.glisser:
                editor.action(editor.seqConnector, e);
                break;
        }
        //if (!playback.playing && e.buttons == 1) playback.position = e.offsetX;
    }).mousedown(e => {
        editor.clickStart = mousePosn(e);
        if (!editor.action) {
            let poly = [[editor.clickStart.x, editor.clickStart.y],
            [editor.clickStart.x, editor.clickStart.y],
            [editor.clickStart.x, editor.clickStart.y],
            [editor.clickStart.x, editor.clickStart.y]];
            editor.selectBox.plot(poly).front().show();
            editor.action = editor.boxSelect;
        }
    }).mouseup(e => {
        if (editor.action == editor.connector) {
            if (editor.seqConnector.destination) {
                editor.connect(editor.seqConnector.source, editor.seqConnector.destination);
            } 
            editor.seqConnector.hide();
            editor.seqText.hide();
            editor.seqConnector.source = null;
            editor.seqConnector.destination = null;
        } else if (editor.action == editor.glisser) {
            if (editor.seqConnector.destination) {
                editor.gliss(editor.seqConnector.source, editor.seqConnector.destination);
            } 
            editor.seqConnector.hide();
            editor.seqText.hide();
            editor.seqConnector.source = null;
            editor.seqConnector.destination = null;
        } else if (editor.action == editor.boxSelect) {
            // selector box
            editor.selectObjectsInBox(editor.selectBox);
            addMessage(`Selected ${editor.selection.length} notes.`)
            editor.selectBox.size(0, 0).hide();
        }

        //seqBender = null;
        //seqMover = null;
        lastY = null;
        startStarts = undefined;
        startDurs = undefined;
        startPosns = undefined;

        editor.setCursorStyle("default");
        editor.action = undefined;
    });

    editor.toLocalX = function(x) {
        x = editor.canvas.point(x, 0).x;
        return x / editor.zoomX;
    }
    editor.toLocalY = function(y) {
        y = editor.canvas.point(0, y).y;
        return editor.numKeys - y/editor.zoomY;
    }

    editor.selectBox = 
        editor.canvas.polygon()
            .fill('grey')
            .opacity(0.2)
            .stroke('black')
            .hide();

    editor.seqConnector = editor.canvas
        .path()
        .stroke(style.editorLine)
        .hide()
        .fill('none');
    disableMouseEvents(editor.seqConnector);
    editor.seqText = editor.canvas
        .text("")
        .font(style.editorText)
        .hide();
    // pass through mouse events
    disableMouseEvents(editor.seqText);
}

editor.glisser = function(seqConnector, e) {
    let start = {x: seqConnector.source.xEnd, y: seqConnector.source.y + editor.zoomY / 2};
    let time = editor.toLocalX(e.x)
    let pitch = editor.toLocalY(e.y)

    /* Stop from extending to a note before the start point */    
    let x = Math.max(time * editor.zoomX, start.x);
    let y = (editor.numKeys - pitch) * editor.zoomY
    //seqConnector.plot(start.x, start.y, x, y).show();
    let path = simpleBezierPath(start, {x, y}, 'horizontal');
    seqConnector.plot(path)
        .show();
}

editor.boxSelect = function(box, e) {
    let end = mousePosn(e);
    let start = editor.clickStart;
    let poly = [
        [start.x, end.y],
        [end.x, end.y],
        [end.x, start.y],
        [start.x, start.y]];
    box.plot(poly);
}

editor.toggleObjectInSelection = function(obj) {
/*     if (editor.selectedObject && !editor.selection.includes(editor.selectedObject)) {
        /* Keep a list instead of one selected object
        editor.selection.push(editor.selectedObject);
        editor.selectedObject = undefined;
    } */
    if (editor.selection.includes(obj)) {
        /* Deselect already selected object */
        editor.selection = editor.selection.filter(n => n != obj);
        obj.selected = false;
        //if (editor.selectedObject == obj) editor.selectedObject = undefined
    } else {
        /* Select unselected object */
        editor.selection.push(obj);
        obj.selected = true;
        //editor.selectedObject = obj;
    }
}

editor.selectObjectsInBox = function(selectBox) {
    let svgElem = $('svg').get()[0]
    let rect = selectBox.node.getBBox()
    editor.deselectAllObjects();

    let selectedNotes = editor.notes.filter(note => {
        return svgElem.checkIntersection(note.rect.node, rect)
    });
    /* Right now it uses the bounding box (rect) which is not ideal */
    let selectedEdges = editor.edges.filter(edge => {
        return svgElem.checkIntersection(edge.line.node, rect)
    })

    editor.selection = selectedNotes.concat(selectedEdges)
    for (let obj of editor.selection) obj.selected = true;
}

editor.deselectAllObjects = function() {
    for (let obj of editor.selection) obj.selected = false;
    editor.selection = []
    //editor.selectedObject = undefined
}

editor.selectObject = function(obj) {
    console.log(editor.selection)
    if (obj && !editor.selection.includes(obj)) {
        editor.deselectAllObjects()
        obj.selected = true;
        editor.selection = [obj]
    }
}

editor.addNote = function(pitch, velocity, start, duration) {
    let note = new SeqNote(pitch, velocity, start, duration)
    editor.notes.push(note);
    note.seq = editor;
    note.draw(editor.canvas);
    return note;
}

editor.disconnect = function(note1, note2) {
    note1.disconnectFrom(note2);
}

editor.setCursorStyle = function(val) {
    pianoRollElement.style.cursor = val;
}

editor.connect = function(note1, note2, by) {
    let edge = note1.connectTo(note2, by);
    if (edge) {
        edge.draw(editor.canvas);
        edge.propagateBend(note1.bend);
    } else {
        addMessage('Cannot connect notes that are already connected.', 'orange')
    }
}

editor.gliss = function(start, end) {
    /* Stop from extending to a note before the start point */ 
    if (start.xEnd < end.x) {
        let gliss = new SeqGliss(start, end);
        start.glissOutputs.push(gliss);
        end.glissInputs.push(gliss);
        gliss.draw(editor.canvas);
        editor.glisses.push(gliss)
    }
}


editor.applyToSelection = function(fn, param) {
    let objs = editor.selection;
    let curr = editor.selectedObject;
    if (objs.includes(curr) || !curr) fn(param, ...objs);
    else if (curr) editor.deselectAllObjects(), fn(param, curr);
}

/* The following functions are meant to be used with applyToSelection() */

let startPosns;
let lastDeltas;
editor.move = function(e, ...objs) {
    let notes = objs.filter(e => e instanceof SeqNote)
    //notes = editor.getAllConnected(notes); // move all those within the tree
    e = mousePosn(e)
    if (!startPosns) {
        startPosns = new Map();
        lastDeltas = {x:0, y:0};
        for (let note of notes) startPosns.set(note, { start: note.start, pitch: note.pitch});
    }

    let deltaX = editor.toLocalX(e.x) - editor.toLocalX(editor.clickStart.x);
    deltaX = Math.round(deltaX / editor.grid) * editor.grid;
    let deltaY = Math.round(editor.toLocalY(e.y) - editor.toLocalY(editor.clickStart.y));
    if (lastDeltas.x != deltaX) {
        for (let note of notes) {
            let n = startPosns.get(note);
            note.start = Math.max(n.start + deltaX, 0);
            note.redrawPosition(0);
            note.redrawInputs();
            note.redrawOutputs();
        }
    }
    if (lastDeltas.y != deltaY) {
        for (let note of notes) {
            let n = startPosns.get(note);
            note.pitch = Math.min(Math.max(n.pitch + deltaY, 0), editor.numKeys);
            note.redrawPosition(0);
            note.redrawInputs();
            note.redrawOutputs();
        }
    }
    lastDeltas = {x: deltaX, y: deltaY};
}

// divide moving from note1 to note2
editor.equallyDivide = function(n, ...objs) {
    if (n < 1) return;

    /* Equally divide every ascending pair (?) */
    let pairs = new Map();
    let notes = objs.filter(e => e instanceof SeqNote)
    let edges = objs.filter(e => e instanceof SeqEdge)

    let notesAscending = (a, b) => a.pitch - b.pitch
    notes.sort(notesAscending);
    for (let i = 1; i < notes.length; i++) pairs.set(notes[i-1], notes[i])
    for (let e of edges) {
        let pair = [e.a, e.b].sort(notesAscending)
        pairs.set(pair[0], pair[1])
    }
    console.log(pairs)
    for (let [a, b] of pairs.entries()) {
        console.log(a,b)
        equallyDividePair(a, b)
    }

    function equallyDividePair(note1, note2) {
        if (note1.soundingPitch == note2.soundingPitch) return;

        let interval = note1.getIntervalTo(note2).divide(n);
        const incStep = (a, b, steps) => (b - a) / steps;
        let velocityStep = incStep(note1.velocity, note2.velocity, n);
        let startStep = incStep(note1.start, note2.start, n);
        let durationStep = incStep(note1.duration, note2.duration, n);
        editor.disconnect(note1, note2);
        let prev = note1;
        for (let i = 1; i < n; i++) {
            let pitch = Math.round(prev.asNote.noteAbove(interval).asET().pitch);
            let curr = editor.addNote(
                pitch, 
                note1.velocity + velocityStep * i, 
                note1.start + startStep * i, 
                note1.duration + durationStep * i);
            editor.connect(prev, curr, interval);
            prev = curr;
        }
        editor.connect(prev, note2, interval);
    }
}


editor.tuneAsPartials = function(_, ...objs) {
    let notes = objs.filter(e => e instanceof SeqNote)
    if (notes.length > 1) {
        notes.sort((a, b) => a.pitch - b.pitch)
        let freqs = notes.map(a => a.asNote.asFrequency())
        let {partials, fundamental} = tune.AdaptiveTuning.bestFitPartials(freqs)
        for (let i = 0; i < partials.length - 1; i++) {
            let a = notes[i]
            let b = notes[i+1]
            editor.connect(a, b, tune.FreqRatio(partials[i+1], partials[i]))
        }
        let midiF0 = tune.Util.freqToET(fundamental)
        let msg = `Calculated fundamental: ${fundamental.toFixed(2)} Hz (${pitchName(midiF0, true)})`
        addMessage(msg, 'green')
    }
}


let startStarts;
editor.resizeLeft = function(e, ...objs) {
    let notes = objs.filter(e => e instanceof SeqNote)
    
    if (!startStarts) {
        startStarts = new Map();
        for (let note of notes) startStarts.set(note, note.start);
    }

    let deltaX = editor.toLocalX(e.x - editor.clickStart.x);
    for (let note of notes) {
        let start = Math.round((startStarts.get(note) + deltaX) / editor.grid) * editor.grid;
        note.duration = Math.max(note.duration + (note.start - start), editor.grid);
        if (note.duration > editor.grid) note.start = start;
        note.updateGraphics(0);
        note.redrawInputs();
        for (let child of note.neighbors) child.updateGraphics(0);
    }
}

let startDurs;
editor.resizeRight = function(e, ...objs) {
    let notes = objs.filter(e => e instanceof SeqNote)
    if (!startDurs) {
        startDurs = new Map();
        for (let note of notes) startDurs.set(note, note.duration);
    }

    let deltaX = editor.toLocalX(e.x - editor.clickStart.x);
    for (let note of notes) {
        let dur = Math.round((startDurs.get(note) + deltaX) / editor.grid) * editor.grid;
        note.duration = Math.max(dur, editor.grid);
        note.updateGraphics(0);
        note.redrawOutputs();
    }
}

editor.delete = function(e, ...objs) {
    console.log('removed',...objs)
    let removed = new Set(objs)
    for (let obj of objs) obj.remove()
    let notRemoved = e => !removed.has(e)
    editor.edges = editor.edges.filter(notRemoved);
    editor.notes = editor.notes.filter(notRemoved);
    console.log(editor.notes)
    editor.deselectAllObjects()
}

let lastBend = {};
let lastY;
editor.bend = function(e, ...objs) {
    let notes = objs.filter(e => e instanceof SeqNote)
    lastY = lastY || e.y;
    let deltaY = e.y - lastY;
    for (let note of notes) {
        let newBend = Math.round(note.bend * 100 - deltaY) / 100;
        if (newBend != lastBend[note]) note.propagateBend(newBend, 0);
        lastBend[note] = newBend;
    }
    lastY = e.y;
}



editor.connector = function(seqConnector, e) {
    let oldPt = editor.clickStart;
    //let newPt = editor.draw.point(e.x, e.y);
    let newPt = mousePosn(e);
    seqConnector.plot(simpleBezierPath(oldPt, newPt, 'vertical')).front().show();
    
    if (!seqConnector.destination) {
        editor.seqText.hide();
        editor.setCursorStyle("crosshair");
    }
}


editor.zoom = function(xZoom, yZoom) {
    editor.zoomX = xZoom;
    editor.zoomY = yZoom;
    //seqBackground.size(editor.width * editor.zoomX, numKeys * editor.zoomY);
    for (let note of editor.notes) note.updateGraphics(0);
    for (let edge of editor.edges) edge.updateGraphics(0);
    for (let gliss of editor.glisses) gliss.updateGraphics(0);
    svg.size(editor.zoomX * editor.width, editor.zoomY * editor.numKeys);

    /* right now these rely on editor.zoomX/Y which is problematic--they have to go here */
    grid.zoom(xZoom, yZoom)
    ruler.zoom(xZoom, yZoom)
    keyboard.zoom(xZoom, yZoom)
}


editor.assignMouseHandler = function(parent, svgNode, type) {
    let handler = handlers[type];
    if (handler.entered) svgNode.mouseover(e => handler.entered(e, parent));
    if (handler.exited)  svgNode.mouseout(e =>  handler.exited( e, parent));
    if (handler.clicked) svgNode.mousedown(e => handler.clicked(e, parent));
    if (handler.hovered) svgNode.mousemove(e => handler.hovered(e, parent));
}


editor.show = function(show) {
    if (show) {
        for (let note of editor.notes) note.show();
        for (let edge of editor.edges) edge.show();
    } else {
        for (let note of editor.notes) note.hide();
        for (let edge of editor.edges) edge.hide();
    }
}

// for debugging purposes
window.editor = editor;
window.notes = () => editor.notes;
window.edges = () => editor.edges;