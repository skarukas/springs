// create drawing context
//import * as tune from './tune.js';
/*
import * as svgJS from "@svgdotjs/svg.js";
const SVG = svgJS.SVG;
/**/ 

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

let scrollX = document.getElementsByClassName('scrollable-roll')[0];

scrollX.addEventListener('scroll',() => {
    rulerElement.scrollLeft = scrollX.scrollLeft;
    console.log(rulerElement.scrollLeft);
});

yRange.addEventListener('input', () => updateSequencerZoom(seqZoomX, yRange.value));
xRange.addEventListener('input', () => updateSequencerZoom(xRange.value, seqZoomY));

let draw = SVG().addTo('#piano-roll').size(seqZoomX * seqWidth, seqZoomY * numKeys);
let keyboard = SVG().addTo('#roll-keyboard').size(keyWidth, seqZoomY * numKeys);
let ruler = SVG().addTo('#ruler').size(seqZoomX * seqWidth, rulerHeight);
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
        let height = (!(i % 2) + !(i % 4) + !(i % 8) + !(i % 16) + 1) * rulerHeight/6;
        return ruler.line(i * seqZoomX, 0, i * seqZoomX, height)
                    .stroke({width: 1})
                    .stroke('black');
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
        rulerTicks[i].plot(i * seqZoomX, 0, i * seqZoomX, height);
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

function getNotesInside(elem) {
    return seqNodes.filter(note => {
        let {x, y, x2, y2} = note.rect.bbox();
        return elem.inside(x, y) 
            || elem.inside(x2, y2);
    });
}

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
        /*let key = container.rect(50, seqZoomY)
            .radius(4)
            .stroke('grey')
            .fill(keys.white.color)
            .move(0, (7-i) * seqZoomY)
            .mouseover(() => {
                key.fill(keys.white.hoverColor);
            })
            .mouseout(() => {
                console.log("mouseout");
                key.fill(keys.white.color);
            })
            .mousedown(() => {
                key.fill(keys.white.clickColor);
            })
            .mouseup(() => {
                key.fill(keys.white.color);
            }); */
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
        // shadow rectangle, shows equal tempered pitch
        this.shadowRect = sequencer.rect(this.width, this.height)
            .stroke('rgb(60, 60, 60)')
            .fill(new SVG.Color(`rgb(0, 255, ${this.velocity * 2})`))
            .opacity(0.3)
            .radius(2)
            .move(this.x, this.yET);

        /* let fillColor = draw.gradient('linear', (add) => {
                add.stop(0, new SVG.Color(`rgb(0, 255, ${this.velocity * 2})`));
                add.stop(1, new SVG.Color(`rgb(0, 128, ${this.velocity * 2})`));
            })
            .from(0, 1)
            .to(0, 0); */
        let fillColor = new SVG.Color(`rgb(0, 128, ${this.velocity * 2})`);

        const setDestination = () => {
            if (seqLine.source && this != seqLine.source) {
                seqLine.destination = this;
                let intervalText;
                if (this.isConnectedTo(seqLine.source)) {
                    pianoRollElement.style.cursor = "not-allowed";
                } else {
                    intervalText = normAscendingInterval(guessJIInterval(seqLine.source.pitch, this.pitch)).toString();
                    //svgElement.style.cursor = "crosshair";
                                    
                    let [mouseX, mouseY] = seqLine.array()[1] ;
                    seqText.text(intervalText)
                        .center(mouseX, mouseY - 15)
                        .front()
                        .show();
                }
            }
        }
        // main rectangle, shows adjusted pitch
        this.rect = sequencer.rect(this.width, this.height)
            .fill(fillColor)
            .stroke(fillColor)
            .radius(2)
            .move(this.x, this.y)
            .mousemove(setDestination)
            .mouseover(() => {
                pianoRollElement.style.cursor = "ns-resize";
            }).mousedown(() => {
                seqBender = this;
                this.centDisplay.opacity(1);
            }).mouseout(() => {
                seqLine.destination = null;
                if (!seqBender) pianoRollElement.style.cursor = "default";
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
                seqLine.plot(pt.x, this.y + 0.5*this.height, pt.x, pt.y).show().front();
                seqLine.source = this;
            })
            .mouseover(() => {
                pianoRollElement.style.cursor = "crosshair";
            })
            .mouseout(() => {
                if (!seqLine.visible()) pianoRollElement.style.cursor = "default";
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
                seqResizeLeft = this;
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
            .mouseover(() => {
                pianoRollElement.style.cursor = "col-resize";
            }).mouseout(() => {
                if (!seqResizeRight) pianoRollElement.style.cursor = "default";
            }).mousedown(e => {
                seqResizeRight = this;
            });

        this.group = sequencer.group();
        this.rect.addTo(this.group);
        this.handle.addTo(this.group);
        this.indicator.addTo(this.group);
        this.centDisplay.addTo(this.group);
        this.resizeRight.addTo(this.group);

        let display = false;
        this.group.mousemove(() => {
            if (!seqBender) {
                this.centDisplay.opacity(1);
                display = true;
            }
        }).mouseout(() => {
            if (display && !seqBender) {
 /*                this.centDisplay.animate(1000, 300).opacity(0).after(() => {
                    display = false;
                }); */
                this.centDisplay.opacity(0);
                display = false;
            }
        });

        this.updateGraphics(0);
        return [this.rect, this.shadowRect];
    }
    get bendText() {
        let str = (Math.round((this.bend * 100) * 100) / 100) + "c";
        if (this.bend >= 0) str = "+" + str;
        return str;
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
        /* this.tree.connect(this, other, by);

        other.note = this.note.noteAbove(by);
        other.bend = tune.ETPitch(other.pitch).intervalTo(other.note).cents();
        other.tree = this.tree; */
        return edge;
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
        for (let child of this.children) child.propogateBend(bend, animateDuration);
    }
    remove() {
        this.bend = 0;
        if (this.parent) this.parent.removeChild(this);
        for (let child of this.children) child.b.resetBend();
    }
    removeChild(node) {
        this.children = this.children.filter(edge => edge.b != node);
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
            line.plot(this.a.handleX, 
                        this.a.handleY,
                        this.b.handleX, 
                        this.b.handleY)
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
        let destination = seqLine.array()[1];
        this.line = sequencer.line(this.a.handleX, 
                                    this.a.handleY,
                                    destination[0], 
                                    destination[1])
            .stroke(lineStroke)
            .opacity(0.7)
            .mouseover(() => this.text.show())
            //.mouseout(() => this.text.hide());

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
        this.b.resetBend();
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

let seqLine = sequencer.line().stroke(lineStroke).hide();
let seqText = sequencer.text("").font(seqTextStyle).hide();
let seqResizeRight = null;
let seqResizeLeft = null;
let seqGrid = 1;
let seqBender = null;
let seqSelectBox = 
    sequencer.polygon()
        .fill('grey')
        .opacity(0.2)
        .stroke('black')
        .hide();
let seqBoxStart = null;
let selectedNotes = [];

// pass through mouse events
seqText.node.style.pointerEvents = 'none'; 
seqLine.node.style.pointerEvents = 'none';
let lastY;
let lastBend;

let xScrollElement = document.getElementsByClassName("scrollable-roll")[0];
let yScrollElement = document.getElementsByClassName("seq")[0];

function mousePosn(e) {
    return {
        x: e.offsetX,
        y: e.offsetY
    }
}

sequencer.mousemove(e => {
    if (seqLine.visible()) {
        let oldPt = seqLine.array()[0];
        let newPt = sequencer.point(e.x, e.y);
        seqLine.plot(...oldPt, newPt.x, newPt.y);
        if (!seqLine.destination) pianoRollElement.style.cursor = "crosshair";
    } else if (seqResizeRight) {
        let roundedX = Math.round(toSequencerX(e.x) / seqGrid) * seqGrid;
        seqResizeRight.duration = Math.max(roundedX - seqResizeRight.start, seqGrid);
        seqResizeRight.updateGraphics(0);
    } else if (seqResizeLeft) {
        let roundedX = Math.round(toSequencerX(e.x) / seqGrid) * seqGrid;
        seqResizeLeft.duration = Math.max(seqResizeLeft.duration + (seqResizeLeft.start - roundedX), seqGrid);
        if (seqResizeLeft.duration > seqGrid) seqResizeLeft.start = roundedX;
        seqResizeLeft.updateGraphics(0);
        for (let child of seqResizeLeft.children) child.updateGraphics(0);
    } else if (seqBender) {
        lastY = lastY || e.y;
        let deltaY = e.y - lastY;
        let newBend = Math.round(seqBender.bend * 100 - deltaY) / 100;
        if (newBend != lastBend) seqBender.propogateBend(newBend, 0);
        
        lastY = e.y;
        lastBend = newBend;
        //seqResize.updateGraphics(0);
    } else if (seqSelectBox.visible()) {
        let p = mousePosn(e);
        let poly = [
            [seqBoxStart.x, p.y],
            [p.x, p.y],
            [p.x, seqBoxStart.y],
            [seqBoxStart.x, seqBoxStart.y]];
        seqSelectBox.plot(poly);
    }
    if (!seqLine.destination) seqText.hide();
    //console.log(toSequencerX(e.x), toSequencerY(e.y));
}).mousedown(e => {
    seqBoxStart = mousePosn(e);
    let poly = [[seqBoxStart.x, seqBoxStart.y],
                [seqBoxStart.x, seqBoxStart.y],
                [seqBoxStart.x, seqBoxStart.y],
                [seqBoxStart.x, seqBoxStart.y]];
    seqSelectBox.plot(poly)
                .show();
}).mouseup(e => {
    if (seqLine.visible()) {
        if (seqLine.destination) {
            let success = seqLine.source.connectTo(seqLine.destination);
            console.log(`connected ${seqLine.source.pitch} and ${seqLine.destination.pitch}? ${!!success}`);
        } 
        seqLine.hide();
        seqText.hide();
        seqLine.source = null;
        seqLine.destination = null;
    } else if (seqSelectBox.visible()) {
        // selector box
        selectedNotes = getNotesInside(seqSelectBox);
        console.log(selectedNotes)
        seqSelectBox.hide().size(0, 0);
    }

    seqResizeRight = null;
    seqResizeLeft = null;
    seqBender = null;
    lastY = null;


    pianoRollElement.style.cursor = "default";
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
window.zoom = updateSequencerZoom;
window.show = showAdjustments;

/* let C = new SeqNode(60, 60, 3, 30);
let E = new SeqNode(64, 12, 13, 10);
let G = new SeqNode(67, 128, 3, 40);
let B = new SeqNode(71, 53, 5, 4);
seqNotes = [C, E, Gsharp, B]; */

for (let i = 0; i < 20; i++) {
    //let pitch = Math.floor(Math.random() * 60) + 60;
    let pitch = i*4 + 60;
    let velocity = Math.floor(Math.random() * 128);
    //let start = Math.floor(Math.random() * 40);
    let start = i + 2 + Math.random() * 4;
    let duration = Math.floor(Math.random() * 40) + 1;
    seqNodes.push(new SeqNode(pitch, velocity, start, duration));
}