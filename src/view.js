import editor from "./editor.js"
import playback from "./playbackData.js"
import midi from "./midi.js"
import { disableMouseEvents } from "./util.js"
/* for interaction with the DOM */

const view = {
    $loader: $('.loader-container'),
    $guiContainer: $('#sequencer'),
    $controls: $('#controls-container'),
    $buttonContainer: $('.file-button-container'),
    $fileName: $('.filename'),

    showLoader(msg, callback) {
        this.$loader.find("p").text(msg || 'loading...')
        this.$loader.fadeIn(1000)
        this.$guiContainer.fadeTo(2000, 0, callback)
    },
    hideLoader(callback) {
        this.$loader.fadeOut(1000)
        this.$guiContainer.fadeTo(2000, 1, callback)      
    },
    showSaveMessage() {
        $('#save-time')
            .text(`Saved to browser storage at ${(new Date()).toLocaleTimeString()}`)
            .show()
            .delay(1000)
            .fadeOut(2000)
    },
    changeFileName(name) {
        this.$fileName.val(name)
    },
    addButton(text, parent = this.$controls) {
        return $(document.createElement('button'))
            .text(text)
            .appendTo(parent)
    }, 
    iconButton(imgSrc, callback) {
        let $button = $(document.createElement('button'))
            .on('click', callback)
            .appendTo(this.$buttonContainer)
            .addClass("icon-button")

        $(`<img src="${imgSrc}"/>`)
            .attr({
                height: 15,
                width: 15,
            }).appendTo($button)
        return $button;
    },
    divider() {
        $('<span></span>')
            .appendTo(this.$buttonContainer)
            .css({
                'border-left': "2px solid black", 
                'border-radius': 1,
                'opacity': 0.5, 
                'padding-top': 4
            })
    },
    init() {
        this.iconButton("assets/download_icon.png", editor.saveJSONFile)
            .attr('title', 'Download .spr file')
            this.iconButton("assets/midi2_icon.png", editor.exportMIDI)
            .attr('title', 'Export .mid file')
            .css({
                paddingRight: 0,
                paddingLeft: 0,
            })
            .children()
            .attr('width', 30)
        this.iconButton("assets/open_icon.png", ø => $filePick.trigger('click'))
            .attr('title', 'Open .spr or .mid file')

        let $filePick = $(document.createElement('input'))
            .attr('type', 'file')
            .css({
                display: 'none',
                width: 0,
                opacity: 0,
            })
            .on('change', e => {
                editor.openFile(e.target.files[0])
                //editor.openJSONFile(e.target.files[0])
                $filePick.val("")
            })
            .appendTo(this.$controls)

        this.divider()

        this.iconButton("assets/copy_icon.png", editor.copyJSONToClipboard)
            .attr('title', 'Copy file to clipboard')
            this.iconButton("assets/paste_icon.png", editor.pasteJSONFromClipboard)
            .attr('title', 'Load file from clipboard')

        this.divider()

        this.iconButton("assets/help_icon.png", ø => $('.control-screen').fadeIn(500))
            .attr('title', 'Show controls')

        let saveName = true;
        const $fileName = $('.filename')
            .on('keydown', e => {
                if (e.key == 'Enter') {
                    saveName = true
                    $fileName.blur();
                } else if (e.key == 'Escape') {
                    saveName = false
                    $fileName.blur();
                }
                e.stopPropagation()
            })
            .on('keypress', e => {$fileName.trigger('input'), e.stopPropagation()})
            .on("blur", e => {
                if (saveName) editor.fileName = e.target.value
                else e.target.value = editor.fileName
                saveName = true
            })

        view.iconButton("assets/wand_icon.png", ø => editor.applyToSelection(editor.tuneAsPartials))
            .attr('title', 'Fit selection to the harmonic series')
        let $eqButton = 
            view.iconButton("assets/frac_icon.webp",  ø => editor.applyToSelection(editor.equallyDivide, $divisions.val()))
                .attr('title', 'Equally divide')
                .children()
                .attr({
                    width: 12,
                    height: 15
                })
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

    /*     view.iconButton("assets/clear_icon.png", editor.clearAllData)
            .attr('title', 'Clear all data') */

    /*     view.addButton("Show Controls")
            .on('click', ø => $('.control-screen').fadeIn(500)); */
    /*     view.addButton("Fit to Harmonic Series!")
            .on('click', ø => editor.applyToSelection(editor.tuneAsPartials)); */
        this.addButton("Clear all data")
            .on('click', editor.clearAllData)

    /*     let $eqButton = view.addButton('Equally Divide')
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
            }).appendTo(this.$controls)

        $(document.createTextNode('bpm:')).appendTo(this.$controls)
        const $tempo = $(document.createElement('input'))
            .attr({
                type: 'number',
                min: 80,
                max: 200,
                value: 120
            }).on('input', ø => {
                playback.bpm = parseInt($tempo.val())
            }).appendTo(this.$controls)


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

        $('.control-screen').on('click', ø => $('.control-screen').fadeOut(500))
        $xRange.on('input', ø => editor.zoom(+$xRange.val(), editor.zoomY));
    }
}
 
export default view
