import SuperpoweredModule from "../public/superpowered";
import React from "react";

import Head from "next/head";
import styles from "../styles/Home.module.css";

import Song from "./Song";

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
    windowWidth: 600, // arbitrary value
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

  handleResize = (event) => {
    this.setState({ windowWidth: window.innerWidth });
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

    this.setState({ windowWidth: window.innerWidth });
    window.addEventListener("resize", this.handleResize);
  }

  componentWillUnmount() {
    this.cleanAudioContext();
    window.removeEventListener("resize", this.handleResize);
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
              width: `calc(${this.state.windowWidth}px)`,
              height: `calc(${divHeightPx}px + 2em)`,
              paddingTop: "1em",
              paddingBottom: "1em",
              paddingLeft: "0em",
              paddingRight: "0em",
            }}
          >
            <Song
              width={this.state.windowWidth}
              channelLeft={this.state.visuDataLeft}
              channelRight={this.state.visuDataRight}
            />
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
