import { pitchName } from "./util.js"

const JZZ = require('jzz');
require('jzz-midi-smf')(JZZ);
const MIDI = JZZ.MIDI

const midi = {
    writeToFile(notes, fileName, options) {
        // Construct multitrack midi data
        let smf = MIDI.SMF()
        let tracks = this.partitionIntoTracks(notes, options)
        for (let i = 0; i < tracks.length; i++) {
            let mtrk = MIDI.SMF.MTrk()
            smf.push(mtrk)
            tracks[i].forEach(note => addNoteToTrack(note, mtrk))
        }

        // Create and download .mid file
        let str = smf.dump()
        let b64 = JZZ.lib.toBase64(str)
        var uri = 'data:audio/midi;base64,' + b64;
        let a = document.createElement('a')
        a.href= uri
        a.download = (fileName || "untitled") + ".mid";
        a.click();
    },
    partitionIntoTracks(notes, options={}) {
        options.releaseTime = options.releaseTime || 0;

        /* Need some logic here to handle glisses... */
    
        notes = notes.sort((a, b) => a.start - b.start);
        // keep track of the notes in each track
        let tracks = [[]];
        
        outer: for (let note of notes) {
            for (let i = 0; i < tracks.length; i++) {
                let track = tracks[i];
                if (!track.length || track[track.length-1].end + options.releaseTime <= note.start) {
                    track.push(note)
                    continue outer;
                }
            }
            // Have to add a new track if loop is unsuccessful
            tracks.push([note])
        }
    
        return tracks;
    }
}

export default midi 

function addNoteToTrack(note, track) {
    let tick = note.start * 32
    let endTick = note.end * 32
    let pitch = pitchName(note.pitch, true)
    let velocity = note.velocity
    let bend = scale14bits(note.bend / 2)
    track.add(tick, MIDI.noteOn(0, pitch, velocity))
        .add(tick, MIDI.pitchBend(0, bend))
        .add(endTick, MIDI.noteOff(0, pitch))
}

const scale14bits = (zeroOne) => {
    if ( zeroOne <= 0 ) {
        return Math.floor( 16384 * ( zeroOne + 1 ) / 2 );
    }

    return Math.floor( 16383 * ( zeroOne + 1 ) / 2 );
}