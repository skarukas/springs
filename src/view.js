import editor from "./editor.js"
import playback from "./playbackData.js"
import userPreferences from "./userPreferences.js"
import midi from "./midi.js"

/* for interaction with the DOM */
const view = {
    $loader: $('.loader-container'),
    $guiContainer: $('#sequencer'),
    $controls: $('#controls-container'),
    $buttonContainer: $('.file-button-container'),
    $fileName: $('.filename'),

    /* Show the loading animation then perform the callback */
    showLoader(msg, callback) {
        this.$loader.find("p").text(msg || 'loading...')
        this.$loader.fadeIn(1000)
        this.$guiContainer.fadeTo(2000, 0, callback)
    },
    /* Hide the loading animation then perform the callback */
    hideLoader(callback) {
        this.$loader.fadeOut(1000, callback)
        this.$guiContainer.fadeTo(2000, 1)      
    },
    /* Message for save to local storage */
    showSaveMessage() {
        $('#save-time')
            .text(`Saved to browser storage at ${(new Date()).toLocaleTimeString()}`)
        $('.save-time-container')
            .show()
            .delay(1000)
            .fadeOut(2000)
    },
    /* Update the displayed filename */
    changeFileName(name) {
        this.$fileName.val(name)
        midi.fileName = `${name} [PB=${userPreferences.pitchBendWidth}]`
        $('#midi-filename').val(midi.fileName)
    },
    /* Append a button to the controls panel */
    addButton(text, parent = this.$controls) {
        return $(document.createElement('button'))
            .text(text)
            .appendTo(parent)
    }, 
    /* Append a button with an icon to the controls panel */
    iconButton(imgSrc, callback) {
        let $button = $(document.createElement('button'))
            .on('click', callback)
            .appendTo(this.$buttonContainer)
            .addClass("icon-button has-tooltip")

        $(`<img src="${imgSrc}"/>`)
            .attr({
                height: 15,
                width: 15,
            }).appendTo($button)
        return $button;
    },
    /* Append a divider to the controls panel */
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
    /* Create controls panel */
    init() {
        /* Export .spr */
        this.iconButton("assets/download_icon.png", editor.saveJSONFile)
            .attr('title', 'Download .spr file')

        /* Export MIDI */
        this.iconButton("assets/midi2_icon.png", () => $('.midi-export').dialog('open'))
            .attr('title', 'Export .mid file')
            .css({
                paddingRight: 0,
                paddingLeft: 0,
            })
            .children()
            .attr('width', 30)

        /* Open */
        this.iconButton("assets/open_icon.png", ø => $filePick.trigger('click'))
            .attr('title', 'Open .spr or .mid file')

        /* Invisible filepicker */
        let $filePick = $(document.createElement('input'))
            .attr('type', 'file')
            .css({
                display: 'none',
                width: 0,
                opacity: 0,
            })
            .on('change', e => {
                editor.openFile(e.target.files[0])
                $filePick.val("")
            })
            .appendTo(this.$controls)

        this.divider()

        /* Copy file */
        this.iconButton("assets/copy_icon.png", editor.copyJSONToClipboard)
            .attr('title', 'Copy file to clipboard')

        /* Paste file */
        this.iconButton("assets/paste_icon.png", editor.pasteJSONFromClipboard)
            .attr('title', 'Load file from clipboard')

        this.divider()

        /* Edit filename */
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
            .on('keypress', e => { $fileName.trigger('input'), e.stopPropagation() })
            .on("blur", e => {
                /* Only save the filename if edit is confirmed */
                if (saveName) editor.fileName = e.target.value
                else e.target.value = editor.fileName
                saveName = true
            })

        /* Retune */
        this.iconButton("assets/wand_icon.png", ø => editor.applyToSelection(editor.tuneAsPartials))
            .attr('title', 'Fit selection to the harmonic series')

        /* Equally Divide */
        let $eqButton = 
            this.iconButton("assets/frac_icon.webp",  ø => editor.applyToSelection(editor.equallyDivide, $divisions.val()))
                .attr('title', 'Equally divide')
                .children()
                .attr({
                    width: 12,
                    height: 15
                })

        this.divider()
            
        /* Open Settings */
        this.iconButton("assets/setting_icon.png", () => $('.setting-screen').dialog('open'))
            .attr('title', 'Settings')

        /* Show Help */
        this.iconButton("assets/help_icon.png", ø => $('.control-screen').fadeIn(500))
            .attr('title', 'Show controls')

        this.addButton("Clear all data")
            .on('click', editor.clearAllData)

        /* Change number of equal divisions */
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
        
        /* Change tempo */
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

        /* Zoom for editor */
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
