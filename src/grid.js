import editor from  "./editor.js"
import style from "./style.js"

const grid = {
    draw() {
        let div = $(document.createElement('div'))
            .addClass("grid")
            .attr({
                width: editor.width,
                height: editor.height
            }).css({
                width: editor.width,
                height: editor.height,
                position: 'absolute',
                left: 0,
                top: 0,
                zIndex: -5,
                overflow: 'scroll'
            }).appendTo('.right-container')
            
        let c = $(document.createElement('canvas'))
            .attr({
                width: editor.width,
                height: editor.height
            }).css({
                position: 'absolute',
                left: 0,
                top: 0,
                zIndex: 1,
                display: 'block'
            }).appendTo(div)
            .on("mouseup", ø => {
                editor.selectObject()
            }).text("Grid")
        let ctx = c.get()[0].getContext("2d")

        ctx.beginPath()
        ctx.fillStyle = style.keyDisplay.black.seqFillUnselected
        // draw horizontal lines
        for (let i = 0; i < editor.numKeys; i++) {
            if ([1, 3, 6, 8, 10].includes(i % 12)) {
                // accidental
                ctx.rect(
                    0, 
                    (editor.numKeys-(i+1)) * editor.zoomY, 
                    editor.width, 
                    editor.zoomY)
            }
        }
        ctx.fill()
        
        // draw vertical lines (rects)
        ctx.beginPath()
        for (let i = 0; i < editor.widthInTime; i++) {
            let width = (!(i % 2) + !(i % 4) + !(i % 8) + !(i % 16) + 1) / 2;
            ctx.rect(
                i * editor.zoomX, 
                0,
                width,
                editor.height)
        }
        ctx.fillStyle = style.darkGrey
        ctx.globalAlpha = 0.3
        ctx.fill()

        this.$div = div;
        this.$canvas = c;
    },
    zoom(xZoom, yZoom) {
        this.$canvas.width(editor.width)
        this.$canvas.height(editor.height)
    },
    scale(val) {
        this.$canvas.css('zoom', val)
    },
    scroll(x, y) {
        let top = -(y - this.$div.offset().top);
        let left = -(x - style.keyDisplay.width);
        this.$canvas.offset({top: top / editor.zoomXY, left: left / editor.zoomXY})
    },
    highlightPitch(pitch, play=true, options) {
        let rect;
        if (!this.highlightRectangles[pitch]) {
            rect = editor.canvas.rect(editor.width, editor.zoomY)
                .move(0, (editor.numKeys-(pitch+1)) * editor.zoomY)
                .fill(options.seqFillSelected)
                .opacity(0.5)
                .back()
            this.highlightRectangles[pitch] = rect;
        } else {
            rect = this.highlightRectangles[pitch]
        }
        if (play) rect.show()
        else rect.hide()
    },
    highlightRectangles: []
}
export default grid;