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

  ctx.fillStyle = "#000000";
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
  ctx.beginPath();
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

  const ZOOM_MAX = 100;
  const ZOOM_MIN = 0.5;
  const eps = 1e-6;
  if (zoom1 === undefined) {
    // First visu: do nothing
  } else {
    if (x0FixedPx === undefined) {
      console.log("PASS 0");
      const zoomToApply = clamp(zoom1, ZOOM_MIN, ZOOM_MAX);
      ctx.translate(x1FixedPx, 0);
      ctx.scale(zoomToApply, 1);
      ctx.translate(-x1FixedPx, 0);
      ctx.translate(translation, 0);
      setX0FixedPx(x1FixedPx);
      setZoom0(zoomToApply);
      setZoom1(1);
    } else if (x0FixedPx === x1FixedPx) {
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
          ctx.translate(x1FixedPx, 0);
          ctx.scale(zoomGlobal, 1);
          ctx.translate(-x1FixedPx, 0);
          ctx.translate(translation, 0);
          setZoom0(zoomGlobal);
        } else {
          console.log("PASS 1.0.1");
          // In this case, the visu seems unchanged: don't update intern parameters
          ctx.translate(x0FixedPx, 0);
          ctx.scale(zoom0, 1);
          ctx.translate(-x0FixedPx, 0);
          ctx.translate(translation, 0);
        }
      } else {
        // TODO: Do a translation and keep this information
        console.log("PASS 1.1");
        // console.log("Deal WITH IT: Do a translation and keep this information");
        const translationInc =
          (1 / zoom0 - 1) * x0FixedPx + (1 - 1 / zoom0) * x1FixedPx;
        console.log("x0FixedPx", x0FixedPx);
        console.log("x1FixedPx", x1FixedPx);
        console.log("(1 / zoom0 - 1)", 1 / zoom0 - 1);
        console.log("(1 - 1 / zoom0)", 1 - 1 / zoom0);
        console.log("f0", (1 / zoom0 - 1) * x0FixedPx);
        console.log("f1", (1 - 1 / zoom0) * x1FixedPx);
        console.log("translationInc", translationInc);
        console.log("translationGlobal", translation + translationInc);
        ctx.translate(translationInc, 0);
        ctx.translate(translation, 0);
        setTranslation(translation + translationInc);
        setX0FixedPx(undefined);
        setZoom0(1);
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

          ctx.translate(xFixedGlobal, 0);
          ctx.scale(zoomGlobal, 1);
          ctx.translate(-xFixedGlobal, 0);
          ctx.translate(translation, 0);
          setX0FixedPx(xFixedGlobal);
          setZoom0(zoomGlobal);
        } else {
          console.log("PASS 2.0.1");
          // In this case, the visu seems unchanged: don't update intern parameters
          ctx.translate(x0FixedPx, 0);
          ctx.scale(zoom0, 1);
          ctx.translate(-x0FixedPx, 0);
          ctx.translate(translation, 0);
        }
      } else {
        // TODO: Do a translation and keep this information
        console.log("PASS 2.1");
        // console.log("Deal WITH IT: Do a translation and keep this information");
        const translationInc =
          (1 / zoom0 - 1) * x0FixedPx + (1 - 1 / zoom0) * x1FixedPx;
        // console.log("x0FixedPx", x0FixedPx);
        // console.log("x1FixedPx", x1FixedPx);
        // console.log("(1 / zoom0 - 1)", 1 / zoom0 - 1);
        // console.log("(1 - 1 / zoom0)", 1 - 1 / zoom0);
        // console.log("f0", (1 / zoom0 - 1) * x0FixedPx);
        // console.log("f1", (1 - 1 / zoom0) * x1FixedPx);
        // console.log("translationInc", translationInc);
        ctx.translate(translationInc, 0);
        ctx.translate(translation, 0);
        setTranslation(translation + translationInc);
        setX0FixedPx(undefined);
        setZoom0(1);
      }
      setZoom1(1);
    }
  }

  // Draw rectangles
  ctx.scale(1, height / 2);

  // Create gradient
  let grd = ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
  grd.addColorStop(0, "red");
  grd.addColorStop(1, "blue");
  ctx.fillStyle = grd;

  const rectangleWidth = ctx.canvas.width / channel.data.length;
  for (let i = 0; i < channel.data.length; ++i) {
    ctx.fillRect(
      i * rectangleWidth,
      0,
      rectangleWidth * 0.95,
      -channel.data[i]
    );
  }

  // Apply gradient
  ctx.fill();
};

const handleWheel = (event, setX1FixedPx, setZoom1) => {
  event.preventDefault();
  // let newZoomFactor = 1;
  const adjustNormalisation = 200;
  // const zoomMax = 100;
  // const zoomMin = 1;

  const mouseXPx = event.offsetX;
  setX1FixedPx(mouseXPx);
  // console.log("mouseXPx", mouseXPx);

  if (event.deltaY < 0) {
    const adjust = -event.deltaY / adjustNormalisation;
    const multiplyFactor = 1 + adjust;
    // newZoomFactor = Math.min(zoomFactor * multiplyFactor, zoomMax);
    const zoom1 = multiplyFactor;
    setZoom1(zoom1);
    // console.log("zoom1", zoom1);
  } else if (event.deltaY > 0) {
    const adjust = event.deltaY / adjustNormalisation;
    const multiplyFactor = 1 + adjust;
    // newZoomFactor = Math.max(zoomFactor / multiplyFactor, zoomMin);
    const zoom1 = 1 / multiplyFactor;
    setZoom1(zoom1);
    // console.log("zoom1", zoom1);
  }
};

function SongVisu(props) {
  // const [previousZoomFactor, setPreviousZoomFactor] = useState(1);
  // const [zoomFactor, setZoomFactor] = useState(1);
  // const [zoomXFocalGraph, setZoomXFocalGraph] = useState(0);
  // const [graphXOriginPx, setGraphXOriginPx] = useState(0);
  const [x0FixedPx, setX0FixedPx] = useState(undefined);
  const [zoom0, setZoom0] = useState(1);
  const [x1FixedPx, setX1FixedPx] = useState(undefined);
  const [zoom1, setZoom1] = useState(undefined);
  const [translation, setTranslation] = useState(0);

  const canvasRef = useRef(null);

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
  }, []); // [zoomFactor, graphXOriginPx]);

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

    // Normalise data
    for (let i = 0; i < nbComputation; ++i) {
      avgs[i] /= maxValue;
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
      const ptPerSec = 1500;
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
      // console.log("visuDataLeft", visuDataLeft);
      // console.log("visuDataRight", visuDataRight);

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
          {/* <div style={{ height: "1000px" }} /> */}
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
        {/* 
        <p className={styles.description}>
          Get started by editing{" "}
          <code className={styles.code}>pages/index.js</code>
        </p>

        <div className={styles.grid}>
          <a href="https://nextjs.org/docs" className={styles.card}>
            <h3>Documentation &rarr;</h3>
            <p>Find in-depth information about Next.js features and API.</p>
          </a>

          <a href="https://nextjs.org/learn" className={styles.card}>
            <h3>Learn &rarr;</h3>
            <p>Learn about Next.js in an interactive course with quizzes!</p>
          </a>

          <a
            href="https://github.com/vercel/next.js/tree/master/examples"
            className={styles.card}
          >
            <h3>Examples &rarr;</h3>
            <p>Discover and deploy boilerplate example Next.js projects.</p>
          </a>

          <a
            href="https://vercel.com/import?filter=next.js&utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
            className={styles.card}
          >
            <h3>Deploy &rarr;</h3>
            <p>
              Instantly deploy your Next.js site to a public URL with Vercel.
            </p>
          </a>
        </div> */}
        <Stretcher />
      </main>

      {/* <footer className={styles.footer}>
        <a
          href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by{" "}
          <img src="/vercel.svg" alt="Vercel Logo" className={styles.logo} />
        </a>
      </footer> */}
    </div>
  );
}
