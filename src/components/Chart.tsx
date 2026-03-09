import { useRef, useCallback, useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import type { CandleData } from "../types";
import { LIGHTWEIGHT_CHARTS_JS } from "./chartLib";

function buildChartHtml(): string {
  // Use array join to avoid $ substitution issues from String.replace
  const parts: string[] = [];
  parts.push('<!DOCTYPE html><html><head>');
  parts.push('<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">');
  parts.push('<style>*{margin:0;padding:0;box-sizing:border-box}html,body{background:#1A1A1A;overflow:hidden;width:100%;height:100%}#chart{width:100%;height:100%}</style>');
  parts.push('</head><body><div id="chart"></div>');
  parts.push('<script>');
  parts.push(LIGHTWEIGHT_CHARTS_JS);
  parts.push('</script>');
  parts.push('<script>');
  parts.push('try{');
  parts.push('  var chart=LightweightCharts.createChart(document.getElementById("chart"),{');
  parts.push('    width:document.body.clientWidth,height:document.body.clientHeight,');
  parts.push('    layout:{background:{color:"#1A1A1A"},textColor:"#B8B2AA",fontSize:11},');
  parts.push('    grid:{vertLines:{color:"#2D2D2D"},horzLines:{color:"#2D2D2D"}},');
  parts.push('    rightPriceScale:{borderColor:"#2D2D2D"},');
  parts.push('    timeScale:{borderColor:"#2D2D2D",timeVisible:true,secondsVisible:false},');
  parts.push('    handleScroll:{vertTouchDrag:false}');
  parts.push('  });');
  parts.push('  var cs=chart.addCandlestickSeries({upColor:"#00C853",downColor:"#CC2936",borderUpColor:"#00C853",borderDownColor:"#CC2936",wickUpColor:"#00C853",wickDownColor:"#CC2936"});');
  parts.push('  chart.timeScale().fitContent();');
  parts.push('  window.setCandles=function(d){cs.setData(d);chart.timeScale().fitContent()};');
  parts.push('  window.updateCandle=function(d){cs.update(d)};');
  parts.push('  new ResizeObserver(function(){chart.applyOptions({width:document.body.clientWidth})}).observe(document.body);');
  parts.push('  window.ReactNativeWebView.postMessage("ready");');
  parts.push('}catch(e){');
  parts.push('  document.body.innerHTML="<p style=color:red;padding:20px>"+e.message+"</p>";');
  parts.push('  window.ReactNativeWebView.postMessage("error:"+e.message);');
  parts.push('}');
  parts.push('</script></body></html>');
  return parts.join('\n');
}

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

const CHART_HTML = buildChartHtml();

export function Chart({ candles, liveCandle, height = 280 }: ChartProps) {
  const webViewRef = useRef<WebView>(null);
  const isReady = useRef(false);
  const candlesRef = useRef(candles);
  candlesRef.current = candles;
  const [status, setStatus] = useState("loading webview...");

  const inject = useCallback((js: string) => {
    webViewRef.current?.injectJavaScript(js + ";true;");
  }, []);

  const sendCandles = useCallback(
    (data: CandleData[]) => {
      const json = JSON.stringify(formatCandles(data));
      inject("window.setCandles(" + json + ")");
    },
    [inject]
  );

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const msg = event.nativeEvent.data;
      if (msg === "ready") {
        setStatus("ready");
        isReady.current = true;
        if (candlesRef.current.length > 0) {
          sendCandles(candlesRef.current);
          setStatus("sent " + candlesRef.current.length + " candles");
        } else {
          setStatus("ready, waiting for candle data...");
        }
      } else if (msg.startsWith("error:")) {
        setStatus(msg);
      }
    },
    [sendCandles]
  );

  // When candles arrive after WebView is ready
  useEffect(() => {
    if (isReady.current && candles.length > 0) {
      sendCandles(candles);
      setStatus("sent " + candles.length + " candles");
    }
  }, [candles, sendCandles]);

  // Live updates
  useEffect(() => {
    if (isReady.current && liveCandle) {
      inject(
        "window.updateCandle(" +
          JSON.stringify({
            time: Math.floor(liveCandle.time / 1000),
            open: liveCandle.open,
            high: liveCandle.high,
            low: liveCandle.low,
            close: liveCandle.close,
          }) +
          ")"
      );
    }
  }, [liveCandle, inject]);

  return (
    <View style={{ height }}>
      <Text style={{ color: "#F5C518", fontSize: 9, fontFamily: "monospace", paddingHorizontal: 4 }}>
        {status}
      </Text>
      <View style={{ flex: 1, borderRadius: 12, overflow: "hidden", backgroundColor: "#1A1A1A" }}>
        <WebView
          ref={webViewRef}
          source={{ html: CHART_HTML }}
          onMessage={onMessage}
          onError={(e) => setStatus("webview error: " + e.nativeEvent.description)}
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
