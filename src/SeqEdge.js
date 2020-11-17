import { 
    simpleBezierPath, 
    normAscendingInterval, 
    addTooltip
} from "./util.js"
import style from "./style.js"
import editor from "./editor.js";
import SeqNote from "./SeqNote.js";
import userPreferences from "./userPreferences.js";

export default class SeqEdge {
    /**
     * A connection of an interval between two `SeqNote`s.
     *   The interval is always assigned in the same direction
     *   as the existing interval between `a` and `b`.
     * 
     * @param { SeqNote } a The start note
     * @param { SeqNote } b The end note
     * @param { tune.Interval } interval The interval to connect by
     */
    constructor(a, b, interval) {
        this.a = a;
        this.b = b;
        if (this.a.soundingPitch > this.b.soundingPitch) {
            this.maxNote = this.a
            this.minNote = this.b
        } else {
            this.maxNote = this.b
            this.minNote = this.a
        }
        this._interval = interval;
    }
    /** Redraw the line and interval text. */
    updateGraphics(animateDuration=300) {
        if (this.line) {
            this.text.text(normAscendingInterval(this.interval).toString())
            let line = animateDuration? this.line.animate(animateDuration) : this.line;
            let text = animateDuration? this.text.animate(animateDuration) : this.text;
            
            let dist = Math.abs(this.a.start-this.b.start);
            let width = 4 * (1 - Math.tanh(dist / 64)) + 1;
            let path = simpleBezierPath(
                {x: this.x1, y: this.y1},
                {x: this.x2, y: this.y2}, 
                'vertical');
            line.plot(path)
                .stroke({width});
            text.center(this.midX, this.midY)
        }
    }
    /** Midpoint x of the line. */
    get midX() {
        return (this.x1 + this.x2) / 2;
    }
    /** Midpoint y of the line. */
    get midY() {
        return (this.y1 + this.y2) / 2;
    }
    get x1() {
        return this.minNote.handleX
    }
    get x2() {
        return this.maxNote.handleX
    }
    get y1() {
        return this.minNote.handleY
    }
    get y2() {
        return this.maxNote.handleY
    }
    set selected(val) {
        this._selected = val;
        let strokeColor = val? style.strokeSelected : style.editorLine.color
        this.line.stroke(strokeColor);
    }
    get selected() {
        return this._selected;
    }
    /** Draw the edge as a path on `canvas`. Only called upon creation. */
    draw(canvas) {
        let path = simpleBezierPath(
            {x: this.x1, y: this.y1},
            {x: this.x2, y: this.y2}, 
            'vertical');
        let dist = Math.abs(this.a.start-this.b.start);
        let width = 4 * (1 - Math.tanh(dist / 64)) + 1;
        this.line = canvas.path(path)
            .stroke(style.editorLine)
            .opacity(0.7)
            .fill('none')
        this.line.stroke({width})
        
        addTooltip(this.line.node, "Press Enter to edit interval size")
        editor.assignMouseHandler(this, this.line, "edge_line")
        let intervalLabel = normAscendingInterval(this.interval).toString()
        this.text = canvas.text(intervalLabel)
            .font(style.editorText)
            .center(this.midX, this.midY)
            .addClass("mouse-disabled")
        if (!userPreferences.alwaysShowEdges) this.text.opacity(0)              
    }
    /** Hide the edge in the editor */
    hide() {
        this.text.hide();
        this.line.hide();
    }
    /** Show the edge in the editor */
    show() {
        this.line.show();
        this.text.show();
    }
    /**
     * This function is called when the user
     * directly deletes this object. The effects may propagate
     * to connected objects.
     */
    delete() {
        if (!this.removed) {
            this.remove()
            if (userPreferences.propagateBendAfterDeletion) {
                /* Retune the higher note */
                this.maxNote.propagateBend(0, 300, [this.minNote]);
            }
        }
    }
    /**
     * This function is called when the object
     * is removed by a connected object. It
     * does not propagate.
     */
    remove() {
        if (!this.removed) {
            this.line.remove();
            this.text.remove();
            SeqNote.graph.get(this.a)?.delete(this.b)
            SeqNote.graph.get(this.b)?.delete(this.a)
            this.removed = true
        }
    }
    get interval() {
        return this._interval;
    }
    /** The interval represented by the edge. 
     * It will always go in the same direction 
     * as the existing interval between `a` and `b`.
     * */
    set interval(val) {
        /* Ensure the intervals go in the same direction */
        if (this._interval.cents() * val.cents() > 0) {
            this._interval = val
        } else {
            this._interval = val.inverse()
        }

        if (this.a.soundingPitch > this.b.soundingPitch) {
            this.maxNote = this.a
            this.minNote = this.b
        } else {
            this.maxNote = this.b
            this.minNote = this.a
        }
        
        this.updateGraphics(0)
    }
    /** Return the difference between the edge interval
     *    and the ET interval between `a` and `b`.
     * */
    getBend() {
        let etDistance = tune.ETInterval(this.maxNote.pitch - this.minNote.pitch)
        return this.interval.abs().subtract(etDistance).cents() / 100;
    }
}

// define missing abs() in tune.Interval
const abs = function() {
    return (this.cents() > 0)? this : this.inverse()
}
tune.ETInterval.prototype.abs = abs
tune.FreqRatio.prototype.abs = abs