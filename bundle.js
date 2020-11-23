(function () {
    'use strict';

    const style = {};
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
      linecap: 'round'
    };
    /* Keyboard Display */

    let w = 50;
    style.keyDisplay = {
      gap: 2,
      height: 20,
      width: w,
      black: {
        width: w * 2 / 3,
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
    };
    /* Piano Roll Note Display Options */

    style.noteFill = function (note) {
      let bValue = Math.floor(note.velocity * 2);
      return new SVG.Color(`rgb(0, 128, ${bValue})`);
    };

    style.noteShadowFill = function (note) {
      let bValue = Math.floor(note.velocity * 2);
      return new SVG.Color(`rgb(0, 255, ${bValue})`);
    };

    style.noteShadowStroke = 'rgb(60, 60, 60)';
    style.strokeSelected = 'red';

    const ruler = {
      height: 20,
      scaleVal: 1,

      /** Create SVG ruler. Only called once. */
      draw() {
        ruler.canvas = SVG().addTo('#ruler').size(editor$1.width, ruler.height).mousemove(e => {
          if (!playback.playing && e.buttons == 1) playback.position = editor$1.canvas.point(e.x, e.y).x;
        }).mousedown(e => {
          if (!playback.playing) playback.position = editor$1.canvas.point(e.x, e.y).x;
          editor$1.deselectAllObjects();
        });
        this.svg = this.canvas;
        /* Draw tick mark and measure number */

        ruler.ticks = Array(editor$1.widthInTime).fill(0).map((_, i) => {
          if (i % 16 == 0) {
            let g = ruler.canvas.group();
            g.line(i * editor$1.zoomX, 0, i * editor$1.zoomX, 20).stroke({
              width: 1
            }).stroke('black');
            let measureNumber = g.text("" + Math.ceil((i + 1) / 16)).font(style.editorText).center((i + 1) * editor$1.zoomX, 10).addClass("mouse-disabled");
            return g;
          }
        });
      },

      /** Adjust the ruler to a new aspect ratio. */
      zoom(zoomX, zoomY) {
        for (let i = 0; i < ruler.ticks.length; i++) {
          ruler.ticks[i]?.move(i * zoomX, 0);
        }
      },

      /** Scale the ruler, preserving aspect ratio. */
      scale(val) {
        for (let i = 0; i < ruler.ticks.length; i++) {
          ruler.ticks[i]?.move(i * val * editor$1.zoomX, 0);
        }

        this.scaleVal = val;
        playback.caret.cx(playback.position * val);
      },

      /** Scroll to specific coordinates. */
      scroll(x, y) {
        let $ruler = $('.ruler-container');
        $ruler.css('overflow', 'scroll');
        $ruler.scrollLeft(x);
        $ruler.css('overflow', 'hidden');
      }

    };

    /**
     * Handles playback display and data,
     * doesn't interact with the WebAudio API
     */

    const playback = {
      draw() {
        this.line = editor$1.canvas.line().stroke({
          width: 2,
          color: 'red'
        }).opacity(0.6).hide().front();
        let d = 8; //this.caret = ruler.canvas.polygon(`0, 0 ${w}, 0  ${w/2+1}, ${h} ${w/2-1}, ${h}`)

        this.caret = ruler.canvas.circle(d).y(ruler.height - d).fill('red').opacity(0.6).hide().front();
      },

      intervalIndex: -1,
      _position: 0,
      bpm: 120,
      ticksPerBeat: 4,
      // 16th division
      beatsPerMeasure: 4,
      // in 4/4
      scaleVal: 1,

      scale(val) {
        this.scaleVal = val;
      },

      set position(val) {
        playback._position = val;
        playback.line.plot(val, 0, val, editor$1.numKeys * editor$1.zoomY).show();
        playback.caret.cx(val * this.scaleVal).show();
      },

      get position() {
        return playback._position;
      },

      get playing() {
        return playback.intervalIndex != -1;
      },

      /* Play from the current position of the playback line or a specified point */
      play(startPosition = playback.position) {
        let start = Date.now();
        playback.pause();
        playback.position = startPosition || playback.position;
        let measureLengthMs = 60000 * this.beatsPerMeasure / playback.bpm;
        let measureWidth = this.ticksPerBeat * this.beatsPerMeasure * editor$1.zoomX;
        let fps = 29;
        playback.line.show().front();
        playback.caret.show().front();
        playback.intervalIndex = setInterval(() => {
          let now = Date.now();
          let deltaMs = now - start;
          let measureCount = deltaMs / measureLengthMs;
          let posn = startPosition + measureWidth * measureCount;
          playback.position = posn;
          if (posn >= editor$1.width) playback.stop();
        }, 1000 / fps);
      },

      /* Pause playback */
      pause() {
        clearInterval(playback.intervalIndex);
        playback.intervalIndex = -1;
      },

      /* Stop playback */
      stop() {
        playback.pause();
        playback.position = 0;
        playback.line.hide();
        playback.caret.hide();
      },

      /* Convert the number of ticks to seconds */
      MIDITimeToSeconds(ticks) {
        return 60 * ticks / (this.bpm * this.ticksPerBeat);
      }

    };

    Number.prototype.clamp = function (lo, hi) {
      return Math.max(lo, Math.min(this, hi));
    };
    /**
     * Add a graphical tooltip to the given 
     * element (either a jQuery object, svg element, DOM node, or selector)
     */


    function addTooltip(elem, text) {
      $(elem).attr("title", text).addClass("has-tooltip");
    }
    /**
     * Create a cubic bezier path between two 
     * points, returned as a string.
     * 
     * @param { {x: number, y: number} } start The start position
     * @param { {x: number, y: number} } end The end position
     * @param { "horizontal" | "vertical" } orientation 
     * @param { number } easingFactor How "curvy" to make the path
     */

    function simpleBezierPath(start, end, orientation, easingFactor = 0.25) {
      // 0.01 is added b/c beziers disappear when they're completely straight
      if (orientation == 'vertical') {
        let ctrlPtOffset = (end.y - start.y) * easingFactor;
        return `M ${start.x} ${start.y} 
               C ${start.x + .01} ${start.y + ctrlPtOffset}
                 ${end.x + .01} ${end.y - ctrlPtOffset} 
                 ${end.x} ${end.y}`;
      } else {
        let ctrlPtOffset = (end.x - start.x) * easingFactor;
        return `M ${start.x} ${start.y} 
                C ${start.x + ctrlPtOffset} ${start.y + .01}
                  ${end.x - ctrlPtOffset} ${end.y + .01} 
                  ${end.x} ${end.y}`;
      }
    }
    /** Return the "ruler" tool's bracket-like path, as a string. */

    function rulerPath(start, end) {
      return `M ${start.x} ${start.y} L ${end.x} ${end.y}
            M ${start.x - 5} ${start.y} L ${start.x + 5} ${start.y}
            M ${end.x - 5} ${end.y} L ${end.x + 5} ${end.y}`;
    }
    function normAscendingInterval(interval) {
      /* if (interval.cents() < 0) interval = interval.inverse(); */
      return interval.normalized();
    } // quick-and dirty default 5 limit intervals

    const fiveLimitScale = [tune.FreqRatio(1, 1), tune.FreqRatio(16, 15), tune.FreqRatio(9, 8), tune.FreqRatio(6, 5), tune.FreqRatio(5, 4), tune.FreqRatio(4, 3), tune.FreqRatio(45, 32), tune.FreqRatio(3, 2), tune.FreqRatio(8, 5), tune.FreqRatio(5, 3), tune.FreqRatio(16, 9), tune.FreqRatio(15, 8)];
    /** Return a JI adjustment of the 
     * interval between two MIDI numbers, `lo` and `hi`.
     * */

    function guessJIInterval(lo, hi) {
      if (lo > hi) [hi, lo] = [lo, hi];
      let idx = ((hi - lo) % 12 + 12) % 12;
      let octaves = Math.floor((hi - lo) / 12);
      let ji = fiveLimitScale[idx];
      let interval = ji;
      return interval.add(tune.ETInterval.octave.multiply(octaves));
    }
    /** Display a message to the user with a certain `color`. */

    function addMessage(text, color = 'black') {
      let a = $(document.createElement('p')).text(text).addClass('warning').css({
        color
      }).appendTo($('.warn-container'));
      a.delay(3000).fadeOut(2000, () => a.remove());
    }
    /** Get the pitch name of a MIDI pitch, optionally including the octave number. */

    function pitchName(pitch, includeOctave = false) {
      const pitchNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      let result = pitchNames[tune.Util.mod(Math.round(pitch), 12)];
      if (includeOctave) result += Math.floor(pitch / 12);
      return result;
    }
    /** Turn a string into an interval.
     * 
     *  Valid formats of `text`:
     *   - `"n#d"` = `tune.ETInterval(n, d)`
     *   - `"n:d"` = `tune.FreqRatio(n, d)`
     *   - `"n c"` = `tune.Cents(n)` **NOT YET SUPPORTED
    */

    function parseIntervalText(text) {
      let ratioPattern = /^(?<num>[\d\.]+)\s?[:/]\s?(?<den>[\d\.]+)\s*$/;
      let etPattern = /^(?<num>-?[\d\.]+)\s?#\s?(?<den>[\d\.]+)\s*$/;
      let centPattern = /^(?<cents>-?[\d\.]+)\s*c$/;

      if (ratioPattern.test(text)) {
        let g = ratioPattern.exec(text).groups;
        return tune.FreqRatio(parseFloat(g.num), parseFloat(g.den));
      } else if (etPattern.test(text)) {
        let g = etPattern.exec(text).groups;
        return tune.ETInterval(parseFloat(g.num), parseFloat(g.den));
      } else if (centPattern.test(text)) {
        // cents not yet supported
        let cents = centPattern.exec(text).groups.cents;
        return false;
      }

      return false;
    }

    /**
     * Namespace for functions interacting with the WebAudio API
     */

    const audio = {
      notes: Array(128),
      // map of midi notes -> osc
      playingNotes: new Set(),

      // all oscillators
      initAudio() {
        if (window.AudioContext || window.webkitAudioContext) {
          this.context = new (window.AudioContext || window.webkitAudioContext)();
          this.gainNode = this.context.createGain();
          this.gainNode.gain.setValueAtTime(0.2, this.context.currentTime);
          this.gainNode.connect(this.context.destination); // connect to output
        } else {
          addMessage("Unable to play audio. This browser does not support the WebAudio API.");
        }
      },

      get now() {
        return this.context.currentTime;
      },

      /* Reset playback data */
      pause() {
        for (let [n, g] of this.playingNotes) {
          g.gain.value = 0;
          g.gain.cancelScheduledValues(0);
        }

        this.playingNotes = new Set();
      },

      /* Play a note `start` seconds in the future, ending `end` seconds into the future. */
      playNote(note, start = 0, end = 2.0) {
        let time = playback.position / editor.zoomX;
        let offset = playback.MIDITimeToSeconds(time);
        let relativeStart = Math.max(0, start - offset);
        let relativeEnd = end - offset;
        if (relativeEnd < 0) return;
        if (!this.context) this.initAudio();
        let a = this.context.createOscillator();
        let oscGain = this.context.createGain();
        a.frequency.value = note.frequency;
        a.type = 'sawtooth';
        let crossFadeDur = 0.1;
        a.start(this.now + relativeStart);
        a.stop(this.now + relativeEnd + crossFadeDur);

        a.onended = ø => void this.playingNotes.delete(a); // Fade in


        oscGain.gain.setValueAtTime(0, this.now + relativeStart);
        oscGain.gain.linearRampToValueAtTime(note.velocity / 128, this.now + relativeStart + crossFadeDur); // hold

        oscGain.gain.setValueAtTime(note.velocity / 128, this.now + relativeEnd); // Fade out

        oscGain.gain.linearRampToValueAtTime(0.01, this.now + relativeEnd + crossFadeDur);
        a.connect(oscGain).connect(this.gainNode);
        this.playingNotes.add([a, oscGain]);

        for (let gliss of note.glissOutputs) {
          this.playGliss(gliss, end, playback.MIDITimeToSeconds(gliss.endNote.start));
        }
      },

      /* Play back a gliss starting at a certain time */
      playGliss(gliss, start = 0, end = 2.0) {
        let time = playback.position / editor.zoomX;
        let offset = playback.MIDITimeToSeconds(time);
        let relativeStart = Math.max(0, start - offset);
        let relativeEnd = end - offset;
        if (relativeEnd < 0) return;
        let relativeStartVelocity = 1 / gliss.startNote.glissOutputs.length ** 0.5;
        let relativeEndVelocity = 1 / gliss.endNote.glissInputs.length ** 0.5;
        if (!this.context) this.initAudio();
        let a = this.context.createOscillator();
        let oscGain = this.context.createGain(); // use provided easing

        a.frequency.value = gliss.startNote.frequency;
        a.frequency.setValueCurveAtTime(gliss.getFreqCurve(), this.now + relativeStart, end - start);
        a.type = 'sawtooth';
        let crossFadeDur = 0.1;
        a.start(this.now + relativeStart);
        a.stop(this.now + relativeEnd + crossFadeDur); // Fade in

        oscGain.gain.setValueAtTime(0, this.now + relativeStart);
        oscGain.gain.linearRampToValueAtTime(relativeStartVelocity * gliss.startNote.velocity / 128, this.now + relativeStart + crossFadeDur);
        oscGain.gain.exponentialRampToValueAtTime(relativeEndVelocity * gliss.endNote.velocity / 128, this.now + relativeEnd); // Fade out

        oscGain.gain.linearRampToValueAtTime(0.01, this.now + relativeEnd + crossFadeDur);
        a.connect(oscGain).connect(this.gainNode);
        this.playingNotes.add([a, oscGain]);
      },

      /* Playback a set of notes */
      playNotes(notes) {
        for (let note of notes) {
          this.playNote(note, playback.MIDITimeToSeconds(note.start), playback.MIDITimeToSeconds(note.end));
        }
      },

      /* Start a note playing */
      noteOn(pitch, velocity = 60) {
        if (this.notes[pitch]) return;
        if (!this.context) this.initAudio();
        let a = this.context.createOscillator();
        let oscGain = this.context.createGain();
        a.frequency.value = tune.Util.ETToFreq(pitch);
        a.type = 'sawtooth';
        a.start();
        oscGain.gain.value = velocity / 127;
        a.connect(oscGain).connect(this.gainNode);
        this.notes[pitch] = a;
      },

      /* End a note playing */
      noteOff(pitch) {
        this.notes[pitch]?.stop(0);
        this.notes[pitch] = undefined;
      }

    };

    const grid = {
      /** Create the time/pitch grid using HTML Canvas. */
      draw() {
        let div = $(document.createElement('div')).addClass("grid").attr({
          width: editor$1.width,
          height: editor$1.height
        }).css({
          width: editor$1.width,
          height: editor$1.height,
          position: 'absolute',
          left: 0,
          top: 0,
          zIndex: -5,
          overflow: 'scroll'
        }).appendTo('.right-container');
        let c = $(document.createElement('canvas')).attr({
          width: editor$1.width,
          height: editor$1.height
        }).css({
          position: 'absolute',
          left: 0,
          top: 0,
          zIndex: 1,
          display: 'block'
        }).appendTo(div).on("mouseup", ø => {
          // clear selection
          editor$1.selectObject();
        }).text("Grid");
        let ctx = c.get()[0].getContext("2d");
        ctx.beginPath();
        ctx.fillStyle = style.keyDisplay.black.seqFillUnselected; // draw horizontal lines

        for (let i = 0; i < editor$1.numKeys; i++) {
          if ([1, 3, 6, 8, 10].includes(i % 12)) {
            // accidental
            ctx.rect(0, (editor$1.numKeys - (i + 1)) * editor$1.zoomY, editor$1.width, editor$1.zoomY);
          }
        }

        ctx.fill(); // draw vertical lines / tick marks corresponding to 4/4

        ctx.beginPath();

        for (let i = 0; i < editor$1.widthInTime; i++) {
          let width = (!(i % 2) + !(i % 4) + !(i % 8) + !(i % 16) + 1) / 2;
          ctx.rect(i * editor$1.zoomX, 0, width, editor$1.height);
        }

        ctx.fillStyle = style.darkGrey;
        ctx.globalAlpha = 0.3;
        ctx.fill();
        this.$div = div;
        this.$canvas = c;
      },

      /** Adjust the zoom to the editor's aspect ratio. */
      zoom(xZoom, yZoom) {
        this.$canvas.width(editor$1.width);
        this.$canvas.height(editor$1.height);
      },

      /** Set the zoom/scale amount, preserving aspect ratio. */
      scale(val) {
        this.$canvas.css('zoom', val);
      },

      /** Move the grid to specified coordinates. */
      scroll(x, y) {
        let top = -(y - this.$div.offset().top);
        let left = -(x - style.keyDisplay.width);
        this.$canvas.offset({
          top: top / editor$1.zoomXY,
          left: left / editor$1.zoomXY
        });
      },

      /** Create a rectangle to display over the grid. */
      highlightPitch(pitch, play = true, options) {
        let rect;

        if (!this.highlightRectangles[pitch]) {
          rect = editor$1.canvas.rect(editor$1.width, editor$1.zoomY).move(0, (editor$1.numKeys - (pitch + 1)) * editor$1.zoomY).fill(options.seqFillSelected).opacity(0.5).back();
          this.highlightRectangles[pitch] = rect;
        } else {
          rect = this.highlightRectangles[pitch];
        }

        if (play) rect.show();else rect.hide();
      },

      /** The displayed SVG highlight rectangles. */
      highlightRectangles: []
    };

    /** A key in the displayed sideways keyboard. */

    class PianoKey {
      constructor(pitch) {
        this.pitchClass = pitch % 12;
        this.isNatural = ![1, 3, 6, 8, 10].includes(this.pitchClass);
        this.displayOptions = this.isNatural ? style.keyDisplay.white : style.keyDisplay.black;
        this.pitch = pitch;
        this.pitchName = pitchName(this.pitch);
      }

      get x() {
        return 0;
      }

      get textX() {
        return this.x + this.width - this.text.length() - 2;
      }

      get textY() {
        return this.y + this.height - this.textSize - 2;
      }

      get textSize() {
        return 8;
      }

      get y() {
        let relativeY = PianoKey.keyYVals[this.pitchClass] * 12 / 7;
        let unscaledY = relativeY + Math.floor(this.pitch / 12) * 12;
        return (editor$1.numKeys - unscaledY) * editor$1.zoomY * keyboard.scaleVal;
      }

      get width() {
        return this.displayOptions.width;
      }

      get whiteKeyHeight() {
        return 12 / 7 * editor$1.zoomY * keyboard.scaleVal;
      }

      get height() {
        return this.isNatural ? this.whiteKeyHeight : this.whiteKeyHeight * 0.6;
      }
      /** Redraw the position, size, and text of the graphics. */


      updateGraphics(animateDuration) {
        if (!this.canvas) return;
        this.keyRect.size(this.width, this.height).move(this.x, this.y);

        if (this.text) {
          if (this.height < this.textSize * 1.3) {
            this.text.hide();
          } else {
            this.text.font({
              size: this.textSize
            }).x(this.textX).y(this.textY).show();
          }
        }
      }
      /** Draw the key as a rectangle on `canvas`. Only called upon creation. */


      draw(canvas) {
        this.canvas = canvas;
        this.keyRect = canvas.rect(this.width, this.height).radius(2).stroke({
          color: 'grey',
          width: 1
        }).fill(this.displayOptions.color).move(this.x, this.y).mouseover(() => {
          this.keyRect.fill(this.displayOptions.hoverColor);
        }).mouseout(ø => this.noteOff()).mousedown(ø => this.noteOn()).mouseup(ø => this.noteOff());
        if (!this.isNatural) this.keyRect.front();else this.keyRect.back();

        if (this.pitchName == 'C') {
          this.text = this.canvas.text(pitchName(this.pitch, true)).font(style.editorText);
          this.text.font({
            size: this.textSize
          }).x(this.textX).y(this.textY).addClass("mouse-disabled");
        }
      }
      /** Display the note as pressed and play back audio of the pitch */


      noteOn(velocity = 60) {
        this.keyRect.fill(this.displayOptions.clickColor);
        grid.highlightPitch(this.pitch, true, this.displayOptions);
        audio.noteOn(this.pitch, velocity);
      }
      /** Display the note as released and stop audio of the pitch */


      noteOff() {
        this.keyRect.fill(this.displayOptions.color);
        grid.highlightPitch(this.pitch, false, this.displayOptions);
        audio.noteOff(this.pitch);
      }

    }
    /** Relative spacing between start of key rectangles. */


    PianoKey.keyYVals = [1, 1.1, 2, 2.4, 3, 4, 4.1, 5, 5.3, 6, 6.5, 7];
    const keyboard = {
      /** Create SVG element and draw all piano keys. */
      draw() {
        this.canvas = SVG().addTo('#roll-keyboard').size(style.keyDisplay.width, editor$1.zoomY * editor$1.numKeys);
        this.svg = this.canvas;

        for (let i = 0; i < editor$1.numKeys; i++) {
          let key = new PianoKey(i);
          key.draw(this.canvas);
          this.keys.push(key);
        }
      },

      zoom(xZoom, yZoom) {
        this.canvas.size(style.keyDisplay.width, yZoom * editor$1.numKeys);

        for (let key of this.keys) key.updateGraphics(0);
      },

      scale(val) {
        this.scaleVal = val;
        this.canvas.size(style.keyDisplay.width, val * editor$1.height);

        for (let key of this.keys) key.updateGraphics(0);
      },

      scaleVal: 1,

      /** Trigger note on for the given pitch */
      noteOn(pitch, velocity = 60) {
        this.keys[pitch].noteOn(velocity);
      },

      /** Trigger note off for the given pitch */
      noteOff(pitch) {
        this.keys[pitch].noteOff();
      },

      keys: [],

      get width() {
        return style.keyDisplay.width;
      },

      /** Move to the given scrolled coordinates. */
      scroll(x, y) {
        let $keyboard = $('.piano-container');
        $keyboard.css('overflow', 'scroll');
        $keyboard.scrollTop(y);
        $keyboard.css('overflow', 'hidden');
      }

    };

    const userPreferences = {
      /**
       * If `true`, reset notes after the interval between
       *   them is deleted.
       */
      propagateBendAfterDeletion: true,

      /**
       * If `true` always display the sizes of intervals.
       *   If `false` only display the sizes of intervals when
       *   hovering over edges.
       * 
       */
      alwaysShowEdges: false,

      /**
       * The pitch bend width (in semitones) of the MIDI instrument
       *  the user is importing from / exporting to.
       */
      pitchBendWidth: 1,

      /**
       * The default amount of easing for created glisses.
       */
      glissEasing: 0.5
    };

    class SeqEdge {
      /**
       * A connection of an interval between two `SeqNote`s.
       *   The interval is always assigned in the same direction
       *   as the existing interval between `a` and `b`.
       * 
       * @param { SeqNote } a The start note
       * @param { SeqNote } b The end note
       * @param { tune.Interval } interval The interval to connect by
       */
      constructor(a, b, interval) {
        this.a = a;
        this.b = b;

        if (this.a.soundingPitch > this.b.soundingPitch) {
          this.maxNote = this.a;
          this.minNote = this.b;
        } else {
          this.maxNote = this.b;
          this.minNote = this.a;
        }

        this._interval = interval;
      }
      /** Redraw the line and interval text. */


      updateGraphics(animateDuration = 300) {
        if (this.line) {
          this.text.text(normAscendingInterval(this.interval).toString());
          let line = animateDuration ? this.line.animate(animateDuration) : this.line;
          let text = animateDuration ? this.text.animate(animateDuration) : this.text;
          let dist = Math.abs(this.a.start - this.b.start);
          let width = 4 * (1 - Math.tanh(dist / 64)) + 1;
          let path = simpleBezierPath({
            x: this.x1,
            y: this.y1
          }, {
            x: this.x2,
            y: this.y2
          }, 'vertical');
          line.plot(path).stroke({
            width
          });
          text.center(this.midX, this.midY);
        }
      }
      /** Midpoint x of the line. */


      get midX() {
        return (this.x1 + this.x2) / 2;
      }
      /** Midpoint y of the line. */


      get midY() {
        return (this.y1 + this.y2) / 2;
      }

      get x1() {
        return this.minNote.handleX;
      }

      get x2() {
        return this.maxNote.handleX;
      }

      get y1() {
        return this.minNote.handleY;
      }

      get y2() {
        return this.maxNote.handleY;
      }

      set selected(val) {
        this._selected = val;
        let strokeColor = val ? style.strokeSelected : style.editorLine.color;
        this.line.stroke(strokeColor);
      }

      get selected() {
        return this._selected;
      }
      /** Draw the edge as a path on `canvas`. Only called upon creation. */


      draw(canvas) {
        let path = simpleBezierPath({
          x: this.x1,
          y: this.y1
        }, {
          x: this.x2,
          y: this.y2
        }, 'vertical');
        let dist = Math.abs(this.a.start - this.b.start);
        let width = 4 * (1 - Math.tanh(dist / 64)) + 1;
        this.line = canvas.path(path).stroke(style.editorLine).opacity(0.7).fill('none');
        this.line.stroke({
          width
        });
        addTooltip(this.line.node, "Press Enter to edit interval size");
        editor$1.assignMouseHandler(this, this.line, "edge_line");
        let intervalLabel = normAscendingInterval(this.interval).toString();
        this.text = canvas.text(intervalLabel).font(style.editorText).center(this.midX, this.midY).addClass("mouse-disabled");
        if (!userPreferences.alwaysShowEdges) this.text.opacity(0);
      }
      /** Hide the edge in the editor */


      hide() {
        this.text.hide();
        this.line.hide();
      }
      /** Show the edge in the editor */


      show() {
        this.line.show();
        this.text.show();
      }
      /**
       * This function is called when the user
       * directly deletes this object. The effects may propagate
       * to connected objects.
       */


      delete() {
        if (!this.removed) {
          this.remove();

          if (userPreferences.propagateBendAfterDeletion) {
            /* Retune the higher note */
            this.maxNote.propagateBend(0, 300, [this.minNote]);
          }
        }
      }
      /**
       * This function is called when the object
       * is removed by a connected object. It
       * does not propagate.
       */


      remove() {
        if (!this.removed) {
          this.line.remove();
          this.text.remove();
          SeqNote.graph.get(this.a)?.delete(this.b);
          SeqNote.graph.get(this.b)?.delete(this.a);
          this.removed = true;
        }
      }

      get interval() {
        return this._interval;
      }
      /** The interval represented by the edge. 
       * It will always go in the same direction 
       * as the existing interval between `a` and `b`.
       * */


      set interval(val) {
        /* Ensure the intervals go in the same direction */
        if (this._interval.cents() * val.cents() > 0) {
          this._interval = val;
        } else {
          this._interval = val.inverse();
        }

        if (this.a.soundingPitch > this.b.soundingPitch) {
          this.maxNote = this.a;
          this.minNote = this.b;
        } else {
          this.maxNote = this.b;
          this.minNote = this.a;
        }

        this.updateGraphics(0);
      }
      /** Return the difference between the edge interval
       *    and the ET interval between `a` and `b`.
       * */


      getBend() {
        let etDistance = tune.ETInterval(this.maxNote.pitch - this.minNote.pitch);
        return this.interval.abs().subtract(etDistance).cents() / 100;
      }

    } // define missing abs() in tune.Interval

    const abs = function () {
      return this.cents() > 0 ? this : this.inverse();
    };

    tune.ETInterval.prototype.abs = abs;
    tune.FreqRatio.prototype.abs = abs;

    class SeqNote {
      constructor(pitch, velocity, start, duration) {
        this._pitch = pitch;
        this._velocity = velocity;
        this._start = start;
        this._end = start + duration;
        this.glissInputs = [];
        this.glissOutputs = [];
        this._bend = 0;
        SeqNote.graph.set(this, new Map());
      }
      /* Update display and set velocity. Valid range = [0, 128) */


      set velocity(val) {
        this._velocity = val.clamp(0, 128);
        this.shadowRect.fill(style.noteShadowFill(this));
        this.rect.fill(style.noteFill(this));

        for (let g of this.glissOutputs) g.redrawColor();

        for (let g of this.glissInputs) g.redrawColor();
      }

      get velocity() {
        return this._velocity;
      }

      get pitch() {
        return this._pitch;
      }
      /* Update display and set pitch. Valid range = [0, 128) */


      set pitch(val) {
        this._pitch = Math.floor(val.clamp(0, 128));
        this.redrawPosition(0);
      }
      /** 
       * Change bend and update the display. If the bend is 
       * outside the range [-0.5, 0.5), change the pitch as well. 
       * */


      set bend(val) {
        let steps = Math.round(Math.abs(val));

        if (val >= 0.5) {
          this.pitch += steps;
          this._bend = val - steps;
        } else if (val < -0.5) {
          this.pitch += -steps;
          this._bend = val + steps;
        } else {
          this._bend = val;
        }

        this.updateGraphics(0);
        this.redrawInputs(0);
        this.redrawOutputs(0);
      }

      get bend() {
        return this._bend;
      }

      set start(val) {
        this._start = val.clamp(0, Infinity);
        this.updateGraphics(0);
        this.redrawInputs(0);
      }

      get start() {
        return this._start;
      }

      set end(val) {
        this._end = val.clamp(1, Infinity);
        this.updateGraphics(0);
        this.redrawOutputs(0);
      }

      get end() {
        return this._end;
      }
      /* Set start while keeping duration */


      set startMove(val) {
        let d = this.duration;
        this._start = val;
        this._end = val + d;
        this.redrawPosition(0);
      }

      get soundingPitch() {
        return this.bend + this.pitch;
      }

      get frequency() {
        return tune.Util.ETToFreq(this.soundingPitch);
      }

      get duration() {
        return this.end - this.start;
      }

      get x() {
        return this.start * this.seq.zoomX;
      }

      get xEnd() {
        return this.end * this.seq.zoomX;
      }

      get y() {
        return (this.seq.numKeys - (this.pitch + 1 + this._bend)) * this.seq.zoomY;
      }

      get yET() {
        return (this.seq.numKeys - (this.pitch + 1)) * this.seq.zoomY;
      }

      get width() {
        return this.duration * this.seq.zoomX;
      }

      get height() {
        return this.seq.zoomY;
      }

      get handleX() {
        return this.x + 0.5 * this.height;
      }

      get handleY() {
        return this.y + 0.5 * this.height;
      }

      get neighbors() {
        return SeqNote.graph.get(this).entries();
      }

      get asNote() {
        return tune.ETPitch(this.soundingPitch);
      }

      set selected(val) {
        this._selected = val;
        let strokeColor = val ? style.strokeSelected : style.noteFill(this);
        this.rect.stroke(strokeColor);
      }

      get selected() {
        return this._selected;
      }
      /** Redraw the position of the graphics and propagate this change. */


      redrawPosition() {
        this.rect.move(this.x, this.y);
        this.shadowRect.move(this.x, this.yET);
        this.handle.center(this.handleX, this.handleY);
        this.indicator.center(this.handleX - this.height * 0.8, this.handleY);
        this.centDisplay.x(this.handleX - this.height - this.centDisplay.length() - 5).cy(this.handleY);
        this.resizeRight.move(this.xEnd - 4, this.y);
        this.redrawOutputs(0);
        this.redrawInputs(0);
      }
      /** Propagate position change to the input glisses and connected edges. */


      redrawInputs(animateDuration = 300) {
        for (let g of this.glissInputs) g.redrawPosition();

        for (let [_, edge] of this.neighbors) edge.updateGraphics(animateDuration);
      }
      /** Propagate position change to the output glisses. */


      redrawOutputs() {
        for (let g of this.glissOutputs) g.redrawPosition();
      }
      /** Update the position, size, and color of the display. */


      updateGraphics(animateDuration = 300) {
        let rect = this.rect,
            shadowRect = this.shadowRect,
            handle = this.handle,
            indicator = this.indicator,
            centDisplay = this.centDisplay,
            resizeRight = this.resizeRight;

        if (animateDuration) {
          rect = rect.animate(animateDuration);
          shadowRect = shadowRect.animate(animateDuration);
          handle = handle.animate(animateDuration);
          indicator = indicator.animate(animateDuration);
          centDisplay = centDisplay.animate(animateDuration);
          resizeRight = resizeRight.animate(animateDuration);
        } // non-animated changes


        this.centDisplay.text(this.bendText); // possibly animated changes

        rect.move(this.x, this.y).size(this.width, this.height);
        shadowRect.move(this.x, this.yET).size(this.width, this.height);
        handle.size(this.height, this.height).center(this.handleX, this.handleY);
        indicator.size(this.height / 4, this.height / 2).center(this.handleX - this.height * 0.8, this.handleY);
        centDisplay.x(this.handleX - this.height - this.centDisplay.length() - 5).cy(this.handleY);
        resizeRight.size(4, this.height).move(this.xEnd - 4, this.y);
        if (Math.abs(this.bend) < 1e-2) this.indicator.fill('grey'); // shows when < 1c
        else if (this.bend < 0) this.indicator.fill('blue');else this.indicator.fill('red');
      }
      /** Hide the note in the editor */


      hide() {
        this.rect.hide();
        this.handle.hide();
        this.indicator.hide();
      }
      /** Show the note in the editor */


      show() {
        this.rect.show();
        this.handle.show();
        this.indicator.show();
      }
      /** Move the note up or down octaves, adjusting the edge interval sizes. */


      transposeByOctaves(n) {
        let pitch = this.pitch;
        this.pitch += 12 * n;

        for (let [note, edge] of this.neighbors) {
          let octaves = tune.FreqRatio(2, 1).multiply(n);

          if (note.pitch > pitch) {
            edge.interval = edge.interval.subtract(octaves);
          } else {
            edge.interval = edge.interval.add(octaves);
          } //console.log("interval:", edge.interval.toString())


          edge.updateGraphics(0);
        }

        this.redrawPosition(0);
      }
      /** Draw the note as a rectangle on `canvas`. Only called upon creation. */


      draw(canvas) {
        // shadow rectangle, shows equal tempered pitch
        this.shadowRect = canvas.rect(this.width, this.height).stroke(style.noteShadowStroke).fill(style.noteShadowFill(this)).opacity(0.3).radius(2).move(this.x, this.yET);
        let fillColor = style.noteFill(this); // main rectangle, shows adjusted pitch

        this.rect = canvas.rect(this.width, this.height).fill(fillColor).stroke(fillColor).radius(2).move(this.x, this.y);
        this.handle = canvas.group();
        this.handle.circle(this.height / 2).center(this.handleX, this.handleY).fill("white"); // invisible, but catches mouse events

        this.handle.rect(this.height, this.height).center(this.handleX, this.handleY).front().stroke('black').fill('white').radius(2).opacity(0.2);
        this.indicator = canvas.rect(this.height / 4, this.height / 2).center(this.handleX - this.height * 0.8, this.handleY).radius(2);
        this.centDisplay = canvas.text(this.bendText).font(style.editorText).opacity(0);
        this.centDisplay.x(this.handleX - this.height - this.centDisplay.length() - 5).cy(this.handleY).addClass("mouse-disabled");
        this.resizeRight = canvas.rect(4, this.height).move(this.xEnd - 4, this.y).radius(2).stroke('black').opacity(0.3).fill('black');
        addTooltip(this.handle.node, "Drag to attach notes by an interval");
        addTooltip(this.rect.node, "Shift+Drag to adjust pitch bend");
        addTooltip(this.resizeRight.node, "Drag to resize; Shift+Drag to create a gliss");
        addTooltip(this.indicator.node, "Drag to resize");
        this.group = canvas.group();
        this.rect.addTo(this.group);
        this.handle.addTo(this.group);
        this.indicator.addTo(this.group);
        this.centDisplay.addTo(this.group);
        this.resizeRight.addTo(this.group);
        editor$1.assignMouseHandler(this, this.rect, "note_body");
        editor$1.assignMouseHandler(this, this.indicator, "note_left_handle");
        editor$1.assignMouseHandler(this, this.handle, "note_attach"); // originally was the handle.rect

        editor$1.assignMouseHandler(this, this.resizeRight, "note_right_handle");
        editor$1.assignMouseHandler(this, this.group, "note_group");
        this.updateGraphics(0);
        return [this.rect, this.shadowRect];
      }
      /** The number of cents of bend, as a string. */


      get bendText() {
        let str = Math.round(this.bend * 100 * 100) / 100 + "c";
        if (this.bend >= 0) str = "+" + str;
        return str;
      }
      /**
       * StoreVals := [...]
       * 
       * initialStore : [...StoreVals]
       * predicate : [Edge, Note] -> Boolean
       * combine: Edge, Note, ...StoreVals -> [...StoreVals]
       * successVal : Edge, Note, ...StoreVals -> S
       * failureVal : () -> S
       * */


      BFS(options) {
        options.noVisit = options.noVisit || [];
        options.initialStore = options.initialStore || [null];

        options.combine = options.combine || ((edge, child) => []);

        options.successVal = options.successVal || ((edge, child) => child);

        options.failureVal = options.failureVal || (ø => null);

        let visited = new Set(options.noVisit);
        let fringe = [[this, ...options.initialStore]];

        while (fringe.length) {
          let [node, ...storeVals] = fringe.pop();
          visited.add(node);

          for (let [child, edge] of node.neighbors) {
            if (!visited.has(child)) {
              let newStore = options.combine(edge, child, ...storeVals);

              if (options.predicate(edge, child)) {
                return options.successVal(edge, child, ...storeVals);
              } else {
                fringe.unshift([child, ...newStore]);
              }
            }
          }
        }

        if (options.returnAll) return [...visited];
        return options.failureVal();
      }
      /**
       * Calculate the interval from `this` to `other`. 
       * If they are in the same component, accumulate the 
       * interval along the path. Otherwise, calculate the 
       * difference as an ET interval. 
       */


      getIntervalTo(other) {
        return this.BFS({
          initialStore: [tune.ETInterval(0)],
          predicate: (edge, child) => child == other,
          combine: (edge, child, interval) => {
            if (edge.maxNote == child) return [edge.interval.add(interval)];else return [edge.interval.inverse().add(interval)];
          },
          successVal: (edge, child, interval) => {
            if (edge.maxNote == child) return edge.interval.add(interval);else return edge.interval.inverse().add(interval);
          },
          failureVal: () => tune.ETInterval(other.soundingPitch - this.soundingPitch)
        });
      }
      /**
       * Connect to another note by an interval, returning the newly created `SeqEdge`.
       * 
       * @param { SeqNote } other 
       * @param { tune.Interval } by 
       * @param { number } animateDuration 
       */


      connectTo(other, by = guessJIInterval(this.pitch, other.pitch), animateDuration = 300) {
        if (this.isConnectedTo(other)) return null;
        let edge = new SeqEdge(this, other, by);
        let oldNeighbors = [...SeqNote.graph.get(this).keys()];
        SeqNote.graph.get(this).set(other, edge);
        SeqNote.graph.get(other).set(this, edge);
        this.propagateBend(this.bend, animateDuration, oldNeighbors);
        return edge;
      }
      /**
       * If the `this` and `other` are in the same component, 
       *  remove the last edge on the path to `other`.
       */


      disconnectFrom(other) {
        return this.BFS({
          predicate: (edge, child) => child == other,
          successVal: (edge, child) => {
            edge.remove();
            return edge;
          },
          failureVal: ø => false
        });
      }
      /**
       * Returns true if `other` is in the same component as `this`.
       */


      isConnectedTo(other) {
        return this.BFS({
          predicate: (edge, child) => child == other,
          successVal: ø => true,
          failureVal: ø => false
        });
      }
      /**
       * Returns all notes in the component, not including `this`.
       */


      getAllConnected() {
        return this.BFS({
          predicate: () => false,
          returnAll: true
        });
      }
      /** 
       * Adjust the pitch bend of `this`
       * and propagate the effect along the graph
      */


      propagateBend(bend = this.bend, animateDuration = 300, awayFrom = []) {
        this.bend = bend;
        this.BFS({
          noVisit: awayFrom,
          initialStore: [bend],
          predicate: () => false,
          combine: (edge, child, bend) => {
            let edgeBend = edge.maxNote == child ? edge.getBend() : -edge.getBend();
            let newBend = edgeBend + bend;
            child.bend = newBend;
            return [child.bend];
          }
        });
      }
      /**
       * This function is called when the user
       * directly deletes this object. The effects may propagate
       * to connected objects.
       */


      delete() {
        if (!this.removed) {
          for (let [_, edge] of this.neighbors) edge.delete();

          for (let g of this.glissInputs) g.remove();

          for (let g of this.glissOutputs) g.remove();

          let removed = this.glissInputs.concat(this.glissOutputs).concat([...this.neighbors].map(e => e[1]));
          editor$1.removeReferences(removed);
          this.remove();
        }
      }
      /**
       * This function is called when the object
       * is removed by a connected object. It
       * does not propagate.
       */


      remove() {
        if (!this.removed) {
          this.group.remove();
          this.shadowRect.remove();
          SeqNote.graph.delete(this);

          for (let map of SeqNote.graph.values()) map.delete(this);

          this.removed = true;
        }
      }

    }
    /** 
     * The adjacency data structure for all notes in the editor. 
     * Structure: `Map<SeqNote a, Map<SeqNote b, SeqEdge edge>>`.
     *  `edge` is the edge from `a` to `b`. 
     * */
    // The edges are undirected, but
    //  I don't think it's possible to index by a pair of objects
    //  so each edge is stored as both (a, b) and (b, a).

    SeqNote.graph = new Map();

    const bezier = require("bezier-easing");

    class SeqGliss {
      constructor(start, end) {
        this.startNote = start;
        this.endNote = end;
        this.easing = userPreferences.glissEasing;
      }

      set selected(val) {
        this._selected = val;
        let strokeColor = val ? style.strokeSelected : this.gradient;
        this.line.stroke(strokeColor);
      }

      get selected() {
        return this._selected;
      }

      get duration() {
        return (this.endNote.start - this.startNote.end).clamp(0, Infinity);
      }
      /**
       * This function is called when the user
       * directly deletes this object. The effects may propagate
       * to connected objects.
       */


      delete() {
        if (!this.removed) {
          this.remove();
          this.startNote.glissOutputs = this.startNote.glissOutputs.filter(e => e != this);
          this.endNote.glissInputs = this.endNote.glissInputs.filter(e => e != this);
        }
      }
      /**
       * This function is called when the object
       * is removed by a connected object. It
       * does not propagate.
       */


      remove() {
        if (!this.removed) {
          this.line.remove();
          this.removed = true;
        }
      }

      draw(canvas) {
        this.canvas = canvas;
        let color, width;

        if (this.startNote.xEnd >= this.endNote.x) {
          throw "Forbidden gliss.";
        } else {
          this.gradient = this.canvas.gradient('linear', add => {
            add.stop(0, style.noteFill(this.startNote));
            add.stop(1, style.noteFill(this.endNote));
          });
          color = this.gradient;
          width = editor$1.zoomY;
        }

        this.line = canvas.path(simpleBezierPath({
          x: this.startNote.xEnd,
          y: this.startNote.y + editor$1.zoomY / 2
        }, {
          x: this.endNote.x,
          y: this.endNote.y + editor$1.zoomY / 2
        }, 'horizontal', this.easing)).stroke({
          color,
          width
        }).fill('none').opacity(0.6).insertBefore(this.startNote.group).insertBefore(this.endNote.group);
        addTooltip(this.line.node, "Drag to adjust easing");
        editor$1.assignMouseHandler(this, this.line, "gliss_line");
      }

      updateGraphics() {
        this.redrawColor();
        this.redrawPosition();
      }

      redrawColor() {
        this.gradient.update(add => {
          add.stop(0, style.noteFill(this.startNote));
          add.stop(1, style.noteFill(this.endNote));
        });
      }

      redrawPosition() {
        this.line.plot(simpleBezierPath({
          x: this.startNote.xEnd,
          y: this.startNote.y + editor$1.zoomY / 2
        }, {
          x: this.endNote.x,
          y: this.endNote.y + editor$1.zoomY / 2
        }, 'horizontal', this.easing));
      }

      getFreqCurve() {
        const glissEasing = bezier(this.easing, 0, 1 - this.easing, 1);
        const glissPoints = [];
        const n = this.duration;

        for (let i = 0; i < n; i++) glissPoints.push(glissEasing(i / (n - 1)));

        let f1 = this.startNote.frequency;
        let f2 = this.endNote.frequency;
        let dFreq = f2 - f1;
        let freqCurve = glissPoints.map(n => 2 ** n - 1) // make exponential (pitch)
        .map(n => n * dFreq + f1);
        return new Float32Array(freqCurve);
      }

    }

    const MIDI = JZZ.MIDI;
    const midi = {
      /** The input MIDI device. */
      port: undefined,

      /**
       * @async 
       * Return a `Promise` that 
       * resolves with an array of 
       * connected MIDI input devices. 
       * */
      getInputDevices() {
        return new Promise((resolve, reject) => {
          JZZ({
            sysex: true
          }).and(function () {
            resolve(this.info().inputs);
          });
        });
      },

      /**
       * Change the input MIDI device. The input
       * should be the name of the device or an element of
       * the array returned by `this.getInputDevices()`
       */
      setInputDevice(device) {
        this.port?.close();
        this.port = JZZ().openMidiIn(device);
        this.port.connect(midi.handleInputMessage);
      },

      /** Perform the action encoded in a MIDI message. */
      handleInputMessage(mid) {
        if (mid.isNoteOn()) {
          let pitch = mid.getNote();
          let velocity = mid.getVelocity();
          keyboard.noteOn(pitch, velocity);
        } else if (mid.isNoteOff()) {
          let pitch = mid.getNote();
          keyboard.noteOff(pitch);
        }
      },

      /**
       * Write the selected notes to a MIDI file.
       * 
       * @param { SeqNote[] } notes 
       * @param { string } fileName 
       * @param { {releaseTime: number } } options 
       * An object with preferences for the export.
       */
      writeToFile(notes, fileName, options) {
        // Construct multitrack midi data
        let smf = MIDI.SMF();
        let tracks = this.partitionIntoTracks(notes, options);

        for (let i = 0; i < tracks.length; i++) {
          let mtrk = MIDI.SMF.MTrk();
          smf.push(mtrk);
          tracks[i].forEach(note => this.addNoteToTrack(note, mtrk));
        } // Create and download .mid file


        let str = smf.dump();
        let b64 = JZZ.lib.toBase64(str);
        var uri = 'data:audio/midi;base64,' + b64;
        let a = document.createElement('a');
        a.href = uri;
        a.download = (fileName || "untitled") + ".mid";
        a.click();
      },

      /** Partition `notes` into a number of arrays without pitch bend conflict. */
      partitionIntoTracks(notes, options = {}) {
        options.releaseTime = options.releaseTime || 0;
        /* Need some logic here to handle glisses... */

        notes = notes.sort((a, b) => a.start - b.start); // keep track of the notes in each track

        let tracks = [[]];

        outer: for (let note of notes) {
          for (let i = 0; i < tracks.length; i++) {
            let track = tracks[i];

            if (!track.length || track[track.length - 1].end + options.releaseTime <= note.start) {
              track.push(note);
              continue outer;
            }
          } // Have to add a new track if loop is unsuccessful


          tracks.push([note]);
        }

        return tracks;
      },

      /** Convert the note to MIDI and add all necessary events. */
      addNoteToTrack(note, track) {
        let tick = note.start * 32;
        let endTick = note.end * 32;
        let pitch = pitchName(note.pitch, true);
        let velocity = note.velocity;
        let bend = scale14bits(note.bend / userPreferences.pitchBendWidth);
        track.add(tick, MIDI.noteOn(0, pitch, velocity)).add(tick, MIDI.pitchBend(0, bend)).add(endTick, MIDI.noteOff(0, pitch));
      },

      /** 
       * @async
       * Read a MIDI file and return an array of `SeqNote`s.
       * */
      readFromFile(file) {
        return new Promise((resolve, reject) => {
          if (!file) return reject();
          view.showLoader(`loading ${file.name}...`, ø => {
            let reader = new FileReader();
            reader.readAsBinaryString(file);

            reader.onload = ø => {
              let smf = MIDI.SMF(reader.result);
              let notesOn = [];
              let notes = [];
              let bends = [];

              for (let mtrk of smf) {
                for (let mid of mtrk) {
                  if (mid.isNoteOn()) {
                    let pitch = mid.getNote();
                    let start = mid.tt / 32;
                    if (start > editor.widthInTime) continue;
                    notesOn[pitch] = {
                      start,
                      velocity: mid.getVelocity(),
                      pitch
                    };
                  } else if (mid.isNoteOff()) {
                    let pitch = mid.getNote();
                    let note = notesOn[pitch];
                    delete notesOn[pitch];

                    if (note) {
                      note.duration = mid.tt / 32 - note.start;
                      notes.push(note);
                    }
                  } else if (mid[0] >= 224 && mid[0] < 240) {
                    // pitch bend
                    // right now only works for one channel
                    let bend = mid[2] << 7 | mid[1];
                    bend = bend / 16384 * 2 - 1;
                    bend *= userPreferences.pitchBendWidth;
                    bends.push({
                      time: mid.tt / 32,
                      bend
                    });
                  }
                }
              }

              console.log("done reading mid");
              bends = bends.sort((a, b) => a.time - b.time);
              notes = notes.sort((a, b) => a.start - b.start);
              let i = 0;
              let currBend = 0;

              for (let note of notes) {
                if (note.start >= bends[i]?.time) currBend = bends[i++].bend;
                note.bend = currBend;
              }

              console.log(notes);
              view.hideLoader();
              console.log("resolving");
              resolve(notes);
            };
          });
        });
      }

    };

    const scale14bits = val => {
      let result = Math.floor(16384 * (val + 1) / 2);
      if (result > 16383) throw new RangeError("Pitch bend values are too large to be represented in the given pitch bend range. Increase 'pitch bend width' in Preferences (and on your digital instrument) to fix this.");
      return result;
    };

    let undoStack = [];
    let redoStack = []; // basically a decorator that saves the action to the stack
    // while the process is being completed, the subprocesses
    // are saved to a substack so that they can be undone all 
    // at once or individually

    function mutator(func, name = "unknown") {
      return function (...args) {
        redoStack = [];
        let action = addAction(func, name, ...args); // child process adds its actions to substack

        let temp = undoStack;
        undoStack = action.stack;
        let result = action.do();
        undoStack = temp;
        return result;
      };
    }
    let tempStack;
    let tempAction; // a function to be called when a sequence of calls to `func`
    //  is about to take place

    const macroActionStart = function (func, name = "unknown") {
      redoStack = [];
      name = "macro_" + name;
      let action = {
        name,
        undo: macroUndo(name),
        stack: []
      };
      undoStack.push(action);
      tempStack = undoStack;
      tempAction = action;
      undoStack = action.stack;
      console.log("start macro");
    };

    function macroUndo(name) {
      let notes = editor$1.selection.filter(e => e instanceof SeqNote);
      let pairs;

      switch (name) {
        case "macro_resizeRight":
          pairs = notes.map(e => [e, e.end]);
          return () => {
            for (let [note, end] of pairs) note.end = end;
          };

        case "macro_resizeLeft":
          pairs = notes.map(e => [e, e.start]);
          return () => {
            for (let [note, start] of pairs) note.start = start;
          };

        case "macro_move":
          notes = editor$1.selectionForest.concat(notes);
          pairs = notes.map(e => [e, e.start, e.pitch]);
          return () => {
            for (let [note, start, pitch] of pairs) {
              note.startMove = start;
              note.pitch = pitch;
            }
          };

        case "macro_bend":
          pairs = notes.map(e => [e, e.pitch, e.bend]);
          return () => {
            for (let [note, pitch, bend] of pairs) {
              note.pitch = pitch;
              note.bend = bend;
            }
          };
      }
    }

    const macroActionEnd = function () {
      if (tempStack) {
        undoStack = tempStack;
        tempStack = undefined;
        tempAction.do = macroUndo(tempAction.name);
      }
    };

    function addAction(func, name, ...args) {
      let action = {
        name,
        do: () => func(...args),
        stack: []
      };
      action.undo = getUndo(action, ...args), undoStack.push(action);
      return action;
    }

    function getUndo(action, ...args) {
      let notes;
      let pairs;

      switch (action.name) {
        case "resetBend":
          notes = args.filter(e => e instanceof SeqNote);
          pairs = notes.map(e => [e, e.pitch, e.bend]);
          return () => {
            for (let [note, pitch, bend] of pairs) {
              note.pitch = pitch;
              note.bend = bend;
            }
          };

        case "disconnect":
          let interval = args[0].getIntervalTo(args[1]);
          return () => {
            editor$1.connect(args[0], args[1], interval);
            undoStack.pop();
          };

        case "connect":
          notes = args.filter(e => e instanceof SeqNote);
          pairs = notes.map(e => [e, e.pitch, e.bend]);
          return () => {
            editor$1.disconnect(args[0], args[1]);

            for (let [note, pitch, bend] of pairs) {
              note.pitch = pitch;
              note.bend = bend;
            }

            undoStack.pop();
          };

        case "tuneAsPartials":
          return () => action.stack.map(a => a.undo());

        case "delete":
        case "addNote":
        case "addGliss":
        case "divide":
        case "pasteJSON":
        case "paste":
        case "clearAllData":
        case "addCompressedData":
        case "transpose":
        default:
          return () => {
            addMessage("Unable to undo", 'orange');
          };
      }
    }

    function undo() {
      /* Disabled for now */
      return addMessage("Undo disabled", "orange");
    }
    function redo() {
      /* Disabled for now */
      return addMessage("Redo disabled", "orange");
    }
    window.undo = undo;
    window.redo = redo;
    window.stack = undoStack;
    window.redoStack = redoStack;

    const handlers = {};
    /* 
        Each handler may include the following methods:
            - exited(e, obj)
            - entered(e, obj)
            - hovered(e, obj)
            - clicked(e, obj)
            - doubleClicked(e, obj)
        Each method is passed the mouse event `e` and the object to modify.
    */

    let display = false;
    handlers["note_group"] = {
      exited(e, note) {
        /* hide number of cents */
        if (display && editor$1.action != editor$1.bend) {
          note.centDisplay.opacity(0);
          display = false;
        }
      },

      hovered(e, note) {
        /* show number of cents */
        if (editor$1.action != editor$1.bend) {
          note.centDisplay.opacity(1);
          display = true;
        } // make note a destination for connection


        if (editor$1.seqConnector.source && note != editor$1.seqConnector.source) {
          editor$1.seqConnector.destination = note;

          if (editor$1.action == editor$1.connector) {
            let intervalText;

            if (note.isConnectedTo(editor$1.seqConnector.source)) {
              /* No cycles allowed */
              editor$1.setCursorStyle("not-allowed");
            } else {
              /* Display the potential new interval */
              let defaultInterval = guessJIInterval(editor$1.seqConnector.source.pitch, note.pitch);
              intervalText = normAscendingInterval(defaultInterval).toString();
              let {
                x,
                y
              } = editor$1.canvas.point(e.x, e.y);
              editor$1.seqText.text(intervalText).center(x, y - 15).front().show();
            }
          } else if (editor$1.action == editor$1.measurer) {
            /* Measure the distance between the two notes */
            let text = editor$1.seqConnector.source.getIntervalTo(note).toString();
            let {
              x,
              y
            } = editor$1.canvas.point(e.x, e.y);
            editor$1.seqText.text(text).center(x, y - 15).front().show();
          }
        }
      },

      clicked(e, note) {
        if (e.metaKey || e.ctrlKey) {
          /* Ctrl-click adds or removes an object from selection */
          editor$1.toggleObjectInSelection(note);
        } else if (editor$1.tool == "ruler") {
          /* Begin measuring with the ruler */
          editor$1.clickStart = editor$1.canvas.point(e.x, e.y);
          editor$1.action = editor$1.measurer;
          editor$1.seqConnector.source = note;
          editor$1.seqConnector.stroke({
            color: 'black',
            width: 3
          }).opacity(0.6).front().show();
          editor$1.measurer(editor$1.seqConnector, e);
        } else {
          if (e.altKey) {
            /* Alt-drag = immediate copy/paste */
            editor$1.copySelection();
            editor$1.paste();
            editor$1.action = editor$1.move;
          } else {
            /* Clicking: just select a note */
            editor$1.selectObject(note);
          }

          let notes = editor$1.selection.filter(e => e instanceof SeqNote);
          editor$1.selectionForest = editor$1.getAllConnected(notes);
        }
      }

    };
    handlers["note_left_handle"] = {
      entered(e, note) {
        editor$1.setCursorStyle("col-resize");
      },

      exited(e, note) {
        if (editor$1.action != editor$1.resizeLeft) editor$1.setCursorStyle("default");
      },

      clicked(e, note) {
        /* Resize */
        editor$1.action = editor$1.resizeLeft;
        editor$1.selectObject(note);
        macroActionStart(editor$1.resizeLeft, "resizeLeft");
      }

    };
    handlers["note_right_handle"] = {
      entered(e, note) {
        if (e.shiftKey) editor$1.setCursorStyle("all-scroll");else editor$1.setCursorStyle("col-resize");
      },

      exited(e, note) {
        if (editor$1.action != editor$1.resizeRight) editor$1.setCursorStyle("default");
      },

      clicked(e, note) {
        if (e.shiftKey) {
          /* Create a gliss from this note */
          editor$1.action = editor$1.glisser;
          editor$1.seqConnector.source = note;
          let color = style.noteFill(note);
          let width = editor$1.zoomY;
          editor$1.seqConnector.stroke({
            color,
            width
          }).opacity(0.6).show();
          editor$1.glisser(editor$1.seqConnector, e);
        } else {
          /* Resize */
          editor$1.action = editor$1.resizeRight;
          editor$1.selectObject(note);
          macroActionStart(editor$1.resizeRight, "resizeRight");
        }
      }

    };
    handlers["note_attach"] = {
      entered(e, note) {
        editor$1.setCursorStyle("crosshair");
      },

      exited(e, note) {
        if (!editor$1.seqConnector.visible()) editor$1.setCursorStyle("default"); // use editor.action
        else editor$1.setCursorStyle("crosshair");
      },

      clicked(e, note) {
        /* Drag to connect to another note */
        let pt = editor$1.canvas.point(e.x, e.y);
        let path = simpleBezierPath({
          x: pt.x,
          y: note.y + 0.5 * note.height
        }, pt, 'vertical');
        editor$1.seqConnector.plot(path).stroke(style.editorLine).opacity(1).show();
        editor$1.seqConnector.source = note;
        editor$1.action = editor$1.connector;
      }

    };
    handlers["note_body"] = {
      exited(e, note) {
        editor$1.seqConnector.destination = null;
        if (editor$1.action != editor$1.bend) editor$1.setCursorStyle("default");
      },

      hovered(e, note) {
        if (e.shiftKey) editor$1.setCursorStyle("ns-resize");else editor$1.setCursorStyle("move");
      },

      clicked(e, note) {
        if (e.shiftKey) {
          /* Shift-drag = bend */
          editor$1.action = editor$1.bend;
          editor$1.selectObject(note);
          macroActionStart(editor$1.bend, "bend");
        } else {
          /* Drag = move */
          editor$1.action = editor$1.move;
          editor$1.selectObject(note);
          macroActionStart(editor$1.move, "move");
        }

        note.centDisplay.opacity(1);
      }

    };
    handlers["edge_line"] = {
      hovered(e, edge) {
        /* Show interval size */
        edge.text.opacity(1);
      },

      exited(e, edge) {
        /* Hide interval size */
        if (!userPreferences.alwaysShowEdges) edge.text.animate(100).opacity(0);
      },

      clicked(e, edge) {
        if (e.metaKey || e.ctrlKey) editor$1.toggleObjectInSelection(edge);else editor$1.selectObject(edge);
        e.stopPropagation();
      },

      doubleClicked(e, edge) {
        editor$1.typeEdit(null, edge);
      }

    };
    handlers["gliss_line"] = {
      hovered(e, gliss) {
        editor$1.setCursorStyle("ns-resize");
      },

      exited(e, gliss) {
        if (editor$1.action != editor$1.glissEasing) editor$1.setCursorStyle("auto");
      },

      clicked(e, gliss) {
        if (e.metaKey || e.ctrlKey) {
          editor$1.toggleObjectInSelection(gliss);
        } else {
          /* Drag = adjust easing */
          editor$1.selectObject(gliss);
          editor$1.action = editor$1.glissEasing;
          macroActionStart(editor$1.glissEasing, "glissEasing");
        }

        e.stopPropagation();
      }

    };

    /* for interaction with the DOM */

    const view$1 = {
      $loader: $('.loader-container'),
      $guiContainer: $('#sequencer'),
      $controls: $('#controls-container'),
      $buttonContainer: $('.file-button-container'),
      $fileName: $('.filename'),

      /* Show the loading animation then perform the callback */
      showLoader(msg, callback) {
        this.$loader.find("p").text(msg || 'loading...');
        this.$loader.fadeIn(1000);
        this.$guiContainer.fadeTo(2000, 0, callback);
      },

      /* Hide the loading animation then perform the callback */
      hideLoader(callback) {
        this.$loader.fadeOut(1000, callback);
        this.$guiContainer.fadeTo(2000, 1);
      },

      /* Message for save to local storage */
      showSaveMessage() {
        $('#save-time').text(`Saved to browser storage at ${new Date().toLocaleTimeString()}`);
        $('.save-time-container').show().delay(1000).fadeOut(2000);
      },

      /* Update the displayed filename */
      changeFileName(name) {
        this.$fileName.val(name);
        midi.fileName = `${name} [PB=${userPreferences.pitchBendWidth}]`;
        $('#midi-filename').val(midi.fileName);
      },

      /* Append a button to the controls panel */
      addButton(text, parent = this.$controls) {
        return $(document.createElement('button')).text(text).appendTo(parent);
      },

      /* Append a button with an icon to the controls panel */
      iconButton(imgSrc, callback) {
        let $button = $(document.createElement('button')).on('click', callback).appendTo(this.$buttonContainer).addClass("icon-button has-tooltip");
        $(`<img src="${imgSrc}"/>`).attr({
          height: 15,
          width: 15
        }).appendTo($button);
        return $button;
      },

      /* Append a divider to the controls panel */
      divider() {
        $('<span></span>').appendTo(this.$buttonContainer).css({
          'border-left': "2px solid black",
          'border-radius': 1,
          'opacity': 0.5,
          'padding-top': 4
        });
      },

      /* Create controls panel */
      init() {
        /* Export .spr */
        this.iconButton("assets/download_icon.png", editor$1.saveJSONFile).attr('title', 'Download .spr file');
        /* Export MIDI */

        this.iconButton("assets/midi2_icon.png", () => $('.midi-export').dialog('open')).attr('title', 'Export .mid file').css({
          paddingRight: 0,
          paddingLeft: 0
        }).children().attr('width', 30);
        /* Open */

        this.iconButton("assets/open_icon.png", ø => $filePick.trigger('click')).attr('title', 'Open .spr or .mid file');
        /* Invisible filepicker */

        let $filePick = $(document.createElement('input')).attr('type', 'file').css({
          display: 'none',
          width: 0,
          opacity: 0
        }).on('change', e => {
          editor$1.openFile(e.target.files[0]);
          $filePick.val("");
        }).appendTo(this.$controls);
        this.divider();
        /* Copy file */

        this.iconButton("assets/copy_icon.png", editor$1.copyJSONToClipboard).attr('title', 'Copy file to clipboard');
        /* Paste file */

        this.iconButton("assets/paste_icon.png", editor$1.pasteJSONFromClipboard).attr('title', 'Load file from clipboard');
        this.divider();
        /* Edit filename */

        let saveName = true;
        const $fileName = $('.filename').on('keydown', e => {
          if (e.key == 'Enter') {
            saveName = true;
            $fileName.blur();
          } else if (e.key == 'Escape') {
            saveName = false;
            $fileName.blur();
          }

          e.stopPropagation();
        }).on('keypress', e => {
          $fileName.trigger('input'), e.stopPropagation();
        }).on("blur", e => {
          /* Only save the filename if edit is confirmed */
          if (saveName) editor$1.fileName = e.target.value;else e.target.value = editor$1.fileName;
          saveName = true;
        });
        /* Retune */

        this.iconButton("assets/wand_icon.png", ø => editor$1.applyToSelection(editor$1.tuneAsPartials)).attr('title', 'Fit selection to the harmonic series');
        /* Equally Divide */

        let $eqButton = this.iconButton("assets/frac_icon.webp", ø => editor$1.applyToSelection(editor$1.equallyDivide, $divisions.val())).attr('title', 'Equally divide').children().attr({
          width: 12,
          height: 15
        });
        this.divider();
        /* Open Settings */

        this.iconButton("assets/setting_icon.png", () => $('.setting-screen').dialog('open')).attr('title', 'Settings');
        /* Show Help */

        this.iconButton("assets/help_icon.png", ø => $('.control-screen').fadeIn(500)).attr('title', 'Show controls');
        this.addButton("Clear all data").on('click', editor$1.clearAllData);
        /* Change number of equal divisions */

        const $divisions = $(document.createElement('input')).attr({
          type: 'number',
          min: 2,
          max: 20,
          value: 2
        }).on('keydown', e => {
          if (e.key == 'Enter') {
            $eqButton.trigger('click');
            e.stopPropagation();
          }
        }).appendTo(this.$controls);
        /* Change tempo */

        $(document.createTextNode('bpm:')).appendTo(this.$controls);
        const $tempo = $(document.createElement('input')).attr({
          type: 'number',
          min: 80,
          max: 200,
          value: 120
        }).on('input', ø => {
          playback.bpm = parseInt($tempo.val());
        }).appendTo(this.$controls);
        /* Zoom for editor */

        const $xRange = $(document.createElement('input')).attr({
          id: 'x-zoom',
          type: "range",
          min: 4,
          max: 32,
          step: 1
        }).css({
          position: 'absolute',
          right: 20,
          bottom: 10
        }).appendTo('body');
        $('.control-screen').on('click', ø => $('.control-screen').fadeOut(500));
        $xRange.on('input', ø => editor$1.zoom(+$xRange.val(), editor$1.zoomY));
      }

    };

    /**
     * Experimental!
     * 
     * Model the predicted sequence of JI (or other) 
     *   intervals as a hidden Markov model, with
     *   interval classes as observed variables
     *   and the sequence moving upwards in pitch
     * 
     */
    const instances = {};
    const states = new Set();
    const model = {
      // viterbi algorithm
      // input: interval classes ascending
      predictSequence(observedStates) {
        let v = [];
        let n = observedStates.length;

        for (let t = 0; t < n; t++) {
          v[t] = {};

          for (let state of states) {
            let emission = p(observedStates[t], state);
            console.log(observedStates[t] + " | " + state, emission);
            let best = {
              prob: -1,
              path: []
            };

            if (t == 0) {
              best = {
                prob: p(state),
                path: []
              };
            } else {
              for (let prevState of states) {
                let last = v[t - 1][prevState];
                let prob = last.prob * p(state, prevState);
                console.log(last.prob + " * " + state + " | " + prevState, p(state, prevState));

                if (prob > best.prob) {
                  best = {
                    prob: prob,
                    path: last.path
                  };
                }
              }
            }

            v[t][state] = {
              prob: emission * best.prob,
              path: best.path.concat(state)
            };
          }
        }

        console.log(v);
        let best = {
          prob: -1,
          path: []
        }; // recover max path

        for (let state in v[n - 1]) {
          if (v[n - 1][state].prob > best.prob) best = v[n - 1][state];
        }

        return best.path;
      },

      recordState(observed, state, prevState) {
        model.updateProbability(); // add to universal

        model.updateProbability(state); // Q[i]

        model.updateProbability(observed, state); // O[i] and Q[i])

        if (prevState) model.updateProbability(state, prevState); // Q[i] and Q[i-1]

        states.add(state.toString());
        console.log(instances);
      },

      updateProbability(event = "U", sampleSpace) {
        event = event.toString();
        let key = sampleSpace ? event + " " + sampleSpace.toString() : event;
        instances[key] = (instances[key] ?? 0) + 1;
      }

    }; // conditional or marginal probability

    function p(event, sampleSpace) {
      if (sampleSpace) {
        let jointString = event.toString() + " " + sampleSpace.toString();

        if (instances[jointString] && instances[sampleSpace.toString()]) {
          return instances[jointString] / instances[sampleSpace.toString()];
        } else {
          // hacky way to get tiny conditional scaled by marginal
          return p(event) / instances["U"];
        }
      } else {
        return instances[event.toString()] / instances["U"];
      }
    }

    /**
     * editor.js
     * 
     * The controller for the piano-roll editor. 
     * Most actions are passed through it at some point
     */

    const {
      shape,
      intersect
    } = require('svg-intersections');

    const editor$1 = {
      get width() {
        return editor$1.widthInTime * editor$1.zoomX;
      },

      get height() {
        return editor$1.numKeys * editor$1.zoomY;
      },

      set fileName(val) {
        val = val.split(".")[0];
        view$1.changeFileName(val);
        editor$1._fileName = val;
        document.title = val;
      },

      get fileName() {
        return editor$1._fileName;
      },

      get objects() {
        return editor$1.notes.concat(editor$1.glisses).concat(editor$1.edges);
      }

    };
    let pianoRollElement = document.getElementById('piano-roll');
    editor$1.notes = [];
    editor$1.edges = [];
    editor$1.glisses = [];
    editor$1.selection = [];
    editor$1.selectionForest = [];
    editor$1.action = null;
    editor$1.timeGridSize = 1;
    editor$1.zoomX = 8;
    editor$1.zoomY = 16;
    editor$1.zoomXY = 1;
    editor$1.scrollX = 0;
    editor$1.scrollY = 0;
    editor$1.widthInTime = 1024;
    editor$1.numKeys = 128;
    editor$1.selectedObject = null;
    editor$1.mousePosn = undefined;
    editor$1._fileName = undefined;
    editor$1.canvas = SVG().addTo('#piano-roll').size(editor$1.zoomX * editor$1.widthInTime, editor$1.zoomY * editor$1.numKeys).viewbox(0, 0, editor$1.width, editor$1.height);

    editor$1.scale = function (val) {
      if (val < 0.28) return;
      let width = editor$1.zoomX * editor$1.widthInTime / val;
      let height = editor$1.zoomY * editor$1.numKeys / val;
      editor$1.canvas.viewbox(editor$1.scrollX, editor$1.scrollY, width, height);
      editor$1.zoomXY = val;
      grid.scale(val);
      ruler.scale(val);
      ruler.scroll(editor$1.scrollX * val, editor$1.scrollY * val);
      keyboard.scale(val);
      keyboard.scroll(editor$1.scrollX * val, editor$1.scrollY * val);
      playback.scale(val);
      editor$1.deltaScroll(1, 1);
    };

    editor$1.scroll = function (x, y) {
      let h = $('.right-container').height();
      let w = $('.right-container').width();
      let viewHeight = (editor$1.height - y) * editor$1.zoomXY;
      let viewWidth = (editor$1.width - x) * editor$1.zoomXY;

      if (viewHeight < h) {
        editor$1.scrollY = editor$1.height - h / editor$1.zoomXY;
      } else if (viewWidth < w) {
        editor$1.scrollX = editor$1.width - w / editor$1.zoomXY;
      } else {
        editor$1.scrollX = Math.max(0, x);
        editor$1.scrollY = Math.max(0, y);
      }

      let width = editor$1.zoomX * editor$1.widthInTime / editor$1.zoomXY;
      let height = editor$1.zoomY * editor$1.numKeys / editor$1.zoomXY;
      editor$1.canvas.viewbox(editor$1.scrollX, editor$1.scrollY, width, height);
      let scrollX = editor$1.scrollX * editor$1.zoomXY;
      let scrollY = editor$1.scrollY * editor$1.zoomXY;
      keyboard.scroll(scrollX, scrollY);
      ruler.scroll(scrollX, scrollY);
      grid.scroll(scrollX, scrollY);
    };

    editor$1.deltaScroll = function (dx, dy) {
      editor$1.scroll(editor$1.scrollX + dx, editor$1.scrollY + dy);
    };

    editor$1.drag = function (e) {
      let pt = editor$1.canvas.point(e.x, e.y);
      editor$1.deltaScroll(editor$1.clickStart.x - pt.x, editor$1.clickStart.y - pt.y);
    };

    editor$1.draw = function () {
      editor$1.canvas.mousemove(e => {
        switch (editor$1.action) {
          case editor$1.move:
            editor$1.move(e, editor$1.selection, editor$1.selectionForest);
            break;

          case editor$1.bend:
          case editor$1.glissEasing:
          case editor$1.resizeLeft:
          case editor$1.resizeRight:
            editor$1.applyToSelection(editor$1.action, e);
            break;

          case editor$1.boxSelect:
            editor$1.boxSelect(editor$1.selectBox, e);
            break;

          case editor$1.connector:
          case editor$1.glisser:
          case editor$1.measurer:
            editor$1.action(editor$1.seqConnector, e);
            break;

          case editor$1.drag:
            editor$1.drag(e);
            break;
        }

        editor$1.mousePosn = {
          x: e.x,
          y: e.y
        };
      }).mousedown(e => {
        // just in case you delete an object while its tooltip is showing
        $(".ui-tooltip").fadeOut(function () {
          this.remove();
        });
        editor$1.clickStart = editor$1.canvas.point(e.x, e.y);

        if (!editor$1.action) {
          if (e.metaKey) {
            /* Create note */
            let n = editor$1.addNote(editor$1.mousePosnToPitch(e), 64, editor$1.mousePosnToTime(e), editor$1.timeGridSize);
            editor$1.action = editor$1.resizeRight;
            editor$1.selectObject(n);
          } else if (e.shiftKey) {
            editor$1.setCursorStyle("grabbing");
            editor$1.action = editor$1.drag;
          } else {
            let poly = [[editor$1.clickStart.x, editor$1.clickStart.y], [editor$1.clickStart.x, editor$1.clickStart.y], [editor$1.clickStart.x, editor$1.clickStart.y], [editor$1.clickStart.x, editor$1.clickStart.y]];
            editor$1.selectBox.plot(poly).front().show();
            editor$1.action = editor$1.boxSelect;
          }
        }
      }).mouseup(e => {
        macroActionEnd();

        if (editor$1.action == editor$1.connector) {
          if (editor$1.seqConnector.destination) {
            editor$1.connect(editor$1.seqConnector.source, editor$1.seqConnector.destination);
          }

          editor$1.seqConnector.hide();
          editor$1.seqText.hide();
          editor$1.seqConnector.source = null;
          editor$1.seqConnector.destination = null;
        } else if (editor$1.action == editor$1.glisser) {
          if (editor$1.seqConnector.destination) {
            editor$1.gliss(editor$1.seqConnector.source, editor$1.seqConnector.destination);
          }

          editor$1.seqConnector.hide();
          editor$1.seqText.hide();
          editor$1.seqConnector.source = null;
          editor$1.seqConnector.destination = null;
        } else if (editor$1.action == editor$1.measurer) {
          if (editor$1.seqConnector.destination) {
            editor$1.measure(editor$1.seqConnector.source, editor$1.seqConnector.destination);
          }

          editor$1.seqConnector.hide();
          editor$1.seqText.hide();
          editor$1.seqConnector.source = null;
          editor$1.seqConnector.destination = null;
        } else if (editor$1.action == editor$1.boxSelect) {
          // selector box
          editor$1.selectObjectsInBox(editor$1.selectBox);
          editor$1.selectBox.size(0, 0).hide();
        }

        lastY = null;
        startStarts = undefined;
        startEnds = undefined;
        startPosns = undefined;
        editor$1.setCursorStyle("default");
        editor$1.action = undefined;
      });

      editor$1.mousePosnToTime = function (e) {
        let x = editor$1.canvas.point(e.x, 0).x;
        return Math.floor(x / editor$1.zoomX / editor$1.timeGridSize) * editor$1.timeGridSize;
      };

      editor$1.mousePosnToPitch = function (e) {
        let y = editor$1.canvas.point(0, e.y).y;
        return Math.floor(editor$1.numKeys - y / editor$1.zoomY);
      };

      editor$1.quantizeTime = function (time) {
        return Math.round(time / editor$1.timeGridSize) * editor$1.timeGridSize;
      };

      editor$1.selectBox = editor$1.canvas.polygon().fill('grey').opacity(0.2).stroke('black').hide();
      editor$1.seqConnector = editor$1.canvas.path().stroke(style.editorLine).hide().fill('none').addClass("mouse-disabled");
      editor$1.seqText = editor$1.canvas.text("").font(style.editorText).hide().addClass("mouse-disabled");
    };

    editor$1.copySelection = function () {
      let notes = editor$1.selection.filter(e => e instanceof SeqNote);
      editor$1.clipboard = editor$1.compressData(notes);
    };

    editor$1.exportMIDI = function () {
      midi.writeToFile(editor$1.notes, midi.fileName);
    };

    editor$1.getEditorJSON = function () {
      let compressed = editor$1.compressData(editor$1.notes);
      return { ...compressed,
        meta: {
          fileName: editor$1.fileName,
          viewbox: {
            scrollX: editor$1.scrollX,
            scrollY: editor$1.scrollY,
            scale: editor$1.zoomXY
          }
        }
      };
    };

    editor$1.saveJSONFile = function () {
      let json = editor$1.getEditorJSON();
      let jsonString = JSON.stringify(json);
      let file = new Blob([jsonString], {
        type: 'application/x-spr'
      });
      let a = document.createElement('a');
      a.href = URL.createObjectURL(file);
      a.download = (editor$1.fileName || "untitled") + ".spr";
      a.click();
      URL.revokeObjectURL(a.href);
    };

    editor$1.openFile = function (file) {
      if (file.name.endsWith(".mid")) editor$1.openMIDIFile(file);else if (file.name.endsWith(".spr")) editor$1.openJSONFile(file);else addMessage("Filetype not recognized.", 'red');
    };

    editor$1.openMIDIFile = function (file) {
      midi.readFromFile(file).then(notes => {
        let compressed = {
          notes,
          edges: [],
          glisses: []
        };
        editor$1.clearAllData();
        editor$1.addCompressedData(compressed);
        let name = file.name.replace(/\..+$/, "");
        $('.filename').val(name);
        editor$1.fileName = name;
        addMessage(`Loaded ${file.name}.`, 'green');
      }).catch(e => {
        addMessage("Unable to parse file.", 'red');
        addMessage(e, 'red');
      });
    };

    editor$1.openJSONFile = function (file) {
      if (file) {
        view$1.showLoader(`loading ${file.name}...`, ø => {
          let reader = new FileReader();
          reader.readAsText(file);

          reader.onload = e => {
            try {
              let json = JSON.parse(reader.result);

              if (json) {
                editor$1.clearAllData();
                editor$1.addCompressedData(json);
                let name = file.name.replace(/\..+$/, "");
                $('.filename').val(name);
                editor$1.fileName = name;
                addMessage(`Loaded ${file.name}.`, 'green');
              } else throw "";
            } catch (e) {
              addMessage("Unable to parse file.", 'red');
              addMessage(e, 'red');
            }

            view$1.hideLoader();
          };
        });
      }
    };

    editor$1.copyJSONToClipboard = function () {
      let json = editor$1.getEditorJSON();
      let jsonString = JSON.stringify(json);
      navigator.clipboard.writeText(jsonString).then(ø => {
        addMessage("Copied file to clipboard.", 'green');
      });
    };

    editor$1.pasteJSONFromClipboard = mutator(function () {
      navigator.clipboard.readText().then(txt => {
        try {
          let json = JSON.parse(txt);

          if (json) {
            editor$1.clearAllData();
            editor$1.addCompressedData(json);
            addMessage("Loaded file from clipboard.", 'green');
          } else throw "";
        } catch (e) {
          addMessage("Unable to parse clipboard.", 'red');
          addMessage(e, 'red');
        }
      });
    }, "pasteJSON");
    /* Automatically stores edges between notes as well */

    editor$1.compressData = function (objs) {
      let compressed = {
        notes: [],
        edges: [],
        glisses: []
      };
      let notes = objs.filter(e => e instanceof SeqNote);
      let edges = [];
      let seen = new Set();
      let adjMat = [];
      /* Add necessary edges (edges between selected notes) */

      for (let note of notes) {
        if (!seen.has(note)) {
          for (let [neigh, edge] of note.neighbors) {
            if (seen.has(neigh)) {
              edges.push(edge);
              seen.add(neigh);
            }
          }

          seen.add(note);
        }

        adjMat.push([]);
      }

      let seenNotes = []; // returns the index of the inserted note
      // and whether or not the note was a new addition

      function addCompressedNote(note) {
        let copy = {
          pitch: note.pitch,
          velocity: note.velocity,
          start: note.start,
          duration: note.duration,
          bend: note.bend
        };
        let idx = -1;

        for (let i = 0; i < compressed.notes.length; i++) {
          if (JSON.stringify(compressed.notes[i]) == JSON.stringify(copy)) {
            idx = i;
            break;
          }
        }

        if (idx == -1) {
          idx = compressed.notes.push(copy) - 1;
          seenNotes.push(note);
        }

        return idx;
      }
      /* Add the ones that are connected */


      for (let edge of edges) {
        let id1 = addCompressedNote(edge.a);
        let id2 = addCompressedNote(edge.b);

        if (!adjMat[id1][id2]) {
          compressed.edges.push({
            id1,
            id2,
            interval: edge.interval.toString()
          });
          adjMat[id1][id2] = true;
          adjMat[id2][id1] = true;
        }
      }
      /* Add the ones that are not connected */


      notes.map(addCompressedNote); // Add necessary glisses (glisses between selected notes)

      for (let i = 0; i < seenNotes.length; i++) {
        for (let gliss of seenNotes[i].glissOutputs) {
          let j = seenNotes.indexOf(gliss.endNote);

          if (j != -1) {
            compressed.glisses.push({
              easing: gliss.easing,
              start: i,
              end: j
            });
          }
        }
      }

      return compressed;
    };

    editor$1.updateLocalStorage = function () {
      let json = editor$1.getEditorJSON();

      try {
        localStorage.setItem("editor", JSON.stringify(json));
        localStorage.setItem("prefs", JSON.stringify(userPreferences));
        return true;
      } catch {
        return false;
      }
    };

    editor$1.loadEditorFromLocalStorage = mutator(function () {
      let jsonString = localStorage.getItem("editor");
      let json = JSON.parse(jsonString);

      if (json) {
        editor$1.addCompressedData(json);
      } else {
        // load demo
        let demo = {
          "notes": [{
            "pitch": 60,
            "velocity": 64,
            "start": 96,
            "duration": 16,
            "bend": -0.8212
          }, {
            "pitch": 63,
            "velocity": 64,
            "start": 96,
            "duration": 16,
            "bend": -0.6648000000000001
          }, {
            "pitch": 68,
            "velocity": 64,
            "start": 80,
            "duration": 32,
            "bend": -0.6844
          }, {
            "pitch": 68,
            "velocity": 64,
            "start": 32,
            "duration": 32,
            "bend": -0.2738
          }, {
            "pitch": 63,
            "velocity": 64,
            "start": 48,
            "duration": 16,
            "bend": -0.2542
          }, {
            "pitch": 60,
            "velocity": 64,
            "start": 16,
            "duration": 16,
            "bend": 0
          }, {
            "pitch": 64,
            "velocity": 64,
            "start": 16,
            "duration": 32,
            "bend": -0.1369
          }, {
            "pitch": 67,
            "velocity": 64,
            "start": 16,
            "duration": 16,
            "bend": 0.019500000000000017
          }, {
            "pitch": 59,
            "velocity": 64,
            "start": 32,
            "duration": 16,
            "bend": -0.11729999999999999
          }, {
            "pitch": 60,
            "velocity": 64,
            "start": 48,
            "duration": 32,
            "bend": -0.41059999999999997
          }, {
            "pitch": 64,
            "velocity": 64,
            "start": 64,
            "duration": 32,
            "bend": -0.5475
          }, {
            "pitch": 67,
            "velocity": 64,
            "start": 64,
            "duration": 16,
            "bend": -0.3911
          }, {
            "pitch": 59,
            "velocity": 64,
            "start": 80,
            "duration": 16,
            "bend": -0.5279
          }],
          "edges": [{
            "id1": 0,
            "id2": 1,
            "interval": "6:5"
          }, {
            "id1": 1,
            "id2": 2,
            "interval": "4:3"
          }, {
            "id1": 3,
            "id2": 4,
            "interval": "4:3"
          }, {
            "id1": 5,
            "id2": 6,
            "interval": "5:4"
          }, {
            "id1": 6,
            "id2": 7,
            "interval": "6:5"
          }, {
            "id1": 8,
            "id2": 6,
            "interval": "4:3"
          }, {
            "id1": 4,
            "id2": 9,
            "interval": "6:5"
          }, {
            "id1": 10,
            "id2": 2,
            "interval": "5:4"
          }, {
            "id1": 10,
            "id2": 11,
            "interval": "6:5"
          }, {
            "id1": 10,
            "id2": 12,
            "interval": "4:3"
          }],
          "glisses": [],
          meta: {
            "viewbox": {
              "scrollX": 79,
              "scrollY": 709,
              "scale": 0.9
            }
          },
          "fileName": "springs-demo"
        };
        console.log("loaded demo data:", demo);
        editor$1.addCompressedData(demo);
        editor$1.deselectAllObjects();
        editor$1.scroll(70, 700);
        editor$1.scale(0.9);
      }

      jsonString = localStorage.getItem("prefs");
      json = JSON.parse(jsonString);

      if (json) {
        /* Load saved preferences */
        for (let pref in json) userPreferences[pref] = json[pref];
      }
    }, "load");
    editor$1.clearAllData = mutator(function () {
      editor$1.delete(null, ...editor$1.objects);
    }, "clearAllData");
    editor$1.addCompressedData = mutator(function (compressed, atTime = 0, atPitch = 0) {
      let notes = [];
      let edges = [];
      let glisses = [];
      /* Add notes from compressed version */

      for (let noteObj of compressed.notes) {
        let note = editor$1.addNote(noteObj.pitch + atPitch, noteObj.velocity, noteObj.start + atTime, noteObj.duration);
        note.bend = noteObj.bend;
        notes.push(note);
      }
      /* 
          Create edges, accessing the indices of the
          note array.
      */


      for (let edgeObj of compressed.edges) {
        let interval = parseIntervalText(edgeObj.interval);
        let edge = editor$1.connect(notes[edgeObj.id1], notes[edgeObj.id2], interval);
        edges.push(edge);
      }
      /* 
          Create glisses, accessing the indices of the
          note array.
      */


      for (let glissObj of compressed.glisses) {
        let gliss = editor$1.gliss(notes[glissObj.start], notes[glissObj.end]);
        gliss.easing = glissObj.easing || gliss.easing;
        gliss.updateGraphics(0);
        glisses.push(gliss);
      }

      let meta = compressed.meta;

      if (meta) {
        /* Navigate to saved view */
        if (meta.viewbox) {
          editor$1.scroll(meta.viewbox.scrollX, meta.viewbox.scrollY);
          editor$1.scale(meta.viewbox.scale);
        }
        /* Load filename */


        if (meta.fileName) {
          editor$1.fileName = meta.fileName;
        }
      }

      editor$1.deselectAllObjects();
      return {
        notes,
        edges,
        glisses
      };
    }, "addCompressedData");
    editor$1.transposeByOctaves = mutator(function (n, ...objs) {
      let notes = objs.filter(e => e instanceof SeqNote);

      for (let note of notes) note.transposeByOctaves(n);
    }, "transpose");
    editor$1.paste = mutator(function () {
      if (!editor$1.clipboard?.notes?.length) return;
      let p = editor$1.mousePosn;
      let time = editor$1.mousePosnToTime(p);
      let pitch = editor$1.mousePosnToPitch(p); // Mouseposn => start of leftmost note, pitch of heighest note

      let minStart = Infinity;
      let maxPitch = 0;

      for (let note of editor$1.clipboard.notes) {
        minStart = Math.min(minStart, note.start);
        maxPitch = Math.max(maxPitch, note.pitch);
      }

      let {
        notes,
        edges
      } = editor$1.addCompressedData(editor$1.clipboard, time - minStart, pitch - maxPitch);

      for (let note of notes) editor$1.toggleObjectInSelection(note);

      for (let edge of edges) editor$1.toggleObjectInSelection(edge);
    }, "paste");

    editor$1.togglePlaybackSelection = function () {
      if (playback.playing) {
        audio.pause();
        playback.pause();
      } else {
        let notes = editor$1.selection.filter(e => e instanceof SeqNote);
        if (!notes.length) return;
        let minX = Infinity;

        for (let note of notes) minX = Math.min(minX, note.x);

        playback.play(minX);
        audio.playNotes(notes);
      }
    };

    editor$1.togglePlayback = function () {
      if (playback.playing) {
        audio.pause();
        playback.pause();
      } else {
        if (editor$1.selection.length) {
          let minX = Infinity;

          for (let obj of editor$1.selection) {
            if (obj instanceof SeqNote) {
              minX = Math.min(minX, obj.x);
            }
          }

          playback.play(minX);
        } else {
          playback.play();
        }

        audio.playNotes(editor$1.notes);
      }
    };

    editor$1.glisser = function (seqConnector, e) {
      let start = {
        x: seqConnector.source.xEnd,
        y: seqConnector.source.y + editor$1.zoomY / 2
      };
      let end = editor$1.canvas.point(e.x, e.y);
      let path = simpleBezierPath(start, end, 'horizontal', userPreferences.glissEasing);
      seqConnector.plot(path).show();
    };

    editor$1.measurer = function (seqConnector, e) {
      let start = {
        x: editor$1.clickStart.x,
        y: seqConnector.source.y + seqConnector.source.height / 2
      };
      let end = editor$1.canvas.point(e.x, e.y);
      let path = rulerPath(start, end);
      seqConnector.plot(path).show();

      if (!seqConnector.destination) {
        editor$1.seqText.hide();
      }

      editor$1.setCursorStyle("context-menu");
    };

    editor$1.boxSelect = function (box, e) {
      let end = editor$1.canvas.point(e.x, e.y);
      let start = editor$1.clickStart;
      let poly = [[start.x, end.y], [end.x, end.y], [end.x, start.y], [start.x, start.y]];
      box.plot(poly);
    };

    editor$1.toggleObjectInSelection = function (obj) {
      if (editor$1.selection.includes(obj)) {
        /* Deselect already selected object */
        editor$1.selection = editor$1.selection.filter(n => n != obj);
        obj.selected = false;
      } else {
        /* Select unselected object */
        editor$1.selection.push(obj);
        obj.selected = true;
      }
    };

    editor$1.selectObjectsInBox = function (selectBox) {
      editor$1.deselectAllObjects();
      let svgElem = $('svg').get(0);
      let rect = selectBox.node.getBBox();
      let rectShape = shape("rect", rect); // change to non-transformed viewbox temporarily
      // a little hacky, but it works

      let vb = editor$1.canvas.viewbox();
      editor$1.canvas.viewbox(0, 0, editor$1.width, editor$1.height);
      let selectedNotes = editor$1.notes.filter(note => {
        return svgElem.checkIntersection(note.rect.node, rect);
      });
      let selectedEdges = editor$1.edges.filter(edge => {
        let pathArr = edge.line.array();
        let paths = pathArr.map(e => e.join(" "));
        let d = paths.join(" ");
        let intersections = intersect(rectShape, shape("path", {
          d
        }));
        return !!intersections.points.length || isInside(rect, edge.line.node.getBBox());
      });
      let selectedGlisses = editor$1.glisses.filter(gliss => {
        let pathArr = gliss.line.array();
        let paths = pathArr.map(e => e.join(" "));
        let d = paths.join(" ");
        let intersections = intersect(rectShape, shape("path", {
          d
        }));
        return !!intersections.points.length || isInside(rect, gliss.line.node.getBBox());
      });

      function isInside(a, b) {
        return !(b.x < a.x || b.y < a.y || b.x + b.width > a.x + a.width || b.y + b.height > a.y + a.height);
      }

      editor$1.canvas.viewbox(vb);
      editor$1.selection = selectedNotes.concat(selectedEdges).concat(selectedGlisses);

      for (let obj of editor$1.selection) obj.selected = true;
    };

    editor$1.deselectAllObjects = function () {
      for (let obj of editor$1.selection) obj.selected = false;

      editor$1.selection = [];
    };

    editor$1.selectAll = function () {
      editor$1.selection = editor$1.objects;

      for (let x of editor$1.selection) x.selected = true;
    };

    editor$1.selectObject = function (obj) {
      if (obj && !editor$1.selection.includes(obj)) {
        editor$1.deselectAllObjects();
        obj.selected = true;
        editor$1.selection = [obj];
      }
    };

    editor$1.play = function (_, ...objs) {
      let notes = objs.filter(e => e instanceof SeqNote);

      for (let note of notes) audio.playNote(note);
    };

    editor$1.resetBend = mutator(function (_, ...objs) {
      let notes = objs.filter(e => e instanceof SeqNote);
      /* Find minimum note of each tree in the forest */

      let minimums = new Set(notes);

      for (let note of notes) {
        for (let neighbor of note.getAllConnected()) {
          if (neighbor != note && minimums.has(neighbor)) {
            if (note.soundingPitch < neighbor.soundingPitch) {
              minimums.delete(neighbor);
            } else {
              minimums.delete(note);
            }
          }
        }
      }

      for (let m of minimums) m.propagateBend(0);
    }, "resetBend");
    editor$1.addNote = mutator(function (pitch, velocity, start, duration) {
      let note = new SeqNote(pitch, velocity, start, duration);
      editor$1.notes.push(note);
      note.seq = editor$1;
      note.draw(editor$1.canvas);
      return note;
    }, "addNote");
    editor$1.disconnect = mutator(function (note1, note2) {
      let removedEdge = note1.disconnectFrom(note2);
      if (removedEdge) editor$1.delete(null, removedEdge);
    }, "disconnect");

    editor$1.setCursorStyle = function (val) {
      pianoRollElement.style.cursor = val;
    };

    editor$1.connect = mutator(function (note1, note2, by) {
      let edge = note1.connectTo(note2, by, 0);

      if (edge) {
        editor$1.edges.push(edge);
        edge.draw(editor$1.canvas);
        editor$1.toggleObjectInSelection(edge); // update HMM

        let pitchClass = Math.round(edge.maxNote.soundingPitch - edge.minNote.soundingPitch);
        model.recordState(pitchClass, edge.interval);
      } else {
        addMessage('Cannot connect notes that are already connected.', 'orange');
      }

      return edge;
    }, "connect");
    editor$1.gliss = mutator(function (start, end) {
      let gliss;
      /* Stop from extending to a note before the start point */

      for (let {
        endNote
      } of start.glissOutputs) if (endNote == end) return end;

      if (start.xEnd < end.x) {
        gliss = new SeqGliss(start, end);
        start.glissOutputs.push(gliss);
        end.glissInputs.push(gliss);
        gliss.draw(editor$1.canvas);
        editor$1.glisses.push(gliss);
      }

      return gliss;
    }, "addGliss");

    editor$1.measure = function (start, end) {
      let interval = start.getIntervalTo(end);
      return interval;
    };

    editor$1.getAllConnected = function (notes) {
      return editor$1.getComponents(notes).flat();
    };

    editor$1.getComponents = function (notes) {
      let seen = new Set();
      let forest = [];

      for (let note of notes) {
        if (!seen.has(note)) {
          let tree = note.getAllConnected();

          for (let e of tree) seen.add(e);

          forest.push(tree);
        }
      }

      return forest;
    };

    editor$1.applyToSelection = function (fn, param) {
      fn(param, ...editor$1.selection);
    };
    /* The following functions are meant to be used with applyToSelection() */


    let startPosns;
    let lastDeltas;

    editor$1.move = function (e, objs, forest) {
      if (!forest.length) forest = objs;
      let notes = objs.filter(e => e instanceof SeqNote);
      forest = forest.filter(e => e instanceof SeqNote);
      let posn = editor$1.canvas.point(e.x, e.y);

      if (!startPosns) {
        startPosns = new Map();
        lastDeltas = {
          x: 0,
          y: 0
        };

        for (let note of forest) startPosns.set(note, {
          start: note.start,
          pitch: note.pitch
        });
      }

      let deltaX = (posn.x - editor$1.clickStart.x) / editor$1.zoomX;
      let deltaY = (posn.y - editor$1.clickStart.y) / editor$1.zoomY;

      if (lastDeltas.x != deltaX) {
        for (let note of notes) {
          let n = startPosns.get(note);
          let anustart = Math.max(n.start + deltaX, 0);
          note.startMove = editor$1.quantizeTime(anustart);
        }
      }

      if (lastDeltas.y != deltaY) {
        for (let note of forest) {
          let n = startPosns.get(note);
          let pitch = (n.pitch - deltaY).clamp(0, editor$1.numKeys);
          note.pitch = Math.round(pitch);
        }
      }

      lastDeltas = {
        x: deltaX,
        y: deltaY
      };
    }; // divide moving from note1 to note2


    editor$1.equallyDivide = mutator(function (n, ...objs) {
      if (n < 1) return;
      /* Equally divide every ascending pair (?) */

      let pairs = new Map();
      let notes = objs.filter(e => e instanceof SeqNote);
      let edges = objs.filter(e => e instanceof SeqEdge);

      let notesAscending = (a, b) => a.pitch - b.pitch;

      notes.sort(notesAscending);

      for (let i = 1; i < notes.length; i++) pairs.set(notes[i - 1], notes[i]);

      for (let e of edges) {
        let pair = [e.a, e.b].sort(notesAscending);
        pairs.set(pair[0], pair[1]);
      }

      for (let [a, b] of pairs.entries()) equallyDividePair(a, b);

      function equallyDividePair(note1, note2) {
        if (note1.soundingPitch == note2.soundingPitch) return;
        let interval = note1.getIntervalTo(note2).divide(n);
        if (interval instanceof tune.FreqRatio) interval = interval.asET();

        const incStep = (a, b, steps) => (b - a) / steps;

        let velocityStep = incStep(note1.velocity, note2.velocity, n);
        let startStep = incStep(note1.start, note2.start, n);
        let durationStep = incStep(note1.duration, note2.duration, n);
        editor$1.disconnect(note1, note2);
        let prev = note1;

        for (let i = 1; i < n; i++) {
          let pitch = Math.round(prev.asNote.noteAbove(interval).asET().pitch);
          let curr = editor$1.addNote(pitch, note1.velocity + velocityStep * i, note1.start + startStep * i, note1.duration + durationStep * i);
          editor$1.connect(prev, curr, interval);
          prev = curr;
        }

        editor$1.connect(prev, note2, interval);
      }
    }, "divide");
    editor$1.tuneAsPartials = mutator(function (_, ...objs) {
      let notes = objs.filter(e => e instanceof SeqNote);

      if (notes.length > 1) {
        notes.sort((a, b) => a.pitch - b.pitch); //// Only for HMM demo:

        let intervalClasses = Array(notes.length - 1);

        for (let i = 0; i < notes.length - 1; i++) {
          intervalClasses[i] = Math.round(notes[i + 1].soundingPitch - notes[i].soundingPitch);
        }

        console.log(intervalClasses);
        console.log(model.predictSequence(intervalClasses)); //// end

        let freqs = notes.map(a => a.asNote.asFrequency());
        let {
          partials,
          fundamental
        } = tune.AdaptiveTuning.bestFitPartials(freqs);

        for (let i = 0; i < partials.length - 1; i++) {
          let a = notes[i];
          let b = notes[i + 1];
          editor$1.connect(a, b, tune.FreqRatio(partials[i + 1], partials[i]));
        }

        let midiF0 = tune.Util.freqToET(fundamental);
        let msg = `Calculated fundamental: ${fundamental.toFixed(2)} Hz (${pitchName(midiF0, true)})`;
        addMessage(msg, 'green');
      }
    }, "tuneAsPartials");
    let startStarts;

    editor$1.resizeLeft = function (e, ...objs) {
      let notes = objs.filter(e => e instanceof SeqNote);
      e = editor$1.canvas.point(e.x, e.y);

      if (!startStarts) {
        startStarts = new Map();

        for (let note of notes) startStarts.set(note, note.start);
      }

      let deltaX = (e.x - editor$1.clickStart.x) / editor$1.zoomX;

      for (let note of notes) {
        let anustart = (startStarts.get(note) + deltaX).clamp(0, note.end - editor$1.timeGridSize);
        note.start = editor$1.quantizeTime(anustart);
      }
    };

    let startEnds;

    editor$1.resizeRight = function (e, ...objs) {
      let notes = objs.filter(e => e instanceof SeqNote);
      e = editor$1.canvas.point(e.x, e.y);

      if (!startEnds) {
        startEnds = new Map();

        for (let note of notes) startEnds.set(note, note.end);
      }

      let deltaX = (e.x - editor$1.clickStart.x) / editor$1.zoomX;

      for (let note of notes) {
        let anuend = (startEnds.get(note) + deltaX).clamp(note.start + editor$1.timeGridSize, editor$1.widthInTime);
        note.end = editor$1.quantizeTime(anuend);
      }
    };

    editor$1.delete = mutator(function (e, ...objs) {
      for (let obj of objs) obj.delete();

      editor$1.removeReferences(objs);
    }, "delete");

    editor$1.removeReferences = function (objs) {
      let removed = new Set(objs);

      let notRemoved = e => !removed.has(e);

      editor$1.edges = editor$1.edges.filter(notRemoved);
      editor$1.notes = editor$1.notes.filter(notRemoved);
      editor$1.glisses = editor$1.glisses.filter(notRemoved);
      editor$1.deselectAllObjects();
    };

    let lastBend = {};
    let lastY;
    editor$1.bend = mutator(function (e, ...objs) {
      let notes = objs.filter(e => e instanceof SeqNote);
      notes = editor$1.getComponents(notes).map(a => a[0]);
      lastY = lastY || e.y;
      let deltaY = e.y - lastY;

      for (let note of notes) {
        let newBend = Math.round(note.bend * 100 - deltaY) / 100;
        if (newBend != lastBend[note]) note.propagateBend(newBend, 0);
        lastBend[note] = newBend;
      }

      lastY = e.y;
    }, "bend");
    editor$1.glissEasing = mutator(function (e, ...objs) {
      let glisses = objs.filter(e => e instanceof SeqGliss);
      lastY = lastY || e.y;
      let deltaY = e.y - lastY;

      for (let gliss of glisses) {
        let newBend = Math.round(gliss.easing * 100 - deltaY) / 100;
        newBend = newBend.clamp(0.01, 1);

        if (newBend != lastBend[gliss]) {
          gliss.easing = newBend;
          gliss.updateGraphics(0);
        }

        lastBend[gliss] = newBend;
      }

      lastY = e.y;
    }, "glissEasing");

    editor$1.typeEdit = function (_, ...objs) {
      if (!objs.length) return;
      let edges = objs.filter(e => e instanceof SeqEdge);
      let notes = objs.filter(e => e instanceof SeqNote);
      /* Create an input box for the new interval */

      let foreign = editor$1.canvas.foreignObject(editor$1.width, editor$1.height).css('overflow', 'visible').front();
      let fadeDur = 500;
      let noteBoxes = [];
      let edgeBoxes = [];
      /* Create transparent background */

      let background = $(document.createElement('div')).css({
        position: 'relative',
        width: "100%",
        height: "100%",
        padding: 0,
        margin: 0,
        backgroundColor: 'rgba(255,255,255,0.6)'
      }).on('mousedown', ø => {
        background.fadeOut(fadeDur, ø => {
          foreign.remove();
          instructions.remove();
        });

        for (let note of noteBoxes) note.fadeOut(fadeDur);

        for (let edge of edgeBoxes) edge.fadeOut(fadeDur);

        instructions.fadeOut(fadeDur);
        $('input').fadeIn(500);
      }).on('keydown', e => {
        if (e.key == 'Enter') {
          for (let note of noteBoxes) note.trigger('submit');

          for (let edge of edgeBoxes) edge.trigger('submit');

          background.trigger('mousedown');
        } else if (e.key == 'Tab') {
          for (let note of noteBoxes) {
            if (note.is(":hidden") || !edges.length) {
              note.show().trigger('focus');
            } else note.hide();
          }

          for (let edge of edgeBoxes) {
            if (edge.is(":hidden") || !notes.length) {
              edge.show().trigger('focus');
            } else edge.hide();
          }

          e.preventDefault();
        } else if (e.key == 'Escape') {
          background.trigger('mousedown');
        }

        e.stopPropagation();
      }).hide().fadeIn(fadeDur).appendTo(foreign.node);
      const intervalText = 'Enter the new interval as a frequency ratio or equal-tempered value, e.g. "5:4" or "3.86#12" (3.86 steps in 12TET).';
      const velocityText = 'Enter the new velocity as an integer from 0-127.';
      let instructions = $(document.createElement('p')).text(intervalText).css({
        position: 'absolute',
        textAlign: 'center',
        width: "80%",
        top: 20,
        fontFamily: 'Arial',
        fontSize: 12,
        letterSpacing: 1,
        color: "green",
        left: "10%"
      }).hide().fadeIn(fadeDur).appendTo($('.seq'));

      for (let edge of edges) {
        let box = createEdgeInputBox(edge);
        background.append(box);
        box.on('input', ø => {
          let interval = parseIntervalText(box.val());
          let color = interval ? 'green' : 'red';

          for (let ed of edgeBoxes) {
            ed.css('border-color', color);
            ed.val(box.val());
            ed.attr('size', Math.max(box.val().length, 5));
          }
        }).hide().on('focus', () => instructions.text(intervalText));
        if (!notes.length) box.fadeIn(fadeDur).trigger('focus');
        edgeBoxes.push(box);
      }

      for (let note of notes) {
        let box = createNoteInputBox(note);
        background.append(box);
        box.on('input', ø => {
          let v = parseInt(box.val());
          let color = v < 128 ? 'green' : 'red';

          for (let n of noteBoxes) {
            n.css('border-color', color);
            n.val(box.val());
          }
        }).hide().on('focus', () => instructions.text(velocityText)).fadeIn(fadeDur).trigger('focus');
        box.show();
        noteBoxes.push(box);
      }

      $('input[type=range]').fadeOut(fadeDur);
    };

    function createEdgeInputBox(edge) {
      let oldText = edge.text.text();
      let input = $(document.createElement('input')).attr({
        type: 'text',
        size: oldText.length,
        placeholder: oldText
      }).css({
        left: edge.midX - 10,
        top: edge.midY - 10
      }).on('mousedown', e => {
        e.stopPropagation();
      }).on('submit', ø => {
        let interval = parseIntervalText(input.val());

        if (interval) {
          edge.interval = interval;
          edge.minNote.propagateBend(0); // update HMM

          let pitchClass = Math.round(edge.maxNote.soundingPitch - edge.minNote.soundingPitch);
          model.recordState(pitchClass, interval);
        }
      }).addClass("text-input");
      return input;
    }

    function createNoteInputBox(note) {
      let velocityInput = $(document.createElement('input')).attr({
        type: 'text',
        size: 3,
        maxlength: 3,
        placeholder: note.velocity
      }).on('mousedown', e => {
        e.stopPropagation();
      }).on('submit', ø => {
        note.velocity = parseInt(velocityInput.val()) || note.velocity;
      }).on('keypress', e => {
        if (isNaN(parseInt(e.key))) e.preventDefault();
        e.stopPropagation();
      }).addClass("text-input");
      velocityInput.css({
        left: (note.xEnd + note.x) / 2 - 15,
        top: note.y - 5
      });
      return velocityInput;
    }

    editor$1.connector = function (seqConnector, e) {
      let oldPt = editor$1.clickStart;
      let newPt = editor$1.canvas.point(e.x, e.y);
      seqConnector.plot(simpleBezierPath(oldPt, newPt, 'vertical')).front().show();

      if (!seqConnector.destination) {
        editor$1.seqText.hide();
        editor$1.setCursorStyle("crosshair");
      }
    };

    editor$1.zoom = function (xZoom, yZoom) {
      editor$1.zoomX = xZoom;
      editor$1.zoomY = yZoom;

      for (let obj of editor$1.objects) obj.updateGraphics(0);

      editor$1.canvas.size(editor$1.zoomX * editor$1.widthInTime, editor$1.zoomY * editor$1.numKeys);
      /* right now these rely on editor.zoomX/Y which is problematic--they have to go here */

      grid.zoom(xZoom, yZoom);
      ruler.zoom(xZoom, yZoom);
      keyboard.zoom(xZoom, yZoom);
      editor$1.scale(editor$1.zoomXY);
    };
    /**
     * Assign handler `type` to mouse events caught by `svgNode`.
     * `parent` is passed to the handlers to be modified by
     * the mouse event.
     * 
     * @param { SeqNote | SeqEdge | SeqGliss } parent The object to modify
     * @param { SVG.Element } svgNode 
     * @param { string } type   One of the types in handlers.js
     */


    editor$1.assignMouseHandler = function (parent, svgNode, type) {
      let handler = handlers[type];
      if (handler.entered) svgNode.mouseover(e => handler.entered(e, parent));
      if (handler.exited) svgNode.mouseout(e => handler.exited(e, parent));
      if (handler.clicked) svgNode.mousedown(e => handler.clicked(e, parent));
      if (handler.hovered) svgNode.mousemove(e => handler.hovered(e, parent));
      if (handler.doubleClicked) $(svgNode.node).on('dblclick', e => handler.doubleClicked(e, parent));
    };

    editor$1.show = function (show) {
      if (show) {
        for (let obj of editor$1.objects) obj.show();
      } else {
        for (let obj of editor$1.objects) obj.hide();
      }
    };

    $(ø => {
      try {
        init();
      } catch (e) {
        view$1.hideLoader(() => {
          addMessage("An error occured when loading. Some features may not work correctly.", "red");
          addMessage(e, "red");
          addMessage("For a copy of this error, open your browser console.", "red");
          console.error(e);
        });
      }
    });

    function init() {
      view$1.init();
      editor$1.draw();
      ruler.draw();
      grid.draw();
      keyboard.draw();
      playback.draw();
      editor$1.loadEditorFromLocalStorage();
      let octaveTransposition = 60;
      /**
       * handle computer keyboard input
       * have to use keydown instead of keypress
       * to catch cmd+number before the browser default
      */

      $(document).on("keydown", function (e) {
        if (e.metaKey) {
          /* Cmd + ... shortcuts */
          switch (e.key) {
            case 'a':
              /* Select all */
              e.preventDefault();
              editor$1.selectAll();
              break;

            case 'c':
              /* Copy */
              e.preventDefault();
              editor$1.copySelection();
              break;

            case 'v':
              /* Paste */
              e.preventDefault();
              editor$1.paste();
              break;

            case 'z':
              /* Undo/Redo */
              if (e.shiftKey) redo();else undo();
              e.preventDefault();
              break;

            case 'y':
              /* Redo */
              redo();
              e.preventDefault();
              break;

            case 'r':
              /* Reset Bend */
              e.preventDefault();
              editor$1.applyToSelection(editor$1.resetBend);
              break;

            case 's':
              /* Save to browser storage */
              e.preventDefault();
              if (editor$1.updateLocalStorage()) view$1.showSaveMessage();else addMessage('Unable to save to browser storage', 'red');
              break;

            case 'o':
              /* Open file from computer */
              $filePick.trigger('click');
              e.preventDefault();
              break;

            case 'ArrowDown':
              /* Transpose note down */
              editor$1.applyToSelection(editor$1.transposeByOctaves, -1);
              e.preventDefault();
              break;

            case 'ArrowUp':
              /* Transpose note up */
              editor$1.applyToSelection(editor$1.transposeByOctaves, 1);
              e.preventDefault();
              break;
          }

          if (+e.key) {
            /* Equally divide intervals */
            e.preventDefault();
            let n = +e.key; // check for digits

            if (n > 1) editor$1.applyToSelection(editor$1.equallyDivide, n);
          }
        } else if (e.shiftKey) {
          /* Shift + ... commands */
          if (e.key == " ") {
            /* Playback only selection */
            e.preventDefault();
            editor$1.togglePlaybackSelection();
          }
        } else if (e.key == 'Shift') {
          /* Navigate around editor */
          editor$1.setCursorStyle("grab");
        } else if (e.key == " ") {
          /* Playback from current position */
          e.preventDefault();
          editor$1.togglePlayback();
        } else if (e.key == 'Backspace') {
          /* Delete */
          editor$1.applyToSelection(editor$1.delete, e);
        } else if (e.key == 'Enter') {
          /* Edit intervals/velocities */
          editor$1.applyToSelection(editor$1.typeEdit);
        }
      }).on("keyup", e => {
        if ("awsedftgyhujkolp;".includes(e.key)) {
          /* End playback of note */
          let pitch = "awsedftgyhujkolp;".indexOf(e.key);
          keyboard.noteOff(pitch + octaveTransposition);
        } else if (e.key == 'Shift') {
          editor$1.setCursorStyle("default");
        }
      }).on("keypress", e => {
        if ("awsedftgyhujkolp;".includes(e.key)) {
          /* Playback note from computer keyboard */
          let pitch = "awsedftgyhujkolp;".indexOf(e.key);
          keyboard.noteOn(pitch + octaveTransposition);
        } else if (e.key == 'z') {
          /* Transpose computer keyboard down */
          octaveTransposition = (octaveTransposition - 12).clamp(0, 108);
        } else if (e.key == 'x') {
          /* Transpose computer keyboard up */
          octaveTransposition = (octaveTransposition + 12).clamp(0, 108);
        }
      });
      document.addEventListener('wheel', e => {
        // `wheel` event catches multi-touch on laptops too
        if (e.ctrlKey) {
          /* Zoom in and out of the editor, fixed aspect ratio */
          let dy = e.deltaY;
          editor$1.scale(editor$1.zoomXY * (1 - dy * 0.01));
          e.preventDefault();
        } else {
          /* Navigate around the editor */
          e.preventDefault();
          editor$1.deltaScroll(e.deltaX, e.deltaY);
        }
      }, {
        passive: false
      });

      window.onbeforeunload = e => {
        /* Autosave to local storage when the user closes/refreshes the page */
        editor$1.updateLocalStorage();
        e.preventDefault();
      }; // show controls for new users


      if (!localStorage.getItem("editor")) {
        $('.control-screen').delay(500).fadeIn(500);
      }
      /* Define jQueryUI tooltip (uses title attr) */


      $(document).tooltip({
        items: ".has-tooltip",
        show: {
          delay: 1000,
          effect: "fadeIn",
          duration: 300
        },

        /* Remove jQueryUI tooltip memory leak from invisible divs */
        close: function () {
          $(".ui-helper-hidden-accessible > *:not(:last)").remove();
        }
      });
      /* Settings menu */

      $('.setting-screen').dialog({
        autoOpen: false,
        width: 400,
        title: "Settings"
      });
      $('.ui-widget-overlay').on('click', () => {
        console.log("exit");
        $('.setting-screen').dialog('close');
      }); // show easing demo

      let demoCanvas = SVG().addTo('#easing-demo').size(75, 50);
      demoCanvas.rect(75, 50).fill(style.lightGrey);
      let width = 10;
      let path = demoCanvas.path(simpleBezierPath({
        x: 0,
        y: width / 2
      }, {
        x: 75,
        y: 50 - width / 2
      }, 'horizontal', userPreferences.glissEasing)).stroke({
        color: 'lightblue',
        width
      }).fill('none').opacity(0.8);
      $('#easing-range').val(userPreferences.glissEasing);
      $('#show-edges').attr('checked', userPreferences.alwaysShowEdges);
      $('#prop-bend').attr('checked', userPreferences.propagateBendAfterDeletion);
      $('#easing-range').on('input', event => {
        path.plot(simpleBezierPath({
          x: 0,
          y: width / 2
        }, {
          x: 75,
          y: 50 - width / 2
        }, 'horizontal', event.target.value));
        userPreferences.glissEasing = event.target.value;
      });
      $('#show-edges').on('change', event => {
        userPreferences.alwaysShowEdges = event.target.checked;

        if (event.target.checked) {
          for (let edge of editor$1.edges) edge.text.opacity(1);
        } else {
          for (let edge of editor$1.edges) edge.text.opacity(0);
        }
      }).trigger('change');
      $('#prop-bend').on('change', event => {
        userPreferences.propagateBendAfterDeletion = event.target.checked;
      });
      /* MIDI export menu */

      $('.midi-export').dialog({
        autoOpen: false,
        width: 400,
        title: "Export MIDI"
      });
      $('#bend-range').on('change', event => {
        let val = (Math.round(event.target.value * 10) / 10).clamp(0, 128);
        event.target.value = val;
        userPreferences.pitchBendWidth = val;
        midi.fileName = `${editor$1.fileName} [PB=${val}]`;
        $('#midi-filename').val(midi.fileName);
      }).val(userPreferences.pitchBendWidth);
      $('#midi-filename').on('change', event => {
        midi.fileName = event.target.value;
      }).on('keypress', e => e.stopPropagation());
      $("#midi-export-button").on('click', () => {
        $('.midi-export').dialog('close');
        editor$1.exportMIDI();
      });
      $("#midi-export-cancel").on('click', () => $('.midi-export').dialog('close'));
      /* contexmenus */

      $.contextMenu({
        selector: ".has-contextmenu, .has-tooltip",
        items: {
          copy: {
            name: "Copy (Ctrl+C)",
            callback: () => editor$1.copySelection()
          },
          paste: {
            name: "Paste (Ctrl+V)",
            callback: () => editor$1.paste()
          },
          sep1: "---------",
          createNote: {
            name: "Create note here (Ctrl+Drag)",
            callback: () => {
              /* Create note */
              let e = editor$1.mousePosn;
              let n = editor$1.addNote(editor$1.mousePosnToPitch(e), 64, editor$1.mousePosnToTime(e), 4 * editor$1.timeGridSize);
              editor$1.selectObject(n);
            }
          },
          resetBend: {
            name: "Reset Bend (Ctrl+R)",
            callback: () => editor$1.applyToSelection(editor$1.resetBend)
          },
          tuneAsPartials: {
            name: "Fit to harmonic series",
            callback: () => editor$1.applyToSelection(editor$1.tuneAsPartials)
          },
          sep2: "---------",
          edit: {
            name: "Edit... (Enter)",
            callback: () => editor$1.applyToSelection(editor$1.typeEdit)
          }
        }
      });
      /* Prevent editor form interpreting context menu action as a drag */

      $(document).on("contextmenu:hide", () => editor$1.canvas.fire("mouseup"));
      view$1.hideLoader();
      /* Connect to MIDI keyboard */

      midi.getInputDevices().then(inputs => {
        midi.setInputDevice(inputs[0]);
        console.log(inputs);
      });
    }

    window.prefs = userPreferences;
    window.view = view$1;
    window.editor = editor$1;

}());
