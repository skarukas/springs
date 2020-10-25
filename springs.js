(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function () {
    'use strict';

    Number.prototype.clamp = function (lo, hi) {
      return Math.max(lo, Math.min(this, hi));
    };

    function disableMouseEvents(svgElement) {
      svgElement.css({
        'pointer-events': 'none',
        'user-select': 'none'
      });
    }
    function simpleBezierPath(start, end, orientation) {
      // 0.01 is added b/c beziers can't be completely straight
      if (orientation == 'vertical') {
        let ctrlPtOffset = (end.y - start.y) / 4;
        return `M ${start.x} ${start.y} 
               C ${start.x + .01} ${start.y + ctrlPtOffset}
                 ${end.x + .01} ${end.y - ctrlPtOffset} 
                 ${end.x} ${end.y}`;
      } else {
        let ctrlPtOffset = (end.x - start.x) / 4;
        return `M ${start.x} ${start.y} 
                C ${start.x + ctrlPtOffset} ${start.y + .01}
                  ${end.x - ctrlPtOffset} ${end.y + .01} 
                  ${end.x} ${end.y}`;
      }
    }
    function normAscendingInterval(interval) {
      /* if (interval.cents() < 0) interval = interval.inverse(); */
      return interval.normalized();
    } // quick-and dirty default 5 limit intervals

    const fiveLimitScale = [tune.FreqRatio(1, 1), tune.FreqRatio(16, 15), tune.FreqRatio(9, 8), tune.FreqRatio(6, 5), tune.FreqRatio(5, 4), tune.FreqRatio(4, 3), tune.FreqRatio(45, 32), tune.FreqRatio(3, 2), tune.FreqRatio(8, 5), tune.FreqRatio(5, 3), tune.FreqRatio(16, 9), tune.FreqRatio(15, 8)];
    function guessJIInterval(lo, hi) {
      if (lo > hi) [hi, lo] = [lo, hi];
      let idx = ((hi - lo) % 12 + 12) % 12;
      let octaves = Math.floor((hi - lo) / 12);
      let ji = fiveLimitScale[idx];
      let interval = ji;
      return interval.add(tune.ETInterval.octave.multiply(octaves));
    }
    function addMessage(text, color = 'black') {
      let a = $(document.createElement('p')).text(text).addClass('warning').css({
        color
      }).appendTo($('.warn-container'));
      a.delay(1000).fadeOut(2000, () => a.remove());
    }
    function addButton(text, parent = $('#controls-container')) {
      return $(document.createElement('button')).text(text).appendTo(parent);
    }
    function pitchName(pitch, includeOctave = false) {
      const pitchNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      let result = pitchNames[tune.Util.mod(Math.round(pitch), 12)];
      if (includeOctave) result += Math.floor(pitch / 12);
      return result;
    }
    function parseIntervalText(text) {
      let ratioPattern = /^(?<num>[\d\.]+)\s?[:/]\s?(?<den>[\d\.]+)\s*$/;
      let etPattern = /^(?<num>-?[\d\.]+)\s?#\s?(?<den>[\d\.]+)\s*$/;
      let centPatttern = /^(?<cents>-?[\d\.]+)\s*c$/;

      if (ratioPattern.test(text)) {
        let g = ratioPattern.exec(text).groups;
        return tune.FreqRatio(parseFloat(g.num), parseFloat(g.den));
      } else if (etPattern.test(text)) {
        let g = etPattern.exec(text).groups;
        return tune.ETInterval(parseFloat(g.num), parseFloat(g.den));
      } else if (centPatttern.test(text)) {
        let cents = centPatttern.exec(text).groups.cents;
        return cents;
      }

      return false;
    }

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

    //const rulerSVG = SVG().addTo('#ruler').size(editor.zoomX * editor.width, rulerHeight);

    const ruler = {
      height: 20,
      scaleVal: 1,

      draw() {
        ruler.canvas = SVG().addTo('#ruler').size(editor$1.width, ruler.height).mousemove(e => {
          if (!playback.playing && e.buttons == 1) playback.position = editor$1.canvas.point(e.x, e.y).x;
        }).mousedown(e => {
          if (!playback.playing) playback.position = editor$1.canvas.point(e.x, e.y).x;
          editor$1.deselectAllObjects();
        });
        this.svg = this.canvas;
        ruler.ticks = Array(editor$1.widthInTime).fill(0).map((_, i) => {
          if (i % 16 == 0) {
            let g = ruler.canvas.group();
            g.line(i * editor$1.zoomX, 0, i * editor$1.zoomX, 20).stroke({
              width: 1
            }).stroke('black');
            let measureNumber = g.text("" + Math.ceil((i + 1) / 16)).font(style.editorText).center((i + 1) * editor$1.zoomX, 10);
            disableMouseEvents(measureNumber);
            return g;
          }
        });
        ruler.barNumbers = null;
      },

      zoom(zoomX, zoomY) {
        for (let i = 0; i < ruler.ticks.length; i++) {
          ruler.ticks[i]?.move(i * zoomX, 0);
        }
      },

      scale(val) {
        for (let i = 0; i < ruler.ticks.length; i++) {
          ruler.ticks[i]?.move(i * val * editor$1.zoomX, 0);
        }

        this.scaleVal = val;
      },

      scroll(x, y) {
        let $ruler = $('.ruler-container');
        $ruler.css('overflow', 'scroll');
        $ruler.scrollLeft(x);
        $ruler.css('overflow', 'hidden');
      }

    };

    const playback = {
      draw() {
        this.line = editor$1.canvas.line().stroke({
          width: 2,
          color: 'red'
        }).hide().front();
        this.carrot = ruler.canvas.circle(10).fill('red').y(ruler.height / 2).hide().front();
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
        playback.carrot.cx(val * this.scaleVal).show();
      },

      get position() {
        return playback._position;
      },

      get playing() {
        return playback.intervalIndex != -1;
      },

      play(startPosition = playback.position) {
        let start = Date.now();
        playback.pause();
        playback.position = startPosition || playback.position;
        let measureLengthMs = 60000 * this.beatsPerMeasure / playback.bpm;
        let measureWidth = this.ticksPerBeat * this.beatsPerMeasure * editor$1.zoomX;
        let fps = 29;
        playback.line.show().front();
        playback.carrot.show().front();
        playback.intervalIndex = setInterval(() => {
          let now = Date.now();
          let deltaMs = now - start;
          let measureCount = deltaMs / measureLengthMs;
          let posn = startPosition + measureWidth * measureCount;
          let screenPosn = Math.max(posn - 100, 0) * this.scaleVal; //$scroller.get()[0].scroll(screenPosn, $scroller.scrollTop());
          //$ruler.get()[0].scroll(screenPosn, $ruler.scrollTop());

          playback.position = posn;
          if (posn >= editor$1.width) playback.stop();
        }, 1000 / fps);
      },

      pause() {
        clearInterval(playback.intervalIndex);
        playback.intervalIndex = -1;
      },

      stop() {
        playback.pause();
        playback.position = 0;
        playback.line.hide();
        playback.carrot.hide();
      },

      MIDITimeToSeconds(ticks) {
        return 60 * ticks / (this.bpm * this.ticksPerBeat);
      }

    };
    window.start = playback.start;
    window.stop = playback.stop;
    window.pause = playback.pause;

    /* Try to remove playback as a dependency */

    const audio = {
      notes: Array(128),
      playingNotes: new Set(),

      initAudio() {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.gainNode = this.context.createGain();
        this.gainNode.gain.setValueAtTime(0.2, this.context.currentTime);
        this.gainNode.connect(this.context.destination); // connect to output
      },

      get now() {
        return this.context.currentTime;
      },

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
        this.playingNotes.add([a, oscGain]); //if (note.glissInputs.length) return //don't need to play

        for (let gliss of note.glissOutputs) {
          this.playGliss(gliss, end, playback.MIDITimeToSeconds(gliss.endNote.start));
        }
      },

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
        let oscGain = this.context.createGain();
        a.frequency.value = gliss.startNote.frequency;
        a.frequency.linearRampToValueAtTime(gliss.endNote.frequency, this.now + relativeEnd);
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

      playNotes(notes) {
        for (let note of notes) {
          this.playNote(note, playback.MIDITimeToSeconds(note.start), playback.MIDITimeToSeconds(note.end));
        }
      },

      noteOn(pitch) {
        if (this.notes[pitch]) return;
        if (!this.context) this.initAudio();
        let a = this.context.createOscillator();
        let oscGain = this.context.createGain();
        a.frequency.value = tune.Util.ETToFreq(pitch);
        a.type = 'sawtooth';
        a.start();
        oscGain.gain.value = 0.4;
        a.connect(oscGain).connect(this.gainNode);
        this.notes[pitch] = a;
      },

      noteOff(pitch) {
        this.notes[pitch]?.stop(0);
        this.notes[pitch] = undefined;
      }

    };

    const grid = {
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

        ctx.fill(); // draw vertical lines (rects)

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

      zoom(xZoom, yZoom) {
        this.$canvas.width(editor$1.width);
        this.$canvas.height(editor$1.height);
      },

      scale(val) {
        this.$canvas.css('zoom', val);
      },

      scroll(x, y) {
        let top = -(y - this.$div.offset().top);
        let left = -(x - style.keyDisplay.width);
        this.$canvas.offset({
          top: top / editor$1.zoomXY,
          left: left / editor$1.zoomXY
        });
      },

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

      highlightRectangles: []
    };

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
          }).x(this.textX).y(this.textY);
          disableMouseEvents(this.text);
        }
      }

      noteOn() {
        this.keyRect.fill(this.displayOptions.clickColor);
        grid.highlightPitch(this.pitch, true, this.displayOptions);
        audio.noteOn(this.pitch);
      }

      noteOff() {
        this.keyRect.fill(this.displayOptions.color);
        grid.highlightPitch(this.pitch, false, this.displayOptions);
        audio.noteOff(this.pitch);
      }

    }

    const keyboard = {
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

      noteOn(pitch) {
        this.keys[pitch].noteOn();
      },

      noteOff(pitch) {
        this.keys[pitch].noteOff();
      },

      keys: [],

      get width() {
        return style.keyDisplay.width;
      },

      scroll(x, y) {
        let $keyboard = $('.piano-container');
        $keyboard.css('overflow', 'scroll');
        $keyboard.scrollTop(y);
        $keyboard.css('overflow', 'hidden');
      }

    };
    PianoKey.keyYVals = [1, 1.1, 2, 2.4, 3, 4, 4.1, 5, 5.3, 6, 6.5, 7];

    class SeqEdge {
      constructor(a, b, interval) {
        this.a = a;
        this.b = b;
        this._interval = interval;
      }

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

      get midX() {
        return (this.x1 + this.x2) / 2;
      }

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
        editor$1.assignMouseHandler(this, this.line, "edge_line");
        let intervalLabel = normAscendingInterval(this.interval).toString();
        this.text = canvas.text(intervalLabel).font(style.editorText).center(this.midX, this.midY).opacity(0);
        disableMouseEvents(this.text);
      }

      hide() {
        this.text.hide();
        this.line.hide();
      }

      show() {
        this.line.show();
        this.text.show();
      }

      get minNote() {
        return this.a.pitch < this.b.pitch ? this.a : this.b;
      }

      get maxNote() {
        return this.a.pitch < this.b.pitch ? this.b : this.a;
      }

      remove() {
        this.line.remove();
        this.text.remove();

        if (SeqNote.graph.has(this.a) && SeqNote.graph.has(this.b)) {
          SeqNote.graph.get(this.a).delete(this.b);
          SeqNote.graph.get(this.b).delete(this.a);
          /* Retune the higher note */

          this.maxNote.propagateBend(0, 300, [this.minNote]);
        }
      }

      get interval() {
        return this._interval;
      }

      set interval(val) {
        /* Ensure the intervals go in the same direction */
        if (this._interval.cents() * val.cents() > 0) {
          this._interval = val;
        } else {
          this._interval = val.inverse();
        }

        this.minNote.propagateBend(0);
        this.updateGraphics();
      } // return the amount the top note will be bent


      getBend() {
        let etDistance = tune.ETInterval(this.maxNote.pitch - this.minNote.pitch);
        return this.interval.subtract(etDistance).cents() / 100;
      }

    }

    // and SeqEdge

    class SeqNote {
      constructor(pitch, velocity, start, duration) {
        this.pitch = pitch;
        this._velocity = velocity;
        this.start = start;
        this.end = start + duration;
        this.glissInputs = [];
        this.glissOutputs = [];
        this._bend = 0;
        SeqNote.graph.set(this, new Map());
      }

      set velocity(val) {
        this._velocity = val.clamp(0, 128);
        this.shadowRect.fill(style.noteShadowFill(this));
        this.rect.fill(style.noteFill(this));
      }

      get velocity() {
        return this._velocity;
      }

      get frequency() {
        return tune.Util.ETToFreq(this.soundingPitch);
      }

      get duration() {
        return this.end - this.start;
      }

      set bend(val) {
        this._bend = val;
      }

      get bend() {
        return this._bend;
      }

      get soundingPitch() {
        return this.bend + this.pitch;
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

      redrawPosition() {
        this.rect.move(this.x, this.y);
        this.shadowRect.move(this.x, this.yET);
        this.handle.center(this.handleX, this.handleY);
        this.indicator.center(this.handleX - this.height * 0.8, this.handleY);
        this.centDisplay.x(this.handleX - this.height - this.centDisplay.length() - 5).cy(this.handleY);
        this.resizeRight.move(this.xEnd - 4, this.y);
      }

      redrawInputs(animateDuration = 300) {
        for (let g of this.glissInputs) g.redrawPosition();

        for (let [_, edge] of this.neighbors) edge.updateGraphics(animateDuration);
      }

      redrawOutputs() {
        for (let g of this.glissOutputs) g.redrawPosition();
      }

      updateGraphics(animateDuration = 300) {
        //console.log("updateGraphics called on",this.pitch)
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

      hide() {
        this.rect.hide();
        this.handle.hide();
        this.indicator.hide();
      }

      show() {
        this.rect.show();
        this.handle.show();
        this.indicator.show();
      }

      transposeByOctaves(n) {
        this.pitch += 12 * n;

        for (let [note, edge] of this.neighbors) {
          edge.interval = edge.interval.inverse().add(tune.FreqRatio(2, 1));
          edge.updateGraphics(0);
        }

        this.redrawPosition(0);
        this.redrawInputs(0);
        this.redrawOutputs(0);
      }

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
        this.centDisplay.x(this.handleX - this.height - this.centDisplay.length() - 5).cy(this.handleY);
        disableMouseEvents(this.centDisplay);
        this.resizeRight = canvas.rect(4, this.height).move(this.xEnd - 4, this.y).radius(2).stroke('black').opacity(0.3).fill('black');
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

      get bendText() {
        let str = Math.round(this.bend * 100 * 100) / 100 + "c";
        if (this.bend >= 0) str = "+" + str;
        return str;
      }

      getIntervalTo(other) {
        return this.BFS({
          initialStore: [tune.ETInterval(0)],
          predicate: (edge, child) => child == other,
          combine: (edge, child, interval) => {
            if (edge.maxNote == child) return [interval.add(edge.interval)];else return [interval.add(edge.interval.inverse())];
          },
          successVal: (edge, child, interval) => {
            if (edge.maxNote == child) return interval.add(edge.interval);else return interval.add(edge.interval.inverse());
          },
          failureVal: () => tune.ETInterval(other.soundingPitch - this.soundingPitch)
        });
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

      connectTo(other, by = guessJIInterval(this.pitch, other.pitch), animateDuration = 300) {
        if (this.isConnectedTo(other)) return null;
        let edge = new SeqEdge(this, other, by);
        let oldNeighbors = [...SeqNote.graph.get(this).keys()];
        SeqNote.graph.get(this).set(other, edge);
        SeqNote.graph.get(other).set(this, edge);
        this.propagateBend(this.bend, animateDuration, oldNeighbors);
        return edge;
      }

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

      isConnectedTo(other) {
        return this.BFS({
          predicate: (edge, child) => child == other,
          successVal: ø => true,
          failureVal: ø => false
        });
      }

      getAllConnected() {
        return this.BFS({
          predicate: () => false,
          returnAll: true
        });
      } // offset all children by this bend amount


      propagateBend(bend, animateDuration = 300, awayFrom = []) {
        this.bend = bend;
        this.updateGraphics(animateDuration);
        this.redrawInputs(animateDuration);
        this.redrawOutputs();
        this.BFS({
          noVisit: awayFrom,
          initialStore: [bend],
          predicate: () => false,
          combine: (edge, child, bend) => {
            let edgeBend = edge.maxNote == child ? edge.getBend() : -edge.getBend();
            let newBend = edgeBend + bend;
            child.bend = newBend;
            child.redrawInputs(animateDuration);
            child.redrawOutputs();
            child.updateGraphics(animateDuration);
            return [newBend];
          }
        });
      }

      remove() {
        this.bend = 0;
        this.group.remove();
        this.shadowRect.remove();

        for (let [_, edge] of this.neighbors) {
          edge.remove();
          editor$1.delete(null, edge);
        }

        for (let map of SeqNote.graph.values()) map.delete(this);

        SeqNote.graph.delete(this);
      }

    }
    SeqNote.graph = new Map();

    class SeqGliss {
      constructor(start, end) {
        this.startNote = start;
        this.endNote = end;
      }

      set selected(val) {
        this._selected = val;
        let strokeColor = val ? style.strokeSelected : this.gradient;
        this.line.stroke(strokeColor);
      }

      get selected() {
        return this._selected;
      }

      remove() {
        this.line.remove();
        this.startNote.glissOutputs = this.startNote.glissOutputs.filter(e => e != this);
        this.endNote.glissInputs = this.endNote.glissInputs.filter(e => e != this);
      }

      draw(canvas) {
        this.canvas = canvas;
        let color, width;

        if (this.startNote.xEnd >= this.endNote.x) {
          /* color = 'red'
          width = 2 */
          throw "BADDADDDADA";
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
        }, 'horizontal')).stroke({
          color,
          width
        }).fill('none').opacity(0.6).insertAfter(this.startNote.rect).insertAfter(this.endNote.rect);
        editor$1.assignMouseHandler(this, this.line, "gliss_line");
      }

      updateGraphics() {
        this.gradient.update(add => {
          add.stop(0, style.noteFill(this.startNote));
          add.stop(1, style.noteFill(this.endNote));
        });
        this.redrawPosition();
      }

      redrawPosition() {
        this.line.plot(simpleBezierPath({
          x: this.startNote.xEnd,
          y: this.startNote.y + editor$1.zoomY / 2
        }, {
          x: this.endNote.x,
          y: this.endNote.y + editor$1.zoomY / 2
        }, 'horizontal'));
      }

    }

    const JZZ = require('jzz');

    require('jzz-midi-smf')(JZZ);

    const MIDI = JZZ.MIDI;
    const midi = {
      writeToFile(notes, fileName) {

        let smf = MIDI.SMF(); // start with only one track

        smf.push(MIDI.SMF.MTrk());
        this.createMIDITracks(notes, smf); // Create and download .mid file

        let str = smf.dump();
        let b64 = JZZ.lib.toBase64(str);
        var uri = 'data:audio/midi;base64,' + b64;
        let a = document.createElement('a');
        a.href = uri;
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
        notes = notes.sort((a, b) => a.start - b.start); // keep track of the notes in each track

        let notesInTracks = [[]];

        outer: for (let note of notes) {
          for (let i = 0; i < notesInTracks.length; i++) {
            let tkArr = notesInTracks[i];

            if (!tkArr.length || tkArr[tkArr.length - 1].end + releaseTime <= note.start) {
              this.addNoteToTrack(note, smf[i]);
              tkArr.push(note);
              continue outer;
            }
          } // Have to add a new track if loop is unsuccessful


          let track = MIDI.SMF.MTrk();
          smf.push(track);
          this.addNoteToTrack(note, track);
          notesInTracks.push([note]);
        }
      },

      addNoteToTrack(note, track) {
        let tick = note.start * 32;
        let endTick = note.end * 32;
        let pitch = pitchName(note.pitch, true);
        let velocity = note.velocity;
        let bend = scale14bits(note.bend / 2);
        track.add(tick, MIDI.noteOn(0, pitch, velocity)).add(tick, MIDI.pitchBend(0, bend)).add(endTick, MIDI.noteOff(0, pitch));
      }

    };

    const scale14bits = zeroOne => {
      if (zeroOne <= 0) {
        return Math.floor(16384 * (zeroOne + 1) / 2);
      }

      return Math.floor(16383 * (zeroOne + 1) / 2);
    };

    const handlers = {};
    let display = false; // this is problematic

    handlers["note_group"] = {
      exited(e, note) {
        if (display && editor$1.action != editor$1.bend) {
          note.centDisplay.opacity(0);
          display = false;
        }
      },

      hovered(e, note) {
        if (editor$1.action != editor$1.bend) {
          note.centDisplay.opacity(1);
          display = true;
        } // added from attach handler


        if (editor$1.seqConnector.source && note != editor$1.seqConnector.source) {
          editor$1.seqConnector.destination = note;

          if (editor$1.action == editor$1.connector) {
            let intervalText;

            if (note.isConnectedTo(editor$1.seqConnector.source)) {
              editor$1.setCursorStyle("not-allowed");
            } else {
              let defaultInterval = guessJIInterval(editor$1.seqConnector.source.pitch, note.pitch);
              intervalText = normAscendingInterval(defaultInterval).toString();
              let {
                x,
                y
              } = editor$1.canvas.point(e.x, e.y);
              editor$1.seqText.text(intervalText).center(x, y - 15).front().show();
            }
          }
        }
      },

      clicked(e, note) {
        if (e.metaKey || e.ctrlKey) {
          editor$1.toggleObjectInSelection(note);
        } else {
          if (e.altKey) {
            editor$1.copySelection();
            editor$1.paste();
            editor$1.action = editor$1.move;
          } else {
            console.log("note clik");
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
        editor$1.action = editor$1.resizeLeft;
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
          editor$1.action = editor$1.resizeRight;
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
        let pt = editor$1.canvas.point(e.x, e.y); //let pt = mousePosn(e);
        //seqConnector.plot(pt.x, this.y + 0.5*this.height, pt.x, pt.y).show().front();

        let path = simpleBezierPath({
          x: pt.x,
          y: note.y + 0.5 * note.height
        }, pt, 'vertical');
        editor$1.seqConnector.plot(path).stroke(style.editorLine).opacity(1).show();
        /* .front(); */

        editor$1.seqConnector.source = note;
        editor$1.action = editor$1.connector;
      }

    };
    handlers["note_body"] = {
      exited(e, note) {
        editor$1.seqConnector.destination = null;
        if (editor$1.action != editor$1.bend) editor$1.setCursorStyle("default");
      },

      clicked(e, note) {
        if (e.shiftKey) {
          editor$1.action = editor$1.bend;
        } else {
          editor$1.action = editor$1.move;
        }

        note.centDisplay.opacity(1);
      },

      hovered(e, note) {
        if (e.shiftKey) editor$1.setCursorStyle("ns-resize");else editor$1.setCursorStyle("move"); //editor.setConnectorDestination(e, note);
      }

    };
    handlers["edge_line"] = {
      clicked(e, edge) {
        if (e.metaKey || e.ctrlKey) editor$1.toggleObjectInSelection(edge);else editor$1.selectObject(edge);
        e.stopPropagation();
      },

      hovered(e, edge) {
        edge.text.opacity(1);
      },

      exited(e, edge) {
        edge.text.animate(100).opacity(0);
      },

      doubleClick(e, edge) {
        editor$1.typeEdit(null, edge);
      }

    };
    handlers["gliss_line"] = {
      clicked(e, gliss) {
        if (e.metaKey || e.ctrlKey) editor$1.toggleObjectInSelection(gliss);else editor$1.selectObject(gliss);
        e.stopPropagation();
      }

    };

    const editor$1 = {
      get width() {
        return editor$1.widthInTime * editor$1.zoomX;
      },

      get height() {
        return editor$1.numKeys * editor$1.zoomY;
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
    editor$1.fileName = undefined;
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
          case editor$1.resizeLeft:
          case editor$1.resizeRight:
            editor$1.applyToSelection(editor$1.action, e);
            break;

          case editor$1.boxSelect:
            editor$1.boxSelect(editor$1.selectBox, e);
            break;

          case editor$1.connector:
          case editor$1.glisser:
            editor$1.action(editor$1.seqConnector, e);
            break;

          case editor$1.drag:
            editor$1.drag(e);
            break;
        }

        editor$1.mousePosn = {
          x: e.x,
          y: e.y
        }; //if (!playback.playing && e.buttons == 1) playback.position = e.offsetX;
      }).mousedown(e => {
        //editor.clickStart = mousePosn(e);
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
        } else if (editor$1.action == editor$1.boxSelect) {
          // selector box
          editor$1.selectObjectsInBox(editor$1.selectBox);
          editor$1.selectBox.size(0, 0).hide();
        } //seqBender = null;
        //seqMover = null;


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
      editor$1.seqConnector = editor$1.canvas.path().stroke(style.editorLine).hide().fill('none');
      disableMouseEvents(editor$1.seqConnector);
      editor$1.seqText = editor$1.canvas.text("").font(style.editorText).hide(); // pass through mouse events

      disableMouseEvents(editor$1.seqText);
    };

    editor$1.copySelection = function () {
      let notes = editor$1.selection.filter(e => e instanceof SeqNote);
      editor$1.clipboard = editor$1.compressData(notes);
    };

    editor$1.exportMIDI = function () {
      midi.writeToFile(editor$1.notes, editor$1.fileName);
    };

    editor$1.getEditorJSON = function () {
      let compressed = editor$1.compressData(editor$1.notes);
      return { ...compressed,
        viewbox: {
          scrollX: editor$1.scrollX,
          scrollY: editor$1.scrollY,
          scale: editor$1.zoomXY
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

    editor$1.openJSONFile = function (file) {
      if (file) {
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
          } catch {
            addMessage("Unable to parse file.", 'red');
          }
        };
      }
    };

    editor$1.copyJSONToClipboard = function () {
      let json = editor$1.getEditorJSON();
      let jsonString = JSON.stringify(json);
      navigator.clipboard.writeText(jsonString).then(ø => {
        addMessage("Copied file to clipboard.", 'green');
      });
    };

    editor$1.pasteJSONFromClipboard = function () {
      navigator.clipboard.readText().then(txt => {
        try {
          let json = JSON.parse(txt);

          if (json) {
            editor$1.clearAllData();
            editor$1.addCompressedData(json);
          } else throw "";
        } catch {
          addMessage("Unable to parse clipboard.", 'red');
        }
      });
    };
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
      } // Add necessary glisses (glisses between selected notes)


      for (let i = 0; i < notes.length; i++) {
        for (let gliss of notes[i].glissOutputs) {
          let j = notes.indexOf(gliss.endNote);

          if (j != -1) {
            compressed.glisses.push({
              start: i,
              end: j
            });
          }
        }
      } // returns the index of the inserted note
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

        if (idx == -1) return compressed.notes.push(copy) - 1;else return idx;
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


      notes.map(addCompressedNote);
      return compressed;
    };

    editor$1.updateLocalStorage = function () {
      let json = editor$1.getEditorJSON();
      localStorage.setItem("editor", JSON.stringify(json));
    };

    editor$1.loadEditorFromLocalStorage = function () {
      let jsonString = localStorage.getItem("editor");
      let json = JSON.parse(jsonString);
      if (json) editor$1.addCompressedData(json);
    };

    editor$1.clearAllData = function () {
      editor$1.delete(null, ...editor$1.notes);
    };

    editor$1.addCompressedData = function (compressed, offsetTime = 0, offsetPitch = 0) {
      let notes = [];
      let edges = [];
      let glisses = [];
      /* Add notes from compressed version */

      for (let noteObj of compressed.notes) {
        let note = editor$1.addNote(noteObj.pitch + offsetPitch, noteObj.velocity, noteObj.start + offsetTime, noteObj.duration);
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
        glisses.push(gliss);
      }
      /* Navigate to saved view */


      let vb = compressed.viewbox;

      if (vb) {
        editor$1.scroll(vb.scrollX, vb.scrollY);
        editor$1.scale(vb.scale);
      }

      editor$1.deselectAllObjects();
      return {
        notes,
        edges,
        glisses
      };
    };

    editor$1.transposeByOctaves = function (n, ...objs) {
      let notes = objs.filter(e => e instanceof SeqNote);

      for (let note of notes) note.transposeByOctaves(n);
    };

    editor$1.paste = function () {
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
    };

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
        playback.pause(); //playback.stop();
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
      let path = simpleBezierPath(start, end, 'horizontal');
      seqConnector.plot(path).show();
    };

    editor$1.boxSelect = function (box, e) {
      //let end = mousePosn(e);
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
      let rect = selectBox.node.getBBox(); // change to non-transformed viewbox temporarily
      // a little hacky, but it works

      let vb = editor$1.canvas.viewbox();
      editor$1.canvas.viewbox(0, 0, editor$1.width, editor$1.height);
      let selectedNotes = editor$1.notes.filter(note => {
        return svgElem.checkIntersection(note.rect.node, rect);
      });
      /* Right now it uses the bounding box (rect) which is not ideal */

      let selectedEdges = editor$1.edges.filter(edge => {
        return svgElem.checkIntersection(edge.line.node, rect);
      });
      let selectedGlisses = editor$1.glisses.filter(gliss => {
        return svgElem.checkIntersection(gliss.line.node, rect);
      });
      editor$1.canvas.viewbox(vb);
      editor$1.selection = selectedNotes.concat(selectedEdges).concat(selectedGlisses);

      for (let obj of editor$1.selection) obj.selected = true;
    };

    editor$1.deselectAllObjects = function () {
      for (let obj of editor$1.selection) obj.selected = false;

      editor$1.selection = [];
    };

    editor$1.selectAll = function () {
      editor$1.selection = editor$1.notes.concat(editor$1.edges).concat(editor$1.glisses);

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

    editor$1.resetBend = function (_, ...objs) {
      let notes = objs.filter(e => e instanceof SeqNote);
      /* Find minimum note of each tree in the forest */

      let minimums = new Set(notes);

      for (let note of notes) {
        //minimums.add(note)
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
    };

    editor$1.addNote = function (pitch, velocity, start, duration) {
      let note = new SeqNote(pitch, velocity, start, duration);
      editor$1.notes.push(note);
      note.seq = editor$1;
      note.draw(editor$1.canvas);
      return note;
    };

    editor$1.disconnect = function (note1, note2) {
      let removedEdge = note1.disconnectFrom(note2);
      if (removedEdge) editor$1.delete(null, removedEdge);
    };

    editor$1.setCursorStyle = function (val) {
      pianoRollElement.style.cursor = val;
    };

    editor$1.connect = function (note1, note2, by) {
      let edge = note1.connectTo(note2, by, 0);

      if (edge) {
        editor$1.edges.push(edge);
        edge.draw(editor$1.canvas);
        editor$1.toggleObjectInSelection(edge);
      } else {
        addMessage('Cannot connect notes that are already connected.', 'orange');
      }

      return edge;
    };

    editor$1.gliss = function (start, end) {
      let gliss;
      /* Stop from extending to a note before the start point */

      if (start.xEnd < end.x) {
        gliss = new SeqGliss(start, end);
        start.glissOutputs.push(gliss);
        end.glissInputs.push(gliss);
        gliss.draw(editor$1.canvas);
        editor$1.glisses.push(gliss);
      }

      return gliss;
    };

    editor$1.getAllConnected = function (notes) {
      let forest = new Set();

      for (let note of notes) {
        if (!forest.has(note)) {
          let tree = note.getAllConnected();

          for (let e of tree) forest.add(e);
        }
      }

      return [...forest];
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
          let duration = note.duration;
          let anustart = Math.max(n.start + deltaX, 0);
          note.start = editor$1.quantizeTime(anustart);
          note.end = note.start + duration;
          note.redrawPosition(0);
          note.redrawInputs(0);
          note.redrawOutputs();
        }
      }

      if (lastDeltas.y != deltaY) {
        for (let note of forest) {
          let n = startPosns.get(note);
          let pitch = (n.pitch - deltaY).clamp(0, editor$1.numKeys);
          note.pitch = Math.round(pitch);
          note.redrawPosition(0);
          note.redrawInputs(0);
          note.redrawOutputs();
        }
      }

      lastDeltas = {
        x: deltaX,
        y: deltaY
      };
    }; // divide moving from note1 to note2


    editor$1.equallyDivide = function (n, ...objs) {
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
    };

    editor$1.tuneAsPartials = function (_, ...objs) {
      let notes = objs.filter(e => e instanceof SeqNote);

      if (notes.length > 1) {
        notes.sort((a, b) => a.pitch - b.pitch);
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
    };

    let startStarts;

    editor$1.resizeLeft = function (e, ...objs) {
      let notes = objs.filter(e => e instanceof SeqNote); //e = mousePosn(e)

      e = editor$1.canvas.point(e.x, e.y);

      if (!startStarts) {
        startStarts = new Map();

        for (let note of notes) startStarts.set(note, note.start);
      }

      let deltaX = (e.x - editor$1.clickStart.x) / editor$1.zoomX;

      for (let note of notes) {
        let anustart = (startStarts.get(note) + deltaX).clamp(0, note.end - editor$1.timeGridSize);
        note.start = editor$1.quantizeTime(anustart);
        note.updateGraphics(0);
        note.redrawInputs(0);
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
        note.updateGraphics(0);
        note.redrawOutputs();
      }
    };

    editor$1.delete = function (e, ...objs) {
      let removed = new Set(objs);

      for (let obj of objs) obj.remove();

      let notRemoved = e => !removed.has(e);

      editor$1.edges = editor$1.edges.filter(notRemoved);
      editor$1.notes = editor$1.notes.filter(notRemoved);
      editor$1.deselectAllObjects();
    };

    let lastBend = {};
    let lastY;

    editor$1.bend = function (e, ...objs) {
      let notes = objs.filter(e => e instanceof SeqNote);
      lastY = lastY || e.y;
      let deltaY = e.y - lastY;

      for (let note of notes) {
        let newBend = Math.round(note.bend * 100 - deltaY) / 100;
        if (newBend != lastBend[note]) note.propagateBend(newBend, 0);
        lastBend[note] = newBend;
      }

      lastY = e.y;
    };

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
      let instructions = $(document.createElement('p')).text('Enter interval as cents, equal-tempered value, or frequency ratio, e.g. "386c", "4#12", or "5:4".').css({
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
          //box.attr('size', Math.max(box.val().length, 5))
          let interval = parseIntervalText(box.val());
          let color = interval ? 'green' : 'red';

          for (let ed of edgeBoxes) {
            ed.css('border-color', color);
            ed.val(box.val());
            ed.attr('size', Math.max(box.val().length, 5));
          }
        }).hide();
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
        }).hide().fadeIn(fadeDur).trigger('focus');
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
        if (interval) edge.interval = interval;
      }).addClass("text-input");
      return input;
    }

    function createNoteInputBox(note) {
      let velocityInput = $(document.createElement('input')).attr({
        type: 'text',
        size: 3,
        maxlength: 3,
        placeholder: note.velocity
      })
      /* .on('input', ø => {
        if (velocityInput.val()) velocityInput.css('border-color', 'green')
        else velocityInput.css('border-color', 'red')
      }) */
      .on('mousedown', e => {
        e.stopPropagation();
      }).on('submit', ø => {
        note.velocity = parseInt(velocityInput.val()) || note.velocity;
        note.updateGraphics();
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
      let newPt = editor$1.canvas.point(e.x, e.y); //let newPt = mousePosn(e);

      seqConnector.plot(simpleBezierPath(oldPt, newPt, 'vertical')).front().show();

      if (!seqConnector.destination) {
        editor$1.seqText.hide();
        editor$1.setCursorStyle("crosshair");
      }
    };

    editor$1.zoom = function (xZoom, yZoom) {
      //throw "Zoom problems!!! :(";
      editor$1.zoomX = xZoom;
      editor$1.zoomY = yZoom; //seqBackground.size(editor.width * editor.zoomX, numKeys * editor.zoomY);

      for (let note of editor$1.notes) note.updateGraphics(0);

      for (let edge of editor$1.edges) edge.updateGraphics(0);

      for (let gliss of editor$1.glisses) gliss.updateGraphics(0);

      editor$1.canvas.size(editor$1.zoomX * editor$1.widthInTime, editor$1.zoomY * editor$1.numKeys); //return

      /* right now these rely on editor.zoomX/Y which is problematic--they have to go here */

      grid.zoom(xZoom, yZoom);
      ruler.zoom(xZoom, yZoom);
      keyboard.zoom(xZoom, yZoom);
      editor$1.scale(editor$1.zoomXY);
    };

    editor$1.assignMouseHandler = function (parent, svgNode, type) {
      let handler = handlers[type];
      if (handler.entered) svgNode.mouseover(e => handler.entered(e, parent));
      if (handler.exited) svgNode.mouseout(e => handler.exited(e, parent));
      if (handler.clicked) svgNode.mousedown(e => handler.clicked(e, parent));
      if (handler.hovered) svgNode.mousemove(e => handler.hovered(e, parent));
      if (handler.doubleClick) $(svgNode.node).on('dblclick', e => handler.doubleClick(e, parent));
    };

    editor$1.show = function (show) {
      if (show) {
        for (let note of editor$1.notes) note.show();

        for (let edge of editor$1.edges) edge.show();
      } else {
        for (let note of editor$1.notes) note.hide();

        for (let edge of editor$1.edges) edge.hide();
      }
    }; // for debugging purposes


    window.editor = editor$1;

    $(ø => {
      $(document.createElement('div')).css({
        position: 'absolute',
        bottom: 20,
        right: 20
      }).addClass("warn-container").appendTo('body');
      const $controls = $('#controls-container');
      iconButton("assets/download_icon.png", editor$1.saveJSONFile).attr('title', 'Download .spr file');
      iconButton("assets/midi2_icon.png", editor$1.exportMIDI).attr('title', 'Export .mid file').css({
        paddingRight: 0,
        paddingLeft: 0
      }).children().attr('width', 30);
      iconButton("assets/open_icon.png", ø => $filePick.trigger('click')).attr('title', 'Open .spr file');
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

      let $filePick = $(document.createElement('input')).attr('type', 'file').css('display', 'none').on('change', e => editor$1.openJSONFile(e.target.files[0])).appendTo($controls);
      divider();
      iconButton("assets/copy_icon.png", editor$1.copyJSONToClipboard).attr('title', 'Copy file to clipboard');
      iconButton("assets/paste_icon.png", editor$1.pasteJSONFromClipboard).attr('title', 'Load file from clipboard');
      divider();
      iconButton("assets/help_icon.png", ø => $('.control-screen').fadeIn(500)).attr('title', 'Show controls');
      const $fileName = $('.filename').on('keydown', e => {
        e.stopPropagation();
        if (e.key == 'Enter' || e.key == 'Escape') $fileName.blur();
      }).on('keypress', e => e.stopPropagation()).on('input', ø => editor$1.fileName = $fileName.val());

      function iconButton(url, callback) {
        let $button = $(document.createElement('button')).on('click', callback).appendTo('.file-button-container').addClass("icon-button");
        $(`<img src="${url}"/>`).attr({
          height: 15,
          width: 15
        }).appendTo($button);
        return $button;
      }

      function divider() {
        $('<span></span>').appendTo('.file-button-container').css({
          'border-left': "2px solid black",
          'border-radius': 1,
          'opacity': 0.5,
          'padding-top': 4
        });
      }

      iconButton("assets/wand_icon.png", ø => editor$1.applyToSelection(editor$1.tuneAsPartials)).attr('title', 'Fit selection to the harmonic series');
      let $eqButton = iconButton("assets/frac_icon.webp", ø => editor$1.applyToSelection(editor$1.equallyDivide, $divisions.val())).attr('title', 'Equally divide').children().attr({
        width: 12,
        height: 15
      });
      /*     iconButton("assets/clear_icon.png", editor.clearAllData)
              .attr('title', 'Clear all data') */

      /*     addButton("Show Controls")
              .on('click', ø => $('.control-screen').fadeIn(500)); */

      /*     addButton("Fit to Harmonic Series!")
              .on('click', ø => editor.applyToSelection(editor.tuneAsPartials)); */

      addButton("Clear all data").on('click', editor$1.clearAllData);
      /*     let $eqButton = addButton('Equally Divide')
              .on('click', ø => editor.applyToSelection(editor.equallyDivide, $divisions.val())); */

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
      }).appendTo($controls);
      $(document.createTextNode('bpm:')).appendTo($controls);
      const $tempo = $(document.createElement('input')).attr({
        type: 'number',
        min: 80,
        max: 200,
        value: 120
      }).on('input', ø => {
        playback.bpm = parseInt($tempo.val());
      }).appendTo($controls);
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

      editor$1.draw();
      ruler.draw();
      grid.draw();
      keyboard.draw();
      playback.draw();
      editor$1.loadEditorFromLocalStorage();
      let octaveTransposition = 60; // handle computer keyboard input
      // have to use keydown instead of keypress
      // to catch cmd+number before the browser default

      $(document).on("keydown", function (e) {
        if (e.metaKey) {
          /* Cmd + ... shortcuts */
          if (e.key == 'a') {
            e.preventDefault();
            editor$1.selectAll();
          } else if (e.key == 'c') {
            e.preventDefault();
            editor$1.copySelection();
          } else if (e.key == 'r') {
            e.preventDefault();
            editor$1.applyToSelection(editor$1.resetBend);
          } else if (e.key == 'v') {
            e.preventDefault();
            editor$1.paste(e);
          } else if (+e.key) {
            /* check for digits */
            e.preventDefault();
            let n = +e.key;
            if (n > 1) editor$1.applyToSelection(editor$1.equallyDivide, n);
          } else if (e.key == 's') {
            // save
            editor$1.updateLocalStorage();
            e.preventDefault();
            addMessage(`Saved at ${new Date().toUTCString()}`, 'green');
          } else if (e.key == 'o') {
            $filePick.trigger('click');
            e.preventDefault();
          } else if (e.key == 'ArrowDown') {
            editor$1.applyToSelection(editor$1.transposeByOctaves, -1);
            e.preventDefault();
          } else if (e.key == 'ArrowUp') {
            editor$1.applyToSelection(editor$1.transposeByOctaves, 1);
            e.preventDefault();
          }
        } else if (e.shiftKey) {
          if (e.key == " ") {
            e.preventDefault();
            editor$1.togglePlaybackSelection();
          }
        } else if (e.key == 'Shift') {
          editor$1.setCursorStyle("grab");
        } else if (e.key == " ") {
          e.preventDefault();
          editor$1.togglePlayback();
        } else if (e.key == 'Backspace') {
          addMessage('Deleting selection');
          editor$1.applyToSelection(editor$1.delete, e);
          /*     } else if (e.key == 'p') {
                  editor.applyToSelection(editor.play); */
        } else if (e.key == 'Enter') {
          editor$1.applyToSelection(editor$1.typeEdit);
        }
      }).on("keyup", e => {
        if ("awsedftgyhujkolp;".includes(e.key)) {
          let pitch = "awsedftgyhujkolp;".indexOf(e.key);
          keyboard.noteOff(pitch + octaveTransposition);
        } else if (e.key == 'Shift') {
          editor$1.setCursorStyle("default");
        }
      }).on("keypress", e => {
        if ("awsedftgyhujkolp;".includes(e.key)) {
          let pitch = "awsedftgyhujkolp;".indexOf(e.key);
          keyboard.noteOn(pitch + octaveTransposition);
        } else if (e.key == 'z') {
          octaveTransposition = (octaveTransposition - 12).clamp(0, 108);
        } else if (e.key == 'x') {
          octaveTransposition = (octaveTransposition + 12).clamp(0, 108);
        }
      });
      document.addEventListener('wheel', e => {
        // catches multi-touch on laptops
        if (e.ctrlKey) {
          let dy = e.deltaY;
          editor$1.scale(editor$1.zoomXY * (1 - dy * 0.01));
          e.preventDefault();
        } else {
          e.preventDefault();
          editor$1.deltaScroll(e.deltaX, e.deltaY);
        }
      }, {
        passive: false
      });

      window.onbeforeunload = e => {
        editor$1.updateLocalStorage();
        e.preventDefault();
      };

      $('.control-screen').on('click', e => $('.control-screen').fadeOut(500)); // show controls for new users and load demo

      if (!localStorage.getItem("editor")) {
        $('.control-screen').delay(500).fadeIn(500); // lord help me

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
          "viewbox": {
            "scrollX": 79,
            "scrollY": 709,
            "scale": 0.9
          }
        };
        console.log("loaded demo data:", demo);
        editor$1.addCompressedData(demo);
        editor$1.deselectAllObjects();
        editor$1.scroll(70, 700);
        editor$1.scale(0.9);
      } //$yRange.on('input', ø => editor.zoom(editor.zoomX, +$yRange.val()));


      $xRange.on('input', ø => editor$1.zoom(+$xRange.val(), editor$1.zoomY));
      $('.loader-container').fadeOut(1000);
      $('#sequencer').fadeTo(2000, 1);
    });

}());

},{"jzz":4,"jzz-midi-smf":3}],2:[function(require,module,exports){
(function (process,__dirname){(function (){
var path='./bin/';
var v=process.versions.node.split('.');
if (v[0]==0 && v[1]<=10) path+='0_10/';
else if (v[0]==0 && v[1]<=12) path+='0_12/';
else if (v[0]<=4) path+='4_9/';
else if (v[0]<=5) path+='5_12/';
else if (v[0]<=6) path+='6_14/';
else if (v[0]<=7) path+='7_10/';
else if (v[0]<=8) path+='8_12/';
else if (v[0]<=9) path+='9_11/';
else if (v[0]<=10) path+='10_15/';
else if (v[0]<=11) path+='11_15/';
if(process.platform=="win32"&&process.arch=="ia32") path+='win32/jazz';
else if(process.platform=="win32"&&process.arch=="x64") path+='win64/jazz';
else if(process.platform=="darwin"&&process.arch=="x64") path+='macos64/jazz';
else if(process.platform=="darwin"&&process.arch=="ia32") path+='macos32/jazz';
else if(process.platform=="linux"&&process.arch=="x64") path+='linux64/jazz';
else if(process.platform=="linux"&&process.arch=="ia32") path+='linux32/jazz';
else if(process.platform=="linux"&&process.arch=="arm") path+='linuxa7/jazz';
module.exports=require(path);
module.exports.package=require(__dirname + '/package.json');

}).call(this)}).call(this,require('_process'),"/node_modules/jazz-midi")
},{"_process":5}],3:[function(require,module,exports){
(function(global, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory;
  }
  else if (typeof define === 'function' && define.amd) {
    define('JZZ.midi.SMF', ['JZZ'], factory);
  }
  else {
    factory(JZZ);
  }
})(this, function(JZZ) {

  if (JZZ.MIDI.SMF) return;

  var _ver = '1.4.0';

  var _now = JZZ.lib.now;
  function _error(s) { throw new Error(s); }

  function _num(n) {
    var s = '';
    if (n > 0x1fffff) s += String.fromCharCode(((n >> 21) & 0x7f) + 0x80);
    if (n > 0x3fff) s += String.fromCharCode(((n >> 14) & 0x7f) + 0x80);
    if (n > 0x7f) s += String.fromCharCode(((n >> 7) & 0x7f) + 0x80);
    s += String.fromCharCode(n & 0x7f);
    return s;
  }
  function _num2(n) {
    return String.fromCharCode(n >> 8) + String.fromCharCode(n & 0xff);
  }
  function _num4(n) {
    return String.fromCharCode((n >> 24) & 0xff) + String.fromCharCode((n >> 16) & 0xff) + String.fromCharCode((n >> 8) & 0xff) + String.fromCharCode(n & 0xff);
  }
  function _num4le(n) {
    return String.fromCharCode(n & 0xff) + String.fromCharCode((n >> 8) & 0xff) + String.fromCharCode((n >> 16) & 0xff) + String.fromCharCode((n >> 24) & 0xff);
  }

  function SMF() {
    var self = this instanceof SMF ? this : self = new SMF();
    var type = 1;
    var ppqn = 96;
    var fps;
    var ppf;
    if (arguments.length == 1) {
      if (arguments[0] instanceof SMF) {
        return arguments[0].copy();
      }
      if (typeof arguments[0] == 'string' && arguments[0] != '0' && arguments[0] != '1' && arguments[0] != '2') {
        self.load(arguments[0]); return self;
      }
      type = parseInt(arguments[0]);
    }
    else if (arguments.length == 2) {
      type = parseInt(arguments[0]);
      ppqn = parseInt(arguments[1]);
    }
    else if (arguments.length == 3) {
      type = parseInt(arguments[0]);
      fps = parseInt(arguments[1]);
      ppf = parseInt(arguments[2]);
    }
    else if (arguments.length) _error('Invalid parameters');
    if (isNaN(type) || type < 0 || type > 2) _error('Invalid parameters');
    self.type = type;
    if (typeof fps == 'undefined') {
      if (isNaN(ppqn) || ppqn < 0 || type > 0xffff) _error('Invalid parameters');
      self.ppqn = ppqn;
    }
    else {
      if (fps != 24 && fps != 25 && fps != 29 && fps != 30) _error('Invalid parameters');
      if (isNaN(ppf) || ppf < 0 || type > 0xff) _error('Invalid parameters');
      self.fps = fps;
      self.ppf = ppf;
    }
    return self;
  }
  SMF.version = function() { return _ver; };

  SMF.prototype = [];
  SMF.prototype.constructor = SMF;
  SMF.prototype.copy = function() {
    var smf = new SMF();
    smf.type = this.type;
    smf.ppqn = this.ppqn;
    smf.fps = this.fps;
    smf.ppf = this.ppf;
    smf.rmi = this.rmi;
    smf.ntrk = this.ntrk;
    for (var i = 0; i < this.length; i++) smf.push(this[i].copy());
    return smf;
  };

  function _issue(off, msg, data, tick) {
    var w = { off: off, msg: msg, data: data };
    if (typeof tick != 'undefined') w.tick = tick;
    return w;
  }
  SMF.prototype._complain = function(off, msg, data) {
    if (!this._warn) this._warn = [];
    this._warn.push(_issue(off, msg, data));
  };
  SMF.prototype.load = function(s) {
    var off = 0;
    if (s.substr(0, 4) == 'RIFF' && s.substr(8, 8) == 'RMIDdata') {
      this.rmi = true;
      off = 20;
      s = s.substr(20, s.charCodeAt(16) + s.charCodeAt(17) * 0x100 + s.charCodeAt(18) * 0x10000 + s.charCodeAt(19) * 0x1000000);
    }
    this.loadSMF(s, off);
  };

  var MThd0006 = 'MThd' + String.fromCharCode(0) + String.fromCharCode(0) + String.fromCharCode(0) + String.fromCharCode(6);
  SMF.prototype.loadSMF = function(s, off) {
    if (!s.length) _error('Empty file');
    if (s.substr(0, 8) != MThd0006) {
      var z = s.indexOf(MThd0006);
      if (z != -1) {
        s = s.substr(z);
        this._complain(off, 'Extra leading characters', z);
        off += z;
      }
      else _error('Not a MIDI file');
    }
    this.type = s.charCodeAt(8) * 16 + s.charCodeAt(9);
    this.ntrk = s.charCodeAt(10) * 16 + s.charCodeAt(11);
    if (s.charCodeAt(12) > 0x7f) {
      this.fps = 0x100 - s.charCodeAt(12);
      this.ppf = s.charCodeAt(13);
    }
    else{
      this.ppqn = s.charCodeAt(12) * 256 + s.charCodeAt(13);
    }
    if (this.type > 2) this._complain(8 + off, 'Invalid MIDI file type', this.type);
    else if (this.type == 0 && this.ntrk > 1) this._complain(10 + off, 'Wrong number of tracks for the type 0 MIDI file', this.ntrk);
    if (!this.ppf && !this.ppqn) _error('Invalid MIDI header');
    var n = 0;
    var p = 14;
    while (p < s.length - 8) {
      var offset = p + off;
      var type = s.substr(p, 4);
      if (type == 'MTrk') n++;
      var len = (s.charCodeAt(p + 4) << 24) + (s.charCodeAt(p + 5) << 16) + (s.charCodeAt(p + 6) << 8) + s.charCodeAt(p + 7);
      if (len <= 0) { // broken file
        len = s.length - p - 8;
        this._complain(p + off + 4, 'Invalid track length', s.charCodeAt(p + 4) + '/' + s.charCodeAt(p + 5) + '/' + s.charCodeAt(p + 6) + '/' + s.charCodeAt(p + 7));
      }
      p += 8;
      var data = s.substr(p, len);
      this.push(new Chunk(type, data, offset));
      if (type == 'MThd') this._complain(offset, 'Unexpected chunk type', 'MThd');
      p += len;
    }
    if (n != this.ntrk) {
      this._complain(off + 10, 'Incorrect number of tracks', this.ntrk);
      this.ntrk = n;
    }
    if (!this.ntrk)  _error('No MIDI tracks');
    if (!this.type && this.ntrk > 1 || this.type > 2)  this.type = 1;
    if (p < s.length) this._complain(off + p, 'Extra trailing characters', s.length - p);
    if (p > s.length) this._complain(off + s.length, 'Incomplete data', p - s.length);
  };

  function _copy(obj) {
    var ret = {};
    for (var k in obj) if (obj.hasOwnProperty(k)) ret[k] = obj[k];
    return ret;
  }
  SMF.prototype.validate = function() {
    var i, k;
    var w = [];
    if (this._warn) for (i = 0; i < this._warn.length; i++) w.push(_copy(this._warn[i]));
    k = 0;
    for (i = 0; i < this.length; i++) if (this[i] instanceof MTrk) {
      k++;
      this[i]._validate(w, k, this.type == 1 ? i : 0);
    }
    w.sort(function(a, b) {
      return (a.off || 0) - (b.off || 0) || (a.track || 0) - (b.track || 0) || (a.tick || 0) - (b.tick || 0);
    });
    if (w.length) return w;
  };
  SMF.prototype.dump = function(rmi) {
    var s = '';
    if (rmi) {
      s = this.dump();
      return 'RIFF' + _num4le(s.length + 12) + 'RMIDdata' + _num4le(s.length) + s;
    }
    this.ntrk = 0;
    for (var i = 0; i < this.length; i++) {
      if (this[i] instanceof MTrk) this.ntrk++;
      s += this[i].dump();
    }
    s = (this.ppqn ? _num2(this.ppqn) : String.fromCharCode(0x100 - this.fps) + String.fromCharCode(this.ppf)) + s;
    s = MThd0006 + String.fromCharCode(0) + String.fromCharCode(this.type) + _num2(this.ntrk) + s;
    return s;
  };
  SMF.prototype.toString = function() {
    var i;
    this.ntrk = 0;
    for (i = 0; i < this.length; i++) if (this[i] instanceof MTrk) this.ntrk++;
    var a = ['SMF:', '  type: ' + this.type];
    if (this.ppqn) a.push('  ppqn: ' + this.ppqn);
    else a.push('  fps: ' + this.fps, '  ppf: ' + this.ppf);
    a.push('  tracks: ' + this.ntrk);
    for (i = 0; i < this.length; i++) {
      a.push(this[i].toString());
    }
    return a.join('\n');
  };

  function _var2num(s) {
    if (!s.length) return 0; // missing last byte
    if (s.charCodeAt(0) < 0x80) return s.charCodeAt(0);
    var x = s.charCodeAt(0) & 0x7f;
    x <<= 7;
    if (s.charCodeAt(1) < 0x80) return x + s.charCodeAt(1);
    x += s.charCodeAt(1) & 0x7f;
    x <<= 7;
    if (s.charCodeAt(2) < 0x80) return x + s.charCodeAt(2);
    x += s.charCodeAt(2) & 0x7f;
    x <<= 7;
    x += s.charCodeAt(3) & 0x7f;
    return s.charCodeAt(3) < 0x80 ? x : -x;
  }
  function _msglen(n) {
    switch (n & 0xf0) {
      case 0x80: case 0x90: case 0xa0: case 0xb0: case 0xe0: return 2;
      case 0xc0: case 0xD0: return 1;
    }
    switch (n) {
      case 0xf1: case 0xf3: return 1;
      case 0xf2: return 2;
    }
    return 0;
  }

  SMF.prototype.player = function() {
    var pl = new Player();
    pl.ppqn = this.ppqn;
    pl.fps = this.fps;
    pl.ppf = this.ppf;
    pl.ppf = this.ppf;
    var i;
    var j;
    var tt = [];
    var e;
    var m = 0;
    var t = 0;
    for (i = 0; i < this.length; i++) if (this[i] instanceof MTrk) tt.push(this[i]);
    if (this.type == 2) {
      for (i = 0; i < tt.length; i++) {
        for (j = 0; j < tt[i].length; j++) {
          e = JZZ.MIDI(tt[i][j]);
          e.track = i;
          t = e.tt + m;
          e.tt = t;
          pl._data.push(e);
        }
        m = t;
      }
    }
    else {
      var pp = [];
      for (i = 0; i < tt.length; i++) pp[i] = 0;
      while (true) {
        var b = true;
        for (i = 0; i < tt.length; i++) {
          while (pp[i] < tt[i].length && tt[i][pp[i]].tt == t) {
            e = JZZ.MIDI(tt[i][pp[i]]);
            e.track = i;
            pl._data.push(e);
            pp[i]++;
          }
          if (pp[i] >= tt[i].length) continue;
          if (b) m = tt[i][pp[i]].tt;
          b = false;
          if (m > tt[i][pp[i]].tt) m = tt[i][pp[i]].tt;
        }
        t = m;
        if (b) break;
      }
    }
    pl._type = this.type;
    pl._tracks = tt.length;
    pl._timing();
    return pl;
  };

  function Chunk(t, d, off) {
    if (!(this instanceof Chunk)) return new Chunk(t, d, off);
    var i;
    if (this.sub[t]) return this.sub[t](t, d, off);
    if (typeof t != 'string' || t.length != 4) _error("Invalid chunk type: " + t);
    for (i = 0; i < t.length; i++) if (t.charCodeAt(i) < 0 || t.charCodeAt(i) > 255) _error("Invalid chunk type: " + t);
    if (typeof d != 'string') _error("Invalid data type: " + d);
    for (i = 0; i < d.length; i++) if (d.charCodeAt(i) < 0 || d.charCodeAt(i) > 255) _error("Invalid data character: " + d[i]);
    this.type = t;
    this.data = d;
    this.offset = off;
  }
  SMF.Chunk = Chunk;
  Chunk.prototype = [];
  Chunk.prototype.constructor = Chunk;
  Chunk.prototype.copy = function() { return new Chunk(this.type, this.data); };

  Chunk.prototype.sub = {
    'MTrk': function(t, d, off) { return new MTrk(d, off); }
  };
  Chunk.prototype.dump = function() {
    return this.type + _num4(this.data.length) + this.data;
  };
  Chunk.prototype.toString = function() {
    return this.type + ': ' + this.data.length + ' bytes';
  };

  function _validate_msg_data(trk, s, p, m, t, off) {
    var x = s.substr(p, m);
    if (x.length < m) {
      trk._complain(off, 'Incomplete track data', m - x.length, t);
      x = (x + '\x00\x00').substr(0, m);
    }
    for (var i = 0; i < m; i++) if (x.charCodeAt(i) > 127) {
      trk._complain(off, 'Bad MIDI value', x.charCodeAt(i), t);
      x = x.substr(0, i) + '\x00' + x.substr(i + 1);
    }
    return x;
  }
  function _validate_number(trk, s, off, t) {
    var n = _var2num(s);
    if (n < 0) {
      n = -n;
      trk._complain(off, "Bad byte sequence", s.charCodeAt(0) + '/' + s.charCodeAt(1) + '/' + s.charCodeAt(2) + '/' + s.charCodeAt(3), t);
    }
    return n;
  }

  function MTrk(s, off) {
    if (!(this instanceof MTrk)) return new MTrk(s, off);
    this._orig = this;
    this._tick = 0;
    if(typeof s == 'undefined') {
      this.push(new Event(0, '\xff\x2f', ''));
      return;
    }
    var t = 0;
    var p = 0;
    var w = '';
    var d;
    var st;
    var m;
    var offset;
    off = off || 0;
    off += 8;
    while (p < s.length) {
      d = _validate_number(this, s.substr(p, 4), offset, t + d);
      p++;
      if (d > 0x7f) p++;
      if (d > 0x3fff) p++;
      if (d > 0x1fffff) p++;
      t += d;
      offset = p + off;
      if (s.charCodeAt(p) == 0xff) {
        st = s.substr(p, 2);
        if (st.length < 2) {
          this._complain(offset, 'Incomplete track data', 3 - st.length, t);
          st = '\xff\x2f';
        }
        p += 2;
        m = _validate_number(this, s.substr(p, 4), offset + 2, t);
        p++;
        if (m > 0x7f) p++;
        if (m > 0x3fff) p++;
        if (m > 0x1fffff) p++;
        this.push (new Event(t, st, s.substr(p, m), offset));
        p += m;
      }
      else if (s.charCodeAt(p) == 0xf0 || s.charCodeAt(p) == 0xf7) {
        st = s.substr(p, 1);
        p += 1;
        m = _validate_number(this, s.substr(p, 4), offset + 1, t);
        p++;
        if (m > 0x7f) p++;
        if (m > 0x3fff) p++;
        if (m > 0x1fffff) p++;
        this.push(new Event(t, st, s.substr(p, m), offset));
        p += m;
      }
      else if (s.charCodeAt(p) & 0x80) {
        w = s.substr(p, 1);
        p += 1;
        m = _msglen(w.charCodeAt(0));
        if (!m) this._complain(offset, 'Unexpected MIDI message', w.charCodeAt(0), t);
        this.push(new Event(t, w, _validate_msg_data(this, s, p, m, t, offset), offset));
        p += m;
      }
      else if (w.charCodeAt(0) & 0x80) {
        m = _msglen(w.charCodeAt(0));
        if (!m) this._complain(offset, 'Unexpected MIDI message', w.charCodeAt(0), t);
        this.push(new Event(t, w, _validate_msg_data(this, s, p, m, t, offset), offset));
        p += m;
      }
    }
  }
  SMF.MTrk = MTrk;

  MTrk.prototype = [];
  MTrk.prototype.constructor = MTrk;
  MTrk.prototype.copy = function() {
    var trk = new MTrk();
    trk.length = 0;
    for (var i = 0; i < this.length; i++) trk.push(new JZZ.MIDI(this[i]));
    return trk;
  };
  function _metaevent_len(msg, name, len) {
    if (msg.dd.length < len) return _issue(msg._off, 'Invalid ' + name + ' meta event: ' + (msg.dd.length ? 'data too short' : 'no data'), msg.toString(), msg.tt);
    if (msg.dd.length > len) return _issue(msg._off, 'Invalid ' + name + ' meta event: data too long', msg.toString(), msg.tt);
  }
  function _timing_first_track(msg, name) {
    return _issue(msg._off, name + ' meta events must be in the first track', msg.toString(), msg.tt);
  }
  function _validate_midi(msg, tr) {
    var issue;
    if (typeof msg.ff != 'undefined') {
      if (msg.ff > 0x7f) return _issue(msg._off, 'Invalid meta event', msg.toString(), msg.tt);
      else if (msg.ff == 0) {
        issue = _metaevent_len(msg, 'Sequence Number', 2); if (issue) return issue;
      }
      else if (msg.ff < 10) {
        if (!msg.dd.length) return _issue(msg._off, 'Invalid Text meta event: no data', msg.toString(), msg.tt);
      }
      else if (msg.ff == 32) {
        issue = _metaevent_len(msg, 'Channel Prefix', 1); if (issue) return issue;
        if (msg.dd.charCodeAt(0) > 15) return _issue(msg._off, 'Invalid Channel Prefix meta event: incorrect data', msg.toString(), msg.tt);
      }
      else if (msg.ff == 33) {
        issue = _metaevent_len(msg, 'MIDI Port', 1); if (issue) return issue;
        if (msg.dd.charCodeAt(0) > 127) return _issue(msg._off, 'Invalid MIDI Port meta event: incorrect data', msg.toString(), msg.tt);
      }
      else if (msg.ff == 47) {
        issue = _metaevent_len(msg, 'End of Track', 0); if (issue) return issue;
      }
      else if (msg.ff == 81) {
        issue = _metaevent_len(msg, 'Tempo', 3); if (issue) return issue;
        if (tr) return _timing_first_track(msg, 'Tempo');
      }
      else if (msg.ff == 84) {
        issue = _metaevent_len(msg, 'SMPTE', 5); if (issue) return issue;
        if (msg.dd.charCodeAt(0) >= 24 || msg.dd.charCodeAt(1) >= 60 || msg.dd.charCodeAt(2) >= 60 || msg.dd.charCodeAt(3) >= 30 || msg.dd.charCodeAt(4) >= 200 || msg.dd.charCodeAt(4) % 25) return _issue(msg._off, 'Invalid SMPTE meta event: incorrect data', msg.toString(), msg.tt);
        if (tr) return _timing_first_track(msg, 'SMPTE');
      }
      else if (msg.ff == 88) {
        issue = _metaevent_len(msg, 'Time Signature', 4); if (issue) return issue;
        if (msg.dd.charCodeAt(1) > 8) return _issue(msg._off, 'Invalid Time Signature meta event: incorrect data', msg.toString(), msg.tt);
        if (tr) return _timing_first_track(msg, 'Time Signature');
      }
      else if (msg.ff == 89) {
        issue = _metaevent_len(msg, 'Key Signature', 2); if (issue) return issue;
        if (msg.dd.charCodeAt(1) > 1 || msg.dd.charCodeAt(0) > 255 || (msg.dd.charCodeAt(0) > 7 && msg.dd.charCodeAt(0) < 249)) return _issue(msg._off, 'Invalid Key Signature meta event: incorrect data', msg.toString(), msg.tt);
      }
      else if (msg.ff == 127) {
        // Sequencer Specific meta event
      }
      else {
        return _issue(msg._off, 'Unknown meta event', msg.toString(), msg.tt);
      }
    }
    else {
      //
    }
  }
  MTrk.prototype._validate = function(w, k, tr) {
    var i, z;
    if (this._warn) for (i = 0; i < this._warn.length; i++) {
      z = _copy(this._warn[i]);
      z.track = k;
      w.push(z);
    }
    for (i = 0; i < this.length; i++) {
      z = _validate_midi(this[i], tr);
      if (z) {
        z.track = k;
        w.push(z);
      }
    }
  };
  MTrk.prototype._complain = function(off, msg, data, tick) {
    if (!this._warn) this._warn = [];
    this._warn.push(_issue(off, msg, data, tick));
  };
  MTrk.prototype.dump = function() {
    var s = '';
    var t = 0;
    var m = '';
    var i, j;
    for (i = 0; i < this.length; i++) {
      s += _num(this[i].tt - t);
      t = this[i].tt;
      if (typeof this[i].dd != 'undefined') {
        s += '\xff';
        s += String.fromCharCode(this[i].ff);
        s += _num(this[i].dd.length);
        s += this[i].dd;
      }
      else if (this[i][0] == 0xf0 || this[i][0] == 0xf7) {
        s += String.fromCharCode(this[i][0]);
        s += _num(this[i].length - 1);
        for (j = 1; j < this[i].length; j++) s += String.fromCharCode(this[i][j]);
      }
      else {
        if (this[i][0] != m) {
          m = this[i][0];
          s += String.fromCharCode(this[i][0]);
        }
        for (j = 1; j < this[i].length; j++) s += String.fromCharCode(this[i][j]);
      }
    }
    return 'MTrk' + _num4(s.length) + s;
  };
  MTrk.prototype.toString = function() {
    var a = ['MTrk:'];
    for (var i = 0; i < this.length; i++) {
      a.push(this[i].tt + ': ' + this[i].toString());
    }
    return a.join('\n  ');
  };
  function _eventOrder(msg) {
    var x = {
      0x00: 0,
      0x03: 1,
      0x02: 2,
      0x54: 3,
      0x51: 4,
      0x58: 5,
      0x59: 6,
      0x20: 7,
      0x21: 7,
      0x06: 8,
      0x04: 9,
      0x01: 16,
      0x05: 16,
      0x7f: 17,
      0x2f: 20
    }[msg.ff];
    if (typeof x !== 'undefined') return x;
    if (msg.length) {
      var s = msg[0] >> 4;
      x = { 8: 10, 15: 11, 11: 12, 12: 13, 10: 15, 13: 15, 14: 15 }[s];
      if (typeof x !== 'undefined') return x;
      if (s == 9) return msg[1] ? 14 : 10;
    }
    return 18;
  }

  MTrk.prototype.add = function(t, msg) {
    t = parseInt(t);
    if(isNaN(t) || t < 0) _error('Invalid parameter');
    msg = JZZ.MIDI(msg);
    msg.tt = t;
    if (this[this.length - 1].tt < t) this[this.length - 1].tt = t; // end of track
    if (msg.ff == 0x2f || msg[0] == 0xff) return this;
    var x = _eventOrder(msg);
    var i;
    for (i = 0; i < this.length; i++) {
      if (this[i].tt > t) break;
      if (this[i].tt == t && _eventOrder(this[i]) > x) break;
    }
    this.splice(i, 0, msg);
    return this;
  };

  MTrk.prototype.send = function(msg) { this._orig.add(this._tick, msg); };
  MTrk.prototype.tick = function(t) {
    if (t != parseInt(t) || t < 0) throw RangeError('Bad tick value: ' + t);
    if (!t) return this;
    var F = function() {}; F.prototype = this._orig;
    var ttt = new F();
    ttt._tick = this._tick + t;
    return ttt;
  };
  MTrk.prototype.note = function(c, n, v, t) {
    this.noteOn(c, n, v);
    if (t > 0) this.tick(t).noteOff(c, n);
    return this;
  };
  MTrk.prototype.ch = function(n) {
    if (typeof n == 'undefined') return this;
    if (n != parseInt(n) || n < 0 || n > 15) throw RangeError('Bad channel value: ' + n  + ' (must be from 0 to 15)');
    return new Chan(this._orig, n, this._tick);
  };

  function Chan(orig, chan, tick) {
    this._orig = orig;
    this._chan = chan;
    this._tick = tick;
  }
  Chan.prototype = new MTrk();
  Chan.prototype.tick = function(t) {
    if (t != parseInt(t) || t < 0) throw RangeError('Bad tick value: ' + t);
    if (!t) return this;
    return new Chan(this._orig, this._chan, this._tick + t);
  };
  Chan.prototype.ch = function(n) {
    if (typeof n == 'undefined') return this._orig.tick(this._tick);
    if (n != parseInt(n) || n < 0 || n > 15) throw RangeError('Bad channel value: ' + n  + ' (must be from 0 to 15)');
    if (n == this._chan) return this;
    return new Chan(this._orig, n, this._tick);
  };
  Chan.prototype.note = function(n, v, t) {
    this.noteOn(n, v);
    if (t) this.tick(t).noteOff(n);
    return this;
  };

  JZZ.lib.copyMidiHelpers(MTrk, Chan);

  function Event(t, s, d, off) {
    var midi;
    if (s.charCodeAt(0) == 0xff) {
      midi = JZZ.MIDI.smf(s.charCodeAt(1), d);
    }
    else {
      var a = [s.charCodeAt(0)];
      for (var i = 0; i < d.length; i++) a.push(d.charCodeAt(i));
      midi = JZZ.MIDI(a);
    }
    if (typeof off != 'undefined') midi._off = off;
    midi.tt = t;
    return midi;
  }

  function Player() {
    var self = new JZZ.Widget();
    self._info.name = 'MIDI Player';
    self._info.manufacturer = 'Jazz-Soft';
    self._info.version = _ver;
    self.playing = false;
    self._loop = 0;
    self._data = [];
    self._pos = 0;
    self._tick = (function(x) { return function(){ x.tick(); }; })(self);
    for (var k in Player.prototype) if (Player.prototype.hasOwnProperty(k)) self[k] = Player.prototype[k];
    return self;
  }
  Player.prototype.onEnd = function() {};
  Player.prototype.loop = function(n) {
    if (n == parseInt(n) && n > 0) this._loop = n;
    else this._loop = n ? -1 : 0;
  };
  Player.prototype.play = function() {
    this.event = undefined;
    this.playing = true;
    this.paused = false;
    this._ptr = 0;
    this._pos = 0;
    this._p0 = 0;
    this._t0 = _now();
    this.tick();
  };
  Player.prototype.stop = function() {
    this._pos = 0;
    this.playing = false;
    this.event = 'stop';
    this.paused = undefined;
  };
  Player.prototype.pause = function() {
    this.event = 'pause';
  };
  Player.prototype.resume = function() {
    if (this.playing) return;
    if (this.paused) {
      this.event = undefined;
      this._t0 = _now();
      this.playing = true;
      this.paused = false;
      this.tick();
    }
    else this.play();
  };
  Player.prototype.sndOff = function() {
    for (var c = 0; c < 16; c++) this._emit(JZZ.MIDI.allSoundOff(c));
  };
  function _filter(e) { this._receive(e); }
  Player.prototype._filter = _filter;
  Player.prototype.filter = function(f) {
    this._filter = f instanceof Function ? f : _filter;
  };
  function _div(s) { return (s.charCodeAt(0) << 16) + (s.charCodeAt(1) << 8) + s.charCodeAt(2); }
  Player.prototype._receive = function(e) {
    if (e.ff == 0x51 && this.ppqn) {
      this._mul = this.ppqn * 1000.0 / _div(e.dd);
      this.mul = this._mul * this._speed;
      this._t0 = _now();
      this._p0 = this._pos;
    }
    this._emit(e);
  };
  Player.prototype.tick = function() {
    var t = _now();
    var e;
    this._pos = this._p0 + (t - this._t0) * this.mul;
    for(; this._ptr < this._data.length; this._ptr++) {
      e = this._data[this._ptr];
      if (e.tt > this._pos) break;
      this._filter(e);
    }
    if (this._ptr >= this._data.length) {
      if (this._loop && this._loop != -1) this._loop--;
      if (this._loop) {
        this._ptr = 0;
        this._p0 = 0;
        this._t0 = t;
      }
      else this.stop();
      this.onEnd();
    }
    if (this.event == 'stop') {
      this.playing = false;
      this.paused = false;
      this._pos = 0;
      this._ptr = 0;
      this.sndOff();
      this.event = undefined;
    }
    if (this.event == 'pause') {
      this.playing = false;
      this.paused = true;
      if (this._pos >= this._duration) this._pos = this._duration - 1;
      this._p0 = this._pos;
      this.sndOff();
      this.event = undefined;
    }
    if (this.playing) JZZ.lib.schedule(this._tick);
  };
  Player.prototype.trim = function() {
    var i, j, e;
    var data = [];
    var dt = 0;
    j = 0;
    for (i = 0; i < this._data.length; i++) {
      e = this._data[i];
      if (e.length || e.ff == 1 || e.ff == 5) {
        for (; j <= i; j++) data.push(this._data[j]);
      }
    }
    dt += this._data[i - 1].tt - this._data[j - 1].tt;
    this._data = data;
    this._timing();
    return dt;
  };
  Player.prototype._timing = function() {
    var i, m, t, e;
    this._duration = this._data[this._data.length - 1].tt;
    this._ttt = [];
    if (this.ppqn) {
      this._mul = this.ppqn / 500.0; // 120 bpm
      m = this._mul;
      t = 0;
      this._durationMS = 0;
      this._ttt.push({ t: 0, m: m, ms: 0 });
      for (i = 0; i < this._data.length; i++) {
        e = this._data[i];
        if (e.ff == 0x51) {
          this._durationMS += (e.tt - t) / m;
          t = e.tt;
          m = this.ppqn * 1000.0 / _div(e.dd);
          this._ttt.push({ t: t, m: m, ms: this._durationMS });
        }
      }
      this._durationMS += (this._duration - t) / m;
    }
    else {
      this._mul = this.fps * this.ppf / 1000.0; // 1s = fps*ppf ticks
      this._ttt.push({ t: 0, m: this._mul, ms: 0 });
      this._durationMS = this._duration / this._mul;
    }
    this._speed = 1;
    this.mul = this._mul;
    this._ttt.push({ t: this._duration, m: 0, ms: this._durationMS });
    if (!this._durationMS) this._durationMS = 1;
  };
  Player.prototype.speed = function(x) {
    if (typeof x != 'undefined') {
      if (isNaN(parseFloat(x)) || x <= 0) x = 1;
      this._speed = x;
      this.mul = this._mul * this._speed;
      this._p0 = this._pos - (_now() - this._t0) * this.mul;
    }
    return this._speed;
  };
  Player.prototype.type = function() { return this._type; };
  Player.prototype.tracks = function() { return this._tracks; };
  Player.prototype.duration = function() { return this._duration; };
  Player.prototype.durationMS = function() { return this._durationMS; };
  Player.prototype.position = function() { return this._pos; };
  Player.prototype.positionMS = function() { return this.tick2ms(this._pos); };
  Player.prototype.jump = function(t) {
    if (isNaN(parseFloat(t))) _error('Not a number: ' + t);
    if (t < 0) t = 0.0;
    if (t >= this._duration) t = this._duration - 1;
    this._goto(t);
  };
  Player.prototype.jumpMS = function(ms) {
    if (isNaN(parseFloat(ms))) _error('Not a number: ' + ms);
    if (ms < 0) ms = 0.0;
    if (ms >= this._durationMS) ms = this._durationMS - 1;
    this._goto(this._ms2t(ms));
  };
  Player.prototype._t2ms = function(t) {
    if (!t) return 0.0;
    var i;
    for (i = 0; this._ttt[i].t < t; i++) ;
    i--;
    return this._ttt[i].ms + (t - this._ttt[i].t) / this._ttt[i].m;
  };
  Player.prototype._ms2t = function(ms) {
    if (!ms) return 0.0;
    var i;
    for (i = 0; this._ttt[i].ms < ms; i++) ;
    i--;
    return this._ttt[i].t + (ms - this._ttt[i].ms) * this._ttt[i].m;
  };
  Player.prototype._goto = function(t) {
    this._pos = t;
    if (!this.playing) this.paused = !!t;
    this._toPos();
    if (this.playing) this.sndOff();
  };
  Player.prototype._toPos = function() {
    for(this._ptr = 0; this._ptr < this._data.length; this._ptr++) {
      var e = this._data[this._ptr];
      if (e.tt >= this._pos) break;
      if (e.ff == 0x51 && this.ppqn) this._mul = this.ppqn * 1000.0 / _div(e.dd);
    }
    this.mul = this._mul * this._speed;
    this._t0 = _now();
    this._p0 = this._pos;
  };
  Player.prototype.tick2ms = function(t) {
    if (isNaN(parseFloat(t))) _error('Not a number: ' + t);
    if (t <= 0) return 0.0;
    if (t >= this._duration) return this._durationMS;
    return this._t2ms(t);
  };
  Player.prototype.ms2tick = function(t) {
    if (isNaN(parseFloat(t))) _error('Not a number: ' + t);
    if (t <= 0) return 0.0;
    if (t >= this._durationMS) return this._duration;
    return this._ms2t(t);
  };
  JZZ.MIDI.SMF = SMF;
});

},{}],4:[function(require,module,exports){
(function (global){(function (){
(function(global, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  }
  else if (typeof define === 'function' && define.amd) {
    define('JZZ', [], factory);
  }
  else {
    if (!global) global = window;
    if (global.JZZ && global.JZZ.MIDI) return;
    global.JZZ = factory();
  }
})(this, function() {

  var _scope = typeof window === 'undefined' ? global : window;
  var _version = '1.1.1';
  var i, j, k, m, n;

  var _time = Date.now || function () { return new Date().getTime(); };
  var _startTime = _time();
  var _now = typeof performance != 'undefined' && performance.now ?
    function() { return performance.now(); } : function() { return _time() - _startTime; };
  var _schedule = function(f) {
    setTimeout(f, 0);
  };

  // _R: common root for all async objects
  function _R() {
    this._orig = this;
    this._ready = false;
    this._queue = [];
    this._log = [];
  }
  _R.prototype._exec = function() {
    while (this._ready && this._queue.length) {
      var x = this._queue.shift();
      x[0].apply(this, x[1]);
    }
  };
  _R.prototype._push = function(func, arg) { this._queue.push([func, arg]); _R.prototype._exec.apply(this); };
  _R.prototype._slip = function(func, arg) { this._queue.unshift([func, arg]); };
  _R.prototype._pause = function() { this._ready = false; };
  _R.prototype._resume = function() { this._ready = true; _R.prototype._exec.apply(this); };
  _R.prototype._break = function(err) { this._orig._bad = true; this._orig._log.push(err || 'Unknown JZZ error'); };
  _R.prototype._repair = function() { this._orig._bad = false; };
  _R.prototype._crash = function(err) { this._break(err); this._resume(); };
  _R.prototype._err = function() { return this._log[this._log.length - 1]; };
  _R.prototype.log = function() { return _clone(this._log); };
  _R.prototype._image = function() {
    var F = function() {}; F.prototype = this._orig;
    var ret = new F();
    ret._ready = false;
    ret._queue = [];
    return ret;
  };
  _R.prototype._thenable = function() {
    var self = this;
    var F = function() {}; F.prototype = self;
    var ret = new F();
    ret.then = function(good, bad) { self._push(_then, [good, bad]); return this; };      
    return ret;
  };
  function _then(good, bad) {
    if (this._bad) {
      if (bad instanceof Function) bad.apply(this, [new Error(this._err())]);
    }
    else {
      if (good instanceof Function) good.apply(this, [this]);
    }
  }
  function _wait(obj, delay) {
    if (this._bad) obj._crash(this._err());
    else setTimeout(function() { obj._resume(); }, delay);
  }
  _R.prototype.wait = function(delay) {
    if (!delay) return this;
    var ret = this._image();
    this._push(_wait, [ret, delay]);
    return ret._thenable();
  };
  function _kick(obj) { if (this._bad) obj._break(this._err()); obj._resume(); }
  function _rechain(self, obj, name) {
    self[name] = function() {
      var arg = arguments;
      var ret = obj._image();
      this._push(_kick, [ret]);
      return ret[name].apply(ret, arg);
    };
  }
  function _and(q) {
    if (!this._bad) {
      if (q instanceof Function) q.apply(this); else console.log(q);
    }
  }
  _R.prototype.and = function(func) { this._push(_and, [func]); return this._thenable(); };
  function _or(q) {
    if (this._bad) {
      if (q instanceof Function) q.apply(this); else console.log(q);
    }
  }
  _R.prototype.or = function(func) { this._push(_or, [func]); return this._thenable(); };

  _R.prototype._info = {};
  _R.prototype.info = function() {
    var info = _clone(this._orig._info);
    if (typeof info.engine == 'undefined') info.engine = 'none';
    if (typeof info.sysex == 'undefined') info.sysex = true;
    return info;
  };
  _R.prototype.name = function() { return this.info().name; };

  function _close(obj) {
    if (this._bad) obj._crash(this._err());
    else {
      this._break('Closed');
      obj._resume();
    }
  }
  _R.prototype.close = function() {
    var ret = new _R();
    if (this._close) this._push(this._close, []);
    this._push(_close, [ret]);
    return ret._thenable();
  };

  function _tryAny(arr) {
    if (!arr.length) {
      this._break();
      return;
    }
    var func = arr.shift();
    if (arr.length) {
      var self = this;
      this._slip(_or, [ function() { _tryAny.apply(self, [arr]); } ]);
    }
    try {
      this._repair();
      func.apply(this);
    }
    catch (err) {
      this._break(err.toString());
    }
  }

  function _push(arr, obj) {
    for (var i = 0; i < arr.length; i++) if (arr[i] === obj) return;
    arr.push(obj);
  }
  function _pop(arr, obj) {
    for (var i = 0; i < arr.length; i++) if (arr[i] === obj) {
      arr.splice(i, 1);
      return;
    }
  }

  // _J: JZZ object
  function _J() {
    _R.apply(this);
  }
  _J.prototype = new _R();

  function _clone(obj, key, val) {
    if (typeof key == 'undefined') return _clone(obj, [], []);
    if (obj instanceof Object) {
      for (var i = 0; i < key.length; i++) if (key[i] === obj) return val[i];
      var ret;
      if (obj instanceof Array) ret = []; else ret = {};
      key.push(obj); val.push(ret);
      for(var k in obj) if (obj.hasOwnProperty(k)) ret[k] = _clone(obj[k], key, val);
      return ret;
    }
    return obj;
  }
  _J.prototype._info = { name: 'JZZ.js', ver: _version, version: _version, inputs: [], outputs: [] };

  var _outs = [];
  var _ins = [];
  var _outsW = [];
  var _insW = [];

  function _postRefresh() {
    _jzz._info.engine = _engine._type;
    _jzz._info.version = _engine._version;
    _jzz._info.sysex = _engine._sysex;
    _jzz._info.inputs = [];
    _jzz._info.outputs = [];
    _outs = [];
    _ins = [];
    _engine._allOuts = {};
    _engine._allIns = {};
    var i, x;
    for (i = 0; i < _engine._outs.length; i++) {
      x = _engine._outs[i];
      x.engine = _engine;
      _engine._allOuts[x.name] = x;
      _jzz._info.outputs.push({
        id: x.name,
        name: x.name,
        manufacturer: x.manufacturer,
        version: x.version,
        engine: _engine._type
      });
      _outs.push(x);
    }
    for (i = 0; i < _virtual._outs.length; i++) {
      x = _virtual._outs[i];
      _jzz._info.outputs.push({
        id: x.name,
        name: x.name,
        manufacturer: x.manufacturer,
        version: x.version,
        engine: x.type
      });
      _outs.push(x);
    }
    for (i = 0; i < _engine._ins.length; i++) {
      x = _engine._ins[i];
      x.engine = _engine;
      _engine._allIns[x.name] = x;
      _jzz._info.inputs.push({
        id: x.name,
        name: x.name,
        manufacturer: x.manufacturer,
        version: x.version,
        engine: _engine._type
      });
      _ins.push(x);
    }
    for (i = 0; i < _virtual._ins.length; i++) {
      x = _virtual._ins[i];
      _jzz._info.inputs.push({
        id: x.name,
        name: x.name,
        manufacturer: x.manufacturer,
        version: x.version,
        engine: x.type
      });
      _ins.push(x);
    }
    if (_jzz._watcher && _jzz._watcher._handles.length) {
      var diff = _diff(_insW, _outsW, _jzz._info.inputs, _jzz._info.outputs);
       if (diff) {
        for (j = 0; j < diff.inputs.removed.length; j++) {
          x = _engine._inMap[diff.inputs.removed[j].name];
          if (x) x._closeAll();
        }
        for (j = 0; j < diff.outputs.removed.length; j++) {
          x = _engine._outMap[diff.outputs.removed[j].name];
          if (x) x._closeAll();
        }
        _fireW(diff);
      }
    }
    _insW = _jzz._info.inputs;
    _outsW = _jzz._info.outputs;
  }
  function _refresh() {
    if (!this._bad) _engine._refresh(this);
  }
  _J.prototype.refresh = function() {
    this._push(_refresh, []);
    return this._thenable();
  };

  function _filterList(q, arr) {
    var i, n;
    if (q instanceof Function) q = q(arr);
    if (!(q instanceof Array)) q = [q];
    var before = [];
    var after = [];
    var etc = arr.slice();
    var a = before;
    for (i = 0; i < q.length; i++) {
      if (typeof q[i] == 'undefined') a = after;
      else if (q[i] instanceof RegExp) for (n = 0; n < etc.length; n++) {
        if (q[i].test(etc[n].name)) {
          a.push(etc[n]);
          etc.splice(n, 1);
          n--;
        }
      }
      else {
        for (n = 0; n < etc.length; n++) if (q[i] + '' === n + '' || q[i] === etc[n].name || (q[i] instanceof Object && q[i].name === etc[n].name)) {
          a.push(etc[n]);
          etc.splice(n, 1);
          n--;
        }
      }
    }
    return a == before ? before : before.concat(etc).concat(after);
  }

  function _notFound(port, q) {
    var msg;
    if (q instanceof RegExp) msg = 'Port matching ' + q + ' not found';
    else if (q instanceof Object || typeof q == 'undefined') msg = 'Port not found';
    else msg = 'Port "' + q + '" not found';
    port._crash(msg);
  }
  function _openMidiOut(port, arg) {
    if (this._bad) port._crash(this._err());
    else {
      var arr = _filterList(arg, _outs);
      if (!arr.length) { _notFound(port, arg); return; }
      var pack = function(x) { return function() { x.engine._openOut(this, x.name); }; };
      for (var i = 0; i < arr.length; i++) arr[i] = pack(arr[i]);
      port._slip(_tryAny, [arr]);
      port._resume();
    }
  }
  _J.prototype.openMidiOut = function(arg) {
    var port = new _M();
    this._push(_refresh, []);
    this._push(_openMidiOut, [port, arg]);
    return port._thenable();
  };
  _J.prototype._openMidiOutNR = function(arg) {
    var port = new _M();
    this._push(_openMidiOut, [port, arg]);
    return port._thenable();
  };

  function _openMidiIn(port, arg) {
    if (this._bad) port._crash(this._err());
    else {
      var arr = _filterList(arg, _ins);
      if (!arr.length) { _notFound(port, arg); return; }
      var pack = function(x) { return function() { x.engine._openIn(this, x.name); }; };
      for (var i = 0; i < arr.length; i++) arr[i] = pack(arr[i]);
      port._slip(_tryAny, [arr]);
      port._resume();
    }
  }
  _J.prototype.openMidiIn = function(arg) {
    var port = new _M();
    this._push(_refresh, []);
    this._push(_openMidiIn, [port, arg]);
    return port._thenable();
  };
  _J.prototype._openMidiInNR = function(arg) {
    var port = new _M();
    this._push(_openMidiIn, [port, arg]);
    return port._thenable();
  };

  function _onChange(watcher, arg) {
    if (this._bad) watcher._crash();
    else {
      watcher._slip(_connectW, [arg]);
      watcher._resume();
    }
  }
  _J.prototype.onChange = function(arg) {
    if (!this._orig._watcher) this._orig._watcher = new _W();
    var watcher = this._orig._watcher._image();
    this._push(_onChange, [watcher, arg]);
    return watcher._thenable();
  };

  _J.prototype._close = function() {
    _engine._close();
  };

  // _M: MIDI-In/Out object
  function _M() {
    _R.apply(this);
    this._handles = [];
    this._outs = [];
  }
  _M.prototype = new _R();
  _M.prototype._filter = function(msg) {
    if (this._orig._mpe) {
      var out;
      var outs = 0;
      if (this._handles && this._handles.length) {
        outs = this._handles.length;
        out = this._handles[0];
      }
      if (this._outs && this._outs.length) {
        outs = this._outs.length;
        out = this._outs[0];
      }
      if (outs == 1 && !out._mpe) {
        msg = this._orig._mpe.filter(msg);
      }
    }
    return msg;
  };
  _M.prototype._receive = function(msg) { this._emit(this._filter(msg)); };
  function _receive(msg) { if (!this._bad) this._receive(msg); }
  _M.prototype.send = function() {
    this._push(_receive, [MIDI.apply(null, arguments)]);
    return this._thenable();
  };
  _M.prototype.note = function(c, n, v, t) {
    this.noteOn(c, n, v);
    if (t > 0) this.wait(t).noteOff(c, n);
    return this._thenable();
  };
  _M.prototype._emit = function(msg) {
    var i;
    for (i = 0; i < this._handles.length; i++) this._handles[i].apply(this, [MIDI(msg)._stamp(this)]);
    for (i = 0; i < this._outs.length; i++) {
      var m = MIDI(msg);
      if (!m._stamped(this._outs[i])) this._outs[i].send(m._stamp(this));
    }
  };
  function _emit(msg) { this._emit(msg); }
  _M.prototype.emit = function(msg) {
    this._push(_emit, [msg]);
    return this._thenable();
  };
  function _connect(arg) {
    if (arg instanceof Function) _push(this._orig._handles, arg);
    else _push(this._orig._outs, arg);
  }
  function _disconnect(arg) {
    if (typeof arg == 'undefined') {
      this._orig._handles = [];
      this._orig._outs = [];
    }
    else if (arg instanceof Function) _pop(this._orig._handles, arg);
    else _pop(this._orig._outs, arg);
  }
  _M.prototype.connect = function(arg) {
    this._push(_connect, [arg]);
    return this._thenable();
  };
  _M.prototype.disconnect = function(arg) {
    this._push(_disconnect, [arg]);
    return this._thenable();
  };
  _M.prototype.connected = function() {
    return this._orig._handles.length + this._orig._outs.length;
  };
  _M.prototype.ch = function(n) {
    if (typeof n == 'undefined') return this;
    _validateChannel(n);
    var chan = new _C(this, n);
    this._push(_kick, [chan]);
    return chan._thenable();
  };
  function _mpe(m, n) {
    if (!this._orig._mpe) this._orig._mpe = new MPE();
    this._orig._mpe.setup(m, n);
  }
  _M.prototype.mpe = function(m, n) {
    if (typeof m == 'undefined' && typeof n == 'undefined') return this;
    MPE.validate(m, n);
    var chan = n ? new _E(this, m, n) : new _C(this, m);
    this._push(_mpe, [m, n]);
    this._push(_kick, [chan]);
    return chan._thenable();
  };
  function _validateChannel(c) {
    if (c != parseInt(c) || c < 0 || c > 15)
      throw RangeError('Bad channel value (must not be less than 0 or more than 15): ' + c);
  }

  // _C: MIDI Channel object
  function _C(port, chan) {
    _M.apply(this);
    this._port = port._orig;
    this._chan = chan;
    _rechain(this, this._port, 'ch');
    _rechain(this, this._port, 'mpe');
    _rechain(this, this._port, 'connect');
    _rechain(this, this._port, 'disconnect');
    _rechain(this, this._port, 'close');
  }
  _C.prototype = new _M();
  _C.prototype.channel = function() { return this._chan; };
  _C.prototype._receive = function(msg) { this._port._receive(msg); };
  _C.prototype.note = function(n, v, t) {
    this.noteOn(n, v);
    if (t) this.wait(t).noteOff(n);
    return this._thenable();
  };

  // _E: MPE Channel object
  function _E(port, m, n) {
    _M.apply(this);
    this._port = port._orig;
    this._master = m;
    this._band = n;
    _rechain(this, this._port, 'ch');
    _rechain(this, this._port, 'mpe');
    _rechain(this, this._port, 'connect');
    _rechain(this, this._port, 'disconnect');
    _rechain(this, this._port, 'close');
  }
  _E.prototype = new _M();
  _E.prototype.channel = function() { return this._master; };
  _E.prototype._receive = function(msg) { this._port._receive(msg); };
  _E.prototype.note = function(n, v, t) {
    this.noteOn(n, v);
    if (t) this.wait(t).noteOff(n);
    return this._thenable();
  };

  // _W: Watcher object ~ MIDIAccess.onstatechange
  function _W() {
    _R.apply(this);
    this._handles = [];
    _rechain(this, _jzz, 'refresh');
    _rechain(this, _jzz, 'openMidiOut');
    _rechain(this, _jzz, 'openMidiIn');
    _rechain(this, _jzz, 'onChange');
    _rechain(this, _jzz, 'close');
  }
  _W.prototype = new _R();
  function _connectW(arg) {
    if (arg instanceof Function) {
      if (!this._orig._handles.length) _engine._watch();
      _push(this._orig._handles, arg);
    }
  }
  function _disconnectW(arg) {
    if (typeof arg == 'undefined') this._orig._handles = [];
    else _pop(this._orig._handles, arg);
    if (!this._orig._handles.length) _engine._unwatch();
  }
  _W.prototype.connect = function(arg) {
    this._push(_connectW, [arg]);
    return this._thenable();
  };
  _W.prototype.disconnect = function(arg) {
    this._push(_disconnectW, [arg]);
    return this._thenable();
  };
  function _changed(x0, y0, x1, y1) {
    var i;
    if (x0.length != x1.length || y0.length != y1.length) return true;
    for (i = 0; i < x0.length; i++) if (x0[i].name != x1[i].name) return true;
    for (i = 0; i < y0.length; i++) if (y0[i].name != y1[i].name) return true;
    return false;
  }
  function _diff(x0, y0, x1, y1) {
    if (!_changed(x0, y0, x1, y1)) return;
    var ax = []; // added
    var ay = [];
    var rx = []; // removed
    var ry = [];
    var i;
    var h = {};
    for (i = 0; i < x0.length; i++) h[x0[i].name] = true;
    for (i = 0; i < x1.length; i++) if (!h[x1[i].name]) ax.push(x1[i]);
    h = {};
    for (i = 0; i < x1.length; i++) h[x1[i].name] = true;
    for (i = 0; i < x0.length; i++) if (!h[x0[i].name]) rx.push(x0[i]);
    h = {};
    for (i = 0; i < y0.length; i++) h[y0[i].name] = true;
    for (i = 0; i < y1.length; i++) if (!h[y1[i].name]) ay.push(y1[i]);
    h = {};
    for (i = 0; i < y1.length; i++) h[y1[i].name] = true;
    for (i = 0; i < y0.length; i++) if (!h[y0[i].name]) ry.push(y0[i]);
    return { inputs: { added: ax, removed: rx }, outputs: { added: ay, removed: ry } };
  }
  function _fireW(arg) {
    for (i = 0; i < _jzz._watcher._handles.length; i++) _jzz._watcher._handles[i].apply(_jzz, [arg]);
  }

  var _jzz;
  var _engine = { _outs: [], _ins: [] };
  var _virtual = { _outs: [], _ins: [] };

  // Node.js
  function _tryNODE() {
    if (typeof module != 'undefined' && module.exports) {
      _initNode(require('jazz-midi'));
      return;
    }
    this._break();
  }
  // Jazz-Plugin
  function _tryJazzPlugin() {
    var div = document.createElement('div');
    div.style.visibility = 'hidden';
    document.body.appendChild(div);
    var obj = document.createElement('object');
    obj.style.visibility = 'hidden';
    obj.style.width = '0px'; obj.style.height = '0px';
    obj.classid = 'CLSID:1ACE1618-1C7D-4561-AEE1-34842AA85E90';
    obj.type = 'audio/x-jazz';
    document.body.appendChild(obj);
    if (obj.isJazz) {
      _initJazzPlugin(obj);
      return;
    }
    this._break();
  }

  // Web MIDI API
  var _navigator;
  var _requestMIDIAccess;
  if (typeof navigator !== 'undefined' && navigator.requestMIDIAccess) {
    _navigator = navigator;
    _requestMIDIAccess = navigator.requestMIDIAccess;
    try {
      if (_requestMIDIAccess.toString().indexOf('JZZ(') != -1) _requestMIDIAccess = undefined;
    }
    catch (err) {}
  }
  function _tryWebMIDI() {
    if (_requestMIDIAccess) {
      var self = this;
      var onGood = function(midi) {
        _initWebMIDI(midi);
        self._resume();
      };
      var onBad = function(msg) {
        self._crash(msg);
      };
      var opt = {};
      _requestMIDIAccess.call(_navigator, opt).then(onGood, onBad);
      this._pause();
      return;
    }
    this._break();
  }
  function _tryWebMIDIsysex() {
    if (_requestMIDIAccess) {
      var self = this;
      var onGood = function(midi) {
        _initWebMIDI(midi, true);
        self._resume();
      };
      var onBad = function(msg) {
        self._crash(msg);
      };
      var opt = {sysex:true};
      _requestMIDIAccess.call(_navigator, opt).then(onGood, onBad);
      this._pause();
      return;
    }
    this._break();
  }
  // Web-extension
  function _tryCRX() {
    var self = this;
    var inst;
    var msg;
    function eventHandle() {
      inst = true;
      if (!msg) msg = document.getElementById('jazz-midi-msg');
      if (!msg) return;
      var a = [];
      try { a = JSON.parse(msg.innerText); } catch (err) {}
      msg.innerText = '';
      document.removeEventListener('jazz-midi-msg', eventHandle);
      if (a[0] === 'version') {
        _initCRX(msg, a[2]);
        self._resume();
      }
      else {
        self._crash();
      }
    }
    this._pause();
    document.addEventListener('jazz-midi-msg', eventHandle);
    try { document.dispatchEvent(new Event('jazz-midi')); } catch (err) {}
    _schedule(function() { if (!inst) self._crash(); });
  }

  function _zeroBreak() {
    this._pause();
    var self = this;
    _schedule(function() { self._crash(); });
  }

  function _filterEngines(opt) {
    var ret = [];
    var arr = _filterEngineNames(opt);
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] == 'webmidi') {
        if (opt && opt.sysex === true) ret.push(_tryWebMIDIsysex);
        if (!opt || opt.sysex !== true || opt.degrade === true) ret.push(_tryWebMIDI);
      }
      else if (arr[i] == 'node') { ret.push(_tryNODE); ret.push(_zeroBreak); }
      else if (arr[i] == 'extension') ret.push(_tryCRX);
      else if (arr[i] == 'plugin') ret.push(_tryJazzPlugin);
    }
    ret.push(_initNONE);
    return ret;
  }

  function _filterEngineNames(opt) {
    var web = ['node', 'extension', 'plugin', 'webmidi'];
    if (!opt || !opt.engine) return web;
    var arr = opt.engine instanceof Array ? opt.engine : [opt.engine];
    var dup = {};
    var none;
    var etc;
    var head = [];
    var tail = [];
    var i;
    for (i = 0; i < arr.length; i++) {
      var name = arr[i].toString().toLowerCase();
      if (dup[name]) continue;
      dup[name] = true;
      if (name === 'none') none = true;
      if (name === 'etc' || typeof name == 'undefined') etc = true;
      if (etc) tail.push(name); else head.push(name);
      _pop(web, name);
    }
    if (etc || head.length || tail.length) none = false;
    return none ? [] : head.concat(etc ? web : tail);
  }

  function _initJZZ(opt) {
    _initAudioContext();
    _jzz = new _J();
    _jzz._options = opt;
    _jzz._push(_tryAny, [_filterEngines(opt)]);
    _jzz.refresh();
    _jzz._resume();
  }

  function _initNONE() {
    _engine._type = 'none';
    _engine._version = _version;
    _engine._sysex = true;
    _engine._outs = [];
    _engine._ins = [];
    _engine._refresh = function() { _postRefresh(); };
    _engine._watch = function() {};
    _engine._unwatch = function() {};
    _engine._close = function() {};
  }
  // common initialization for Jazz-Plugin and jazz-midi
  function _initEngineJP() {
    _engine._inArr = [];
    _engine._outArr = [];
    _engine._inMap = {};
    _engine._outMap = {};
    _engine._outsW = [];
    _engine._insW = [];
    _engine._version = _engine._main.version;
    _engine._sysex = true;
    var watcher;
    function _closeAll() {
      for (var i = 0; i < this.clients.length; i++) this._close(this.clients[i]);
    }
    _engine._refresh = function() {
      _engine._outs = [];
      _engine._ins = [];
      var i, x;
      for (i = 0; (x = _engine._main.MidiOutInfo(i)).length; i++) {
        _engine._outs.push({ type: _engine._type, name: x[0], manufacturer: x[1], version: x[2] });
      }
      for (i = 0; (x = _engine._main.MidiInInfo(i)).length; i++) {
        _engine._ins.push({ type: _engine._type, name: x[0], manufacturer: x[1], version: x[2] });
      }
      _postRefresh();
    };
    _engine._openOut = function(port, name) {
      var impl = _engine._outMap[name];
      if (!impl) {
        if (_engine._pool.length <= _engine._outArr.length) _engine._pool.push(_engine._newPlugin());
        impl = {
          name: name,
          clients: [],
          info: {
            name: name,
            manufacturer: _engine._allOuts[name].manufacturer,
            version: _engine._allOuts[name].version,
            type: 'MIDI-out',
            sysex: _engine._sysex,
            engine: _engine._type
          },
          _close: function(port) { _engine._closeOut(port); },
          _closeAll: _closeAll,
          _receive: function(a) { if (a.length) this.plugin.MidiOutRaw(a.slice()); }
        };
        var plugin = _engine._pool[_engine._outArr.length];
        impl.plugin = plugin;
        _engine._outArr.push(impl);
        _engine._outMap[name] = impl;
      }
      if (!impl.open) {
        var s = impl.plugin.MidiOutOpen(name);
        if (s !== name) {
          if (s) impl.plugin.MidiOutClose();
          port._break(); return;
        }
        impl.open = true;
      }
      port._orig._impl = impl;
      _push(impl.clients, port._orig);
      port._info = impl.info;
      port._receive = function(arg) { impl._receive(arg); };
      port._close = function() { impl._close(this); };
    };
    _engine._openIn = function(port, name) {
      var impl = _engine._inMap[name];
      if (!impl) {
        if (_engine._pool.length <= _engine._inArr.length) _engine._pool.push(_engine._newPlugin());
        impl = {
          name: name,
          clients: [],
          info: {
            name: name,
            manufacturer: _engine._allIns[name].manufacturer,
            version: _engine._allIns[name].version,
            type: 'MIDI-in',
            sysex: _engine._sysex,
            engine: _engine._type
          },
          _close: function(port) { _engine._closeIn(port); },
          _closeAll: _closeAll,
          handle: function(t, a) {
            for (var i = 0; i < this.clients.length; i++) {
              var msg = MIDI(a);
              this.clients[i]._emit(msg);
            }
          }
        };
        var makeHandle = function(x) { return function(t, a) { x.handle(t, a); }; };
        impl.onmidi = makeHandle(impl);
        var plugin = _engine._pool[_engine._inArr.length];
        impl.plugin = plugin;
        _engine._inArr.push(impl);
        _engine._inMap[name] = impl;
      }
      if (!impl.open) {
        var s = impl.plugin.MidiInOpen(name, impl.onmidi);
        if (s !== name) {
          if (s) impl.plugin.MidiInClose();
          port._break(); return;
        }
        impl.open = true;
      }
      port._orig._impl = impl;
      _push(impl.clients, port._orig);
      port._info = impl.info;
      port._close = function() { impl._close(this); };
    };
    _engine._closeOut = function(port) {
      var impl = port._impl;
      _pop(impl.clients, port._orig);
      if (!impl.clients.length && impl.open) {
        impl.open = false;
        impl.plugin.MidiOutClose();
      }
    };
    _engine._closeIn = function(port) {
      var impl = port._impl;
      _pop(impl.clients, port._orig);
      if (!impl.clients.length && impl.open) {
        impl.open = false;
        impl.plugin.MidiInClose();
      }
    };
    _engine._close = function() {
      for (var i = 0; i < _engine._inArr.length; i++) if (_engine._inArr[i].open) _engine._inArr[i].plugin.MidiInClose();
      _engine._unwatch();
    };
    _engine._watch = function() {
      if (!watcher) watcher = setInterval(function() { _engine._refresh(); }, 250);
    };
    _engine._unwatch = function() {
      if (watcher) clearInterval(watcher);
      watcher = undefined;
    };
  }

  function _initNode(obj) {
    _engine._type = 'node';
    _engine._main = obj;
    _engine._pool = [];
    _engine._newPlugin = function() { return new obj.MIDI(); };
    _initEngineJP();
  }
  function _initJazzPlugin(obj) {
    _engine._type = 'plugin';
    _engine._main = obj;
    _engine._pool = [obj];
    _engine._newPlugin = function() {
      var plg = document.createElement('object');
      plg.style.visibility = 'hidden';
      plg.style.width = '0px'; obj.style.height = '0px';
      plg.classid = 'CLSID:1ACE1618-1C7D-4561-AEE1-34842AA85E90';
      plg.type = 'audio/x-jazz';
      document.body.appendChild(plg);
      return plg.isJazz ? plg : undefined;
    };
    _initEngineJP();
  }
  function _initWebMIDI(access, sysex) {
    _engine._type = 'webmidi';
    _engine._version = 43;
    _engine._sysex = !!sysex;
    _engine._access = access;
    _engine._inMap = {};
    _engine._outMap = {};
    _engine._outsW = [];
    _engine._insW = [];
    var watcher;
    function _closeAll() {
      for (var i = 0; i < this.clients.length; i++) this._close(this.clients[i]);
    }
    _engine._refresh = function() {
      _engine._outs = [];
      _engine._ins = [];
      _engine._access.outputs.forEach(function(port) {
        _engine._outs.push({type: _engine._type, name: port.name, manufacturer: port.manufacturer, version: port.version});
      });
      _engine._access.inputs.forEach(function(port) {
        _engine._ins.push({type: _engine._type, name: port.name, manufacturer: port.manufacturer, version: port.version});
      });
      _postRefresh();
    };
    _engine._openOut = function(port, name) {
      var impl = _engine._outMap[name];
      if (!impl) {
        impl = {
          name: name,
          clients: [],
          info: {
            name: name,
            manufacturer: _engine._allOuts[name].manufacturer,
            version: _engine._allOuts[name].version,
            type: 'MIDI-out',
            sysex: _engine._sysex,
            engine: _engine._type
          },
          _close: function(port) { _engine._closeOut(port); },
          _closeAll: _closeAll,
          _receive: function(a) { if (impl.dev && a.length) this.dev.send(a.slice()); }
        };
      }
      var found;
      _engine._access.outputs.forEach(function(dev) {
        if (dev.name === name) found = dev;
      });
      if (found) {
        impl.dev = found;
        _engine._outMap[name] = impl;
        port._orig._impl = impl;
        _push(impl.clients, port._orig);
        port._info = impl.info;
        port._receive = function(arg) { impl._receive(arg); };
        port._close = function() { impl._close(this); };
        if (impl.dev.open) {
          port._pause();
          impl.dev.open().then(function() {
            port._resume();
          }, function() {
            port._crash();
          });
        }
      }
      else port._break();
    };
    _engine._openIn = function(port, name) {
      var impl = _engine._inMap[name];
      if (!impl) {
        impl = {
          name: name,
          clients: [],
          info: {
            name: name,
            manufacturer: _engine._allIns[name].manufacturer,
            version: _engine._allIns[name].version,
            type: 'MIDI-in',
            sysex: _engine._sysex,
            engine: _engine._type
          },
          _close: function(port) { _engine._closeIn(port); },
          _closeAll: _closeAll,
          handle: function(evt) {
            for (var i = 0; i < this.clients.length; i++) {
              var msg = MIDI([].slice.call(evt.data));
              this.clients[i]._emit(msg);
            }
          }
        };
      }
      var found;
      _engine._access.inputs.forEach(function(dev) {
        if (dev.name === name) found = dev;
      });
      if (found) {
        impl.dev = found;
        var makeHandle = function(x) { return function(evt) { x.handle(evt); }; };
        impl.dev.onmidimessage = makeHandle(impl);
        _engine._inMap[name] = impl;
        port._orig._impl = impl;
        _push(impl.clients, port._orig);
        port._info = impl.info;
        port._close = function() { impl._close(this); };
        if (impl.dev.open) {
          port._pause();
          impl.dev.open().then(function() {
            port._resume();
          }, function() {
            port._crash();
          });
        }
      }
      else port._break();
    };
    _engine._closeOut = function(port) {
      var impl = port._impl;
      _pop(impl.clients, port._orig);
      if (!impl.clients.length) {
        if (impl.dev && impl.dev.close) impl.dev.close();
        impl.dev = undefined;
      }
    };
    _engine._closeIn = function(port) {
      var impl = port._impl;
      _pop(impl.clients, port._orig);
      if (!impl.clients.length) {
        if (impl.dev) {
          impl.dev.onmidimessage = null;
          if (impl.dev.close) impl.dev.close();
        }
        impl.dev = undefined;
      }
    };
    _engine._close = function() {
      _engine._unwatch();
    };
    _engine._watch = function() {
      _engine._access.onstatechange = function() {
        watcher = true;
        _schedule(function() {
          if (watcher) {
            _engine._refresh();
            watcher = false;
          }
        });
      };
    };
    _engine._unwatch = function() {
      _engine._access.onstatechange = undefined;
    };
  }
  function _initCRX(msg, ver) {
    _engine._type = 'extension';
    _engine._version = ver;
    _engine._sysex = true;
    _engine._pool = [];
    _engine._outs = [];
    _engine._ins = [];
    _engine._inArr = [];
    _engine._outArr = [];
    _engine._inMap = {};
    _engine._outMap = {};
    _engine._outsW = [];
    _engine._insW = [];
    _engine.refreshClients = [];
    _engine._msg = msg;
    _engine._newPlugin = function() {
      var plugin = { id: _engine._pool.length };
      _engine._pool.push(plugin);
      if (!plugin.id) plugin.ready = true;
      else document.dispatchEvent(new CustomEvent('jazz-midi', { detail: ['new'] }));
    };
    _engine._newPlugin();
    _engine._refresh = function(client) {
      _engine.refreshClients.push(client);
      client._pause();
      _schedule(function() {
        document.dispatchEvent(new CustomEvent('jazz-midi', { detail: ['refresh'] }));
      });
    };
    function _closeAll() {
      for (var i = 0; i < this.clients.length; i++) this._close(this.clients[i]);
    }
    _engine._openOut = function(port, name) {
      var impl = _engine._outMap[name];
      if (!impl) {
        if (_engine._pool.length <= _engine._outArr.length) _engine._newPlugin();
        var plugin = _engine._pool[_engine._outArr.length];
        impl = {
          name: name,
          clients: [],
          info: {
            name: name,
            manufacturer: _engine._allOuts[name].manufacturer,
            version: _engine._allOuts[name].version,
            type: 'MIDI-out',
            sysex: _engine._sysex,
            engine: _engine._type
          },
          _start: function() { document.dispatchEvent(new CustomEvent('jazz-midi', { detail: ['openout', plugin.id, name] })); },
          _close: function(port) { _engine._closeOut(port); },
          _closeAll: _closeAll,
          _receive: function(a) { if (a.length) { var v = a.slice(); v.splice(0, 0, 'play', plugin.id); document.dispatchEvent(new CustomEvent('jazz-midi', {detail: v})); } }
        };
        impl.plugin = plugin;
        plugin.output = impl;
        _engine._outArr.push(impl);
        _engine._outMap[name] = impl;
      }
      port._orig._impl = impl;
      _push(impl.clients, port._orig);
      port._info = impl.info;
      port._receive = function(arg) { impl._receive(arg); };
      port._close = function() { impl._close(this); };
      if (!impl.open) {
        port._pause();
        if (impl.plugin.ready) impl._start();
      }
    };
    _engine._openIn = function(port, name) {
      var impl = _engine._inMap[name];
      if (!impl) {
        if (_engine._pool.length <= _engine._inArr.length) _engine._newPlugin();
        var plugin = _engine._pool[_engine._inArr.length];
        impl = {
          name: name,
          clients: [],
          info: {
            name: name,
            manufacturer: _engine._allIns[name].manufacturer,
            version: _engine._allIns[name].version,
            type: 'MIDI-in',
            sysex: _engine._sysex,
            engine: _engine._type
          },
          _start: function() { document.dispatchEvent(new CustomEvent('jazz-midi', { detail: ['openin', plugin.id, name] })); },
          _close: function(port) { _engine._closeIn(port); },
          _closeAll: _closeAll
        };
        impl.plugin = plugin;
        plugin.input = impl;
        _engine._inArr.push(impl);
        _engine._inMap[name] = impl;
      }
      port._orig._impl = impl;
      _push(impl.clients, port._orig);
      port._info = impl.info;
      port._close = function() { impl._close(this); };
      if (!impl.open) {
        port._pause();
        if (impl.plugin.ready) impl._start();
      }
    };
    _engine._closeOut = function(port) {
      var impl = port._impl;
      _pop(impl.clients, port._orig);
      if (!impl.clients.length && impl.open) {
        impl.open = false;
        document.dispatchEvent(new CustomEvent('jazz-midi', { detail: ['closeout', impl.plugin.id] }));
      }
    };
    _engine._closeIn = function(port) {
      var impl = port._impl;
      _pop(impl.clients, port._orig);
      if (!impl.clients.length && impl.open) {
        impl.open = false;
        document.dispatchEvent(new CustomEvent('jazz-midi', { detail: ['closein', impl.plugin.id] }));
      }
    };
    _engine._close = function() {
      _engine._unwatch();
    };
    var watcher;
    _engine._watch = function() {
      _engine._insW = _engine._ins;
      _engine._outsW = _engine._outs;
      watcher = setInterval(function() {
        document.dispatchEvent(new CustomEvent('jazz-midi', {detail:['refresh']}));
      }, 250);
    };
    _engine._unwatch = function() {
      clearInterval(watcher);
      watcher = undefined;
    };
    document.addEventListener('jazz-midi-msg', function() {
      var v = _engine._msg.innerText.split('\n');
      var impl, i, j;
      _engine._msg.innerText = '';
      for (i = 0; i < v.length; i++) {
        var a = [];
        try { a = JSON.parse(v[i]); } catch (err) {}
        if (!a.length) continue;
        if (a[0] === 'refresh') {
          if (a[1].ins) {
            for (j = 0; j < a[1].ins.length; j++) a[1].ins[j].type = _engine._type;
            _engine._ins = a[1].ins;
          }
          if (a[1].outs) {
            for (j = 0; j < a[1].outs.length; j++) a[1].outs[j].type = _engine._type;
            _engine._outs = a[1].outs;
          }
          _postRefresh();
          for (j = 0; j < _engine.refreshClients.length; j++) _engine.refreshClients[j]._resume();
          _engine.refreshClients = [];
        }
        else if (a[0] === 'version') {
          var plugin = _engine._pool[a[1]];
          if (plugin) {
            plugin.ready = true;
            if (plugin.input) plugin.input._start();
            if (plugin.output) plugin.output._start();
          }
        }
        else if (a[0] === 'openout') {
          impl = _engine._pool[a[1]].output;
          if (impl) {
            if (a[2] == impl.name) {
              impl.open = true;
              if (impl.clients) for (j = 0; j < impl.clients.length; j++) impl.clients[j]._resume();
            }
            else if (impl.clients) for (j = 0; j < impl.clients.length; j++) impl.clients[j]._crash();
          }
        }
        else if (a[0] === 'openin') {
          impl = _engine._pool[a[1]].input;
          if (impl) {
            if (a[2] == impl.name) {
              impl.open = true;
              if (impl.clients) for (j = 0; j < impl.clients.length; j++) impl.clients[j]._resume();
            }
            else if (impl.clients) for (j = 0; j < impl.clients.length; j++) impl.clients[j]._crash();
          }
        }
        else if (a[0] === 'midi') {
          impl = _engine._pool[a[1]].input;
          if (impl && impl.clients) {
            for (j = 0; j < impl.clients.length; j++) {
              var msg = MIDI(a.slice(3));
              impl.clients[j]._emit(msg);
            }
          }
        }
      }
    });
  }

  var JZZ = function(opt) {
    if (!_jzz) _initJZZ(opt);
    return _jzz._thenable();
  };
  JZZ.JZZ = JZZ;
  JZZ.version = _version;
  JZZ.info = function() { return _J.prototype.info(); };
  JZZ.Widget = function(arg) {
    var obj = new _M();
    if (arg instanceof Object) for (var k in arg) if (arg.hasOwnProperty(k)) obj[k] = arg[k];
    obj._resume();
    return obj;
  };
  _J.prototype.Widget = JZZ.Widget;
  JZZ.addMidiIn = function(name, widget) {
    var info = _clone(widget._info || {});
    info.name = name;
    info.type = info.type || 'javascript';
    info.manufacturer = info.manufacturer || 'virtual';
    info.version = info.version || '0.0';
    var engine = {
      _info: function() { return info; },
      _openIn: function(port, name) {
        widget.connect(port);
        port._info = this._info(name);
        port._close = function() { widget.disconnect(port); };
        port._resume();
      }
    };
    return JZZ.lib.registerMidiIn(name, engine);
  };
  JZZ.addMidiOut = function(name, widget) {
    var info = _clone(widget._info || {});
    info.name = name;
    info.type = info.type || 'javascript';
    info.manufacturer = info.manufacturer || 'virtual';
    info.version = info.version || '0.0';
    var engine = {
      _info: function() { return info; },
      _openOut: function(port, name) {
        port.connect(widget);
        port._info = this._info(name);
        port._close = function() { port.disconnect(); };
        port._resume();
      }
    };
    return JZZ.lib.registerMidiOut(name, engine);
  };

  // JZZ.SMPTE

  function SMPTE() {
    var self = this instanceof SMPTE ? this : self = new SMPTE();
    SMPTE.prototype.reset.apply(self, arguments);
    return self;
  }
  SMPTE.prototype.reset = function(arg) {
    if (arg instanceof SMPTE) {
      this.setType(arg.getType());
      this.setHour(arg.getHour());
      this.setMinute(arg.getMinute());
      this.setSecond(arg.getSecond());
      this.setFrame(arg.getFrame());
      this.setQuarter(arg.getQuarter());
      return this;
    }
    var arr = arg instanceof Array ? arg : arguments;
    this.setType(arr[0]);
    this.setHour(arr[1]);
    this.setMinute(arr[2]);
    this.setSecond(arr[3]);
    this.setFrame(arr[4]);
    this.setQuarter(arr[5]);
    return this;
  };
  function _fixDropFrame() { if (this.type == 29.97 && !this.second && this.frame < 2 && this.minute % 10) this.frame = 2; }
  SMPTE.prototype.isFullFrame = function() { return this.quarter == 0 || this.quarter == 4; };
  SMPTE.prototype.getType = function() { return this.type; };
  SMPTE.prototype.getHour = function() { return this.hour; };
  SMPTE.prototype.getMinute = function() { return this.minute; };
  SMPTE.prototype.getSecond = function() { return this.second; };
  SMPTE.prototype.getFrame = function() { return this.frame; };
  SMPTE.prototype.getQuarter = function() { return this.quarter; };
  SMPTE.prototype.setType = function(x) {
    if (typeof x == 'undefined' || x == 24) this.type = 24;
    else if (x == 25) this.type = 25;
    else if (x == 29.97) { this.type = 29.97; _fixDropFrame.apply(this); }
    else if (x == 30) this.type = 30;
    else throw RangeError('Bad SMPTE frame rate: ' + x);
    if (this.frame >= this.type) this.frame = this.type - 1; // could not be more than 29
    return this;
  };
  SMPTE.prototype.setHour = function(x) {
    if (typeof x == 'undefined') x = 0;
    if (x != parseInt(x) || x < 0 || x >= 24) throw RangeError('Bad SMPTE hours value: ' + x);
    this.hour = x;
    return this;
  };
  SMPTE.prototype.setMinute = function(x) {
    if (typeof x == 'undefined') x = 0;
    if (x != parseInt(x) || x < 0 || x >= 60) throw RangeError('Bad SMPTE minutes value: ' + x);
    this.minute = x;
    _fixDropFrame.apply(this);
    return this;
  };
  SMPTE.prototype.setSecond = function(x) {
    if (typeof x == 'undefined') x = 0;
    if (x != parseInt(x) || x < 0 || x >= 60) throw RangeError('Bad SMPTE seconds value: ' + x);
    this.second = x;
    _fixDropFrame.apply(this);
    return this;
  };
  SMPTE.prototype.setFrame = function(x) {
    if (typeof x == 'undefined') x = 0;
    if (x != parseInt(x) || x < 0 || x >= this.type) throw RangeError('Bad SMPTE frame number: ' + x);
    this.frame = x;
    _fixDropFrame.apply(this);
    return this;
  };
  SMPTE.prototype.setQuarter = function(x) {
    if (typeof x == 'undefined') x = 0;
    if (x != parseInt(x) || x < 0 || x >= 8) throw RangeError('Bad SMPTE quarter frame: ' + x);
    this.quarter = x;
    return this;
  };
  SMPTE.prototype.incrFrame = function() {
    this.frame++;
    if (this.frame >= this.type) {
      this.frame = 0;
      this.second++;
      if (this.second >= 60) {
        this.second = 0;
        this.minute++;
        if (this.minute >= 60) {
          this.minute = 0;
          this.hour = this.hour >= 23 ? 0 : this.hour + 1;
        }
      }
    }
    _fixDropFrame.apply(this);
    return this;
  };
  SMPTE.prototype.decrFrame = function() {
    if (!this.second && this.frame == 2 && this.type == 29.97 && this.minute % 10) this.frame = 0; // drop-frame
    this.frame--;
    if (this.frame < 0) {
      this.frame = this.type == 29.97 ? 29 : this.type - 1;
      this.second--;
      if (this.second < 0) {
        this.second = 59;
        this.minute--;
        if (this.minute < 0) {
          this.minute = 59;
          this.hour = this.hour ? this.hour - 1 : 23;
        }
      }
    }
    return this;
  };
  SMPTE.prototype.incrQF = function() {
    this.backwards = false;
    this.quarter = (this.quarter + 1) & 7;
    if (this.quarter == 0 || this.quarter == 4) this.incrFrame();
    return this;
  };
  SMPTE.prototype.decrQF = function() {
    this.backwards = true;
    this.quarter = (this.quarter + 7) & 7;
    if (this.quarter == 3 || this.quarter == 7) this.decrFrame();
    return this;
  };
  function _825(a) { return [[24, 25, 29.97, 30][(a[7] >> 1) & 3], ((a[7] & 1) << 4) | a[6], (a[5] << 4) | a[4], (a[3] << 4) | a[2], (a[1] << 4) | a[0]]; }
  SMPTE.prototype.read = function(m) {
    if (!(m instanceof MIDI)) m = MIDI.apply(null, arguments);
    if (m[0] == 0xf0 && m[1] == 0x7f && m[3] == 1 && m[4] == 1 && m[9] == 0xf7) {
      this.type = [24, 25, 29.97, 30][(m[5] >> 5) & 3];
      this.hour = m[5] & 31;
      this.minute = m[6];
      this.second = m[7];
      this.frame = m[8];
      this.quarter = 0;
      this._ = undefined;
      this._b = undefined;
      this._f = undefined;
      return true;
    }
    if (m[0] == 0xf1 && typeof m[1] != 'undefined') {
      var q = m[1] >> 4;
      var n = m[1] & 15;
      if (q == 0) {
        if (this._ == 7) {
          if (this._f == 7) {
            this.reset(_825(this._a));
            this.incrFrame();
          }
          this.incrFrame();
        }
      }
      else if (q == 3) {
        if (this._ == 4) {
          this.decrFrame();
        }
      }
      else if (q == 4) {
        if (this._ == 3) {
          this.incrFrame();
        }
      }
      else if (q == 7) {
        if (this._ === 0) {
          if (this._b === 0) {
            this.reset(_825(this._a));
            this.decrFrame();
          }
          this.decrFrame();
        }
      }
      if (!this._a) this._a = [];
      this._a[q] = n;
      this._f = this._f === q - 1 || q == 0 ? q : undefined;
      this._b = this._b === q + 1 || q == 7 ? q : undefined;
      this._ = q;
      this.quarter = q;
      return true;
    }
    return false;
  };
  function _mtc(t) {
    if (!t.backwards && t.quarter >= 4) t.decrFrame(); // continue encoding previous frame
    else if (t.backwards && t.quarter < 4) t.incrFrame();
    var ret;
    switch (t.quarter >> 1) {
      case 0: ret = t.frame; break;
      case 1: ret = t.second; break;
      case 2: ret = t.minute; break;
      default: ret = t.hour;
    }
    if (t.quarter & 1) ret >>= 4;
    else ret &= 15;
    if (t.quarter == 7) {
      if (t.type == 25) ret |= 2;
      else if (t.type == 29.97) ret |= 4;
      else if (t.type == 30) ret |= 6;
    }
    // restore original t
    if (!t.backwards && t.quarter >= 4) t.incrFrame();
    else if (t.backwards && t.quarter < 4) t.decrFrame();
    return ret | (t.quarter << 4);
  }
  function _hrtype(t) {
    if (t.type == 25) return t.hour | 0x20;
    if (t.type == 29.97) return t.hour | 0x40;
    if (t.type == 30) return t.hour | 0x60;
    return t.hour;
  }
  function _dec(x) { return x < 10 ? '0' + x : x; }
  function _smptetxt(x) {
    var arr = [];
    for (var i = 0; i < x.length; i++) arr[i] = _dec(x[i]);
    return arr.join(':');
  }
  SMPTE.prototype.toString = function() { return _smptetxt([this.hour, this.minute, this.second, this.frame]); };
  JZZ.SMPTE = SMPTE;

  // JZZ.MIDI

  function MIDI(arg) {
    var self = this instanceof MIDI ? this : self = new MIDI();
    var i;
    if (arg instanceof MIDI) {
      self._from = arg._from.slice();
      for (i in arg) if (arg.hasOwnProperty(i) && i != '_from') self[i] = arg[i];
      return self;
    }
    else self._from = [];
    if (typeof arg == 'undefined') return self;
    var arr = arg instanceof Array ? arg : arguments;
    for (i = 0; i < arr.length; i++) {
      n = arr[i];
      if (i == 1) {
        if (self[0] >= 0x80 && self[0] <= 0xAF) n = MIDI.noteValue(n);
        if (self[0] >= 0xC0 && self[0] <= 0xCF) n = MIDI.programValue(n);
      }
      if (n != parseInt(n) || n < 0 || n > 255) _throw(arr[i]);
      self.push(n);
    }
    return self;
  }
  MIDI.prototype = [];
  MIDI.prototype.constructor = MIDI;
  var _noteNum = {};
  MIDI.noteValue = function(x) { return typeof x == 'undefined' ? undefined : _noteNum[x.toString().toLowerCase()]; };
  MIDI.programValue = function(x) { return x; };
  MIDI.freq = function(n, a) {
    if (typeof a == 'undefined') a = 440.0;
    return (a * Math.pow(2, (_7b(MIDI.noteValue(n), n) - 69.0) / 12.0));
  };

  var _noteMap = { c:0, d:2, e:4, f:5, g:7, a:9, b:11, h:11 };
  for (k in _noteMap) {
    if (!_noteMap.hasOwnProperty(k)) continue;
    for (n = 0; n < 12; n++) {
      m = _noteMap[k] + n * 12;
      if (m > 127) break;
      _noteNum[k+n] = m;
      if (m > 0) { _noteNum[k + 'b' + n] = m - 1; _noteNum[k + 'bb' + n] = m - 2; }
      if (m < 127) { _noteNum[k + '#' + n] = m + 1; _noteNum[k + '##' + n] = m + 2; }
    }
  }
  for (n = 0; n < 128; n++) _noteNum[n] = n;
  function _throw(x) { throw RangeError('Bad MIDI value: ' + x); }
  function _ch(c) { _validateChannel(c); return parseInt(c); }
  function _7b(n, m) { if (n != parseInt(n) || n < 0 || n > 0x7f) _throw(typeof m == 'undefined' ? n : m); return parseInt(n); }
  function _8b(n, m) { if (n != parseInt(n) || n < 0 || n > 0xff) _throw(typeof m == 'undefined' ? n : m); return parseInt(n); }
  function _lsb(n) { if (n != parseInt(n) || n < 0 || n > 0x3fff) _throw(n); return parseInt(n) & 0x7f; }
  function _msb(n) { if (n != parseInt(n) || n < 0 || n > 0x3fff) _throw(n); return parseInt(n) >> 7; }
  function _8bs(s) { s = '' + s; for (var i = 0; i < s.length; i++) if (s.charCodeAt(i) > 255) _throw(s[i]); return s; }
  var _helperCH = {
    noteOff: function(c, n, v) { if (typeof v == 'undefined') v = 64; return [0x80 + _ch(c), _7b(MIDI.noteValue(n), n), _7b(v)]; },
    noteOn: function(c, n, v) { if (typeof v == 'undefined') v = 127; return [0x90 + _ch(c), _7b(MIDI.noteValue(n), n), _7b(v)]; },
    aftertouch: function(c, n, v) { return [0xA0 + _ch(c), _7b(MIDI.noteValue(n), n), _7b(v)]; },
    control: function(c, n, v) { return [0xB0 + _ch(c), _7b(n), _7b(v)]; },
    program: function(c, n) { return [0xC0 + _ch(c), _7b(MIDI.programValue(n), n)]; },
    pressure: function(c, n) { return [0xD0 + _ch(c), _7b(n)]; },
    pitchBend: function(c, n) { return [0xE0 + _ch(c), _lsb(n), _msb(n)]; },
    bankMSB: function(c, n) { return [0xB0 + _ch(c), 0x00, _7b(n)]; },
    bankLSB: function(c, n) { return [0xB0 + _ch(c), 0x20, _7b(n)]; },
    modMSB: function(c, n) { return [0xB0 + _ch(c), 0x01, _7b(n)]; },
    modLSB: function(c, n) { return [0xB0 + _ch(c), 0x21, _7b(n)]; },
    breathMSB: function(c, n) { return [0xB0 + _ch(c), 0x02, _7b(n)]; },
    breathLSB: function(c, n) { return [0xB0 + _ch(c), 0x22, _7b(n)]; },
    footMSB: function(c, n) { return [0xB0 + _ch(c), 0x04, _7b(n)]; },
    footLSB: function(c, n) { return [0xB0 + _ch(c), 0x24, _7b(n)]; },
    portamentoMSB: function(c, n) { return [0xB0 + _ch(c), 0x05, _7b(n)]; },
    portamentoLSB: function(c, n) { return [0xB0 + _ch(c), 0x25, _7b(n)]; },
    volumeMSB: function(c, n) { return [0xB0 + _ch(c), 0x07, _7b(n)]; },
    volumeLSB: function(c, n) { return [0xB0 + _ch(c), 0x27, _7b(n)]; },
    balanceMSB: function(c, n) { return [0xB0 + _ch(c), 0x08, _7b(n)]; },
    balanceLSB: function(c, n) { return [0xB0 + _ch(c), 0x28, _7b(n)]; },
    panMSB: function(c, n) { return [0xB0 + _ch(c), 0x0A, _7b(n)]; },
    panLSB: function(c, n) { return [0xB0 + _ch(c), 0x2A, _7b(n)]; },
    expressionMSB: function(c, n) { return [0xB0 + _ch(c), 0x0B, _7b(n)]; },
    expressionLSB: function(c, n) { return [0xB0 + _ch(c), 0x2B, _7b(n)]; },
    damper: function(c, b) { return [0xB0 + _ch(c), 0x40, b ? 127 : 0]; },
    portamento: function(c, b) { return [0xB0 + _ch(c), 0x41, b ? 127 : 0]; },
    sostenuto: function(c, b) { return [0xB0 + _ch(c), 0x42, b ? 127 : 0]; },
    soft: function(c, b) { return [0xB0 + _ch(c), 0x43, b ? 127 : 0]; },
    allSoundOff: function(c) { return [0xB0 + _ch(c), 0x78, 0]; },
    allNotesOff: function(c) { return [0xB0 + _ch(c), 0x7b, 0]; },
  };
  var _helperNC = { // no channel
    mtc: function(t) { return [0xF1, _mtc(t)]; },
    songPosition: function(n) { return [0xF2, _lsb(n), _msb(n)]; },
    songSelect: function(n) { return [0xF3, _7b(n)]; },
    tune: function() { return [0xF6]; },
    clock: function() { return [0xF8]; },
    start: function() { return [0xFA]; },
    continue: function() { return [0xFB]; },
    stop: function() { return [0xFC]; },
    active: function() { return [0xFE]; },
    sxIdRequest: function() { return [0xF0, 0x7E, 0x7F, 0x06, 0x01, 0xF7]; },
    sxFullFrame: function(t) { return [0xF0, 0x7F, 0x7F, 0x01, 0x01, _hrtype(t), t.getMinute(), t.getSecond(), t.getFrame(), 0xF7]; },
    reset: function() { return [0xFF]; },
  };
  function _smf(ff, dd) {
    var midi = new MIDI();
    midi.ff = _8b(ff);
    midi.dd = typeof dd == 'undefined' ? '' : _8bs(dd);
    return midi;
  }
  var _helperSMF = { // Standard MIDI File events
    smf: function(arg) {
      if (arg instanceof MIDI) return new MIDI(arg);
      var arr = arg instanceof Array ? arg : arguments;
      var ff = _8b(arr[0]);
      var dd = '';
      if (arr.length == 2) dd = _2s(arr[1]);
      else if (arr.length > 2) dd = _2s(Array.prototype.slice.call(arr, 1));
      return _smf(ff, dd);
    },
    smfSeqNumber: function(dd) {
      if (dd == parseInt(dd)) {
        if (dd < 0 || dd > 0xffff) throw RangeError('Sequence number out of range: ' + dd);
        dd = String.fromCharCode(dd >> 8) + String.fromCharCode(dd & 0xff);
      }
      else {
        dd = '' + dd;
        if (dd.length == 0) dd = '\x00\x00';
        else if (dd.length == 1) dd = '\x00' + dd;
        else if (dd.length > 2) throw RangeError('Sequence number out of range: ' + _smftxt(dd));
      }
      return _smf(0, dd);
    },
    smfText: function(dd) { return _smf(1, JZZ.lib.toUTF8(dd)); },
    smfCopyright: function(dd) { return _smf(2, JZZ.lib.toUTF8(dd)); },
    smfSeqName: function(dd) { return _smf(3, JZZ.lib.toUTF8(dd)); },
    smfInstrName: function(dd) { return _smf(4, JZZ.lib.toUTF8(dd)); },
    smfLyric: function(dd) { return _smf(5, JZZ.lib.toUTF8(dd)); },
    smfMarker: function(dd) { return _smf(6, JZZ.lib.toUTF8(dd)); },
    smfCuePoint: function(dd) { return _smf(7, JZZ.lib.toUTF8(dd)); },
    smfProgName: function(dd) { return _smf(8, JZZ.lib.toUTF8(dd)); },
    smfDevName: function(dd) { return _smf(9, JZZ.lib.toUTF8(dd)); },
    smfChannelPrefix: function(dd) {
      if (dd == parseInt(dd)) {
        _validateChannel(dd);
        dd = String.fromCharCode(dd);
      }
      else {
        dd = '' + dd;
        if (dd.length == 0) dd = '\x00';
        else if (dd.length > 1 || dd.charCodeAt(0) > 15) throw RangeError('Channel number out of range: ' + _smftxt(dd));
      }
      return _smf(32, dd);
    },
    smfMidiPort: function(dd) {
      if (dd == parseInt(dd)) {
        if (dd < 0 || dd > 127) throw RangeError('Port number out of range: ' + dd);
        dd = String.fromCharCode(dd);
      }
      else {
        dd = '' + dd;
        if (dd.length == 0) dd = '\x00';
        else if (dd.length > 1 || dd.charCodeAt(0) > 127) throw RangeError('Port number out of range: ' + _smftxt(dd));
      }
      return _smf(33, dd);
    },
    smfEndOfTrack: function(dd) {
      if (_2s(dd) != '') throw RangeError('Unexpected data: ' + _smftxt(_2s(dd)));
      return _smf(47);
    },
    smfTempo: function(dd) { // microseconds per quarter note
      if (('' + dd).length == 3) return _smf(81, dd);
      if (dd == parseInt(dd) && dd > 0 && dd <= 0xffffff) {
        return _smf(81, String.fromCharCode(dd >> 16) + String.fromCharCode((dd >> 8) & 0xff) + String.fromCharCode(dd & 0xff));
      }
      throw RangeError('Out of range: ' + _smftxt(_2s(dd)));
    },
    smfBPM: function(bpm) { return _helperSMF.smfTempo(Math.round(60000000.0 / bpm)); },
    smfSMPTE: function(dd) {
      if (dd instanceof SMPTE) return _smf(84, String.fromCharCode(dd.hour) + String.fromCharCode(dd.minute) + String.fromCharCode(dd.second) + String.fromCharCode(dd.frame) + String.fromCharCode((dd.quarter % 4) * 25));
      var s = '' + dd;
      if (s.length == 5) {
        return _smf(84, dd);
      }
      var arr = dd instanceof Array ? dd : Array.prototype.slice.call(arguments);
      arr.splice(0, 0, 30);
      return _helperSMF.smfSMPTE(new SMPTE(arr));
    },
    smfTimeSignature: function(a, b, c, d) {
      var nn, dd, cc, bb;
      var m = ('' + a ).match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/);
      if (m) {
        nn = parseInt(m[1]);
        dd = parseInt(m[2]);
        if (nn > 0 && nn <= 0xff && dd && !(dd & (dd - 1))) {
          cc = dd; dd = 0;
          for (cc >>= 1; cc; cc >>= 1) dd++;
          cc = b == parseInt(b) ? b : 24;
          bb = c == parseInt(c) ? c : 8;
          return _smf(88, String.fromCharCode(nn) + String.fromCharCode(dd) + String.fromCharCode(cc) + String.fromCharCode(bb));
        }
        else if (('' + a ).length == 4) return _smf(88, a);
      }
      else if (a == parseInt(a) && b == parseInt(b) && b && !(b & (b - 1))) {
        nn = a;
        dd = 0;
        cc = b;
        for (cc >>= 1; cc; cc >>= 1) dd++;
        cc = c == parseInt(c) ? c : 24;
        bb = d == parseInt(d) ? d : 8;
        return _smf(88, String.fromCharCode(nn) + String.fromCharCode(dd) + String.fromCharCode(cc) + String.fromCharCode(bb));
      }
      else if (('' + a ).length == 4) return _smf(88, a);
      throw RangeError('Wrong time signature: ' + _smftxt(_2s(a)));
    },
    smfKeySignature: function(dd) {
      dd = '' + dd;
      var m = dd.match(/^\s*([A-H][b#]?)\s*(|maj|major|dur|m|min|minor|moll)\s*$/i);
      if (m) {
        var sf = {
          CB: 0, GB: 1, DB: 2, AB: 3, EB: 4, BB: 5, F: 6, C: 7, G: 8, D: 9, A: 10,
          E:11, B: 12, H: 12, 'F#': 13, 'C#': 14, 'G#': 15, 'D#': 16, 'A#': 17
        }[m[1].toUpperCase()];
        var mi = { '': 0, MAJ: 0, MAJOR: 0, DUR: 0, M: 1, MIN: 1, MINOR: 1, MOLL: 1}[m[2].toUpperCase()];
        if (typeof sf != 'undefined' && typeof mi != 'undefined') {
          if (mi) sf -= 3;
          sf -= 7;
          if (sf >= -7 && sf < 0) dd = String.fromCharCode(256 + sf) + String.fromCharCode(mi);
          else if (sf >= 0 && sf <= 7) dd = String.fromCharCode(sf) + String.fromCharCode(mi);
        }
      }
      if (dd.length == 2 && dd.charCodeAt(1) <= 1 && (dd.charCodeAt(0) <= 7 || dd.charCodeAt(0) <= 255 && dd.charCodeAt(0) >= 249)) return _smf(89, dd);
      throw RangeError('Incorrect key signature: ' + _smftxt(dd));
    },
    smfSequencer: function(dd) { return _smf(127, _2s(dd)); }
  };

  function _copyPortHelper(M, name, func) {
    M.prototype[name] = function() { this.send(func.apply(0, arguments)); return this; };
  }
  function _copyChannelHelper(C, name, func) {
    C.prototype[name] = function() {
      this.send(func.apply(0, [this._chan].concat(Array.prototype.slice.call(arguments)))); return this;
    };
  }
  function _copyHelperNC(name, func) {
    MIDI[name] = function() { return new MIDI(func.apply(0, arguments)); };
  }
  function _copyHelperSMF(name, func) {
    MIDI[name] = function() { return func.apply(0, arguments); };
  }
  function _copyHelperCH(name, func) {
    _copyHelperNC(name, func);
    _E.prototype[name] = function() {
      var chan;
      var args = Array.prototype.slice.call(arguments);
      if (args.length < func.length) args = [this._master].concat(args);
      else {
        chan = _7b(MIDI.noteValue(args[0], args[0]));
        args[0] = this._master;
      }
      var msg = func.apply(0, args);
      msg.mpe = chan;
      this.send(msg);
      return this;
    };
  }
  for (k in _helperNC) if (_helperNC.hasOwnProperty(k)) _copyHelperNC(k, _helperNC[k]);
  for (k in _helperSMF) if (_helperSMF.hasOwnProperty(k)) _copyHelperSMF(k, _helperSMF[k]);
  for (k in _helperCH) if (_helperCH.hasOwnProperty(k)) _copyHelperCH(k, _helperCH[k]);
  function _copyMidiHelpers(M, C) {
    for (k in _helperNC) if (_helperNC.hasOwnProperty(k)) _copyPortHelper(M, k, _helperNC[k]);
    for (k in _helperSMF) if (_helperSMF.hasOwnProperty(k)) _copyPortHelper(M, k, _helperSMF[k]);
    for (k in _helperCH) if (_helperCH.hasOwnProperty(k)) _copyPortHelper(M, k, _helperCH[k]);
    if (C) for (k in _helperCH) if (_helperCH.hasOwnProperty(k)) _copyChannelHelper(C, k, _helperCH[k]);
  }
  _copyMidiHelpers(_M, _C);

  _E.prototype.noteOn = function(n, v) {
    var msg = MIDI.noteOn(this._master, n, v);
    msg._mpe = msg[1];
    this.send(msg);
    return this;
  };
  _E.prototype.noteOff = function(n, v) {
    var msg = MIDI.noteOff(this._master, n, v);
    msg._mpe = msg[1];
    this.send(msg);
    return this;
  };
  _E.prototype.aftertouch = function(n, v) {
    var msg = MIDI.aftertouch(this._master, n, v);
    msg._mpe = msg[1];
    this.send(msg);
    return this;
  };

  var _channelMap = { a:10, b:11, c:12, d:13, e:14, f:15, A:10, B:11, C:12, D:13, E:14, F:15 };
  for (k = 0; k < 16; k++) _channelMap[k] = k;
  MIDI.prototype.getChannel = function() {
    if (this.ff == 0x20 && this.dd.length == 1 && this.dd.charCodeAt(0) < 16) return this.dd.charCodeAt(0);
    var c = this[0];
    if (typeof c == 'undefined' || c < 0x80 || c > 0xef) return;
    return c & 15;
  };
  MIDI.prototype.setChannel = function(x) {
    x = _channelMap[x];
    if (typeof x == 'undefined') return this;
    if (this.ff == 0x20) this.dd = String.fromCharCode(x);
    else {
      var c = this[0];
      if (typeof c != 'undefined' && c >= 0x80 && c <= 0xef) this[0] = (c & 0xf0) | x;
    }
    return this;
  };
  MIDI.prototype.getNote = function() {
    var c = this[0];
    if (typeof c == 'undefined' || c < 0x80 || c > 0xaf) return;
    return this[1];
  };
  MIDI.prototype.setNote = function(x) {
    var c = this[0];
    if (typeof c == 'undefined' || c < 0x80 || c > 0xaf) return this;
    x = MIDI.noteValue(x);
    if (typeof x != 'undefined') this[1] = x;
    return this;
  };
  MIDI.prototype.getVelocity = function() {
    var c = this[0];
    if (typeof c == 'undefined' || c < 0x80 || c > 0x9f) return;
    return this[2];
  };
  MIDI.prototype.setVelocity = function(x) {
    var c = this[0];
    if (typeof c == 'undefined' || c < 0x80 || c > 0x9f) return this;
    x = parseInt(x);
    if (x >= 0 && x < 128) this[2] = x;
    return this;
  };
  MIDI.prototype.getSysExChannel = function() {
    if (this[0] == 0xf0) return this[2];
  };
  MIDI.prototype.setSysExChannel = function(x) {
    if (this[0] == 0xf0 && this.length > 2) {
      x = parseInt(x);
      if (x >= 0 && x < 128) this[2] = x;
    }
    return this;
  };
  MIDI.prototype.getData = function() {
    if (typeof this.dd != 'undefined') return this.dd.toString();
  };
  MIDI.prototype.setData = function(dd) {
    this.dd = _2s(dd);
    return this;
  };
  MIDI.prototype.getText = function() {
    if (typeof this.dd != 'undefined') return JZZ.lib.fromUTF8(this.dd);
  };
  MIDI.prototype.setText = function(dd) {
    this.dd = JZZ.lib.toUTF8(dd);
    return this;
  };
  MIDI.prototype.getTempo = function() {
    if (this.ff == 0x51 && typeof this.dd != 'undefined') {
      return this.dd.charCodeAt(0) * 65536 + this.dd.charCodeAt(1) * 256 + this.dd.charCodeAt(2);
    }
  };
  MIDI.prototype.getBPM = function() {
    var ms = this.getTempo();
    if (ms) return 60000000 / ms;
  };
  MIDI.prototype.getTimeSignature = function() {
    if (this.ff == 0x58 && typeof this.dd != 'undefined') {
       return [this.dd.charCodeAt(0), 1 << this.dd.charCodeAt(1)];
    }
  };
  MIDI.prototype.getKeySignature = function() {
    if (this.ff == 0x59 && typeof this.dd != 'undefined') {
      var sf = this.dd.charCodeAt(0);
      var mi = this.dd.charCodeAt(1);
      if (sf & 0x80) sf = sf - 0x100;
      if (sf >= -7 && sf <= 7 && mi >= 0 && mi <= 1) {
        return [sf,
          ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#'][mi ? sf + 10 : sf + 7],
          !!mi
        ];
      }
    }
  };

  MIDI.prototype.isNoteOn = function() {
    var c = this[0];
    if (typeof c == 'undefined' || c < 0x90 || c > 0x9f) return false;
    return this[2] > 0 ? true : false;
  };
  MIDI.prototype.isNoteOff = function() {
    var c = this[0];
    if (typeof c == 'undefined' || c < 0x80 || c > 0x9f) return false;
    if (c < 0x90) return true;
    return this[2] == 0 ? true : false;
  };
  MIDI.prototype.isSysEx = function() {
    return this[0] == 0xf0;
  };
  MIDI.prototype.isFullSysEx = function() {
    return this[0] == 0xf0 && this[this.length - 1] == 0xf7;
  };
  MIDI.prototype.isSMF = function() {
    return this.ff >= 0 && this.ff <= 0x7f;
  };
  MIDI.prototype.isEOT = function() {
    return this.ff == 0x2f;
  };
  MIDI.prototype.isTempo = function() {
    return this.ff == 0x51;
  };
  MIDI.prototype.isTimeSignature = function() {
    return this.ff == 0x58;
  };
  MIDI.prototype.isKeySignature = function() {
    return this.ff == 0x59;
  };

  function _s2a(x) {
    var a = [];
    for (var i = 0; i < x.length; i++) {
      a[i] = x.charCodeAt(i);
    }
    return a;
  }
  function _a2s(x) {
    var a = '';
    for (var i = 0; i < x.length; i++) {
      a += String.fromCharCode(x[i]);
    }
    return a;
  }
  function _2s(x) {
    return x instanceof Array ? _a2s(x) : typeof x == 'undefined' ? '' : '' + x;
  }
  function _s2n(x) {
    var n = 0;
    for (var i = 0; i < x.length; i++) n = (n << 8) + x.charCodeAt(i);
    return n;
  }

  function __hex(x) { return (x < 16 ? '0' : '') + x.toString(16); }
  function _hex(x) {
    var a = [];
    for (var i = 0; i < x.length; i++) {
      a[i] = __hex(x[i]);
    }
    return a.join(' ');
  }
  function _toLine(s) {
    var out = '';
    for (var i = 0; i < s.length; i++) {
      if (s[i] == '\n') out += '\\n';
      else if (s[i] == '\r') out += '\\r';
      else if (s[i] == '\t') out += '\\t';
      else if (s.charCodeAt(i) < 32) out += '\\x' + __hex(s.charCodeAt(i));
      else out += s[i];
    }
    return out;
  }
  function _smfhex(dd) {
    return dd.length ? ': ' + _hex(_s2a(dd)) : '';
  }
  function _smftxt(dd) {
    return dd.length ? ': ' + _toLine(JZZ.lib.fromUTF8(dd)) : '';
  }
  MIDI.prototype.toString = function() {
    var s;
    var ss;
    if (!this.length) {
      if (typeof this.ff != 'undefined') {
        s = 'ff' + __hex(this.ff) + ' -- ';
        if (this.ff == 0) s += 'Sequence Number: ' + _s2n(this.dd);
        else if (this.ff > 0 && this.ff < 10) s += ['', 'Text', 'Copyright', 'Sequence Name', 'Instrument Name', 'Lyric', 'Marker', 'Cue Point', 'Program Name', 'Device Name'][this.ff] + _smftxt(this.dd);
        else if (this.ff == 32) s += 'Channel Prefix' + _smfhex(this.dd);
        else if (this.ff == 33) s += 'MIDI Port' + _smfhex(this.dd);
        else if (this.ff == 47) s += 'End of Track' + _smfhex(this.dd);
        else if (this.ff == 81) {
          var bpm = Math.round(this.getBPM() * 100) / 100;
          s += 'Tempo: ' + bpm + ' bpm';
        }
        else if (this.ff == 84) s += 'SMPTE Offset: ' + _smptetxt(_s2a(this.dd));
        else if (this.ff == 88) {
          var d = 1 << this.dd.charCodeAt(1);
          s += 'Time Signature: ' + this.dd.charCodeAt(0) + '/' + d;
          s += ' ' + this.dd.charCodeAt(2) + ' ' + this.dd.charCodeAt(3);
        }
        else if (this.ff == 89) {
          s += 'Key Signature: ';
          var ks = this.getKeySignature();
          if (ks) {
            s += ks[1];
            if (ks[2]) s += ' min';
          }
          else s+= 'invalid';
        }
        else if (this.ff == 127) s += 'Sequencer Specific' + _smfhex(this.dd);
        else s += 'SMF' + _smfhex(this.dd);
        return s;
      }
      return 'empty';
    }
    s = _hex(this);
    if (this[0] < 0x80) return s;
    ss = {
      241: 'MIDI Time Code',
      242: 'Song Position',
      243: 'Song Select',
      244: 'Undefined',
      245: 'Undefined',
      246: 'Tune request',
      248: 'Timing clock',
      249: 'Undefined',
      250: 'Start',
      251: 'Continue',
      252: 'Stop',
      253: 'Undefined',
      254: 'Active Sensing',
      255: 'Reset'
    }[this[0]];
    if (ss) return s + ' -- ' + ss;
    var c = this[0] >> 4;
    ss = {8: 'Note Off', 10: 'Aftertouch', 12: 'Program Change', 13: 'Channel Aftertouch', 14: 'Pitch Wheel'}[c];
    if (ss) return s + ' -- ' + ss;
    if (c == 9) return s + ' -- ' + (this[2] ? 'Note On' : 'Note Off');
    if (c != 11) return s;
    ss = {
      0: 'Bank Select MSB',
      1: 'Modulation Wheel MSB',
      2: 'Breath Controller MSB',
      4: 'Foot Controller MSB',
      5: 'Portamento Time MSB',
      6: 'Data Entry MSB',
      7: 'Channel Volume MSB',
      8: 'Balance MSB',
      10: 'Pan MSB',
      11: 'Expression Controller MSB',
      12: 'Effect Control 1 MSB',
      13: 'Effect Control 2 MSB',
      16: 'General Purpose Controller 1 MSB',
      17: 'General Purpose Controller 2 MSB',
      18: 'General Purpose Controller 3 MSB',
      19: 'General Purpose Controller 4 MSB',
      32: 'Bank Select LSB',
      33: 'Modulation Wheel LSB',
      34: 'Breath Controller LSB',
      36: 'Foot Controller LSB',
      37: 'Portamento Time LSB',
      38: 'Data Entry LSB',
      39: 'Channel Volume LSB',
      40: 'Balance LSB',
      42: 'Pan LSB',
      43: 'Expression Controller LSB',
      44: 'Effect control 1 LSB',
      45: 'Effect control 2 LSB',
      48: 'General Purpose Controller 1 LSB',
      49: 'General Purpose Controller 2 LSB',
      50: 'General Purpose Controller 3 LSB',
      51: 'General Purpose Controller 4 LSB',
      64: 'Damper Pedal On/Off',
      65: 'Portamento On/Off',
      66: 'Sostenuto On/Off',
      67: 'Soft Pedal On/Off',
      68: 'Legato Footswitch',
      69: 'Hold 2',
      70: 'Sound Controller 1',
      71: 'Sound Controller 2',
      72: 'Sound Controller 3',
      73: 'Sound Controller 4',
      74: 'Sound Controller 5',
      75: 'Sound Controller 6',
      76: 'Sound Controller 7',
      77: 'Sound Controller 8',
      78: 'Sound Controller 9',
      79: 'Sound Controller 10',
      80: 'General Purpose Controller 5',
      81: 'General Purpose Controller 6',
      82: 'General Purpose Controller 7',
      83: 'General Purpose Controller 8',
      84: 'Portamento Control',
      88: 'High Resolution Velocity Prefix',
      91: 'Effects 1 Depth',
      92: 'Effects 2 Depth',
      93: 'Effects 3 Depth',
      94: 'Effects 4 Depth',
      95: 'Effects 5 Depth',
      96: 'Data Increment',
      97: 'Data Decrement',
      98: 'Non-Registered Parameter Number LSB',
      99: 'Non-Registered Parameter Number MSB',
      100: 'Registered Parameter Number LSB',
      101: 'Registered Parameter Number MSB',
      120: 'All Sound Off',
      121: 'Reset All Controllers',
      122: 'Local Control On/Off',
      123: 'All Notes Off',
      124: 'Omni Mode Off',
      125: 'Omni Mode On',
      126: 'Mono Mode On',
      127: 'Poly Mode On'
    }[this[1]];
    if (!ss) ss = 'Undefined';
    return s + ' -- ' + ss;
  };
  MIDI.prototype._stamp = function(obj) { this._from.push(obj._orig ? obj._orig : obj); return this; };
  MIDI.prototype._unstamp = function(obj) {
    if (typeof obj == 'undefined') this._from = [];
    else {
      if (obj._orig) obj = obj._orig;
      var i = this._from.indexOf(obj);
      if (i > -1) this._from.splice(i, 1);
    }
    return this;
  };
  MIDI.prototype._stamped = function(obj) {
    if (obj._orig) obj = obj._orig;
    for (var i = 0; i < this._from.length; i++) if (this._from[i] == obj) return true;
    return false;
  };

  JZZ.MIDI = MIDI;

  function MPE() {
    var self = this instanceof MPE ? this : self = new MPE();
    self.reset();
    if (arguments.length) MPE.prototype.setup.apply(self, arguments);
    return self;
  }
  MPE.validate = function(arg) {
    var a = arg instanceof Array ? arg : arguments;
    if (a[0] != parseInt(a[0]) || a[0] < 0 || a[0] > 14) throw RangeError('Bad master channel value: ' + a[0]);
    if (a[1] != parseInt(a[1]) || a[1] < 0 || a[0] + a[1] > 15) throw RangeError('Bad zone size value: ' + a[1]);
  };
  MPE.prototype.reset = function() { for (var n = 0; n < 16; n++) this[n] = { band: 0, master: n }; };
  MPE.prototype.setup = function(m, n) {
    MPE.validate(m, n);
    var k;
    var last = m + n;
    if (this[m].master == m && this[m].band == n) return;
    if (!n && !this[m].band) return;
    if (this[m].band) {
      k = m + this[m].band;
      if (last < k) last = k;
    }
    else if (this[m].master == m - 1) {
      k = m - 1;
      k = k + this[k].band;
      if (last < k) last = k;
      this[m - 1] = { band: 0, master: m - 1 };
    }
    else if (this[m].master != m) {
      k = this[m].master;
      k = k + this[k].band;
      if (last < k) last = k;
      this[this[m].master].band = m - this[m].master - 1;
    }
    this[m].master = m;
    this[m].band = n;
    for (k = m + 1; k <= m + n; k++) {
      if (this[k].band && last < k + this[k].band) last = k + this[k].band;
      this[k] = { band: 0, master: m };
    }
    for (; k <= last; k++) this[k] = { band: 0, master: k };
  };
  MPE.prototype.filter = function(msg) {
    var c = msg.getChannel();
    if (!this[c] || !this[this[c].master].band) return msg;
    var m = this[c].master;
    var n = this[m].band;
    var i, j, k;
    if (typeof msg._mpe != 'undefined') {
      k = 256;
      for (i = m + 1; i <= m + n; i++) {
        if (!this[i].notes) {
          if (k > 0) { c = i; k = 0; }
        }
        else {
          if (k > this[i].notes.length) { c = i; k = this[i].notes.length; }
          for (j = 0; j < this[i].notes.length; j++) {
            if (this[i].notes[j] == msg._mpe) { c = i; k = -1; break; }
          }
        }
      }
      msg.setChannel(c);
      msg._mpe = undefined;
    }
    if (c == m) return msg; // bad mpe
    if (msg.isNoteOn()) {
      if (!this[c].notes) this[c].notes = [];
      _push(this[c].notes, msg.getNote());
    }
    else if (msg.isNoteOff()) {
      if (this[c].notes) _pop(this[c].notes, msg.getNote());
    }
    return msg;
  };
  JZZ.MPE = MPE;

  JZZ.lib = {};
  JZZ.lib.now = _now;
  JZZ.lib.schedule = _schedule;
  JZZ.lib.openMidiOut = function(name, engine) {
    var port = new _M();
    engine._openOut(port);
    port._info = engine._info(name);
    return port;
  };
  JZZ.lib.openMidiIn = function(name, engine) {
    var port = new _M();
    engine._openIn(port);
    port._info = engine._info(name);
    return port;
  };
  JZZ.lib.registerMidiOut = function(name, engine) {
    var x = engine._info(name);
    for (var i = 0; i < _virtual._outs.length; i++) if (_virtual._outs[i].name == x.name) return false;
    x.engine = engine;
    _virtual._outs.push(x);
    if (_jzz) {
      _postRefresh();
      if (_jzz._bad) { _jzz._repair(); _jzz._resume(); }
    }
    return true;
  };
  JZZ.lib.registerMidiIn = function(name, engine) {
    var x = engine._info(name);
    for (var i = 0; i < _virtual._ins.length; i++) if (_virtual._ins[i].name == x.name) return false;
    x.engine = engine;
    _virtual._ins.push(x);
    if (_jzz) {
      _postRefresh();
      if (_jzz._bad) { _jzz._repair(); _jzz._resume(); }
    }
    return true;
  };
  var _ac;
  function _initAudioContext() {
    if (!_ac && typeof window !== 'undefined') {
      var AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        _ac = new AudioContext();
        if (_ac && !_ac.createGain) _ac.createGain = _ac.createGainNode;
        var _activateAudioContext = function() {
          if (_ac.state != 'running') {
            _ac.resume();
            var osc = _ac.createOscillator();
            var gain = _ac.createGain();
            try { gain.gain.value = 0; } catch (err) {}
            gain.gain.setTargetAtTime(0, _ac.currentTime, 0.01);
            osc.connect(gain);
            gain.connect(_ac.destination);
            if (!osc.start) osc.start = osc.noteOn;
            if (!osc.stop) osc.stop = osc.noteOff;
            osc.start(0.1); osc.stop(0.11);
          }
          else {
            document.removeEventListener('touchstart', _activateAudioContext);
            document.removeEventListener('touchend', _activateAudioContext);
            document.removeEventListener('mousedown', _activateAudioContext);
            document.removeEventListener('keydown', _activateAudioContext);
          }
        };
        document.addEventListener('touchstart', _activateAudioContext);
        document.addEventListener('touchend', _activateAudioContext);
        document.addEventListener('mousedown', _activateAudioContext);
        document.addEventListener('keydown', _activateAudioContext);
        _activateAudioContext();
      }
    }
  }
  JZZ.lib.copyMidiHelpers = _copyMidiHelpers;
  JZZ.lib.getAudioContext = function() { _initAudioContext(); return _ac; };
  var _b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  JZZ.lib.fromBase64 = function(input) {
    var output = '';
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;
    input = input.replace(/[^A-Za-z0-9+/=]/g, '');
    while (i < input.length) {
      enc1 = _b64.indexOf(input.charAt(i++));
      enc2 = _b64.indexOf(input.charAt(i++));
      enc3 = _b64.indexOf(input.charAt(i++));
      enc4 = _b64.indexOf(input.charAt(i++));
      chr1 = (enc1 << 2) | (enc2 >> 4);
      chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      chr3 = ((enc3 & 3) << 6) | enc4;
      output = output + String.fromCharCode(chr1);
      if (enc3 != 64) {
        output = output + String.fromCharCode(chr2);
      }
      if (enc4 != 64) {
        output = output + String.fromCharCode(chr3);
      }
    }
    return output;
  };
  JZZ.lib.toBase64 = function(data) {
    var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, enc = '', arr = [];
    if (!data) return data;
    do {
      o1 = data.charCodeAt(i++);
      o2 = data.charCodeAt(i++);
      o3 = data.charCodeAt(i++);
      bits = o1 << 16 | o2 << 8 | o3;
      h1 = bits >> 18 & 0x3f;
      h2 = bits >> 12 & 0x3f;
      h3 = bits >> 6 & 0x3f;
      h4 = bits & 0x3f;
      arr[ac++] = _b64.charAt(h1) + _b64.charAt(h2) + _b64.charAt(h3) + _b64.charAt(h4);
    } while(i < data.length);
    enc = arr.join('');
    var r = data.length % 3;
    return (r ? enc.slice(0, r - 3) + '==='.slice(r) : enc);
  };
  JZZ.lib.fromUTF8 = function(data) {
    data = typeof data == 'undefined' ? '' : '' + data;
    var out = '';
    var i, n, m;
    for (i = 0; i < data.length; i++) {
      n = data.charCodeAt(i);
      if (n > 0xff) return data;
      if (n < 0x80) out += data[i];
      else if ((n & 0xe0) == 0xc0) {
        n = (n & 0x1f) << 6;
        i++; if (i >= data.length) return data;
        m = data.charCodeAt(i);
        if ((m & 0xc0) != 0x80) return data;
        n += (m & 0x3f);
        out += String.fromCharCode(n);
      }
      else if ((n & 0xf0) == 0xe0) {
        n = (n & 0x0f) << 12;
        i++; if (i >= data.length) return data;
        m = data.charCodeAt(i);
        if ((m & 0xc0) != 0x80) return data;
        n += (m & 0x3f) << 6;
        i++; if (i >= data.length) return data;
        m = data.charCodeAt(i);
        if ((m & 0xc0) != 0x80) return data;
        n += (m & 0x3f);
        out += String.fromCharCode(n);
      }
      else if ((n & 0xf8) == 0xf0) {
        n = (n & 0x07) << 18;
        i++; if (i >= data.length) return data;
        m = data.charCodeAt(i);
        if ((m & 0xc0) != 0x80) return data;
        n += (m & 0x3f) << 12;
        i++; if (i >= data.length) return data;
        m = data.charCodeAt(i);
        if ((m & 0xc0) != 0x80) return data;
        n += (m & 0x3f) << 6;
        i++; if (i >= data.length) return data;
        m = data.charCodeAt(i);
        if ((m & 0xc0) != 0x80) return data;
        n += (m & 0x3f);
        if (n > 0x10ffff) return data;
        n -= 0x10000;
        out += String.fromCharCode(0xd800 + (n >> 10));
        out += String.fromCharCode(0xdc00 + (n & 0x3ff));
      }
    }
    return out;
  };
  JZZ.lib.toUTF8 = function(data) {
    data = typeof data == 'undefined' ? '' : '' + data;
    var out = '';
    var i, n;
    for (i = 0; i < data.length; i++) {
      n = data.charCodeAt(i);
      if (n < 0x80) out += data[i];
      else if (n < 0x800) {
        out += String.fromCharCode(0xc0 + (n >> 6));
        out += String.fromCharCode(0x80 + (n & 0x3f));
      }
      else if (n < 0x10000) {
        out += String.fromCharCode(0xe0 + (n >> 12));
        out += String.fromCharCode(0x80 + ((n >> 6) & 0x3f));
        out += String.fromCharCode(0x80 + (n & 0x3f));
      }
      else {
        out += String.fromCharCode(0xf0 + (n >> 18));
        out += String.fromCharCode(0x80 + ((n >> 12) & 0x3f));
        out += String.fromCharCode(0x80 + ((n >> 6) & 0x3f));
        out += String.fromCharCode(0x80 + (n & 0x3f));
      }
    }
    return out;
  };

  // Web MIDI API
  var _wma = [];
  var _outputMap = {};
  var _inputMap = {};

  var Promise = _scope.Promise;
  if (typeof Promise !== 'function') {
    Promise = function(executor) {
      this.executor = executor;
    };
    Promise.prototype.then = function(resolve, reject) {
      if (typeof resolve !== 'function') {
        resolve = function() {};
      }
      if (typeof reject !== 'function') {
        reject = function() {};
      }
      this.executor(resolve, reject);
    };
  }
  function DOMException(name, message, code) {
    this.name = name;
    this.message = message;
    this.code = code;
  }

  function MIDIConnectionEvent(port, target) {
    this.bubbles = false;
    this.cancelBubble = false;
    this.cancelable = false;
    this.currentTarget = target;
    this.defaultPrevented = false;
    this.eventPhase = 0;
    this.path = [];
    this.port = port;
    this.returnValue = true;
    this.srcElement = target;
    this.target = target;
    this.timeStamp = _now();
    this.type = 'statechange';
  }

  function MIDIMessageEvent(port, data) {
    this.bubbles = false;
    this.cancelBubble = false;
    this.cancelable = false;
    this.currentTarget = port;
    this.data = data;
    this.defaultPrevented = false;
    this.eventPhase = 0;
    this.path = [];
    this.receivedTime = _now();
    this.returnValue = true;
    this.srcElement = port;
    this.target = port;
    this.timeStamp = this.receivedTime;
    this.type = 'midimessage';
  }

  function _statechange(p, a) {
    if (p) {
      if (p.onstatechange) p.onstatechange(new MIDIConnectionEvent(p, p));
      if (a.onstatechange) a.onstatechange(new MIDIConnectionEvent(p, a));
    }
  }

  function MIDIInput(a, p) {
    var self = this;
    var _open = false;
    var _ochng = null;
    var _onmsg = null;
    this.type = 'input';
    this.id = p.id;
    this.name = p.name;
    this.manufacturer = p.man;
    this.version = p.ver;
    Object.defineProperty(this, 'state', { get: function() { return p.connected ? 'connected' : 'disconnected'; }, enumerable: true });
    Object.defineProperty(this, 'connection', { get: function() {
      return _open ? p.proxy ? 'open' : 'pending' : 'closed';
    }, enumerable: true });
    Object.defineProperty(this, 'onmidimessage', {
      get: function() { return _onmsg; },
      set: function(value) {
        if (value instanceof Function) {
          _onmsg = value;
          if (!_open) self.open();
        }
        else _onmsg = null;
      },
      enumerable: true
    });
    Object.defineProperty(this, 'onstatechange', {
      get: function() { return _ochng; },
      set: function(value) {
        if (value instanceof Function) _ochng = value;
        else _ochng = null;
      },
      enumerable: true
    });
    this.open = function() {
      return new Promise(function(resolve, reject) {
        if (_open) resolve(self);
        else {
          p.open().then(function() {
            if (!_open) {
              _open = true;
              _statechange(self, a);
            }
            resolve(self);
          }, function() {
            reject(new DOMException('InvalidAccessError', 'Port is not available', 15));
          });
        }
      });
    };
    this.close = function() {
      return new Promise(function(resolve/*, reject*/) {
        if (_open) {
          _open = false;
          p.close();
          _statechange(self, a);
        }
        resolve(self);
      });
    };
    Object.freeze(this);
  }

  function _split(q) {
    var i, k;
    while (q.length) {
      for (i = 0; i < q.length; i++) if (q[i] == parseInt(q[i]) && q[i] >= 0x80 && q[i] <= 0xff && q[i] != 0xf7) break;
      q.splice(0, i);
      if (!q.length) return;
      if (q[0] == 0xf0) {
        for (i = 1; i < q.length; i++) if (q[i] == 0xf7) break;
        if (i == q.length) return;
        return q.splice(0, i + 1);
      }
      else {
        k = _datalen(q[0]) + 1;
        if (k > q.length) return;
        for (i = 1; i < k; i++) if (q[i] != parseInt(q[i]) || q[i] < 0 || q[i] >= 0x80) break;
        if (i == k) return q.splice(0, i);
        else q.splice(0, i);
      }
    }
  }

  function _InputProxy(id, name, man, ver) {
    var self = this;
    this.id = id;
    this.name = name;
    this.man = man;
    this.ver = ver;
    this.connected = true;
    this.ports = [];
    this.pending = [];
    this.proxy = undefined;
    this.queue = [];
    this.onmidi = function(msg) {
      var m;
      self.queue = self.queue.concat(msg.slice());
      for (m = _split(self.queue); m; m = _split(self.queue)) {
        for (i = 0; i < self.ports.length; i++) {
          if (self.ports[i][0].onmidimessage && (m[0] != 0xf0 || self.ports[i][1])) {
            self.ports[i][0].onmidimessage(new MIDIMessageEvent(self, new Uint8Array(m)));
          }
        }
      }
    };
  }
  _InputProxy.prototype.open = function() {
    var self = this;
    return new Promise(function(resolve, reject) {
      var i;
      if (self.proxy || !self.connected) resolve();
      else {
        self.pending.push([resolve, reject]);
        if (self.pending.length == 1) {
          JZZ().openMidiIn(self.name).or(function() {
            for (i = 0; i < self.pending.length; i++) self.pending[i][1]();
            self.pending = [];
          }).and(function() {
            self.proxy = this;
            self.proxy.connect(self.onmidi);
            for (i = 0; i < self.pending.length; i++) self.pending[i][0]();
            self.pending = [];
          });
        }
      }
    });
  };
  _InputProxy.prototype.close = function() {
    var i;
    if (this.proxy) {
      for (i = 0; i < this.ports.length; i++) if (this.ports[i].connection == 'open') return;
      this.proxy.close();
      this.proxy = undefined;
    }
  };
  _InputProxy.prototype.disconnect = function() {
    this.connected = false;
    if (this.proxy) {
      this.proxy.close();
      this.proxy = undefined;
    }
  };
  _InputProxy.prototype.reconnect = function() {
    var self = this;
    var i, p;
    var a = [];
    this.connected = true;
    for (i = 0; i < _wma.length; i++) {
      p = _wma[i].inputs.get(this.id);
      if (p.connection == 'closed') _statechange(p, _wma[i]);
      else a.push([p, _wma[i]]);
    }
    if (a.length) {
      JZZ()._openMidiInNR(self.name).or(function() {
        for (i = 0; i < a.length; i++) a[i][0].close();
      }).and(function() {
        self.proxy = this;
        self.proxy.connect(self.onmidi);
        for (i = 0; i < a.length; i++) _statechange(a[i][0], a[i][1]);
      });
    }
  };

  function _datalen(x) {
    if (x >= 0x80 && x <= 0xbf || x >= 0xe0 && x <= 0xef || x == 0xf2) return 2;
    if (x >= 0xc0 && x <= 0xdf || x == 0xf1 || x == 0xf3) return 1;
    return 0;
  }

  var _epr = "Failed to execute 'send' on 'MIDIOutput': ";

  function _validate(arr, sysex) {
    var i, k;
    var msg;
    var data = [];
    for (i = 0; i < arr.length; i++) {
      if (arr[i] != parseInt(arr[i]) || arr[i] < 0 || arr[i] > 255) throw TypeError(_epr + arr[i] + ' is not a UInt8 value.');
    }
    k = 0;
    for (i = 0; i < arr.length; i++) {
      if (!k) {
        if (arr[i] < 0x80) throw TypeError(_epr + 'Running status is not allowed at index ' + i + ' (' + arr[i] + ').');
        if (arr[i] == 0xf7) throw TypeError(_epr + 'Unexpected end of system exclusive message at index ' + i + ' (' + arr[i] + ').');
        msg = [arr[i]];
        data.push(msg);
        if (arr[i] == 0xf0) {
          if (!sysex) throw new DOMException('InvalidAccessError', _epr + 'System exclusive messag is not allowed at index ' + i + ' (' + arr[i] + ').', 15);
          k = -1;
          for (; i < arr.length; i++) {
            msg.push(arr[i]);
            if (arr[i] == 0xf7) {
              k = 0;
              break;
            }
          }
        }
        else {
          k = _datalen(arr[i]);
        }
      }
      else {
        if (arr[i] > 0x7f) throw TypeError(_epr + 'Unexpected status byte at index ' + i + ' (' + arr[i] + ').');
        msg.push(arr[i]);
        k--;
      }
    }
    if (k) throw TypeError(_epr + 'Message is incomplete');
    return [data];
  }

  function MIDIOutput(a, p) {
    var self = this;
    var _open = false;
    var _ochng = null;
    this.type = 'output';
    this.id = p.id;
    this.name = p.name;
    this.manufacturer = p.man;
    this.version = p.ver;
    Object.defineProperty(this, 'state', { get: function() { return p.connected ? 'connected' : 'disconnected'; }, enumerable: true });
    Object.defineProperty(this, 'connection', { get: function() {
      return _open ? p.proxy ? 'open' : 'pending' : 'closed';
    }, enumerable: true });
    Object.defineProperty(this, 'onstatechange', {
      get: function() { return _ochng; },
      set: function(value) {
        if (value instanceof Function) _ochng = value;
        else _ochng = null;
      },
      enumerable: true
    });
    this.open = function() {
      return new Promise(function(resolve, reject) {
        if (_open) resolve(self);
        else {
          p.open().then(function() {
            if (!_open) {
              _open = true;
              _statechange(self, a);
            }
            resolve(self);
          }, function() {
            reject(new DOMException('InvalidAccessError', 'Port is not available', 15));
          });
        }
      });
    };
    this.close = function() {
      return new Promise(function(resolve/*, reject*/) {
        if (_open) {
          _open = false;
          self.clear();
          p.close();
          _statechange(self, a);
        }
        resolve(self);
      });
    };
    this.clear = function() {
    };
    this.send = function(data, timestamp) {
      _validate(data, a.sysexEnabled);
      if (!p.connected) throw new DOMException('InvalidStateError', 'Port is not connected', 11);
      if (_open) {
        var now = _now();
        if (timestamp > now) setTimeout(function() { p.proxy.send(data); }, timestamp - now);
        else p.proxy.send(data);
      }
      else this.open().then(function() { self.send(data, timestamp); });

    };
    Object.freeze(this);
  }

  function _OutputProxy(id, name, man, ver) {
    this.id = id;
    this.name = name;
    this.man = man;
    this.ver = ver;
    this.connected = true;
    this.ports = [];
    this.pending = [];
    this.proxy = undefined;
  }
  _OutputProxy.prototype.open = function() {
    var self = this;
    return new Promise(function(resolve, reject) {
      var i;
      if (self.proxy || !self.connected) resolve();
      else {
        self.pending.push([resolve, reject]);
        if (self.pending.length == 1) {
          JZZ().openMidiOut(self.name).or(function() {
            for (i = 0; i < self.pending.length; i++) self.pending[i][1]();
            self.pending = [];
          }).and(function() {
            self.proxy = this;
            for (i = 0; i < self.pending.length; i++) self.pending[i][0]();
            self.pending = [];
          });
        }
      }
    });
  };
  _OutputProxy.prototype.close = function() {
    var i;
    if (this.proxy) {
      for (i = 0; i < this.ports.length; i++) if (this.ports[i].connection == 'open') return;
      this.proxy.close();
      this.proxy = undefined;
    }
  };
  _OutputProxy.prototype.disconnect = function() {
    this.connected = false;
    if (this.proxy) {
      this.proxy.close();
      this.proxy = undefined;
    }
  };
  _OutputProxy.prototype.reconnect = function() {
    var self = this;
    var i, p;
    var a = [];
    this.connected = true;
    for (i = 0; i < _wma.length; i++) {
      p = _wma[i].outputs.get(this.id);
      if (p.connection == 'closed') _statechange(p, _wma[i]);
      else a.push([p, _wma[i]]);
    }
    if (a.length) {
      JZZ()._openMidiOutNR(self.name).or(function() {
        for (i = 0; i < a.length; i++) a[i][0].close();
      }).and(function() {
        self.proxy = this;
        for (i = 0; i < a.length; i++) _statechange(a[i][0], a[i][1]);
      });
    }
  };

  function _Maplike(data) {
    this.has = function(id) {
      return data.hasOwnProperty(id) && data[id].connected;
    };
    this.keys = function() {
      try { // some old browsers may have no Map object
        var m = new Map();
        for (var id in data) if (this.has(id)) m.set(id, this.get(id));
        return m.keys();
      } catch (e) {}
    };
    this.values = function() {
      try {
        var m = new Map();
        for (var id in data) if (this.has(id)) m.set(id, this.get(id));
        return m.values();
      } catch (e) {}
    };
    this.entries = function() {
      try {
        var m = new Map();
        for (var id in data) if (this.has(id)) m.set(id, this.get(id));
        return m.entries();
      } catch (e) {}
    };
    this.forEach = function(fun, self) {
      if (typeof self == 'undefined') self = this;
      for (var id in data) if (this.has(id)) fun.call(self, this.get(id), id, this);
    };
    Object.defineProperty(this, 'size', {
      get: function() {
        var len = 0;
        for (var id in data) if (this.has(id)) len++;
        return len;
      },
      enumerable: true
    });
  }

  function MIDIInputMap(_access, _inputs) {
    this.get = function(id) {
      if (_inputMap.hasOwnProperty(id) && _inputMap[id].connected) {
        if (!_inputs[id]) {
          _inputs[id] = new MIDIInput(_access, _inputMap[id]);
          _inputMap[id].ports.push([_inputs[id], _access.sysexEnabled]);
        }
        return _inputs[id];
      }
    };
    Object.freeze(this);
  }
  MIDIInputMap.prototype = new _Maplike(_inputMap);
  MIDIInputMap.prototype.constructor = MIDIInputMap;

  function MIDIOutputMap(_access, _outputs) {
    this.get = function(id) {
      if (_outputMap.hasOwnProperty(id) && _outputMap[id].connected) {
        if (!_outputs[id]) {
          _outputs[id] = new MIDIOutput(_access, _outputMap[id]);
          _outputMap[id].ports.push([_outputs[id], _access.sysexEnabled]);
        }
        return _outputs[id];
      }
    };
    Object.freeze(this);
  }
  MIDIOutputMap.prototype = new _Maplike(_outputMap);
  MIDIOutputMap.prototype.constructor = MIDIOutputMap;

  function _wm_watch(x) {
    var i, k, p, a;
    for (i = 0; i < x.inputs.added.length; i++) {
      p = x.inputs.added[i];
      if (!_inputMap.hasOwnProperty(p.id)) _inputMap[p.id] = new _InputProxy(p.id, p.name, p.manufacturer, p.version);
      _inputMap[p.id].reconnect();
    }
    for (i = 0; i < x.outputs.added.length; i++) {
      p = x.outputs.added[i];
      if (!_outputMap.hasOwnProperty(p.id)) _outputMap[p.id] = new _OutputProxy(p.id, p.name, p.manufacturer, p.version);
      _outputMap[p.id].reconnect();
    }
    for (i = 0; i < x.inputs.removed.length; i++) {
      p = x.inputs.removed[i];
      if (_inputMap.hasOwnProperty(p.id)) {
        a = [];
        for (k = 0; k < _wma.length; k++) a.push([_wma[k].inputs.get(p.id), _wma[k]]);
        _inputMap[p.id].disconnect();
        for (k = 0; k < a.length; k++) _statechange(a[k][0], a[k][1]);
      }
    }
    for (i = 0; i < x.outputs.removed.length; i++) {
      p = x.outputs.removed[i];
      if (_outputMap.hasOwnProperty(p.id)) {
        a = [];
        for (k = 0; k < _wma.length; k++) a.push([_wma[k].outputs.get(p.id), _wma[k]]);
        _outputMap[p.id].disconnect();
        for (k = 0; k < a.length; k++) _statechange(a[k][0], a[k][1]);
      }
    }
  }

  function MIDIAccess(sysex) {
    var _inputs = {};
    var _outputs = {};
    var _onstatechange = null;
    var self = this;
    this.sysexEnabled = sysex;
    this.inputs = new MIDIInputMap(self, _inputs);
    this.outputs = new MIDIOutputMap(self, _outputs);
    Object.defineProperty(this, 'onstatechange', {
      get: function() { return _onstatechange; },
      set: function(f) { _onstatechange = f instanceof Function ? f : null; },
      enumerable: true
    });
    Object.freeze(this);
    var i;
    var p;
    var info = _jzz._info;
    for (i = 0; i < info.inputs.length; i++) {
      p = info.inputs[i];
      if (!_inputMap.hasOwnProperty(p.id)) _inputMap[p.id] = new _InputProxy(p.id, p.name, p.manufacturer, p.version);
    }
    for (i = 0; i < info.outputs.length; i++) {
      p = info.outputs[i];
      if (!_outputMap.hasOwnProperty(p.id)) _outputMap[p.id] = new _OutputProxy(p.id, p.name, p.manufacturer, p.version);
    }
    if (!_wma.length) JZZ().onChange(_wm_watch);
    _wma.push(this);
  }

  JZZ.requestMIDIAccess = function(opt) {
    return new Promise(function(resolve, reject) {
      JZZ.JZZ(opt).or(function() {
      }).and(function() {
        var sysex = !!(opt && opt.sysex);
        if (sysex && !this.info().sysex) reject(new DOMException('SecurityError', 'Sysex is not allowed', 18));
        else {
          var wma = new MIDIAccess(sysex);
          resolve(wma);
        }
      });
    });
  };
  if (typeof navigator !== 'undefined' && !navigator.requestMIDIAccess) navigator.requestMIDIAccess = JZZ.requestMIDIAccess;
  JZZ.close = function() { if (_engine._close) _engine._close(); };

  return JZZ;
});

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"jazz-midi":2}],5:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[1]);
