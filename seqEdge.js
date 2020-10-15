import { simpleBezierPath, normAscendingInterval, disableMouseEvents } from "./util.js"
import style from "./style.js"
import editor from "./editor.js";
import SeqNote from "./seqNote.js";

export default class SeqEdge {
    constructor(a, b, interval) {
        this.a = a;
        this.b = b;
        this.interval = interval;
    }
    updateGraphics(animateDuration) {
        if (this.line) {
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
    get midX() {
        return (this.x1 + this.x2) / 2;
    }
    get midY() {
        return (this.y1 + this.y2) / 2;
    }
    get x1() {
        return this.a.handleX
    }
    get x2() {
        return this.b.handleX
    }
    get y1() {
        return this.a.handleY
    }
    get y2() {
        return this.b.handleY
    }
    set selected(val) {
        this._selected = val;
        let strokeColor = val? style.strokeSelected : style.editorLine.color
        this.line.stroke(strokeColor);
    }
    get selected() {
        return this._selected;
    }
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
        
        editor.assignMouseHandler(this, this.line, "edge_line")
        this.text = canvas.text(normAscendingInterval(this.interval).toString())
            .font(style.editorText)
            .center(this.midX, this.midY)
            .opacity(0)
        disableMouseEvents(this.text)                
    }
    hide() {
        this.text.hide();
        this.line.hide();
    }
    show() {
        this.line.show();
        this.text.show();
    }
    remove() {
        this.line.remove();
        this.text.remove();
        SeqNote.graph.get(this.a).delete(this.b)
        SeqNote.graph.get(this.b).delete(this.a)
        
        /* Retune the higher note */
        let min, max;
        if (this.a.pitch < this.b.pitch) {
            min = this.a
            max = this.b
        } else {
            min = this.b
            max = this.a   
        }
        max.propagateBend(0, 300, [min]);
    }
    // return the amount the top note will be bent
    getBend() {
        return this.interval.subtract(tune.ETInterval(this.b.pitch - this.a.pitch)).cents() / 100;
    }
}