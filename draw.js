// create drawing context
//import * as tune from './tune.js';
/*
import * as svgJS from "@svgdotjs/svg.js";
const SVG = svgJS.SVG;
/**/
//const tune = require("./tune");

 

let keyWidth = 50;
let keyHeight = 20;
let keyGap = 2;
let numKeys = 128;

let seqZoomX = 8;
let seqZoomY = 16;
let seqWidth = 1024;

let rulerHeight = 20;

let lineStroke = {
    width:2, 
    color: 'rgb(200, 200, 200)', 
    linecap:'round'
};
let seqTextStyle = {
    family: 'Arial',
    fill: 'grey',
    size: 10
}
let lightGreyStrokeColor = "rgb(240, 240, 240)";
let greyStrokeColor = "rgb(220, 220, 220)";
let darkGreyStrokeColor = "rgb(200, 200, 200)";

let pianoRollElement = document.getElementById('piano-roll');
//let rollKeyboardElement = document.getElementById('roll-keyboard');
let xRange = document.getElementById('x-zoom');
let yRange = document.getElementById('y-zoom');

let rulerElement = document.getElementsByClassName('ruler-container')[0];
let keyboardElement = document.getElementsByClassName('piano-container')[0];
let scroller = document.getElementsByClassName('right-container')[0];

document.onkeydown = function(e) {
    switch (e.key) {
        case " ":
            e.preventDefault();
            if (playback.playing) playback.pause();
            else playback.play();
    }
}

function disableMouseEvents(svgElement) {
    svgElement.node.style.userSelect = 'none';
}

scroller.addEventListener('scroll',() => {
    keyboardElement.style.overflow = 'scroll';
    keyboardElement.scrollTop = scroller.scrollTop;
    keyboardElement.style.overflow = 'hidden';

    rulerElement.style.overflow = 'scroll';
    rulerElement.scrollLeft = scroller.scrollLeft;
    rulerElement.style.overflow = 'hidden';
});

yRange.addEventListener('input', () => updateSequencerZoom(seqZoomX, +yRange.value));
xRange.addEventListener('input', () => updateSequencerZoom(+xRange.value, seqZoomY));

let draw = SVG().addTo('#piano-roll').size(seqZoomX * seqWidth, seqZoomY * numKeys);
let keyboard = SVG().addTo('#roll-keyboard').size(keyWidth, seqZoomY * numKeys);
let ruler = SVG().addTo('#ruler').size(seqZoomX * seqWidth, rulerHeight);

ruler.mousemove(e => {
    if (!playback.playing && e.buttons == 1) playback.position = e.offsetX;
}).mousedown(e => {
    if (!playback.playing) playback.position = e.offsetX;
});
//let keyboard = draw.group();
//keyboard.move(0, 100);

let sequencer = draw.group();
let pianoKeys = [];
let seqNodes = [];
let seqEdges = [];

//pianoKeys.push(keyboard.rect(seqZoomX, seqZoomY));


let [grid, xLines, yLines] = createSequenceGrid();

let [rulerTicks, barNumbers] = createRuler();

function createRuler() {
    let ticks = Array(seqWidth).fill(0).map((_, i) => {
        /* let height = (!(i % 2) + !(i % 4) + !(i % 8) + !(i % 16) + 1) * rulerHeight/6;
        return ruler.line(i * seqZoomX, 0, i * seqZoomX, height)
                    .stroke({width: 1})
                    .stroke('black'); */
        if (i % 16 == 0) {
            let g = ruler.group();
            g.line(i * seqZoomX, 0, i * seqZoomX, 20)
                .stroke({width: 1})
                .stroke('black');
            let mm = g.text("" + Math.ceil((i+1) / 16))
                .font(seqTextStyle)
                .center((i+1) * seqZoomX, 10);
            disableMouseEvents(mm);
            return g;
        }
    });
    return [ticks, null];
}

function createSequenceGrid() {
    let grid = sequencer.group();
    //let seqBackground = grid.rect(seqWidth * seqZoomX, numKeys * seqZoomY).fill(seqBackgroundColor);

    // draw horizontal lines
    /* let xLines = Array(128).fill(0).map((_, i) => {
        let width = (!((129-i) % 12) + 0.5);
        return grid.line(0, i * seqZoomY, seqWidth * seqZoomX, i * seqZoomY)
                    .stroke({width: width})
                    .stroke(lightGreyStrokeColor);
    }); */
    let xLines = Array(128).fill(0).map((_, i) => {
        if ([1, 3, 6, 8, 10].includes(i % 12)) {
            // accidental
            return grid.rect(seqWidth * seqZoomX, seqZoomY)
                .move(0, (numKeys-(i+1)) * seqZoomY)
                .fill(greyStrokeColor);
        } else {
            return grid.rect(seqWidth * seqZoomX, seqZoomY)
                .move(0, (numKeys-(i+1)) * seqZoomY)
                .fill(lightGreyStrokeColor);
            }
        /*  else {
            let width = (!((129-i) % 12) + 0.5);
            return grid.line(0, i * seqZoomY, seqWidth * seqZoomX, i * seqZoomY)
            .stroke({width: width})
            .stroke(lightGreyStrokeColor);
        } */
    });
    // draw vertical lines
    let yLines = Array(seqWidth).fill(0).map((_, i) => {
        let width = (!(i % 2) + !(i % 4) + !(i % 8) + !(i % 16) + 1) / 2;
        return grid.line(i * seqZoomX, 0, i * seqZoomX, numKeys * seqZoomY)
                    .stroke({width: width})
                    .stroke(darkGreyStrokeColor);
    });
    
    return [grid, xLines, yLines];
}

grid.mouseup(() => {
    editor.selectNote()
});



function playNote(pitch, play=true, options) {
    let horizontalBar = xLines[pitch];
    if (!horizontalBar) return;

    let fillColor = play? options.seqFillSelected : options.seqFillUnselected;

    horizontalBar.fill(fillColor);
}

function updateSequencerZoom(xZoom, yZoom) {
    seqZoomX = xZoom;
    seqZoomY = yZoom;
    for (let i = 0; i < xLines.length; i++) {
        //xLines[i].plot(0, i * seqZoomY, seqWidth * seqZoomX, i * seqZoomY);
        xLines[i]?.size(seqWidth * seqZoomX, seqZoomY)
            .move(0, (numKeys-(i+1)) * seqZoomY);
    }
    for (let i = 0; i < yLines.length; i++) {
        yLines[i].plot(i * seqZoomX, 0, i * seqZoomX, numKeys * seqZoomY);
    }
    for (let i = 0; i < rulerTicks.length; i++) {
        let height = (!(i % 2) + !(i % 4) + !(i % 8) + !(i % 16) + 1) * rulerHeight/6;
        rulerTicks[i]?.move(i * seqZoomX, 0);
    }
    //seqBackground.size(seqWidth * seqZoomX, numKeys * seqZoomY);
    for (let note of seqNodes) note.updateGraphics(0);
    for (let edge of seqEdges) edge.updateGraphics(0);
    for (let key of pianoKeys) key.updateGraphics(0);

    draw.size(seqZoomX * seqWidth, seqZoomY * numKeys);
    keyboard.size(keyWidth, seqZoomY * numKeys);
}

function toSequencerX(x) {
    x = sequencer.point(x, 0).x;
    return x / seqZoomX;
}
function toSequencerY(y) {
    y = sequencer.point(0, y).y;
    return numKeys - y/seqZoomY;
}

const keyDisplay = {
    gap : keyGap,
    black: {
        color: 'black',
        hoverColor: 'grey',
        clickColor: 'lightblue',
        seqFillUnselected: greyStrokeColor,
        seqFillSelected: 'lightblue'
    },
    white: {
        color: 'white',
        hoverColor: 'grey',
        clickColor: 'lightblue',
        seqFillUnselected: lightGreyStrokeColor,
        seqFillSelected: 'lightblue'
    }
}

// quick-and dirty default 5 limit intervals
const fiveLimitScale = [
    tune.FreqRatio(1, 1),
    tune.FreqRatio(16, 15),
    tune.FreqRatio(9, 8),
    tune.FreqRatio(6, 5),
    tune.FreqRatio(5, 4),
    tune.FreqRatio(4, 3),
    tune.FreqRatio(45, 32),
    tune.FreqRatio(3, 2),
    tune.FreqRatio(8, 5),
    tune.FreqRatio(5, 3),
    tune.FreqRatio(16, 9),
    tune.FreqRatio(15, 8)
];

function guessJIInterval(x, y) {
    let idx = (((y - x) % 12) + 12) % 12;
    let octaves = Math.floor((y - x) / 12);
    let ji = fiveLimitScale[idx];
    let interval = ji
    //let interval = (x > y)? ji.inverse() : ji;
    return interval.add(tune.ETInterval.octave.multiply(octaves));
}

let pitchNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
let unscaledYList = [1, 1.1, 2, 2.4, 3, 4, 4.1, 5, 5.3, 6, 6.5, 7];

class PianoKey {
    constructor(pitch) {
        this.pitchClass = pitch % 12;
        this.isNatural = ![1, 3, 6, 8, 10].includes(this.pitchClass);
        this.displayOptions = this.isNatural? keyDisplay.white : keyDisplay.black;
        this.pitch = pitch;
        this.pitchName = pitchNames[this.pitchClass];
    }
    get x() {
        return 0;
    }
    get y() {
        return (numKeys - (unscaledYList[this.pitchClass] * 12/7 + Math.floor(this.pitch/12) * 12)) * seqZoomY;
    }
    get width() {
        return this.isNatural? keyWidth : keyWidth * 2/3;
    }
    get whiteKeyHeight() {
        return (12/7) * seqZoomY;
    }
    get height() {
        return this.isNatural? this.whiteKeyHeight : this.whiteKeyHeight * 0.6;
    }
    updateGraphics(animateDuration) {
        if (!this.container) return;
        this.keyRect.size(this.width, this.height)
            .move(this.x, this.y);
    }
    draw(container) {
        this.container = container;
        this.keyRect = container.rect(this.width, this.height)
            .radius(2)
            .stroke({color: 'grey', width: 1})
            .fill(this.displayOptions.color)
            .move(this.x, this.y)
            .mouseover(() => {
                this.keyRect.fill(this.displayOptions.hoverColor);
            })
            .mouseout(() => {
                this.keyRect.fill(this.displayOptions.color);
                playNote(this.pitch, false, this.displayOptions);
            })
            .mousedown(() => {
                this.keyRect.fill(this.displayOptions.clickColor);
                playNote(this.pitch, true, this.displayOptions);
            })
            .mouseup(() => {
                this.keyRect.fill(this.displayOptions.color);
                playNote(this.pitch, false, this.displayOptions);
            });;

        if (!this.isNatural) this.keyRect.front();
        else this.keyRect.back();
    }
}

createKeys(keyboard)

/**
 * 
 * @param { svgJS.Container } container 
 */
function createKeys(container) {
    for (let i = 0; i < numKeys; i++) {
        let key = new PianoKey(i);
        key.draw(container);
        pianoKeys.push(key);
    }
}

class SeqGliss {
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }
    draw() {
        let bValue1 = Math.floor(this.start.velocity * 2);
        let bValue2 = Math.floor(this.end.velocity * 2);
        let fillColor1 = new SVG.Color(`rgb(0, 128, ${bValue1})`);
        let fillColor2 = new SVG.Color(`rgb(0, 128, ${bValue2})`);
    
        let gradient = sequencer.gradient('linear', add => {
            add.stop(0, fillColor1);
            add.stop(1, fillColor2);
        });
        this.path = sequencer.path(simpleBezierPath({x: this.start.xEnd, y: this.start.y + seqZoomY / 2}, 
                                        {x: this.end.x, y: this.end.y + seqZoomY / 2}, 'horizontal'))
            .stroke({color: gradient, width: seqZoomY})
            .fill('none')
            .opacity(0.4)
            .insertAfter(this.start.rect)
            .insertAfter(this.end.rect);
    }
    redrawPosition() {
        this.path.plot(simpleBezierPath(
            {x: this.start.xEnd, y: this.start.y + seqZoomY / 2}, 
            {x: this.end.x, y: this.end.y + seqZoomY / 2}, 'horizontal'));
    }
}

class SeqNode {
    constructor(pitch, velocity, start, duration) {
        this.pitch = pitch;
        this.velocity = velocity;
        this.start = start;
        this.duration = duration;
        //this.tree = new SeqTree();
        this.children = [];
        this.glissInputs = [];
        this.glissOutputs = [];

        // these will change
        this._bend = 0;
        this.draw();
        //this.note = tune.NullNote();
    }
    set bend(val) {
        this._bend = val;
    }
    get bend() {
        return this._bend;
    }
    get soundingPitch() {
        return this.bend + this.pitch;
    }

    get x() {
        return this.start * seqZoomX;
    }
    get xEnd() {
        return (this.start + this.duration) * seqZoomX;
    }
    get y() {
        return (numKeys - (this.pitch + this._bend)) * seqZoomY;
    }
    get yET() {
        return (numKeys - this.pitch) * seqZoomY;
    }
    get width() {
        return this.duration * seqZoomX;
    }
    get height() {
        return seqZoomY;
    }
    get handleX() {
        return this.x + 0.5 * this.height;
    }
    get handleY() {
        return this.y + 0.5 * this.height;
    }
    get neighbors() {
        return this.children;
    }
    get asNote() {
        return tune.ETPitch(this.soundingPitch);
    }
    set selected(val) {
        this._selected = val;
        let bValue = Math.floor(this.velocity * 2);
        let fillColor = val? 'red' : new SVG.Color(`rgb(0, 128, ${bValue})`);
        this.rect.stroke(fillColor);
    }
    get selected() {
        return this._selected;
    }
    redrawPosition() {
        this.rect.move(this.x, this.y);
        this.shadowRect.move(this.x, this.yET);
        this.handle.center(this.handleX, this.handleY);
        this.indicator.center(this.handleX - this.height * 0.8, this.handleY);
        this.centDisplay.x((this.handleX - this.height) - this.centDisplay.length() - 5)
            .cy(this.handleY);
        this.resizeRight.move(this.xEnd - 4, this.y);
    }
    redrawInputs() {
        for (let g of this.glissInputs) g.redrawPosition()
    }
    redrawOutputs() {
        for (let g of this.glissOutputs) g.redrawPosition()
    }
    updateGraphics(animateDuration = 300) {
        let rect = this.rect, 
            shadowRect = this.shadowRect,
            handle = this.handle, 
            indicator = this.indicator, 
            centDisplay = this.centDisplay, 
            resizeRight = this.resizeRight;

        if (animateDuration) {
            rect = rect.animate(animateDuration);
            shadowRect = shadowRect.animate(animateDuration);
            handle = handle.animate(animateDuration);
            indicator = indicator.animate(animateDuration);
            centDisplay = centDisplay.animate(animateDuration);
            resizeRight = resizeRight.animate(animateDuration);
        }
        // non-animated changes
        this.centDisplay.text(this.bendText);

        // possibly animated changes
        rect.move(this.x, this.y)
            .size(this.width, this.height);
        shadowRect.move(this.x, this.yET)
            .size(this.width, this.height);
        handle.size(this.height, this.height)
            .center(this.handleX, this.handleY);
        indicator.size(this.height / 4, this.height / 2)
            .center(this.handleX - this.height * 0.8, this.handleY);
        centDisplay.x((this.handleX - this.height) - this.centDisplay.length() - 5)
            .cy(this.handleY);
        resizeRight.size(4, this.height)
            .move(this.xEnd - 4, this.y);
        if (Math.abs(this.bend) < 1e-2) this.indicator.fill('grey'); // shows when < 1c
        else if (this.bend < 0) this.indicator.fill('blue')
        else this.indicator.fill('red')
    }
    hide() {
        this.rect.hide();
        this.handle.hide();
        this.indicator.hide();
    }
    show() {
        this.rect.show();
        this.handle.show();
        this.indicator.show();
    }
    draw() {
        let bValue = Math.floor(this.velocity * 2);
        // shadow rectangle, shows equal tempered pitch
        this.shadowRect = sequencer.rect(this.width, this.height)
            .stroke('rgb(60, 60, 60)')
            .fill(new SVG.Color(`rgb(0, 255, ${bValue})`))
            .opacity(0.3)
            .radius(2)
            .move(this.x, this.yET);

        let fillColor = new SVG.Color(`rgb(0, 128, ${bValue})`);

        const setDestination = e => {
            if (seqConnector.source && this != seqConnector.source) {
                if (editor.action == editor.glisser) {
                    if (seqConnector.source.xEnd < this.x) {
                        seqConnector.destination = this;
                    }
                } else {
                    seqConnector.destination = this;
                    let intervalText;
                    if (this.isConnectedTo(seqConnector.source)) {
                        pianoRollElement.style.cursor = "not-allowed";
                    } else {
                        intervalText = normAscendingInterval(guessJIInterval(seqConnector.source.pitch, this.pitch)).toString();
                        //svgElement.style.cursor = "crosshair";
                                        
                        let {x, y} = mousePosn(e)
                        seqText.text(intervalText)
                            .center(x, y - 15)
                            .front()
                            .show();
                    }
                }
            }
        }
        // main rectangle, shows adjusted pitch
        this.rect = sequencer.rect(this.width, this.height)
            .fill(fillColor)
            .stroke(fillColor)
            .radius(2)
            .move(this.x, this.y)
            .mousemove(e => {
                if (e.altKey) pianoRollElement.style.cursor = "ns-resize";
                else pianoRollElement.style.cursor = "move";
                setDestination(e);
            }).mousedown(e => {
                if (e.altKey) editor.action = editor.bend;
                else editor.action = editor.move
                
                this.centDisplay.opacity(1);
            }).mouseout(() => {
                seqConnector.destination = null;
                if (editor.action != editor.bend) pianoRollElement.style.cursor = "default";
            });

        this.handle = sequencer.group();
        this.handle.circle(this.height / 2)
            .center(this.handleX, this.handleY)
            .fill("white");

        // invisible, but catches mouse events
        this.handle.rect(this.height, this.height)
            .center(this.handleX, this.handleY)
            .front()
            .stroke('black')
            .fill('white')
            .radius(2)
            .opacity(0.2)
            .mousedown(e => {
                let pt = sequencer.point(e.x, e.y);
                //seqConnector.plot(pt.x, this.y + 0.5*this.height, pt.x, pt.y).show().front();
                seqConnector.plot(simpleBezierPath({x: pt.x, y: this.y + 0.5*this.height}, pt, 'vertical'))
                    .stroke(lineStroke)
                    .opacity(1)
                    .show()
                    /* .front(); */
                seqConnector.source = this;
                editor.action = editor.connector;
            })
            .mouseover(() => {
                pianoRollElement.style.cursor = "crosshair";
            })
            .mouseout(() => {
                if (!seqConnector.visible()) pianoRollElement.style.cursor = "default";
                else pianoRollElement.style.cursor = "crosshair";
            })
            .mousemove(setDestination);

        this.indicator = sequencer.rect(this.height / 4, this.height / 2)
            .center(this.handleX - this.height * 0.8, this.handleY)
            .radius(2)
            .mouseover(() => {
                pianoRollElement.style.cursor = "col-resize";
            }).mouseout(() => {
                if (!seqResizeLeft) pianoRollElement.style.cursor = "default";
            }).mousedown(() => {
                editor.action = editor.resizeLeft;
            });
        this.centDisplay = sequencer.text(this.bendText)
            .font(seqTextStyle)
            .opacity(0);
        this.centDisplay.x((this.handleX - this.height) - this.centDisplay.length() - 5)
            .cy(this.handleY);
        this.centDisplay.node.style.userSelect = 'none';

        this.resizeRight = sequencer.rect(4, this.height)
            .move(this.xEnd - 4, this.y)
            .radius(2)
            .stroke('black')
            .opacity(0.3)
            .fill('black')
            .mouseover(e => {
                if (e.altKey) pianoRollElement.style.cursor = "all-scroll";
                else pianoRollElement.style.cursor = "col-resize";
            }).mouseout(() => {
                if (!seqResizeRight) pianoRollElement.style.cursor = "default";
            }).mousedown(e => {
                if (e.altKey) {
                    editor.action = editor.glisser;
                    seqConnector.source = this;
                    seqConnector.stroke({color: fillColor, width: seqZoomY})
                        .opacity(0.4);
                } else editor.action = editor.resizeRight;
            });

        this.group = sequencer.group();
        this.rect.addTo(this.group);
        this.handle.addTo(this.group);
        this.indicator.addTo(this.group);
        this.centDisplay.addTo(this.group);
        this.resizeRight.addTo(this.group);

        let display = false;
        this.group.mousemove(() => {
            if (editor.action != editor.bend) {
                this.centDisplay.opacity(1);
                display = true;
            }
        }).mouseout(() => {
            if (display && editor.action != editor.bend) {
                this.centDisplay.opacity(0);
                display = false;
            }
        }).mousedown(e => {
            if (e.metaKey || e.ctrlKey) editor.toggleNoteInSelection(this); 
            else editor.selectNote(this);
        });

        this.updateGraphics(0);
        return [this.rect, this.shadowRect];
    }
    get bendText() {
        let str = (Math.round((this.bend * 100) * 100) / 100) + "c";
        if (this.bend >= 0) str = "+" + str;
        return str;
    }
    getIntervalTo(other) {
        return this.BFS({
            initialStore: [tune.ETInterval(0)],
            predicate: child => child.b == other,
            combine: (edge, interval) => [interval.add(edge.interval)],
            successVal: (edge, interval) => interval.add(edge.interval),
            failureVal: () => tune.ETInterval(other.soundingPitch - this.soundingPitch)
        });
    }
    /**
     * StoreVals := [...]
     * 
     * initialStore : [...StoreVals]
     * predicate : Edge -> Boolean
     * combine: Edge, ...StoreVals -> [...StoreVals]
     * successVal : Edge, ...StoreVals -> S
     * failureVal : () -> S
     * */
    BFS(options) {

        options.initialStore = options.initialStore || [null];
        options.combine = options.combine || (edge => []);
        options.successVal = options.successVal || (edge => edge);
        options.failureVal = options.failureVal || (() => null);

        let visited = new Set();
        let fringe = [[this, ...options.initialStore]];
        
        while (fringe.length) {
            let [node, ...storeVals] = fringe.pop();
            visited.add(node);
            for (let child of node.neighbors) {
                if (!(child.b in visited)) {
                    let newStore = options.combine(child, ...storeVals);
                    if (options.predicate(child)) return options.successVal(child, ...storeVals);
                    else fringe.unshift([child.b, ...newStore]);
                }
            }
        }
        return options.failureVal();
    }
    connectTo(other, by = guessJIInterval(this.pitch, other.pitch)) {
        // does not really account for other already having a parent

        if (this.isConnectedTo(other) || other.parent) return null;

        other.parent = this;
        let edge = new SeqEdge(this, other, by);
        this.children.push(edge);
        seqEdges.push(edge);
        // propogate own bend to subtree
        edge.draw();
        edge.propogateBend(this.bend);

        return edge;
    }
    disconnectFrom(other) {
        return this.BFS({
            predicate: edge => edge.b == other,
            successVal: edge => {
                edge.remove()
                return true;
            },
            failureVal: () => false,
        });
    }
    isConnectedTo(other) {
        return this.hasDescendant(other) 
            || other.hasDescendant(this) 
            || this.hasSibling(other); 
    }
    hasSibling(other) {
        return this.parent?.children.find(e => e.b == other);
    }
    // DFS
    hasDescendant(other) {
        if (other == this) return true;

        for (let child of this.children) {
            if (child.b.isConnectedTo(other)) return true;
        }
        return false; 
    }
    resetBend() {
        this.propogateBend(0, 0);
    }
    // offset all children by this bend amount
    propogateBend(bend, animateDuration = 300) {
        this.bend = bend;
        this.updateGraphics(animateDuration);
        this.redrawInputs();
        this.redrawOutputs();

        this.BFS({
            initialStore: [bend],
            predicate: () => false,
            combine: (edge, bend) => {
                let note = edge.b;
                let newBend = edge.getBend() + bend
                note.bend = newBend;
                note.updateGraphics(animateDuration);
                note.redrawInputs();
                note.redrawOutputs();
                edge.updateGraphics(animateDuration);
                return [newBend];
            }
        });
    }
    remove() {
        this.bend = 0;
        if (this.parent) this.parent.removeChild(this);
        for (let child of this.children) child.b.resetBend();
    }
    removeChild(node) {
        this.children = this.children.filter(edge => edge.b != node);
        console.log("children:", this.children)
    }
}

class SeqEdge {
    constructor(a, b, interval) {
        this.a = a;
        this.b = b;
        this.interval = interval;
    }
    updateGraphics(animateDuration) {
        if (this.line) {
            let line = animateDuration? this.line.animate(animateDuration) : this.line;
            let text = animateDuration? this.text.animate(animateDuration) : this.text;

            let dist = Math.abs(this.a.start - this.b.start);
            let width = 4 * (1 - Math.tanh(dist / 64)) + 1;
            let path = simpleBezierPath(
                {x: this.a.handleX, y: this.a.handleY},
                {x: this.b.handleX, y: this.b.handleY}, 
                'vertical');
            line.plot(path)
                .stroke({width: width});
            text.center(this.midX, this.midY);
        }
    }
    get midX() {
        return (this.a.handleX + this.b.handleX) / 2;
    }
    get midY() {
        return (this.a.handleY + this.b.handleY) / 2;
    }
    draw() {
        let path = simpleBezierPath(
            {x: this.a.handleX, y: this.a.handleY},
            {x: this.b.handleX, y: this.b.handleY}, 
            'vertical');

        this.line = sequencer.path(path)
            .stroke(lineStroke)
            .opacity(0.7)
            .fill('none')
            .mouseover(() => this.text.show())

        this.text = sequencer.text(normAscendingInterval(this.interval).toString())
                    .font(seqTextStyle)
                    .center(this.midX, this.midY)
                    //.hide();
        this.text.node.style.userSelect = 'none';
                    
    }
    hide() {
        this.text.hide();
        this.line.hide();
    }
    show() {
        this.line.show();
    }
    remove() {
        this.a.removeChild(this.b);
        this.b.parent = undefined; ////FIX THIS WHEN U FIX NEIGHBORS
        console.log("b:", this.b)
        this.b.resetBend();
        this.line.remove();
        this.text.remove();
        seqEdges = seqEdges.filter(e => e != this);
        console.log("edges:",seqEdges)
    }
    // offset child and all its children by this bend amount
    propogateBend(bend, animateDuration) {
        this.b.propogateBend(this.getBend() + bend, animateDuration);
        this.updateGraphics(animateDuration);
    }
    // return the amount the top note will be bent
    getBend() {
        return this.interval.subtract(tune.ETInterval(this.b.pitch - this.a.pitch)).cents() / 100;
    }
}

function normAscendingInterval(interval) {
    if (interval.n < interval.d) interval = interval.inverse();
    return interval.normalized();
}

let seqConnector = sequencer.path().stroke(lineStroke).hide().fill('none');
let seqText = sequencer.text("").font(seqTextStyle).hide();
let seqResizeRight = null;
let seqResizeLeft = null;
let seqGrid = 1;
let seqBender = null;
let seqMover= null;
let seqSelectBox = 
    sequencer.polygon()
        .fill('grey')
        .opacity(0.2)
        .stroke('black')
        .hide();
let seqClickStart = null;


const playback = {
    line: sequencer.line().stroke({ width: 2, color: 'red'}).hide().front(),
    carrot: ruler.circle(10).fill('red').y(rulerHeight / 2).hide().front(),
    intervalIndex: -1,
    _position: 0,
    bpm: 120,
    set position(val) {
        playback._position = val;
        playback.line.plot(val, 0, val, numKeys * seqZoomY).show();
        playback.carrot.cx(val).show()
    },
    get position() {
        return playback._position;
    },
    get playing() {
        return playback.intervalIndex != -1;
    },
    play(startPosition = playback.position) {
        let start = Date.now();
        playback.pause();
        playback.position = startPosition || playback.position;
        let measureLengthMs = (60000 * 4) / playback.bpm;
        let measureWidth = 16 * seqZoomX;
        let fps = 29;
        playback.line.show().front()
        playback.carrot.show().front()

        playback.intervalIndex = setInterval(() => {
            let now = Date.now();
            let deltaMs = now - start;
            let measureCount = deltaMs / measureLengthMs;
            let posn = startPosition + measureWidth * measureCount;
            let screenPosn = Math.max(posn - 100, 0);
            scroller.scroll(screenPosn, scroller.scrollTop);

            playback.position = posn;
            if (posn >= seqWidth * seqZoomX) playback.stop();
        }, 1000 / fps);
    },
    pause() {
        clearInterval(playback.intervalIndex);
        playback.intervalIndex = -1;
    },
    stop() {
        playback.pause();
        playback.position = 0;
        playback.line.hide();
        playback.carrot.hide();
    }
}

window.start = playback.start;
window.stop = playback.stop;
window.pause = playback.pause;


// pass through mouse events
disableMouseEvents(seqText);
disableMouseEvents(seqConnector);

let xScrollElement = document.getElementsByClassName("scrollable-roll")[0];
let yScrollElement = document.getElementsByClassName("seq")[0];

function mousePosn(e) {
    return {
        x: e.offsetX,
        y: e.offsetY
    }
}
const editor = {};

let startStarts;
editor.resizeLeft = function(e, ...notes) {
    if (!startStarts) {
        startStarts = new Map();
        for (let note of notes) startStarts.set(note, note.start);
    }

    let deltaX = toSequencerX(e.x - seqClickStart.x);
    for (let note of notes) {
        let start = Math.round((startStarts.get(note) + deltaX) / seqGrid) * seqGrid;
        note.duration = Math.max(note.duration + (note.start - start), seqGrid);
        if (note.duration > seqGrid) note.start = start;
        note.updateGraphics(0);
        note.redrawInputs();
        for (let child of note.neighbors) child.updateGraphics(0);
    }
}

let startDurs;
editor.resizeRight = function(e, ...notes) {
    if (!startDurs) {
        startDurs = new Map();
        for (let note of notes) startDurs.set(note, note.duration);
    }

    let deltaX = toSequencerX(e.x - seqClickStart.x);
    for (let note of notes) {
        let dur = Math.round((startDurs.get(note) + deltaX) / seqGrid) * seqGrid;
        note.duration = Math.max(dur, seqGrid);
        note.updateGraphics(0);
        note.redrawOutputs();
    }
}

let lastBend = {};
let lastY;
editor.bend = function(e, ...notes) {
    lastY = lastY || e.y;
    let deltaY = e.y - lastY;
    for (let note of notes) {
        let newBend = Math.round(note.bend * 100 - deltaY) / 100;
        if (newBend != lastBend[note]) note.propogateBend(newBend, 0);
        lastBend[note] = newBend;
    }
    
    lastY = e.y;
}

editor.glisser = function(seqConnector, e) {
    let start = {x: seqConnector.source.xEnd, y: seqConnector.source.y + seqZoomY / 2};
    let time = toSequencerX(e.x)
    let pitch = toSequencerY(e.y)
    // discrete steps??
   /*  time = Math.round(time * seqGrid) / seqGrid;
    pitch = Math.floor(pitch) + 0.5 */
    let x = time * seqZoomX;
    let y = (numKeys - pitch) * seqZoomY
    //seqConnector.plot(start.x, start.y, x, y).show();
    let path = simpleBezierPath(start, {x, y}, 'horizontal');
    seqConnector.plot(path)
        .show();
}

editor.boxSelect = function(box, e) {
    let end = mousePosn(e);
    let start = seqClickStart;
    let poly = [
        [start.x, end.y],
        [end.x, end.y],
        [end.x, start.y],
        [start.x, start.y]];
    box.plot(poly);
}

editor.toggleNoteInSelection = function(note) {
    if (editor.selectedNote && !editor.selection.includes(editor.selectedNote)) {
        editor.selection.push(editor.selectedNote);
        editor.selectedNote = undefined;
    }
    if (editor.selection.includes(note)) {
        editor.selection = editor.selection.filter(n => n != note);
        note.selected = false;
    } else {
        editor.selection.push(note);
        note.selected = true;
        editor.selectedNote = note;
    }
    console.log(editor.selection)
}

editor.selectNotes = function(elem) {
    editor.deselectNotes();
    editor.selection = seqNodes.filter(note => {
        let {x, y, x2, y2} = note.rect.bbox();
        return elem.inside(x, y) 
            || elem.inside(x2, y2);
    });
    for (let note of editor.selection) note.selected = true;
}

editor.deselectNotes = function() {
    //for (let note of seqNodes) note.selected = false;
    for (let note of editor.selection) note.selected = false;
}

editor.selectNote = function(note) {
    if(editor.selectedNote && !editor.selection.includes(note)) {
        editor.selectedNote.selected = false;
    }
    note && (note.selected = true);
    editor.selectedNote = note;
}

// divide moving from note1 to note2
editor.equallyDivide = function(note1, note2, n) {
    if (n < 1) return;

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
    editor.connect(prev, note2, prev.getIntervalTo(note2));
}

editor.addNote = function(pitch, velocity, start, duration) {
    let note = new SeqNode(pitch, velocity, start, duration)
    seqNodes.push(note);
    return note;
}

editor.disconnect = function(note1, note2) {
    note1.disconnectFrom(note2);
}

editor.connect = function(note1, note2, by) {
    let success = note1.connectTo(note2, by);
    console.log(`connected ${note1.pitch} and ${note2.pitch}? ${!!success}`);
}

editor.gliss = function(start, end) {
    let gliss = new SeqGliss(start, end);
    start.glissOutputs.push(gliss);
    end.glissInputs.push(gliss);
    gliss.draw();
    // add gliss???
}

let startPosns;
let lastDeltas;
editor.move = function(e, ...notes) {
    //notes = getAllConnected(); // get those connected by 
    e = mousePosn(e)
    if (!startPosns) {
        startPosns = new Map();
        lastDeltas = {x:0, y:0};
        for (let note of notes) startPosns.set(note, { start: note.start, pitch: note.pitch});
    }

    let deltaX = toSequencerX(e.x) - toSequencerX(seqClickStart.x);
    deltaX = Math.round(deltaX / seqGrid) * seqGrid;
    let deltaY = Math.round(toSequencerY(e.y) - toSequencerY(seqClickStart.y));
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
            note.pitch = Math.min(Math.max(n.pitch + deltaY, 0), numKeys);
            note.redrawPosition(0);
            note.redrawInputs();
            note.redrawOutputs();
        }
    }
    lastDeltas = {x: deltaX, y: deltaY};
}

editor.applyToSelection = function(fn, e) {
    let notes = editor.selection;
    let curr = editor.selectedNote;
    if (notes.includes(curr)) fn(e, ...notes);
    ///else fn(e, ...notes, curr)
    else editor.deselectNotes(), fn(e, curr);
}

function simpleBezierPath(start, end, orientation) {
    // 0.01 is added b/c beziers can't be completely straight
    if (orientation == 'vertical') {
        let ctrlPtOffset = (end.y - start.y) / 4;
        return`M ${start.x} ${start.y} 
               C ${start.x + .01} ${start.y + ctrlPtOffset}
                 ${end.x + .01} ${end.y - ctrlPtOffset} 
                 ${end.x} ${end.y}`;
    } else {
        let ctrlPtOffset = (end.x - start.x) / 4;
        return `M ${start.x} ${start.y} 
                C ${start.x + ctrlPtOffset} ${start.y + .01}
                  ${end.x - ctrlPtOffset} ${end.y + .01} 
                  ${end.x} ${end.y}`;
    }
}

editor.connector = function(seqConnector, e) {
    let oldPt = seqClickStart;
    let newPt = sequencer.point(e.x, e.y);
    seqConnector.plot(simpleBezierPath(oldPt, newPt, 'vertical'));
    
    if (!seqConnector.destination) {
        seqText.hide();
        pianoRollElement.style.cursor = "crosshair";
    }
}

editor.selection = [];
editor.action = null;

// for debugging purposes
window.editor = editor;
window.notes = () => seqNodes;
window.edges = () => seqEdges;

sequencer.mousemove(e => {
    switch (editor.action) {
        case editor.move:
        case editor.bend:
        case editor.resizeLeft:
        case editor.resizeRight:
            editor.applyToSelection(editor.action, e)
            break;
        case editor.boxSelect:
            editor.boxSelect(seqSelectBox, e);
            break;
        case editor.connector:
        case editor.glisser:
            editor.action(seqConnector, e);
            break;
    }
    //if (!playback.playing && e.buttons == 1) playback.position = e.offsetX;
}).mousedown(e => {
    seqClickStart = mousePosn(e);
    if (!editor.action) {
        let poly = [[seqClickStart.x, seqClickStart.y],
        [seqClickStart.x, seqClickStart.y],
        [seqClickStart.x, seqClickStart.y],
        [seqClickStart.x, seqClickStart.y]];
        seqSelectBox.plot(poly).show();
        editor.action = editor.boxSelect;
        console.log("showing box")
    }
}).mouseup(e => {
    if (editor.action == editor.connector) {
        if (seqConnector.destination) {
            editor.connect(seqConnector.source, seqConnector.destination);
        } 
        seqConnector.hide();
        seqText.hide();
        seqConnector.source = null;
        seqConnector.destination = null;
    } else if (editor.action == editor.glisser) {
        if (seqConnector.destination) {
            editor.gliss(seqConnector.source, seqConnector.destination);
        } 
        seqConnector.hide();
        seqText.hide();
        seqConnector.source = null;
        seqConnector.destination = null;
    } else if (editor.action == editor.boxSelect) {
        // selector box
        editor.selectNotes(seqSelectBox);
        console.log("selected notes:",editor.selection)
        seqSelectBox.size(0, 0).hide();
    }

    seqResizeRight = null;
    seqResizeLeft = null;
    seqBender = null;
    seqMover = null;
    lastY = null;
    startStarts = undefined;
    startDurs = undefined;
    startPosns = undefined;

    pianoRollElement.style.cursor = "default";
    editor.action = undefined;
});

function showAdjustments(show) {
    if (show) {
        for (let note of seqNodes) note.show();
        for (let edge of seqEdges) edge.show();
    } else {
        for (let note of seqNodes) note.hide();
        for (let edge of seqEdges) edge.hide();
    }
}
editor.zoom = updateSequencerZoom;
editor.show = showAdjustments;

/* let C = new SeqNode(60, 60, 3, 30);
let E = new SeqNode(64, 12, 13, 10);
let G = new SeqNode(67, 128, 3, 40);
let B = new SeqNode(71, 53, 5, 4);
seqNotes = [C, E, Gsharp, B]; */
seqNodes.push(new SeqNode(60, 60, 20, 10));
seqNodes.push(new SeqNode(72, 128, 25, 15));

for (let i = 0; i < 20; i++) {
    //let pitch = Math.floor(Math.random() * 60) + 60;
    let pitch = i*4 + 60;
    let velocity = Math.floor(Math.random() * 128);
    //let start = Math.floor(Math.random() * 40);
    let start = i + 2 + Math.random() * 4;
    let duration = Math.floor(Math.random() * 40) + 1;
    seqNodes.push(new SeqNode(pitch, velocity, start, duration));
}