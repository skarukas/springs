# springs
*A "piano roll" music editor for intuitive voice-independent tuning within the browser.*

### why
One of the limitations of MIDI editing in DAW's (Digital Audio Workstations) is their handling of "pitch bend" information:
- pitch bend acts globally on an instrument/channel, meaning retuning one note will affect all notes. Some workarounds include mapping the piano keys to retuned samples from the software instrument or creating separate channels for each voice, neither of which are very friendly or flexible.
- changing frequency over time must be accomplished with pitch bend automation, AKA manipulation of a separate pointwise function with arbitrary measurements.

### what
In contrast, this environment allows voice-specific tuning changes, pitch bends between notes, and a completely fluid tuning ecosystem, meaning microtonal effects like "comma pumps" or pitch shifts can be easily accomplished. Notes may also optionally be connected by intervals, which lock them together and allow them to respond dynamically to each other's tuning changes.
![](assets/springs_demo.gif)

This app was built with jQuery and SVG.js.
