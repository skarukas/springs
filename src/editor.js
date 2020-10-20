import keyboard from "./keyboard.js";
import SeqNote from "./SeqNote.js";
import SeqEdge from "./SeqEdge.js";
import SeqGliss from "./SeqGliss.js";
import grid from "./grid.js"
import ruler from "./ruler.js"
import handlers from "./handlers.js"
import { 
    pitchName, 
    addMessage, 
    disableMouseEvents, 
    mousePosn, 
    simpleBezierPath, 
    parseIntervalText 
} from "./util.js"
import style from "./style.js";
import playback from "./playbackData.js";
import audio from "./audio-playback.js";

const editor = {
    get width() {
        return editor.widthInTime * editor.zoomX;
    },
    get height() {
        return editor.numKeys * editor.zoomY;
    }
};
export default editor;

let pianoRollElement = document.getElementById('piano-roll');

editor.notes = [];
editor.edges = [];
editor.glisses = [];
editor.selection = [];
editor.selectionForest = [];
editor.action = null;
editor.timeGridSize = 1;
editor.zoomX = 8;
editor.zoomY = 16;
editor.widthInTime = 1024;
editor.numKeys = 128;
editor.selectedObject = null;
editor.mousePosn = undefined;

editor.canvas = SVG()
    .addTo('#piano-roll')
    .size(editor.zoomX * editor.widthInTime, editor.zoomY * editor.numKeys)
    .viewbox(0, 0, editor.width, editor.height)

editor.zoomXY = 1;
editor.scale = function(val) {
    if (val < 0.28) return
    let width = editor.zoomX * editor.widthInTime / val
    let height = editor.zoomY * editor.numKeys / val
    editor.canvas.viewbox(editor.scrollX, editor.scrollY, width, height)
    editor.zoomXY = val
    grid.scale(val)
    ruler.scale(val)
    ruler.scroll(editor.scrollX * val, editor.scrollY * val)
    keyboard.scale(val)
    keyboard.scroll(editor.scrollX * val, editor.scrollY * val)
    playback.scale(val)
    editor.deltaScroll(1, 1)
    //keyboard.svg.viewbox(0, 0, keyboard.width, height) // temp
/*     editor.zoomX *= val;
    editor.zoomY *= val;
    ruler.zoom(editor.zoomX, editor.zoomY)
    keyboard.zoom(editor.zoomX, editor.zoomY) */
}

editor.scrollX = 0;
editor.scrollY = 0;

editor.scroll = function(x, y) {
    let h = $('.right-container').height();
    let w = $('.right-container').width();

    let viewHeight = (editor.height - y) * editor.zoomXY;
    let viewWidth = (editor.width - x) * editor.zoomXY;

    if (viewHeight < h) {
        editor.scrollY = editor.height - h/editor.zoomXY;
    } else if (viewWidth < w) {
        editor.scrollX = editor.width - w/editor.zoomXY;
    } else {
        editor.scrollX = Math.max(0, x);
        editor.scrollY = Math.max(0, y);
    }

    let width = editor.zoomX * editor.widthInTime / editor.zoomXY
    let height = editor.zoomY * editor.numKeys / editor.zoomXY
    editor.canvas.viewbox(editor.scrollX, editor.scrollY, width, height)

    let scrollX = editor.scrollX * editor.zoomXY;
    let scrollY = editor.scrollY * editor.zoomXY;
    keyboard.scroll(scrollX, scrollY);
    ruler.scroll(scrollX, scrollY);
    grid.scroll(scrollX, scrollY);
}

editor.deltaScroll = function(dx, dy) {
    editor.scroll(editor.scrollX + dx, editor.scrollY + dy)
}

editor.drag = function(e) {
    let pt = editor.canvas.point(e.x, e.y)
    editor.deltaScroll(
        editor.clickStart.x - pt.x,
        editor.clickStart.y - pt.y);
} 

editor.draw = function() {

    editor.canvas
    .mousemove(e => {
        switch (editor.action) {
            case editor.move:
                editor.move(e, editor.selection, editor.selectionForest)
                break
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
            case editor.drag:
                editor.drag(e)
                break;
        }
        editor.mousePosn = {x: e.x, y:e.y}
        //if (!playback.playing && e.buttons == 1) playback.position = e.offsetX;
    }).mousedown(e => {
        //editor.clickStart = mousePosn(e);
        editor.clickStart = editor.canvas.point(e.x, e.y)
        if (!editor.action) {
            if (e.metaKey) {
                /* Create note */
                let n = editor.addNote(
                    editor.mousePosnToPitch(e),
                    64,
                    editor.mousePosnToTime(e),
                    editor.timeGridSize);
                editor.action = editor.resizeRight
                editor.selectObject(n)
            } else if (e.shiftKey) {
                editor.setCursorStyle("grabbing")
                editor.action = editor.drag;
            } else {
                let poly = [[editor.clickStart.x, editor.clickStart.y],
                [editor.clickStart.x, editor.clickStart.y],
                [editor.clickStart.x, editor.clickStart.y],
                [editor.clickStart.x, editor.clickStart.y]];
                editor.selectBox.plot(poly).front().show();
                editor.action = editor.boxSelect;
            }
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
        startEnds = undefined;
        startPosns = undefined;

        editor.setCursorStyle("default");
        editor.action = undefined;
    });

    editor.mousePosnToTime = function(e) {
        let x = editor.canvas.point(e.x, 0).x;
        return Math.floor((x / editor.zoomX) / editor.timeGridSize) * editor.timeGridSize;
    }
    editor.mousePosnToPitch = function(e) {
        let y = editor.canvas.point(0, e.y).y;
        return Math.floor(editor.numKeys - y/editor.zoomY);
    }
    editor.quantizeTime = function(time) {
        return Math.round(time / editor.timeGridSize) * editor.timeGridSize;
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

editor.copySelection = function() {
    let notes = editor.selection.filter(e => e instanceof SeqNote)
    editor.clipboard = editor.compressData(notes)
}

/* Automatically stores edges between notes as well */
editor.compressData = function(objs) {
    let compressed = {
        notes: [],
        edges: [],
        glisses: []
    }
    let notes = objs.filter(e => e instanceof SeqNote)
    //let edges = objs.filter(e => e instanceof SeqEdge)
    //let glisses = objs.filter(e => e instanceof SeqGliss) // not selectable yet
    let edges = [];
    let seen = new Set();

    /* Add necessary edges (edges between selected notes) */
    for (let note of notes) {
        if (!seen.has(note)) {
            for (let [neigh, edge] of note.neighbors) {
                if (seen.has(neigh)) {
                    edges.push(edge)
                    seen.add(neigh)
                }
            }
            seen.add(note)
        }
    }

    // Add necessary glisses (glisses between selected notes)
    for (let i = 0; i < notes.length; i++) {
        for (let gliss of notes[i].glissOutputs) {
            let idx = notes.indexOf(gliss.endNote)
            if (idx != -1) {
                compressed.glisses.push({
                    start: i,
                    end: idx
                })
            }
        }
    }

    // returns the index of the inserted note
    // and whether or not the note was a new addition
    function addCompressedNote(note) {
        let copy = {
            pitch: note.pitch,
            velocity: note.velocity,
            start: note.start,
            duration: note.duration,
            bend: note.bend
        }
        let idx = -1;
        for (let i = 0; i < compressed.notes.length; i++) {
            if (JSON.stringify(compressed.notes[i]) == JSON.stringify(copy)) {
                idx = i;
                break;
            }
        }
        if (idx == -1) return [true, compressed.notes.push(copy) - 1]
        else return [false, idx]
    }

    /* Add the ones that are connected */
    for (let edge of edges) {
        let [isAdded1, id1] = addCompressedNote(edge.a)
        let [isAdded2, id2] = addCompressedNote(edge.b)
        if (isAdded1 || isAdded2) {
            compressed.edges.push({
                id1,
                id2,
                interval: edge.interval.toString()
            })
        }
    }

    /* Add the ones that are not connected */
    notes.map(addCompressedNote)
    return compressed
}

editor.updateLocalStorage = function() {
    let compressed = editor.compressData(editor.notes)
    localStorage.setItem("cachedEditor", JSON.stringify(compressed))
    localStorage.setItem("viewbox", 
        JSON.stringify({
            scrollX: editor.scrollX,
            scrollY: editor.scrollY,
            scale: editor.zoomXY,
        }))
}

editor.loadEditorFromLocalStorage = function() {
    let editorString = localStorage.getItem("cachedEditor")
    let viewboxString = localStorage.getItem("viewbox")
    if (editorString) {
        let compressed = JSON.parse(editorString)
        editor.addCompressedData(compressed)
        editor.deselectAllObjects()
    }
    if (viewboxString) {
        let data = JSON.parse(viewboxString)
        editor.scroll(data.scrollX, data.scrollY)
        editor.scale(data.scale)
    }
}

editor.clearAllData = function() {
    editor.delete(null, ...editor.notes)
}

editor.addCompressedData = function(compressed, offsetTime=0, offsetPitch=0) {
    editor.deselectAllObjects()

    let notes = [];
    let edges = [];
    let glisses = [];

    /* Add notes from compressed version */
    for (let noteObj of compressed.notes) {
        let note = editor.addNote(
            noteObj.pitch + offsetPitch, 
            noteObj.velocity,
            noteObj.start + offsetTime,
            noteObj.duration)
        note.bend = noteObj.bend;
        notes.push(note)
    }

    /* 
        Create edges, accessing the indices of the
        note array.
    */
    for (let edgeObj of compressed.edges) {
        let interval = parseIntervalText(edgeObj.interval)
        let edge = editor.connect(
            notes[edgeObj.id1], 
            notes[edgeObj.id2], 
            interval)
        edges.push(edge)
    }

    /* 
        Create glisses, accessing the indices of the
        note array.
    */
    for (let glissObj of compressed.glisses) {
        let gliss = editor.gliss(
            notes[glissObj.start], 
            notes[glissObj.end])
        glisses.push(gliss)
    }

    return { notes, edges, glisses }
}

editor.transposeByOctaves = function(n, ...objs) {
    let notes = objs.filter(e => e instanceof SeqNote)
    for (let note of notes) note.transposeByOctaves(n)
}

editor.paste = function() {

    let p = editor.mousePosn;
    let time = editor.mousePosnToTime(p)
    let pitch = editor.mousePosnToPitch(p)

    // Mouseposn => start of leftmost note, pitch of heighest note
    let minStart = Infinity;
    let maxPitch = 0;
    for (let note of editor.clipboard.notes) {
        minStart = Math.min(minStart, note.start)
        maxPitch = Math.max(maxPitch, note.pitch)
    }

    let { notes, edges } = editor.addCompressedData(
        editor.clipboard, 
        time - minStart, 
        pitch - maxPitch)

    for (let note of notes) editor.toggleObjectInSelection(note)
    for (let edge of edges) editor.toggleObjectInSelection(edge)
}

editor.togglePlayback = function() {
    if (playback.playing) {
        audio.pause();
        playback.pause();
        //playback.stop();
    } else {
        if (editor.selection.length) {
            let minX = Infinity
            for (let obj of editor.selection) {
                if (obj instanceof SeqNote) {
                    minX = Math.min(minX, obj.x)
                }
            }
            playback.play(minX);
        } else {
            playback.play();
        }
        audio.playNotes(editor.notes);
    }
}

editor.glisser = function(seqConnector, e) {
    let start = {x: seqConnector.source.xEnd, y: seqConnector.source.y + editor.zoomY / 2};
    let end = editor.canvas.point(e.x, e.y)
    let path = simpleBezierPath(start, end, 'horizontal');
    seqConnector.plot(path).show();
}

editor.boxSelect = function(box, e) {
    //let end = mousePosn(e);
    let end = editor.canvas.point(e.x, e.y)
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
    editor.deselectAllObjects();

    let svgElem = $('svg').get()[0]
    let rect = selectBox.node.getBBox()
    // change to non-transformed viewbox temporarily
    // a little hacky, but it works
    let vb = editor.canvas.viewbox()
    editor.canvas.viewbox(0, 0, editor.width, editor.height)
    let selectedNotes = editor.notes.filter(note => {
        return svgElem.checkIntersection(note.rect.node, rect)
    });
    /* Right now it uses the bounding box (rect) which is not ideal */
    let selectedEdges = editor.edges.filter(edge => {
        return svgElem.checkIntersection(edge.line.node, rect)
    })
    editor.canvas.viewbox(vb)

    editor.selection = selectedNotes.concat(selectedEdges)
    for (let obj of editor.selection) obj.selected = true;
}

editor.deselectAllObjects = function() {
    for (let obj of editor.selection) obj.selected = false;
    editor.selection = []
    //editor.selectedObject = undefined
}

editor.selectAll = function() {
    editor.selection = editor.notes
        .concat(editor.edges)
        .concat(editor.glisses);
    for (let x of editor.selection) x.selected = true;
}

editor.selectObject = function(obj) {
    if (obj && !editor.selection.includes(obj)) {
        editor.deselectAllObjects()
        obj.selected = true;
        editor.selection = [obj]
    }
}

editor.play = function(_, ...objs) {
    let notes = objs.filter(e => e instanceof SeqNote)
    for (let note of notes) audio.playNote(note)
} 

editor.resetBend = function(_, ...objs) {
    let notes = objs.filter(e => e instanceof SeqNote)
    /* Find minimum note of each tree in the forest */
    let minimums = new Set(notes);
    for (let note of notes) {
        //minimums.add(note)
        for (let neighbor of note.getAllConnected()) {
            if (neighbor != note && minimums.has(neighbor)) {
                if (note.soundingPitch < neighbor.soundingPitch) {
                    minimums.delete(neighbor)
                } else {
                    minimums.delete(note)
                }
            }
        }
    }
    for (let m of minimums) m.propagateBend(0)
}

editor.addNote = function(pitch, velocity, start, duration) {
    let note = new SeqNote(pitch, velocity, start, duration)
    editor.notes.push(note);
    note.seq = editor;
    note.draw(editor.canvas);
    return note;
}

editor.disconnect = function(note1, note2) {
    let removedEdge = note1.disconnectFrom(note2);
    if (removedEdge) editor.delete(null, removedEdge)
}

editor.setCursorStyle = function(val) {
    pianoRollElement.style.cursor = val;
}

editor.connect = function(note1, note2, by) {
    let edge = note1.connectTo(note2, by, 0);
    if (edge) {
        editor.edges.push(edge)
        edge.draw(editor.canvas);
        editor.toggleObjectInSelection(edge)
    } else {
        addMessage('Cannot connect notes that are already connected.', 'orange')
    }
    return edge;
}

editor.gliss = function(start, end) {
    let gliss;
    /* Stop from extending to a note before the start point */ 
    if (start.xEnd < end.x) {
        gliss = new SeqGliss(start, end);
        start.glissOutputs.push(gliss);
        end.glissInputs.push(gliss);
        gliss.draw(editor.canvas);
        editor.glisses.push(gliss)
    }
    return gliss;
}


editor.getAllConnected = function(notes) {
    let forest = new Set()
    for (let note of notes) {
        if (!forest.has(note)) {
            let tree = note.getAllConnected()
            for (let e of tree) forest.add(e)
        }
    }
    return [...forest]
}

editor.applyToSelection = function(fn, param) {
    fn(param, ...editor.selection);
}

/* The following functions are meant to be used with applyToSelection() */

let startPosns;
let lastDeltas;
editor.move = function(e, objs, forest) {
    if (!forest.length) forest = objs;

    let notes = objs.filter(e => e instanceof SeqNote)
    forest = forest.filter(e => e instanceof SeqNote)

    let posn = editor.canvas.point(e.x, e.y)
    if (!startPosns) {
        startPosns = new Map();
        lastDeltas = {x:0, y:0};
        for (let note of forest) startPosns.set(note, {start: note.start, pitch: note.pitch});
    }

    let deltaX = (posn.x - editor.clickStart.x) / editor.zoomX
    let deltaY = (posn.y - editor.clickStart.y) / editor.zoomY
    if (lastDeltas.x != deltaX) {
        for (let note of notes) {
            let n = startPosns.get(note);
            let duration = note.duration;
            let anustart = Math.max(n.start + deltaX, 0);
            note.start = editor.quantizeTime(anustart)
            note.end = note.start + duration
            note.redrawPosition(0);
            note.redrawInputs(0);
            note.redrawOutputs();
        }
    }
    if (lastDeltas.y != deltaY) {
        for (let note of forest) {
            let n = startPosns.get(note);
            let pitch = (n.pitch - deltaY).clamp(0, editor.numKeys);
            note.pitch = Math.round(pitch)
            note.redrawPosition(0);
            note.redrawInputs(0);
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

    for (let [a, b] of pairs.entries()) equallyDividePair(a, b)

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
    //e = mousePosn(e)
    e = editor.canvas.point(e.x, e.y)

    if (!startStarts) {
        startStarts = new Map();
        for (let note of notes) startStarts.set(note, note.start);
    }

    let deltaX = (e.x - editor.clickStart.x) / editor.zoomX;
    for (let note of notes) {
        let anustart = (startStarts.get(note) + deltaX).clamp(0, note.end-editor.timeGridSize)
        note.start = editor.quantizeTime(anustart)
        note.updateGraphics(0);
        note.redrawInputs(0);
    }
}

let startEnds;
editor.resizeRight = function(e, ...objs) {
    let notes = objs.filter(e => e instanceof SeqNote)
    e = editor.canvas.point(e.x, e.y)

    if (!startEnds) {
        startEnds = new Map();
        for (let note of notes) startEnds.set(note, note.end);
    }

    let deltaX = (e.x - editor.clickStart.x) / editor.zoomX;
    for (let note of notes) {
        let anuend = (startEnds.get(note) + deltaX).clamp(note.start+editor.timeGridSize, editor.widthInTime)
        note.end = editor.quantizeTime(anuend)
        note.updateGraphics(0);
        note.redrawOutputs();
    }
}

editor.delete = function(e, ...objs) {
    let removed = new Set(objs)
    for (let obj of objs) obj.remove()
    let notRemoved = e => !removed.has(e)
    editor.edges = editor.edges.filter(notRemoved);
    editor.notes = editor.notes.filter(notRemoved);
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


editor.typeEdit = function(_, ...objs) {
    if (!objs.length) return

    let edges = objs.filter(e => e instanceof SeqEdge)
    let notes = objs.filter(e=> e instanceof SeqNote)
     /* Create an input box for the new interval */
    let foreign = editor.canvas.foreignObject(editor.width, editor.height)
        .css('overflow', 'visible')
        .front()
    let fadeDur = 500;
    let noteBoxes = [];
    let edgeBoxes = [];

    /* Create transparent background */
    let background = $(document.createElement('div'))
        .css({
            position: 'relative',
            width: "100%",
            height: "100%",
            padding: 0,
            margin: 0,
            backgroundColor: 'rgba(255,255,255,0.6)'
        }).on('mousedown', ø => {
            background.fadeOut(fadeDur, ø => {
                foreign.remove()
                instructions.remove()
            })
            for (let note of noteBoxes) note.fadeOut(fadeDur)
            for (let edge of edgeBoxes) edge.fadeOut(fadeDur)
            instructions.fadeOut(fadeDur)
            $('input').fadeIn(500)
        }).on('keydown', e => {
            if (e.key == 'Enter') {
                for (let note of noteBoxes) note.trigger('submit')
                for (let edge of edgeBoxes) edge.trigger('submit')
                background.trigger('mousedown')
            } else if (e.key == 'Tab') {
                for (let note of noteBoxes) {
                    if (note.is(":hidden") || !edges.length) {
                        note.show().trigger('focus')
                    } else note.hide()
                }
                for (let edge of edgeBoxes) {
                    if (edge.is(":hidden") || !notes.length) {
                        edge.show().trigger('focus')
                    } else edge.hide()
                }

                e.preventDefault()
            } else if (e.key == 'Escape') {
                background.trigger('mousedown')
            }
            e.stopPropagation()
        }).hide().fadeIn(fadeDur)
        .appendTo(foreign.node)

    let instructions = $(document.createElement('p'))
        .text('Enter interval as cents, equal-tempered value, or frequency ratio, e.g. "386c", "4#12", or "5:4".')
        .css({
            position: 'absolute',
            textAlign: 'center',
            width: "80%",
            top: 20,
            fontFamily: 'Arial',
            fontSize: 12,
            letterSpacing: 1,
            color: "green",
            left: "10%"
        }).hide().fadeIn(fadeDur)
        .appendTo($('.seq'))

    for (let edge of edges) {
        let box = createEdgeInputBox(edge)
        background.append(box)
        box.on('input', ø => {
                //box.attr('size', Math.max(box.val().length, 5))
                let interval = parseIntervalText(box.val())
                let color = interval? 'green' : 'red';
                for (let ed of edgeBoxes) {
                    ed.css('border-color', color)
                    ed.val(box.val())
                    ed.attr('size', Math.max(box.val().length, 5))
                }
            }).hide()
        if (!notes.length) box.fadeIn(fadeDur).trigger('focus')
        edgeBoxes.push(box)
    }

    for (let note of notes) {
        let box = createNoteInputBox(note)
        background.append(box)
        box.on('input', ø => {
                let v = parseInt(box.val())
                let color = (v < 128) ? 'green' : 'red';
                for (let n of noteBoxes) {
                    n.css('border-color', color)
                    n.val(box.val())
                }
            }).hide()
            .fadeIn(fadeDur)
            .trigger('focus')

        box.show()
        noteBoxes.push(box)
    }

    $('input[type=range]').fadeOut(fadeDur)
}

function createEdgeInputBox(edge) {
    let oldText = edge.text.text()

    let input = $(document.createElement('input'))
        .attr({
            type: 'text',
            size: oldText.length,
            placeholder: oldText
        }).css({
            left: edge.midX-10,
            top: edge.midY-10,
        }).on('mousedown', e => {
            e.stopPropagation()
        }).on('submit', ø => {
            let interval = parseIntervalText(input.val())
            interval && edge.updateInterval(interval)
        }).addClass("text-input")
    return input;
}

function createNoteInputBox(note) {
    let velocityInput = $(document.createElement('input'))
        .attr({
            type: 'text',
            size: 3,
            maxlength: 3,
            placeholder: note.velocity
        })/* .on('input', ø => {
            if (velocityInput.val()) velocityInput.css('border-color', 'green')
            else velocityInput.css('border-color', 'red')
        }) */.on('mousedown', e => {
            e.stopPropagation()
        }).on('submit', ø => {
            note.velocity = parseInt(velocityInput.val()) || note.velocity;
            note.updateGraphics()
        }).on('keypress', e => {
            if (isNaN(parseInt(e.key))) e.preventDefault()
            e.stopPropagation()
        }).addClass("text-input")
    velocityInput.css({
        left: (note.xEnd + note.x)/2 - 15,
        top: note.y-5,
    })
    return velocityInput;
}

editor.connector = function(seqConnector, e) {
    let oldPt = editor.clickStart;
    let newPt = editor.canvas.point(e.x, e.y);
    //let newPt = mousePosn(e);
    seqConnector.plot(simpleBezierPath(oldPt, newPt, 'vertical')).front().show();
    
    if (!seqConnector.destination) {
        editor.seqText.hide();
        editor.setCursorStyle("crosshair");
    }
}

editor.zoom = function(xZoom, yZoom) {
    //throw "Zoom problems!!! :(";
    editor.zoomX = xZoom;
    editor.zoomY = yZoom;
    //seqBackground.size(editor.width * editor.zoomX, numKeys * editor.zoomY);
    for (let note of editor.notes) note.updateGraphics(0);
    for (let edge of editor.edges) edge.updateGraphics(0);
    for (let gliss of editor.glisses) gliss.updateGraphics(0);
    editor.canvas.size(editor.zoomX * editor.widthInTime, editor.zoomY * editor.numKeys);
    //return
    /* right now these rely on editor.zoomX/Y which is problematic--they have to go here */
    grid.zoom(xZoom, yZoom)
    ruler.zoom(xZoom, yZoom)
    keyboard.zoom(xZoom, yZoom)
    editor.scale(editor.zoomXY)
}


editor.assignMouseHandler = function(parent, svgNode, type) {
    let handler = handlers[type];
    if (handler.entered) svgNode.mouseover(e => handler.entered(e, parent));
    if (handler.exited)  svgNode.mouseout(e =>  handler.exited( e, parent));
    if (handler.clicked) svgNode.mousedown(e => handler.clicked(e, parent));
    if (handler.hovered) svgNode.mousemove(e => handler.hovered(e, parent));
    
    if (handler.doubleClick) $(svgNode.node).on('dblclick', e => handler.doubleClick(e, parent))
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
window.notes = ø => editor.notes;
window.edges = ø => editor.edges;