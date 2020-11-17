import editor from "./editor.js";
import { 
    guessJIInterval,
    addTooltip
} from "./util.js"
import SeqEdge from "./SeqEdge.js"
import style from "./style.js"

export default class SeqNote {

    constructor(pitch, velocity, start, duration) {
        this._pitch = pitch;
        this._velocity = velocity;
        this._start = start;
        this._end = start + duration
        this.glissInputs = [];
        this.glissOutputs = [];
        this._bend = 0;
        SeqNote.graph.set(this, new Map())
    }
    /* Update display and set velocity. Valid range = [0, 128) */
    set velocity(val) {
        this._velocity = val.clamp(0, 128);
        this.shadowRect.fill(style.noteShadowFill(this))
        this.rect.fill(style.noteFill(this))
        for (let g of this.glissOutputs) g.redrawColor()
        for (let g of this.glissInputs) g.redrawColor()
    }
    get velocity() {
        return this._velocity
    }
    get pitch() {
        return this._pitch;
    }
    /* Update display and set pitch. Valid range = [0, 128) */
    set pitch(val) {
        this._pitch = Math.floor(val.clamp(0, 128));
        this.redrawPosition(0);
    }
    /** 
     * Change bend and update the display. If the bend is 
     * outside the range [-0.5, 0.5), change the pitch as well. 
     * */
    set bend(val) {
        let steps = Math.round(Math.abs(val))
        if (val >= 0.5) {
            this.pitch += steps
            this._bend = val - steps;
        } else if (val < -0.5) {
            this.pitch += -steps
            this._bend = val + steps;
        } else {
            this._bend = val;
        }
        this.updateGraphics(0)
        this.redrawInputs(0)
        this.redrawOutputs(0)
    }
    get bend() {
        return this._bend;
    }
    set start(val) {
        this._start = val.clamp(0, Infinity);
        this.updateGraphics(0)
        this.redrawInputs(0)
    }
    get start() {
        return this._start
    }
    set end(val) {
        this._end = val.clamp(1, Infinity);
        this.updateGraphics(0)
        this.redrawOutputs(0)
    }
    get end() {
        return this._end
    }
    /* Set start while keeping duration */
    set startMove(val) {
        let d = this.duration;
        this._start = val;
        this._end = val + d;
        this.redrawPosition(0);
    }
    
    get soundingPitch() {
        return this.bend + this.pitch;
    }
    get frequency() {
        return tune.Util.ETToFreq(this.soundingPitch)
    }
    get duration() {
        return this.end-this.start
    }
    get x() {
        return this.start * this.seq.zoomX;
    }
    get xEnd() {
        return this.end * this.seq.zoomX;
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
        return SeqNote.graph.get(this).entries()
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
    /** Redraw the position of the graphics and propagate this change. */
    redrawPosition() {
        this.rect.move(this.x, this.y);
        this.shadowRect.move(this.x, this.yET);
        this.handle.center(this.handleX, this.handleY);
        this.indicator.center(this.handleX - this.height * 0.8, this.handleY);
        this.centDisplay.x((this.handleX - this.height) - this.centDisplay.length() - 5)
            .cy(this.handleY);
        this.resizeRight.move(this.xEnd - 4, this.y);

        this.redrawOutputs(0)
        this.redrawInputs(0)
    }
    /** Propagate position change to the input glisses and connected edges. */
    redrawInputs(animateDuration=300) {
        for (let g of this.glissInputs) g.redrawPosition()
        for (let [_, edge] of this.neighbors) edge.updateGraphics(animateDuration)
    }
    /** Propagate position change to the output glisses. */
    redrawOutputs() {
        for (let g of this.glissOutputs) g.redrawPosition()
    }
    /** Update the position, size, and color of the display. */
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
    /** Hide the note in the editor */
    hide() {
        this.rect.hide();
        this.handle.hide();
        this.indicator.hide();
    }
    /** Show the note in the editor */
    show() {
        this.rect.show();
        this.handle.show();
        this.indicator.show();
    }
    /** Move the note up or down octaves, adjusting the edge interval sizes. */
    transposeByOctaves(n) {
        let pitch = this.pitch
        this.pitch += 12 * n
        for (let [note, edge] of this.neighbors) {
            let octaves = tune.FreqRatio(2,1).multiply(n)
            if (note.pitch > pitch) {
                edge.interval = edge.interval.subtract(octaves)
            } else {
                edge.interval = edge.interval.add(octaves)
            }
        
            //console.log("interval:", edge.interval.toString())
            edge.updateGraphics(0)
        }
        this.redrawPosition(0)
    }
    /** Draw the note as a rectangle on `canvas`. Only called upon creation. */
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
            .cy(this.handleY)
            .addClass("mouse-disabled")

        this.resizeRight = canvas.rect(4, this.height)
            .move(this.xEnd - 4, this.y)
            .radius(2)
            .stroke('black')
            .opacity(0.3)
            .fill('black')

        addTooltip(this.handle.node, "Drag to attach notes by an interval")
        addTooltip(this.rect.node, "Shift+Drag to adjust pitch bend")
        addTooltip(this.resizeRight.node, "Drag to resize; Shift+Drag to create a gliss")
        addTooltip(this.indicator.node, "Drag to resize")
        
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
    /** The number of cents of bend, as a string. */
    get bendText() {
        let str = (Math.round((this.bend * 100) * 100) / 100) + "c";
        if (this.bend >= 0) str = "+" + str;
        return str;
    }
    /**
     * StoreVals := [...]
     * 
     * initialStore : [...StoreVals]
     * predicate : [Edge, Note] -> Boolean
     * combine: Edge, Note, ...StoreVals -> [...StoreVals]
     * successVal : Edge, Note, ...StoreVals -> S
     * failureVal : () -> S
     * */
    BFS(options) {

        options.noVisit = options.noVisit || []
        options.initialStore = options.initialStore || [null];
        options.combine = options.combine || ((edge, child) => []);
        options.successVal = options.successVal || ((edge, child) => child);
        options.failureVal = options.failureVal || (ø => null);

        let visited = new Set(options.noVisit);
        let fringe = [[this, ...options.initialStore]];
        
        while (fringe.length) {
            let [node, ...storeVals] = fringe.pop();
            visited.add(node);
            for (let [child, edge] of node.neighbors) {
                if (!visited.has(child)) {
                    let newStore = options.combine(edge, child, ...storeVals);
                    if (options.predicate(edge, child)) {
                        return options.successVal(edge, child, ...storeVals);
                    } else {
                        fringe.unshift([child, ...newStore]);
                    }
                }
            }
        }
        if (options.returnAll) return [...visited]
        return options.failureVal();
    }
    /**
     * Calculate the interval from `this` to `other`. 
     * If they are in the same component, accumulate the 
     * interval along the path. Otherwise, calculate the 
     * difference as an ET interval. 
     */
    getIntervalTo(other) {
        return this.BFS({
            initialStore: [tune.ETInterval(0)],
            predicate: (edge, child) => child == other,
            combine: (edge, child, interval) => {
                if (edge.maxNote == child) return [edge.interval.add(interval)]
                else return [edge.interval.inverse().add(interval)]
            },
            successVal: (edge, child, interval) => {
                if (edge.maxNote == child) return edge.interval.add(interval)
                else return edge.interval.inverse().add(interval)
            },
            failureVal: () => tune.ETInterval(other.soundingPitch - this.soundingPitch)
        });
    }
    /**
     * Connect to another note by an interval, returning the newly created `SeqEdge`.
     * 
     * @param { SeqNote } other 
     * @param { tune.Interval } by 
     * @param { number } animateDuration 
     */
    connectTo(other, by = guessJIInterval(this.pitch, other.pitch), animateDuration=300) {
        if (this.isConnectedTo(other)) return null;

        let edge = new SeqEdge(this, other, by);
        let oldNeighbors = [...SeqNote.graph.get(this).keys()]

        SeqNote.graph.get(this).set(other, edge)
        SeqNote.graph.get(other).set(this, edge)
        this.propagateBend(this.bend, animateDuration, oldNeighbors)

        return edge;
    }
    /**
     * If the `this` and `other` are in the same component, 
     *  remove the last edge on the path to `other`.
     */
    disconnectFrom(other) {
        return this.BFS({
            predicate: (edge, child) => child == other,
            successVal: (edge, child) => {
                edge.remove()
                return edge;
            },
            failureVal: ø => false,
        });
    }
    /**
     * Returns true if `other` is in the same component as `this`.
     */
    isConnectedTo(other) {
        return this.BFS({
            predicate: (edge, child) => child == other,
            successVal: ø => true,
            failureVal: ø => false,
        });
    }
    /**
     * Returns all notes in the component, not including `this`.
     */
    getAllConnected() {
        return this.BFS({
            predicate: () => false,
            returnAll: true
        });
    }

    /** 
     * Adjust the pitch bend of `this`
     * and propagate the effect along the graph
    */
    propagateBend(bend=this.bend, animateDuration = 300, awayFrom=[]) {
        this.bend = bend;

        this.BFS({
            noVisit: awayFrom,
            initialStore: [bend],
            predicate: () => false,
            combine: (edge, child, bend) => {
                let edgeBend = (edge.maxNote == child)? edge.getBend() : -edge.getBend()
                let newBend = edgeBend + bend
                child.bend = newBend;
                return [child.bend];
            }
        });
    }
    /**
     * This function is called when the user
     * directly deletes this object. The effects may propagate
     * to connected objects.
     */
    delete() {
        if (!this.removed) {
            for (let [_, edge] of this.neighbors) edge.delete()
            for (let g of this.glissInputs) g.remove()
            for (let g of this.glissOutputs) g.remove()

            let removed = this.glissInputs
                .concat(this.glissOutputs)
                .concat([...this.neighbors].map(e => e[1]))
            editor.removeReferences(removed)
            this.remove()
        }
    }
    /**
     * This function is called when the object
     * is removed by a connected object. It
     * does not propagate.
     */
    remove() {
        if (!this.removed) {
            this.group.remove()
            this.shadowRect.remove()
            SeqNote.graph.delete(this)
            for (let map of SeqNote.graph.values()) map.delete(this)
            this.removed = true
        }
    }
}
/** 
 * The adjacency data structure for all notes in the editor. 
 * Structure: `Map<SeqNote a, Map<SeqNote b, SeqEdge edge>>`.
 *  `edge` is the edge from `a` to `b`. 
 * */
// The edges are undirected, but
//  I don't think it's possible to index by a pair of objects
//  so each edge is stored as both (a, b) and (b, a).
SeqNote.graph = new Map()