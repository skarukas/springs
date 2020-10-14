import editor from "./editor.js";
import { disableMouseEvents, guessJIInterval } from "./util.js"
import SeqEdge from "./seqEdge.js"
import style from "./style.js"

export default class SeqNote {
    constructor(pitch, velocity, start, duration) {
        this.pitch = pitch;
        this.velocity = velocity;
        this.start = start;
        this.duration = duration;
        this.children = [];
        this.glissInputs = [];
        this.glissOutputs = [];
        this._bend = 0;
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
        return this.start * this.seq.zoomX;
    }
    get xEnd() {
        return (this.start + this.duration) * this.seq.zoomX;
    }
    get y() {
        return (this.seq.numKeys - (this.pitch+1 + this._bend)) * this.seq.zoomY;
    }
    get yET() {
        return (this.seq.numKeys - (this.pitch+1)) * this.seq.zoomY;
    }
    get width() {
        return this.duration * this.seq.zoomX;
    }
    get height() {
        return this.seq.zoomY;
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
        let strokeColor = val? style.strokeSelected : style.noteFill(this)
        this.rect.stroke(strokeColor);
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
    draw(canvas) {
        // shadow rectangle, shows equal tempered pitch
        this.shadowRect = canvas.rect(this.width, this.height)
            .stroke(style.noteShadowStroke)
            .fill(style.noteShadowFill(this))
            .opacity(0.3)
            .radius(2)
            .move(this.x, this.yET);

        let fillColor = style.noteFill(this)

        // main rectangle, shows adjusted pitch
        this.rect = canvas.rect(this.width, this.height)
            .fill(fillColor)
            .stroke(fillColor)
            .radius(2)
            .move(this.x, this.y)

        this.handle = canvas.group();
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

        this.indicator = canvas.rect(this.height / 4, this.height / 2)
            .center(this.handleX - this.height * 0.8, this.handleY)
            .radius(2)

        this.centDisplay = canvas.text(this.bendText)
            .font(style.editorText)
            .opacity(0);
        this.centDisplay.x((this.handleX - this.height) - this.centDisplay.length() - 5)
            .cy(this.handleY);
        disableMouseEvents(this.centDisplay)

        this.resizeRight = canvas.rect(4, this.height)
            .move(this.xEnd - 4, this.y)
            .radius(2)
            .stroke('black')
            .opacity(0.3)
            .fill('black')

        this.group = canvas.group();
        this.rect.addTo(this.group);
        this.handle.addTo(this.group);
        this.indicator.addTo(this.group);
        this.centDisplay.addTo(this.group);
        this.resizeRight.addTo(this.group);

        editor.assignMouseHandler(this, this.rect, "note_body")
        editor.assignMouseHandler(this, this.indicator, "note_left_handle")
        editor.assignMouseHandler(this, this.handle, "note_attach") // originally was the handle.rect
        editor.assignMouseHandler(this, this.resizeRight, "note_right_handle")
        editor.assignMouseHandler(this, this.group, "note_group")

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
        this.seq.edges.push(edge);
        // propagate own bend to subtree

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
        this.propagateBend(0, 0);
    }
    // offset all children by this bend amount
    propagateBend(bend, animateDuration = 300) {
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
        console.log("removed", this.pitch)
        this.bend = 0;
        this.group.remove()
        this.shadowRect.remove()
        if (this.parent) this.parent.removeChild(this);
        for (let child of this.children) child.b.resetBend();
        // remove all edges??
    }
    removeChild(node) {
        this.children = this.children.filter(edge => edge.b != node);
        console.log("children:", this.children)
    }
}