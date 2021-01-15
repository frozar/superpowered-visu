import SuperpoweredModule from "../public/superpowered";
import React, { useState, useRef, useEffect } from "react";
import Head from "next/head";
import styles from "../styles/Home.module.css";

// Use some global variable to shortcut the slow redraw mecanism of React

// *** BEGIN PANNING SECTION
let G_mouseMoveXOriginPx = 0;
let G_translationGphInc = 0;
let G_firstZeroEffectiveTranslation = true;
// *** END PANNING SECTION

// *** BEGIN DEBUG SECTION
let G_verbose = false;

function dbg() {
  if (G_verbose) {
    console.log(...arguments);
  }
}
// *** END DEBUG SECTION

class PlayButton extends React.Component {
  state = { value: 0 };

  togglePlayback = () => {
    const { value } = this.state;
    if (value === 1) {
      this.setState({ value: 0 });
      this.props.audioContext.suspend();
    } else {
      this.setState({ value: 1 });
      this.props.audioContext.resume();
    }
  };

  render() {
    const buttonText = this.state.value === 0 ? "PLAY" : "PAUSE";
    return (
      <button id="playPause" onClick={this.togglePlayback}>
        {buttonText}
      </button>
    );
  }
}

class RateSlider extends React.Component {
  initValue = 10000;
  state = { value: this.initValue };

  // sending the new rate to the audio node
  updateAudioRate = (rate) => {
    this.props.audioNode.sendMessageToAudioScope({ rate });
  };

  changeRate = (evt) => {
    const value = evt.target.valueAsNumber;
    this.setState({ value });
    this.updateAudioRate(value);
  };

  changeRateDbl = () => {
    const value = this.initValue;
    this.setState({ value });
    this.updateAudioRate(value);
  };

  render() {
    const renderText = () => {
      const { value } = this.state;
      let text;
      if (value === 10000) {
        text = "original tempo";
      } else if (value < 10000) {
        text = "-" + (100 - value / 100).toPrecision(2) + "%";
      } else {
        text = "+" + (value / 100 - 100).toPrecision(2) + "%";
      }
      return text;
    };
    return (
      <>
        <p id="rateDisplay">{renderText()}</p>
        <input
          id="rateSlider"
          type="range"
          min="5000"
          max="20000"
          value={this.state.value}
          onInput={this.changeRate}
          onDoubleClick={this.changeRateDbl}
          style={{ width: "100%" }}
        />
      </>
    );
  }
}

function Credit(props) {
  if (props.fileName === "") {
    return (
      <div>
        Thank you{" "}
        <a
          href="https://soundcloud.com/freemusicforvlogs/joakim-karud-classic-free-music-for-vlogs"
          target="_blank"
        >
          Joakim Karud - Classic
        </a>
      </div>
    );
  } else {
    return <div>File "{props.fileName}" loaded</div>;
  }
}

function SongVisu(props) {
  const [x0FixedPx, setX0FixedPx] = useState(0);
  const [zoom0, setZoom0] = useState(1);
  const [x1FixedPx, setX1FixedPx] = useState(0);
  const [zoom1, setZoom1] = useState(1);
  const [translationGph, setTranslationGph] = useState(0);
  const [init, setInit] = useState(true);
  const [moving, setMoving] = useState(false);

  const canvasRef = useRef(null);

  // *** BEGIN HELPER FUNCTION
  function setDimension(canvas) {
    const parentNode = canvas.parentNode;
    const width = parentNode.clientWidth;
    const height = parentNode.clientHeight;
    const style = getComputedStyle(parentNode);

    // Docutation link:
    // https://www.javascripttutorial.net/javascript-dom/javascript-width-height/
    const contentWidth =
      width - parseInt(style.paddingLeft) - parseInt(style.paddingRight);
    const contentHeight =
      height - parseInt(style.paddingTop) - parseInt(style.paddingBottom);

    canvas.width = contentWidth;
    canvas.height = contentHeight;
  }

  function drawBackground(ctx) {
    function rgbToHex(r, g, b) {
      function componentToHex(c) {
        const hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
      }

      return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    }

    const halfHeight = ctx.canvas.height / 2;
    const brightPt = (-halfHeight * 2) / 3;

    let centerColorValue;
    let borderColorValue;
    const nbStep = 20;

    // Compute the top background cosine gradiant
    centerColorValue = 255;
    borderColorValue = 210;
    const grd0 = ctx.createLinearGradient(0, brightPt, 0, -halfHeight);
    for (let i = 0; i < nbStep; ++i) {
      const weight = Math.cos(((i / (nbStep - 1)) * Math.PI) / 2);
      const interpValue = Math.floor(
        weight * centerColorValue + (1 - weight) * borderColorValue
      );
      const color = rgbToHex(interpValue, interpValue, interpValue);
      grd0.addColorStop(i / (nbStep - 1), color);
    }

    ctx.fillStyle = grd0;

    // Draw top background
    ctx.beginPath();
    const rectHeight0 = ctx.canvas.height - (halfHeight - brightPt);
    ctx.fillRect(0, brightPt, ctx.canvas.width, -rectHeight0);
    ctx.fill();

    // Compute the bottom background cosine gradiant
    centerColorValue = 255;
    borderColorValue = 160;
    const grd1 = ctx.createLinearGradient(0, brightPt, 0, halfHeight);
    for (let i = 0; i < nbStep; ++i) {
      const weight = Math.cos(((i / (nbStep - 1)) * Math.PI) / 2);
      const interpValue = Math.floor(
        weight * centerColorValue + (1 - weight) * borderColorValue
      );
      const color = rgbToHex(interpValue, interpValue, interpValue);
      grd1.addColorStop(i / (nbStep - 1), color);
    }
    ctx.fillStyle = grd1;

    // Draw bottom background
    ctx.beginPath();
    const rectHeight1 = ctx.canvas.height - (brightPt - -halfHeight);
    ctx.fillRect(0, brightPt, ctx.canvas.width, rectHeight1);
    ctx.fill();
  }

  function setupCanvas(canvasRef) {
    const canvas = canvasRef.current;

    setDimension(canvas);
    const ctx = canvas.getContext("2d");
    ctx.translate(0, canvas.height / 2);

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    drawBackground(ctx);

    return ctx;
  }

  function Graph2Px(xPixel, xFixedPx, zoom, translationGraph) {
    return (xPixel - xFixedPx) * zoom + xFixedPx + translationGraph * zoom;
  }

  function Px2Graph(xGraph, xFixedPx, zoom, translationGraph) {
    return (
      (xGraph - xFixedPx - translationGraph * zoom) * (1 / zoom) + -xFixedPx
    );
  }

  function transformOf0Gph(xFixedPx, zoom, translationGraph) {
    return Graph2Px(0, xFixedPx, zoom, translationGraph);
  }

  function translationMaxOf0Gph(xFixedPx, zoom) {
    return (-1 / zoom) * ((0 - xFixedPx) * zoom + xFixedPx);
  }

  function computeZoomParameters(
    x0FixedPx,
    zoom0,
    x1FixedPx,
    zoom1,
    translation
  ) {
    G_verbose = false;
    dbg("x0FixedPx", x0FixedPx);
    dbg("x1FixedPx", x1FixedPx);
    dbg("zoom0", zoom0);
    dbg("zoom1", zoom1);
    dbg("translation", translation);

    const ZOOM_MAX = 200;
    const ZOOM_MIN = 0.5;
    const eps = 1e-6;
    function clamp(val, min, max) {
      return Math.min(Math.max(val, min), max);
    }

    let xFixed = null;
    let zoom = null;
    let scaledTranslation = null;
    if (x0FixedPx === x1FixedPx) {
      dbg("PASS 1");
      const zoomGlobal = clamp(zoom0 * zoom1, ZOOM_MIN, ZOOM_MAX);
      dbg("zoomGlobal", zoomGlobal);
      // If zoomGlobal big enough, apply a zoom
      if (zoomGlobal < 1 - eps || 1 + eps < zoomGlobal) {
        dbg("PASS 1.0");
        if (
          !(zoom0 === ZOOM_MIN && zoomGlobal === ZOOM_MIN) &&
          !(zoom0 === ZOOM_MAX && zoomGlobal === ZOOM_MAX)
        ) {
          dbg("PASS 1.0.0");
          dbg("transform", transformOf0Gph(x0FixedPx, zoomGlobal, translation));
          // Avoid the see on the left part of the track
          if (0 < transformOf0Gph(x0FixedPx, zoomGlobal, translation)) {
            xFixed = 0;
            zoom = zoomGlobal;
            scaledTranslation = 0;
          } else {
            xFixed = x0FixedPx;
            zoom = zoomGlobal;
            scaledTranslation = translation;
          }
        } else {
          dbg("PASS 1.0.1");
          // In this case, zoom0 === ZOOM_MIN or zoom0 === ZOOM_MAX.
          // So the visu seems unchanged: don't update intern parameters
          xFixed = x0FixedPx;
          zoom = zoomGlobal;
          scaledTranslation = translation;
        }
      } else {
        dbg("PASS 1.1");

        // zoomGlobal == 1 ; x0 == x1
        dbg("transformOf0", transformOf0Gph(0, 1, translation));

        // Avoid the see on the left part of the track
        if (0 < transformOf0Gph(0, 1, translation)) {
          dbg("PASS 1.1.0");
          xFixed = 0;
          zoom = 1;
          scaledTranslation = 0;
        } else {
          dbg("PASS 1.1.1");
          xFixed = 0;
          zoom = 1;
          scaledTranslation = translation;
        }
      }
    } else {
      dbg("PASS 2");
      const zoomGlobal = clamp(zoom0 * zoom1, ZOOM_MIN, ZOOM_MAX);
      dbg("zoomGlobal", zoomGlobal);
      // If zoomGlobal big enough, apply a zoom
      if (zoomGlobal < 1 - eps || 1 + eps < zoomGlobal) {
        dbg("PASS 2.0");
        dbg("zoom0", zoom0);
        dbg("zoomGlobal", zoomGlobal);
        if (
          !(zoom0 === ZOOM_MIN && zoomGlobal === ZOOM_MIN) &&
          !(zoom0 === ZOOM_MAX && zoomGlobal === ZOOM_MAX)
        ) {
          dbg("PASS 2.0.0");
          const xFixedGlobal =
            ((1 - zoom0) * zoom1 * x0FixedPx + (1 - zoom1) * x1FixedPx) /
            (1 - zoom0 * zoom1);

          dbg("xFixedGlobal", xFixedGlobal);
          dbg(
            "transformOf0",
            transformOf0Gph(xFixedGlobal, zoomGlobal, translation)
          );
          // Avoid the see on the left part of the track
          if (0 < transformOf0Gph(xFixedGlobal, zoomGlobal, translation)) {
            xFixed = 0;
            zoom = zoomGlobal;
            scaledTranslation = 0;
          } else {
            xFixed = xFixedGlobal;
            zoom = zoomGlobal;
            scaledTranslation = translation;
          }
        } else {
          dbg("PASS 2.0.1");
          // In this case, zoom0 === ZOOM_MIN or zoom0 === ZOOM_MAX.
          // So the visu seems unchanged: don't update intern parameters

          // Avoid the see on the left part of the track
          if (0 < transformOf0Gph(x0FixedPx, zoom0, translation)) {
            xFixed = 0;
            zoom = zoomGlobal;
            scaledTranslation = 0;
          } else {
            xFixed = x0FixedPx;
            zoom = zoom0;
            scaledTranslation = translation;
          }
        }
      } else {
        dbg("PASS 2.1");

        // zoomGlobal near to 1
        const translationInc =
          (1 / zoom0 - 1) * x0FixedPx + (1 - 1 / zoom0) * x1FixedPx;

        // Avoid the see on the left part of the track
        if (0 < transformOf0Gph(0, 1, translation + translationInc)) {
          xFixed = 0;
          zoom = 1;
          scaledTranslation = 0;
        } else {
          xFixed = 0;
          zoom = 1;
          scaledTranslation = translation + translationInc;
        }
      }
    }
    return [xFixed, zoom, scaledTranslation];
  }

  function applyZoom(ctx, xFixed, zoom, scaledTranslation) {
    ctx.translate(xFixed, 0);
    ctx.scale(zoom, 1);
    ctx.translate(-xFixed, 0);
    ctx.translate(scaledTranslation, 0);
  }

  function computeTranslationParameters(x0FixedPx, zoom0, translationGph) {
    const translationMaxGph = translationMaxOf0Gph(x0FixedPx, zoom0);

    let effectiveTranslation;
    if (translationGph < translationMaxGph) {
      effectiveTranslation = translationGph;
    } else {
      effectiveTranslation = translationMaxGph;

      // Compute a new mouseMoveXOriginPx
      const newMouseMoveXOriginPx =
        G_mouseMoveXOriginPx - (translationMaxGph - translationGph) * zoom0;
      if (newMouseMoveXOriginPx !== G_mouseMoveXOriginPx) {
        G_mouseMoveXOriginPx = newMouseMoveXOriginPx;
      }
    }
    return effectiveTranslation;
  }

  function applyPan(ctx, x0FixedPx, zoom0, effectiveTranslation) {
    ctx.translate(x0FixedPx, 0);
    ctx.scale(zoom0, 1);
    ctx.translate(-x0FixedPx, 0);
    ctx.translate(effectiveTranslation, 0);
  }

  const draw = (ctx, channel, xFixedPx, zoom, translationGph) => {
    const nbPt = channel.data.length;
    const pointWidth = ctx.canvas.width / nbPt;

    // Compute the window of point to display on screen
    let firstVisibleIdx = null;
    let lastVisibleIdx = null;
    for (let i = 0; i < nbPt; ++i) {
      const xGphStart = i * pointWidth;
      const xGphEnd = (i + 1) * pointWidth;
      const xGphMid = (xGphStart + xGphEnd) / 2;
      const xImagePx = Graph2Px(xGphMid, xFixedPx, zoom, translationGph);

      if (!firstVisibleIdx) {
        if (0 <= xImagePx && xImagePx <= ctx.canvas.width) {
          firstVisibleIdx = Math.max(0, i - 1);
        }
      } else if (!lastVisibleIdx) {
        if (ctx.canvas.width < xImagePx) {
          lastVisibleIdx = Math.min(i + 1, nbPt);
        }
      }
    }
    if (firstVisibleIdx && !lastVisibleIdx) {
      lastVisibleIdx = nbPt;
    }

    if (firstVisibleIdx && lastVisibleIdx) {
      // Draw line
      ctx.scale(1, ctx.canvas.height / 2);

      ctx.beginPath();
      ctx.moveTo(0, 0);

      for (let i = firstVisibleIdx; i < lastVisibleIdx; ++i) {
        const xStart = i * pointWidth;
        const xEnd = (i + 1) * pointWidth;
        ctx.lineTo((xStart + xEnd) / 2, -channel.data[i]);
      }

      // Apply gradient
      const grd = ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
      grd.addColorStop(0, "red");
      grd.addColorStop(1, "blue");
      ctx.strokeStyle = grd;
      ctx.lineWidth = 0.005;
      ctx.stroke();
    }
  };

  const handleWheel = (event) => {
    event.preventDefault();
    let effectiveXFixedPx;
    let effectiveZoom;

    const adjustNormalisation = 200;
    effectiveXFixedPx = event.offsetX;

    if (event.deltaY < 0) {
      const adjust = -event.deltaY / adjustNormalisation;
      const multiplyFactor = 1 + adjust;
      effectiveZoom = multiplyFactor;
    } else if (event.deltaY > 0) {
      const adjust = event.deltaY / adjustNormalisation;
      const multiplyFactor = 1 + adjust;
      effectiveZoom = 1 / multiplyFactor;
    }

    return [effectiveXFixedPx, effectiveZoom];
  };
  // *** END HELPER FUNCTION

  // Executed only once
  useEffect(() => {
    const wheelEventListener = (event) => {
      const [xFixedPx, zoom] = handleWheel(event, setX1FixedPx, setZoom1);
      setX1FixedPx(xFixedPx);
      setZoom1(zoom);
    };

    // Treat wheel event with native event, not synthetic event.
    // Documentation link:
    // https://medium.com/@ericclemmons/react-event-preventdefault-78c28c950e46
    const canvas = canvasRef.current;
    canvas.addEventListener("wheel", wheelEventListener);

    return () => {
      canvas.removeEventListener("wheel", wheelEventListener);
    };
  }, []);

  // Executed at initialisation and when props.channel or zoom1 change
  useEffect(() => {
    if (init || zoom1 !== 1) {
      const ctx = setupCanvas(canvasRef);

      const [xFixed, zoom, scaledTranslation] = computeZoomParameters(
        x0FixedPx,
        zoom0,
        x1FixedPx,
        zoom1,
        translationGph
      );
      // Apply zoom
      applyZoom(ctx, xFixed, zoom, scaledTranslation);

      // Update internal parameter
      setX0FixedPx(xFixed);
      setZoom0(zoom);
      setTranslationGph(scaledTranslation);
      setZoom1(1);

      // Our draw come here
      draw(ctx, props.channel, xFixed, zoom, scaledTranslation);
      dbg("");
      setInit(false);
    }
  }, [props.channel, zoom0, zoom1, translationGph]);

  const handleOnMouseDown = (event, canvasRef) => {
    const canvas = canvasRef.current;
    if (event.ctrlKey) {
      canvas.style.cursor = "move";
      setMoving(true);
      G_mouseMoveXOriginPx = event.nativeEvent.offsetX;
    }
  };

  const handleOnMouseMove = (event, canvasRef) => {
    if (moving) {
      const mouseXPx = event.nativeEvent.offsetX;
      const moveVectPx = mouseXPx - G_mouseMoveXOriginPx;
      // Avoid to redraw if the translation along X axis doesn't update
      if (G_translationGphInc === moveVectPx / zoom0) {
        return;
      }
      G_translationGphInc = moveVectPx / zoom0;

      const effectiveTranslation = computeTranslationParameters(
        x0FixedPx,
        zoom0,
        translationGph + G_translationGphInc
      );

      // Avoid to redraw if the translation is null
      if (
        (effectiveTranslation === 0 && G_firstZeroEffectiveTranslation) ||
        effectiveTranslation !== 0
      ) {
        if (effectiveTranslation === 0) {
          G_firstZeroEffectiveTranslation = false;
        } else {
          G_firstZeroEffectiveTranslation = true;
        }

        const ctx = setupCanvas(canvasRef);

        // Apply pan
        applyPan(ctx, x0FixedPx, zoom0, effectiveTranslation);

        draw(ctx, props.channel, x0FixedPx, zoom0, effectiveTranslation);
      }
    }
  };

  const handleOnMouseUp = (event, canvasRef) => {
    const canvas = canvasRef.current;
    if (moving) {
      setTranslationGph(translationGph + G_translationGphInc);
    }
    G_translationGphInc = 0;
    G_mouseMoveXOriginPx = 0;
    canvas.style.cursor = "default";
    setMoving(false);
  };

  return (
    <canvas
      ref={canvasRef}
      style={{ boxShadow: "2px 6px 10px 2px rgba(0,0,0,0.3)" }}
      onMouseDown={(event) => handleOnMouseDown(event, canvasRef)}
      onMouseMove={(event) => handleOnMouseMove(event, canvasRef)}
      onMouseUp={(event) => handleOnMouseUp(event, canvasRef)}
      {...props}
    />
  );
}

class Stretcher extends React.Component {
  INIT = 0;
  DOWNLOADING = 1;
  DECODING = 2;
  READY = 3;
  Superpowered = null;
  audioNode = null;
  audioContext = null;

  state = {
    step: this.INIT,
    fileName: "",
    visuDataLeft: [],
    visuDataRight: [],
  };

  initAudioNode = async () => {
    const onMessageFromAudioScope = (message) => {
      console.log("Message received from the audio node: " + message);
    };

    this.audioContext = this.Superpowered.getAudioContext(44100);
    this.audioNode = await this.Superpowered.createAudioNodeAsync(
      this.audioContext,
      "/processor.js",
      "MyProcessor",
      onMessageFromAudioScope
    );
  };

  sum(array) {
    let res = 0;
    for (let i = 0; i < array.length; ++i) {
      res += array[i];
    }
    return res;
  }

  filterChannel(channel, sampleRate, ptPerSec) {
    const sliceLength = sampleRate / ptPerSec;
    const nbComputation = Math.ceil(channel.length / sliceLength);

    // Compute average and max value
    let maxValue = -Infinity;
    // let maxValue = 0;
    const avgs = Array(nbComputation);
    for (let i = 0; i < nbComputation; ++i) {
      const iStart = i * sliceLength;
      const iEnd = Math.min((i + 1) * sliceLength - 1, channel.length);
      const nbPt = iEnd - iStart - 1;
      const avg = this.sum(channel.slice(iStart, iEnd)) / nbPt;

      avgs[i] = avg;
      maxValue = Math.max(maxValue, avg < 0 ? -avg : avg);
    }

    // Normalise data.
    // As values are in [0, 1], use the cubic root to give volume
    // in the visualisation
    for (let i = 0; i < nbComputation; ++i) {
      avgs[i] = Math.cbrt(avgs[i] / maxValue);
    }
    return { data: avgs, sampleRate: ptPerSec };
  }

  processInputSound = async (input) => {
    this.setState({ step: this.DECODING });
    let rawData = await input.arrayBuffer();

    this.audioContext.decodeAudioData(rawData, (pcmData) => {
      // console.log("pcmData", pcmData);
      const channelLeft = pcmData.getChannelData(0);
      const channelRight = pcmData.getChannelData(1);
      const ptPerSec = 300;
      const visuDataLeft = this.filterChannel(
        channelLeft,
        pcmData.sampleRate,
        ptPerSec
      );
      const visuDataRight = this.filterChannel(
        channelRight,
        pcmData.sampleRate,
        ptPerSec
      );
      this.setState({ visuDataLeft, visuDataRight });

      // Safari doesn't support await for decodeAudioData yet
      // send the PCM audio to the audio node
      this.audioNode.sendMessageToAudioScope({
        left: pcmData.getChannelData(0),
        right: pcmData.getChannelData(1),
      });

      // audioNode -> audioContext.destination (audio output)
      this.audioContext.suspend();
      this.audioNode.connect(this.audioContext.destination);

      this.setState({ step: this.READY });
    });
  };

  cleanAudioContext = () => {
    this.audioContext.suspend();
    this.audioContext = null;
    this.setState({ step: this.INIT, fileName: "" });
  };

  setFileName = (fileName) => {
    this.setState({ fileName });
  };

  fetchDefaultSong = async () => {
    this.setState({ step: this.DOWNLOADING });
    let response = await fetch("track.mp3");

    this.processInputSound(response);
  };

  componentDidMount() {
    SuperpoweredModule({
      licenseKey: "ExampleLicenseKey-WillExpire-OnNextUpdate",
      enableAudioTimeStretching: true,

      onReady: (SuperpoweredInstance) => {
        this.Superpowered = SuperpoweredInstance;

        const awaitFunc = async () => {
          await this.initAudioNode();
          this.fetchDefaultSong();
        };
        awaitFunc();
      },
    });
  }

  componentWillUnmount() {
    this.cleanAudioContext();
  }

  render() {
    const { step } = this.state;
    if (step === this.INIT) {
      return <div>Init state</div>;
    } else if (step === this.DOWNLOADING) {
      return <div>Downloading music...</div>;
    } else if (step === this.DECODING) {
      return <div>Decoding audio...</div>;
    } else if (step >= this.READY) {
      const divWidthPx = Math.max(
        document.documentElement.clientWidth || 0,
        window.innerWidth || 0
      );
      const divHeightPx = 250;
      return (
        <>
          <div>
            <PlayButton audioContext={this.audioContext} />
            <RateSlider audioNode={this.audioNode} />
            <Credit fileName={this.state.fileName} />
          </div>
          <div
            style={{
              width: `calc(${divWidthPx}px)`,
              height: `calc(${divHeightPx}px + 2em)`,
              paddingTop: "1em",
              paddingBottom: "1em",
              paddingLeft: "0em",
              paddingRight: "0em",
            }}
          >
            <SongVisu channel={this.state.visuDataLeft} />
          </div>
        </>
      );
    }
  }
}

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Superpowered Visualisation</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <Stretcher />
      </main>
    </div>
  );
}
