const style = {};
export default style;

style.lightGrey = "rgb(240, 240, 240)";
style.grey = "rgb(220, 220, 220)";
style.darkGrey = "rgb(140, 140, 140)";

/* Editor Connectors (Gliss / JI Connections) */
style.editorText = {
    family: 'Arial',
    fill: 'grey',
    size: 10
};

style.editorLine = {
    width: 2,
    color: style.darkGrey,
    linecap:'round'
};

/* Keyboard Display */
let w = 50
style.keyDisplay = {
    gap : 2,
    height: 20,
    width: w,
    black: {
        width: w * 2/3,
        color: 'black',
        hoverColor: style.darkGrey,
        clickColor: 'lightblue',
        seqFillUnselected: style.grey,
        seqFillSelected: 'lightblue'
    },
    white: {
        width: w,
        color: 'white',
        hoverColor: style.lightGrey,
        clickColor: 'lightblue',
        seqFillUnselected: style.lightGrey,
        seqFillSelected: 'lightblue'
    }
}

/* Piano Roll Note Display Options */
style.noteFill = function(note) {
    let bValue = Math.floor(note.velocity * 2);
    return new SVG.Color(`rgb(0, 128, ${bValue})`);
}

style.noteShadowFill = function(note) {
    let bValue = Math.floor(note.velocity * 2);
    return new SVG.Color(`rgb(0, 255, ${bValue})`);
}

style.noteShadowStroke = 'rgb(60, 60, 60)'
style.strokeSelected = 'red'