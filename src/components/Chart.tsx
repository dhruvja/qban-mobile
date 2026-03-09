import { useRef, useCallback, useEffect, useState } from "react";
import { View, Text } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import type { CandleData } from "../types";
import { LIGHTWEIGHT_CHARTS_JS } from "./chartLib";

const CHART_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { background:#1A1A1A; overflow:hidden; width:100%; height:100%; }
    #chart { width:100%; height:100%; }
    #debug { position:fixed; top:0; left:0; color:#F5C518; font-size:10px; font-family:monospace; z-index:9999; padding:2px 4px; background:rgba(0,0,0,0.7); }
  </style>
</head>
<body>
  <div id="chart"></div>
  <div id="debug">loading...</div>
  <script>
    var dbg = document.getElementById('debug');
    function log(msg) {
      dbg.textContent = msg;
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type:'log',msg:msg}));
    }
    log('script start');
  </script>
  <script>LW_PLACEHOLDER</script>
  <script>
    try {
      if (typeof LightweightCharts === 'undefined') {
        log('ERROR: LightweightCharts not defined');
      } else {
        log('lib loaded, creating chart...');
        var chart = LightweightCharts.createChart(document.getElementById('chart'), {
          width: document.body.clientWidth,
          height: document.body.clientHeight,
          layout: {
            background: { color: '#1A1A1A' },
            textColor: '#B8B2AA',
            fontSize: 11,
          },
          grid: {
            vertLines: { color: '#2D2D2D' },
            horzLines: { color: '#2D2D2D' },
          },
          rightPriceScale: { borderColor: '#2D2D2D' },
          timeScale: {
            borderColor: '#2D2D2D',
            timeVisible: true,
            secondsVisible: false,
          },
          handleScroll: { vertTouchDrag: false },
        });

        var candleSeries = chart.addCandlestickSeries({
          upColor: '#00C853',
          downColor: '#CC2936',
          borderUpColor: '#00C853',
          borderDownColor: '#CC2936',
          wickUpColor: '#00C853',
          wickDownColor: '#CC2936',
        });

        window.setCandles = function(data) {
          log('setCandles: ' + data.length + ' candles');
          candleSeries.setData(data);
          chart.timeScale().fitContent();
        };

        window.updateCandle = function(data) {
          candleSeries.update(data);
        };

        chart.timeScale().fitContent();
        log('chart ready, waiting for data...');
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}));
      }
    } catch(e) {
      log('ERROR: ' + e.message);
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',msg:e.message}));
    }
  </script>
</body>
</html>`;

interface ChartProps {
  candles: CandleData[];
  liveCandle?: CandleData;
  height?: number;
}

function formatCandles(candles: CandleData[]) {
  return candles.map((c) => ({
    time: Math.floor(c.time / 1000),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));
}

export function Chart({ candles, liveCandle, height = 280 }: ChartProps) {
  const webViewRef = useRef<WebView>(null);
  const isReady = useRef(false);
  const candlesRef = useRef(candles);
  candlesRef.current = candles;
  const [debugMsg, setDebugMsg] = useState("initializing...");

  // Build HTML with inlined library — avoid String.replace to prevent $ substitution issues
  const [html] = useState(() => {
    const parts = CHART_HTML.split("LW_PLACEHOLDER");
    return parts[0] + LIGHTWEIGHT_CHARTS_JS + parts[1];
  });

  const inject = useCallback((js: string) => {
    webViewRef.current?.injectJavaScript(js + ";true;");
  }, []);

  const sendCandles = useCallback(
    (data: CandleData[]) => {
      const json = JSON.stringify(formatCandles(data));
      inject(`window.setCandles(${json})`);
    },
    [inject]
  );

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.type === "ready") {
          setDebugMsg("ready, sending " + candlesRef.current.length + " candles");
          isReady.current = true;
          if (candlesRef.current.length > 0) {
            sendCandles(candlesRef.current);
          }
        } else if (msg.type === "log") {
          setDebugMsg(msg.msg);
        } else if (msg.type === "error") {
          setDebugMsg("ERROR: " + msg.msg);
        }
      } catch {
        // raw string message
        setDebugMsg(event.nativeEvent.data);
      }
    },
    [sendCandles]
  );

  // When candles arrive after WebView is ready
  useEffect(() => {
    if (isReady.current && candles.length > 0) {
      setDebugMsg("sending " + candles.length + " candles");
      sendCandles(candles);
    }
  }, [candles, sendCandles]);

  // Live candle updates
  useEffect(() => {
    if (isReady.current && liveCandle) {
      inject(
        `window.updateCandle(${JSON.stringify({
          time: Math.floor(liveCandle.time / 1000),
          open: liveCandle.open,
          high: liveCandle.high,
          low: liveCandle.low,
          close: liveCandle.close,
        })})`
      );
    }
  }, [liveCandle, inject]);

  return (
    <View style={{ height }}>
      <Text style={{ color: "#F5C518", fontSize: 10, fontFamily: "monospace", paddingHorizontal: 4, paddingVertical: 2 }}>
        chart: {debugMsg}
      </Text>
      <View style={{ flex: 1, borderRadius: 12, overflow: "hidden", backgroundColor: "#1A1A1A" }}>
        <WebView
          ref={webViewRef}
          source={{ html }}
          onMessage={onMessage}
          onError={(e) => setDebugMsg("WebView error: " + e.nativeEvent.description)}
          onHttpError={(e) => setDebugMsg("HTTP error: " + e.nativeEvent.statusCode)}
          scrollEnabled={false}
          bounces={false}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={["*"]}
          style={{ flex: 1, backgroundColor: "#1A1A1A" }}
        />
      </View>
    </View>
  );
}
