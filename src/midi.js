import { pitchName } from "./util.js"

const JZZ = require('jzz');
require('jzz-midi-smf')(JZZ);
const MIDI = JZZ.MIDI

const midi = {
    writeToFile(notes, fileName) {
        let tempo = 120 // change

        let smf = MIDI.SMF()
        // start with only one track
        smf.push(MIDI.SMF.MTrk())
        this.createMIDITracks(notes, smf)

        // Create and download .mid file
        let str = smf.dump()
        let b64 = JZZ.lib.toBase64(str)
        var uri = 'data:audio/midi;base64,' + b64;
        let a = document.createElement('a')
        a.href= uri
        a.download = (fileName || "untitled") + ".mid";
        a.click();
    },
    // Create channels so that no two notes are
    //   playing on the same channel at once
    // Try to maximize the time before the channel is reused
    //   to avoid unwanted glisses
    createMIDITracks(notes, smf) {
        // The minimum amount of time before another note can be played on 
        //     the same track. For sounds with releases, this helps avoid
        //     a sudden pitch shift between consecutive notes
        let releaseTime = 4;

        notes = notes.sort((a, b) => a.start - b.start);
        // keep track of the notes in each track
        let notesInTracks = [[]];
        
        outer: for (let note of notes) {
            for (let i = 0; i < notesInTracks.length; i++) {
                let tkArr = notesInTracks[i];
                if (!tkArr.length || tkArr[tkArr.length-1].end + releaseTime <= note.start) {
                    this.addNoteToTrack(note, smf[i])
                    tkArr.push(note)
                    continue outer;
                }
            }
            // Have to add a new track if loop is unsuccessful
            let track = MIDI.SMF.MTrk()
            smf.push(track)
            this.addNoteToTrack(note, track)
            notesInTracks.push([note])
        }
    },
    addNoteToTrack(note, track) {
        let tick = note.start * 32
        let endTick = note.end * 32
        let pitch = pitchName(note.pitch, true)
        let velocity = note.velocity
        let bend = scale14bits(note.bend / 2)
        track.add(tick, MIDI.noteOn(0, pitch, velocity))
            .add(tick, MIDI.pitchBend(0, bend))
            .add(endTick, MIDI.noteOff(0, pitch))
    }
}

export default midi 


const scale14bits = (zeroOne) => {
    if ( zeroOne <= 0 ) {
        return Math.floor( 16384 * ( zeroOne + 1 ) / 2 );
    }

    return Math.floor( 16383 * ( zeroOne + 1 ) / 2 );
}