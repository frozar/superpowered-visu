import SuperpoweredModule from "../public/superpowered";
import React, { useState, useRef, useEffect } from "react";
import Head from "next/head";
import styles from "../styles/Home.module.css";

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

const drawCorners = (ctx, height) => {
  const radius = 10;
  const heightOffset = height / 2;

  ctx.beginPath();
  const grd = ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
  grd.addColorStop(0, "red");
  grd.addColorStop(1, "blue");
  ctx.fillStyle = grd;

  ctx.moveTo(0, -heightOffset);
  ctx.arc(0, -heightOffset, radius, 0, 2 * Math.PI);
  ctx.arc(ctx.canvas.width, -heightOffset, radius, 0, 2 * Math.PI);
  ctx.moveTo(0, ctx.canvas.height - heightOffset);
  ctx.arc(0, ctx.canvas.height - heightOffset, radius, 0, 2 * Math.PI);
  ctx.arc(
    ctx.canvas.width,
    ctx.canvas.height - heightOffset,
    radius,
    0,
    2 * Math.PI
  );
  ctx.fill();
};

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

const draw = (
  ctx,
  height,
  channel,
  x0FixedPx,
  setX0FixedPx,
  zoom0,
  setZoom0,
  x1FixedPx,
  zoom1,
  setZoom1,
  translation,
  setTranslation
) => {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  drawCorners(ctx, height);

  // Apply zoom
  // console.log("zoomXFocalPx", zoomXFocalPx);
  // console.log("zoomFactor", zoomFactor);
  // ctx.translate(zoomXFocalGraph, 0);
  // ctx.scale(zoomFactor, 1);
  // ctx.translate(-zoomXFocalGraph, 0);
  console.log("x0FixedPx", x0FixedPx);
  console.log("x1FixedPx", x1FixedPx);
  console.log("zoom0", zoom0);
  console.log("zoom1", zoom1);
  console.log("translation", translation);

  const ZOOM_MAX = 200;
  const ZOOM_MIN = 0.5;
  const eps = 1e-6;
  function transformOf0(xFixedPx, zoom, translation) {
    return (0 - xFixedPx) * zoom + xFixedPx + translation;
  }

  if (x0FixedPx === x1FixedPx) {
    console.log("PASS 1");
    const zoomGlobal = clamp(zoom0 * zoom1, ZOOM_MIN, ZOOM_MAX);
    console.log("zoomGlobal", zoomGlobal);
    // If zoomGlobal big enough, apply a zoom
    if (zoomGlobal < 1 - eps || 1 + eps < zoomGlobal) {
      console.log("PASS 1.0");
      if (
        !(zoom0 === ZOOM_MIN && zoomGlobal === ZOOM_MIN) &&
        !(zoom0 === ZOOM_MAX && zoomGlobal === ZOOM_MAX)
      ) {
        console.log("PASS 1.0.0");
        // Avoid the see on the left part of the track
        if (0 < transformOf0(x0FixedPx, zoomGlobal, translation)) {
          ctx.scale(zoomGlobal, 1);
          setX0FixedPx(0);
          setZoom0(zoomGlobal);
          setTranslation(0);
        } else {
          ctx.translate(x0FixedPx, 0);
          ctx.scale(zoomGlobal, 1);
          ctx.translate(-x0FixedPx, 0);
          ctx.translate(translation, 0);
          setZoom0(zoomGlobal);
        }
      } else {
        console.log("PASS 1.0.1");
        // In this case, zoom0 === ZOOM_MIN or zoom0 === ZOOM_MAX.
        // So the visu seems unchanged: don't update intern parameters
        ctx.translate(x0FixedPx, 0);
        ctx.scale(zoom0, 1);
        ctx.translate(-x0FixedPx, 0);
        ctx.translate(translation, 0);
      }
    } else {
      console.log("PASS 1.1");

      // zoomGlobal near to 1
      // In the x0 == x1, don't update the translation vector

      console.log("transformOf0", transformOf0(0, 1, translation));

      // Avoid the see on the left part of the track
      if (0 < transformOf0(0, 1, translation)) {
        setTranslation(0);
        setX0FixedPx(0);
        setZoom0(1);
      } else {
        ctx.translate(translation, 0);
        setX0FixedPx(0);
        setZoom0(1);
      }
    }
    setZoom1(1);
  } else {
    console.log("PASS 2");
    const zoomGlobal = clamp(zoom0 * zoom1, ZOOM_MIN, ZOOM_MAX);
    console.log("zoomGlobal", zoomGlobal);
    // If zoomGlobal big enough, apply a zoom
    if (zoomGlobal < 1 - eps || 1 + eps < zoomGlobal) {
      console.log("PASS 2.0");
      console.log("zoom0", zoom0);
      console.log("zoomGlobal", zoomGlobal);
      if (
        !(zoom0 === ZOOM_MIN && zoomGlobal === ZOOM_MIN) &&
        !(zoom0 === ZOOM_MAX && zoomGlobal === ZOOM_MAX)
      ) {
        console.log("PASS 2.0.0");
        const xFixedGlobal =
          ((1 - zoom0) * zoom1 * x0FixedPx + (1 - zoom1) * x1FixedPx) /
          (1 - zoom0 * zoom1);

        console.log("xFixedGlobal", xFixedGlobal);
        console.log(
          "transformOf0",
          transformOf0(xFixedGlobal, zoomGlobal, translation)
        );
        // Avoid the see on the left part of the track
        if (0 < transformOf0(xFixedGlobal, zoomGlobal, translation)) {
          ctx.scale(zoomGlobal, 1);
          setX0FixedPx(0);
          setZoom0(zoomGlobal);
          setTranslation(0);
        } else {
          ctx.translate(xFixedGlobal, 0);
          ctx.scale(zoomGlobal, 1);
          ctx.translate(-xFixedGlobal, 0);
          ctx.translate(translation, 0);
          setX0FixedPx(xFixedGlobal);
          setZoom0(zoomGlobal);
        }
      } else {
        console.log("PASS 2.0.1");
        // In this case, zoom0 === ZOOM_MIN or zoom0 === ZOOM_MAX.
        // So the visu seems unchanged: don't update intern parameters

        // Avoid the see on the left part of the track
        if (0 < transformOf0(x0FixedPx, zoom0, translation)) {
          ctx.scale(zoom0, 1);
          setTranslation(0);
        } else {
          ctx.translate(x0FixedPx, 0);
          ctx.scale(zoom0, 1);
          ctx.translate(-x0FixedPx, 0);
          ctx.translate(translation, 0);
        }
      }
    } else {
      console.log("PASS 2.1");

      // zoomGlobal near to 1
      const translationInc =
        (1 / zoom0 - 1) * x0FixedPx + (1 - 1 / zoom0) * x1FixedPx;

      // console.log(
      //   "transformOf0",
      //   transformOf0(0, 1, translation + translationInc)
      // );
      // Avoid the see on the left part of the track
      if (0 < transformOf0(0, 1, translation + translationInc)) {
        setTranslation(0);
        setX0FixedPx(0);
        setZoom0(1);
      } else {
        ctx.translate(translation + translationInc, 0);
        setTranslation(translation + translationInc);
        setX0FixedPx(0);
        setZoom0(1);
      }
    }
    setZoom1(1);
  }

  // Draw rectangles
  ctx.scale(1, height / 2);

  // Create gradient
  const grd = ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
  grd.addColorStop(0, "red");
  grd.addColorStop(1, "blue");
  ctx.strokeStyle = grd;

  const pointWidth = ctx.canvas.width / channel.data.length;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let i = 0; i < channel.data.length; ++i) {
    ctx.lineTo(
      (i * pointWidth + (i * pointWidth + pointWidth * 0.95)) / 2,
      -channel.data[i]
    );
  }

  // Apply gradient
  ctx.lineWidth = 0.005;
  ctx.stroke();
};

const handleWheel = (event, setX1FixedPx, setZoom1) => {
  event.preventDefault();
  const adjustNormalisation = 200;
  const mouseXPx = event.offsetX;
  setX1FixedPx(mouseXPx);

  if (event.deltaY < 0) {
    const adjust = -event.deltaY / adjustNormalisation;
    const multiplyFactor = 1 + adjust;
    const zoom1 = multiplyFactor;
    setZoom1(zoom1);
    // console.log("zoom1", zoom1);
  } else if (event.deltaY > 0) {
    const adjust = event.deltaY / adjustNormalisation;
    const multiplyFactor = 1 + adjust;
    const zoom1 = 1 / multiplyFactor;
    setZoom1(zoom1);
    // console.log("zoom1", zoom1);
  }
};

function SongVisu(props) {
  const [x0FixedPx, setX0FixedPx] = useState(0);
  const [zoom0, setZoom0] = useState(1);
  const [x1FixedPx, setX1FixedPx] = useState(0);
  const [zoom1, setZoom1] = useState(1);
  const [translation, setTranslation] = useState(0);

  const canvasRef = useRef(null);

  // Executed only once
  useEffect(() => {
    const canvas = canvasRef.current;
    // console.log(canvas.width);

    const wheelEventListener = (event) => {
      handleWheel(event, setX1FixedPx, setZoom1);
      // console.log("1 newGraphXOriginPx", graphXOriginPx);
    };

    // Treat wheel event with native event, not synthetic event.
    // Documentation link:
    // https://medium.com/@ericclemmons/react-event-preventdefault-78c28c950e46
    canvas.addEventListener("wheel", wheelEventListener);

    return () => {
      canvas.removeEventListener("wheel", wheelEventListener);
    };
  }, []);

  // Executed only once
  useEffect(() => {
    const canvas = canvasRef.current;

    const ctx = canvas.getContext("2d");
    const vw = Math.max(
      document.documentElement.clientWidth || 0,
      window.innerWidth || 0
    );

    canvas.width = vw;
    const height = 200;
    canvas.height = height;

    ctx.translate(0, height / 2);

    //Our draw come here
    draw(
      ctx,
      height,
      props.channel,
      x0FixedPx,
      setX0FixedPx,
      zoom0,
      setZoom0,
      x1FixedPx,
      zoom1,
      setZoom1,
      translation,
      setTranslation
    );
  }, []);

  // Executed only when props.channel or zoom1 change
  useEffect(() => {
    if (zoom1 !== 1) {
      const canvas = canvasRef.current;

      const ctx = canvas.getContext("2d");
      const vw = Math.max(
        document.documentElement.clientWidth || 0,
        window.innerWidth || 0
      );

      canvas.width = vw;
      const height = 200;
      canvas.height = height;

      ctx.translate(0, height / 2);

      //Our draw come here
      draw(
        ctx,
        height,
        props.channel,
        x0FixedPx,
        setX0FixedPx,
        zoom0,
        setZoom0,
        x1FixedPx,
        zoom1,
        setZoom1,
        translation,
        setTranslation
      );
      console.log("");
    }
  }, [props.channel, zoom1]);

  return <canvas ref={canvasRef} {...props} />;
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
      return (
        <>
          <div>
            <PlayButton audioContext={this.audioContext} />
            <RateSlider audioNode={this.audioNode} />
            <Credit fileName={this.state.fileName} />
          </div>
          <div onScroll={() => console.log("scroll div")}>
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
        <h1 className={styles.title}>
          Welcome to <a href="https://nextjs.org">Next.js!</a>
        </h1>
        <Stretcher />
      </main>
    </div>
  );
}
