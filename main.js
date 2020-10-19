import audio from "./audio-playback.js";
import editor from "./editor.js";
import grid from "./grid.js";
import "./jquery-3.5.1.js";
import keyboard from "./keyboard.js";
import playback from "./playbackData.js";
import ruler from "./ruler.js";
import { addButton, addMessage } from "./util.js";

$(ø => {
    const $scroller = $('.right-container');
    const $keyboard = $('.piano-container');
    const $ruler = $('.ruler-container');

    $(document.createElement('div'))
        .css({
            position: 'absolute',
            bottom: 20,
            right: 20,
        })
        .addClass("warn-container")
        .appendTo('body')

    addButton("Show Controls")
        .on('click', ø => $('#controls').fadeIn(500));

    addButton("Fit to Harmonic Series!")
        .on('click', ø => editor.applyToSelection(editor.tuneAsPartials));
    addButton("Clear all data")
        .on('click', ø => editor.clearAllData())

    let $eqButton = addButton('Equally Divide')
        .on('click', ø => editor.applyToSelection(editor.equallyDivide, $divisions.val()));

    const $divisions = $(document.createElement('input'))
        .attr({
            type: 'number',
            min: 2,
            max: 20,
            value: 2
        })
        .on('keydown', e => {
            if (e.key == 'Enter') {
                $eqButton.trigger('click')
                e.stopPropagation()
            }
        })
        .appendTo('#controls-container')


    const $xRange = $(document.createElement('input'))
        .attr({
            id:'x-zoom',
            type: "range",
            min: 4,
            max: 16,
            step: 0.1
        })
        .css({
            position: 'absolute',
            right: 20,
            bottom: 10
        })
        .appendTo($('.seq'))
    const $yRange = $(document.createElement('input'))
        .attr({
            id:'y-zoom',
            type: "range",
            min: "4",
            max: "16",
            orient: 'vertical',
            step: 0.1
        })
        .css({
            position: 'absolute',
            right: 10,
            bottom: 20
        })
        .appendTo($('.seq'))

    editor.draw();
    ruler.draw();
    grid.draw();
    keyboard.draw();
    playback.draw();
    editor.loadEditorFromLocalStorage()

    let octaveTransposition = 60;
    // handle computer keyboard input
    // have to use keydown instead of keypress
    // to catch cmd+number before the browser default
    $(document).on("keydown", function(e) {
        if (e.metaKey) {
            /* Cmd + ... shortcuts */
            if (e.key == 'a') {
                e.preventDefault();
                editor.selectAll();
            } else if (e.key == 'c') {
                e.preventDefault();
                editor.copySelection()
            } else if (e.key == 'r') {
                editor.applyToSelection(editor.resetBend);
            } else if (e.key == 'v') {
                e.preventDefault();
                editor.paste(e)
            } else if (+e.key) {
                /* check for digits */
                e.preventDefault()
                let n = +e.key;
                if (n > 1) editor.applyToSelection(editor.equallyDivide, n)
            } else if (e.key == 's') {
                // save
                editor.updateLocalStorage()
                e.preventDefault()
                addMessage(`Saved at ${(new Date()).toUTCString()}`, 'green')
            } else if (e.key == 'ArrowDown') {
                editor.applyToSelection(editor.transposeByOctaves, -1)
                e.preventDefault()
            } else if (e.key == 'ArrowUp') {
                editor.applyToSelection(editor.transposeByOctaves, 1)
                e.preventDefault()
            }
        } else if (e.key == " ") {
            e.preventDefault();
            editor.togglePlayback()
        } else if (e.key == 'Backspace') {
            addMessage('Deleting selection')
            editor.applyToSelection(editor.delete, e)
    /*     } else if (e.key == 'p') {
            editor.applyToSelection(editor.play); */
        } else if (e.key == 'Enter') {
            editor.applyToSelection(editor.typeEdit)
        }
    }).on("keyup", e => {
        if ("awsedftgyhujkolp;".includes(e.key)) {
            let pitch = "awsedftgyhujkolp;".indexOf(e.key)
            keyboard.noteOff(pitch + octaveTransposition)
        }
    }).on("keypress", e => {
        if ("awsedftgyhujkolp;".includes(e.key)) {
            let pitch = "awsedftgyhujkolp;".indexOf(e.key)
            keyboard.noteOn(pitch + octaveTransposition)
        } else if (e.key == 'z') {
            octaveTransposition = (octaveTransposition-12).clamp(0, 108);
        } else if (e.key == 'x') {
            octaveTransposition = (octaveTransposition+12).clamp(0, 108)
        }
    })
    document.addEventListener('wheel', e => {
        // catches multi-touch on laptops
        if (e.ctrlKey) {
            let dy = e.deltaY
            editor.scale(editor.zoomXY * (1-dy*0.01))
            e.preventDefault()
        } else {
            e.preventDefault()
            editor.scroll(e.deltaX, e.deltaY)
        }
    }, { passive: false })

    window.onbeforeunload = e => {
        editor.updateLocalStorage()
        e.preventDefault()
    }

    $('#controls').on('click', e => $('#controls').fadeOut(500))
    // show controls for new users and load demo
    if (!localStorage.getItem("cachedEditor")) {
        $('#controls').delay(500).fadeIn(500)
        // lord help me
        let demo = `{"notes":[{"pitch":60,"velocity":64,"start":96,"duration":16,"bend":-0.8212},
        {"pitch":63,"velocity":64,"start":96,"duration":16,"bend":-0.6648000000000001},
        {"pitch":68,"velocity":64,"start":80,"duration":32,"bend":-0.6844},
        {"pitch":68,"velocity":64,"start":32,"duration":32,"bend":-0.2738},
        {"pitch":63,"velocity":64,"start":48,"duration":16,"bend":-0.2542},
        {"pitch":60,"velocity":64,"start":16,"duration":16,"bend":0},
        {"pitch":64,"velocity":64,"start":16,"duration":32,"bend":-0.1369},
        {"pitch":67,"velocity":64,"start":16,"duration":16,"bend":0.019500000000000017},
        {"pitch":59,"velocity":64,"start":32,"duration":16,"bend":-0.11729999999999999},
        {"pitch":60,"velocity":64,"start":48,"duration":32,"bend":-0.41059999999999997},
        {"pitch":64,"velocity":64,"start":64,"duration":32,"bend":-0.5475},
        {"pitch":67,"velocity":64,"start":64,"duration":16,"bend":-0.3911},
        {"pitch":59,"velocity":64,"start":80,"duration":16,"bend":-0.5279}],
        "edges":[{"id1":0,"id2":1,"interval":"6:5"},{"id1":1,"id2":2,"interval":"4:3"},
        {"id1":3,"id2":4,"interval":"4:3"},{"id1":5,"id2":6,"interval":"5:4"},
        {"id1":6,"id2":7,"interval":"6:5"},{"id1":8,"id2":6,"interval":"4:3"},
        {"id1":4,"id2":9,"interval":"6:5"},{"id1":10,"id2":2,"interval":"5:4"},
        {"id1":10,"id2":11,"interval":"6:5"},{"id1":10,"id2":12,"interval":"4:3"}],
        "glisses":[]}`;
        let data = JSON.parse(demo)
        console.log("loaded demo data:",data)
        editor.addCompressedData(data)
        editor.deselectAllObjects()
    }

    $yRange.on('input', ø => editor.zoom(editor.zoomX, +$yRange.val()));
    $xRange.on('input', ø => editor.zoom(+$xRange.val(), editor.zoomY));

})