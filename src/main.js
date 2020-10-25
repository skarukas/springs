import editor from "./editor.js";
import grid from "./grid.js";
import keyboard from "./keyboard.js";
import playback from "./playbackData.js";
import ruler from "./ruler.js";
import { addButton, addMessage } from "./util.js";

$(ø => { 
    $(document.createElement('div'))
        .css({
            position: 'absolute',
            bottom: 20,
            right: 20,
        }).addClass("warn-container")
        .appendTo('body')

    const $controls = $('#controls-container')

    iconButton("assets/download_icon.png", editor.saveJSONFile)
        .attr('title', 'Download .spr file')
    iconButton("assets/midi2_icon.png", editor.exportMIDI)
        .attr('title', 'Export .mid file')
        .css({
            paddingRight: 0,
            paddingLeft: 0,
        })
        .children()
        .attr('width', 30)
    iconButton("assets/open_icon.png", ø => $filePick.trigger('click'))
        .attr('title', 'Open .spr file')
    /* 
    function createDropdown(textArr, elem) {
        elem.on('mouseenter', ø => div.show())
            .on('mouseleave', ø => div.hide())
        let div = $('<div></div>')
            .appendTo(elem)
            .addClass('dropdown')
            .hide()
        return textArr.map(text => {
            return $(`<p>${text}</p>`)
                .appendTo(div)
                .addClass('dropdown-item')
        })
    } */

    let $filePick = $(document.createElement('input'))
        .attr('type', 'file')
        .css('display', 'none')
        .on('change', e => editor.openJSONFile(e.target.files[0]))
        .appendTo($controls)

    divider()

    iconButton("assets/copy_icon.png", editor.copyJSONToClipboard)
        .attr('title', 'Copy file to clipboard')
    iconButton("assets/paste_icon.png", editor.pasteJSONFromClipboard)
        .attr('title', 'Load file from clipboard')

    divider()

    iconButton("assets/help_icon.png", ø => $('.control-screen').fadeIn(500))
        .attr('title', 'Show controls')


    const $fileName = $('.filename')
        .on('keydown', e => {
            e.stopPropagation()
            if (e.key == 'Enter' || e.key == 'Escape') $fileName.blur();
        }).on('keypress', e => e.stopPropagation())
        .on('input', ø => editor.fileName = $fileName.val())

    function iconButton(url, callback) {
        let $button = $(document.createElement('button'))
            .on('click', callback)
            .appendTo('.file-button-container')
            .addClass("icon-button")

        $(`<img src="${url}"/>`)
            .attr({
                height: 15,
                width: 15,
            }).appendTo($button)
        return $button;
    }

    function divider() {
        $('<span></span>')
            .appendTo('.file-button-container')
            .css({
                'border-left': "2px solid black", 
                'border-radius': 1,
                'opacity': 0.5, 
                'padding-top': 4
            })
    }

    iconButton("assets/wand_icon.png", ø => editor.applyToSelection(editor.tuneAsPartials))
        .attr('title', 'Fit selection to the harmonic series')
    let $eqButton = 
        iconButton("assets/frac_icon.webp",  ø => editor.applyToSelection(editor.equallyDivide, $divisions.val()))
            .attr('title', 'Equally divide')
            .children()
            .attr({
                width: 12,
                height: 15
            })
/*     iconButton("assets/clear_icon.png", editor.clearAllData)
        .attr('title', 'Clear all data') */

/*     addButton("Show Controls")
        .on('click', ø => $('.control-screen').fadeIn(500)); */
/*     addButton("Fit to Harmonic Series!")
        .on('click', ø => editor.applyToSelection(editor.tuneAsPartials)); */
    addButton("Clear all data")
        .on('click', editor.clearAllData)

/*     let $eqButton = addButton('Equally Divide')
        .on('click', ø => editor.applyToSelection(editor.equallyDivide, $divisions.val())); */

    const $divisions = $(document.createElement('input'))
        .attr({
            type: 'number',
            min: 2,
            max: 20,
            value: 2
        }).on('keydown', e => {
            if (e.key == 'Enter') {
                $eqButton.trigger('click')
                e.stopPropagation()
            }
        }).appendTo($controls)

    $(document.createTextNode('bpm:')).appendTo($controls)
    const $tempo = $(document.createElement('input'))
        .attr({
            type: 'number',
            min: 80,
            max: 200,
            value: 120
        }).on('input', ø => {
            playback.bpm = parseInt($tempo.val())
        }).appendTo($controls)


    const $xRange = $(document.createElement('input'))
        .attr({
            id:'x-zoom',
            type: "range",
            min: 4,
            max: 32,
            step: 1
        }).css({
            position: 'absolute',
            right: 20,
            bottom: 10
        }).appendTo('body')
        
/*     const $yRange = $(document.createElement('input'))
        .attr({
            id:'y-zoom',
            type: "range",
            min: "4",
            max: "16",
            orient: 'vertical',
            step: 0.1
        }).css({
            position: 'absolute',
            right: 10,
            bottom: 20
        }).appendTo('body') */

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
                e.preventDefault();
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
            } else if (e.key == 'o') {
                $filePick.trigger('click')
                e.preventDefault()
            } else if (e.key == 'ArrowDown') {
                editor.applyToSelection(editor.transposeByOctaves, -1)
                e.preventDefault()
            } else if (e.key == 'ArrowUp') {
                editor.applyToSelection(editor.transposeByOctaves, 1)
                e.preventDefault()
            }
        } else if (e.shiftKey) {
            if (e.key == " ") {
                e.preventDefault();
                editor.togglePlaybackSelection();
            }
        } else if (e.key == 'Shift') {
            editor.setCursorStyle("grab")
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
        } else if (e.key == 'Shift') {
            editor.setCursorStyle("default")
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
            editor.deltaScroll(e.deltaX, e.deltaY)
        }
    }, { passive: false })

    window.onbeforeunload = e => {
        editor.updateLocalStorage()
        e.preventDefault()
    }

    $('.control-screen').on('click', e => $('.control-screen').fadeOut(500))
    // show controls for new users and load demo
    if (!localStorage.getItem("editor")) {
        $('.control-screen').delay(500).fadeIn(500)
        // lord help me
        let demo = {"notes":[{"pitch":60,"velocity":64,"start":96,"duration":16,"bend":-0.8212},
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
        "glisses":[],
        "viewbox":{"scrollX":79,"scrollY":709,"scale":0.9}};
        console.log("loaded demo data:",demo)
        editor.addCompressedData(demo)
        editor.deselectAllObjects()
        editor.scroll(70, 700)
        editor.scale(0.9)

    } 

    //$yRange.on('input', ø => editor.zoom(editor.zoomX, +$yRange.val()));
    $xRange.on('input', ø => editor.zoom(+$xRange.val(), editor.zoomY));

    $('.loader-container').fadeOut(1000)
    $('#sequencer').fadeTo(2000, 1)
})