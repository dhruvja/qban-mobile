import { useRef, useCallback, useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import * as FileSystem from "expo-file-system";
import type { CandleData } from "../types";
import { LIGHTWEIGHT_CHARTS_JS } from "./chartLib";

const CHART_FILE = FileSystem.cacheDirectory + "qban_chart.html";

function buildChartHtml(): string {
  // Use string concat instead of template to avoid $ substitution issues
  return [
    '<!DOCTYPE html><html><head>',
    '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">',
    '<style>*{margin:0;padding:0;box-sizing:border-box}html,body{background:#1A1A1A;overflow:hidden;width:100%;height:100%}#chart{width:100%;height:100%}</style>',
    '</head><body><div id="chart"></div>',
    '<script>',
    LIGHTWEIGHT_CHARTS_JS,
    '<\/script>',
    '<script>',
    'try{',
    '  var chart=LightweightCharts.createChart(document.getElementById("chart"),{',
    '    width:document.body.clientWidth,height:document.body.clientHeight,',
    '    layout:{background:{color:"#1A1A1A"},textColor:"#B8B2AA",fontSize:11},',
    '    grid:{vertLines:{color:"#2D2D2D"},horzLines:{color:"#2D2D2D"}},',
    '    rightPriceScale:{borderColor:"#2D2D2D"},',
    '    timeScale:{borderColor:"#2D2D2D",timeVisible:true,secondsVisible:false},',
    '    handleScroll:{vertTouchDrag:false}',
    '  });',
    '  var cs=chart.addCandlestickSeries({upColor:"#00C853",downColor:"#CC2936",borderUpColor:"#00C853",borderDownColor:"#CC2936",wickUpColor:"#00C853",wickDownColor:"#CC2936"});',
    '  chart.timeScale().fitContent();',
    '  window.setCandles=function(d){cs.setData(d);chart.timeScale().fitContent()};',
    '  window.updateCandle=function(d){cs.update(d)};',
    '  new ResizeObserver(function(){chart.applyOptions({width:document.body.clientWidth})}).observe(document.body);',
    '  window.ReactNativeWebView.postMessage("ready");',
    '}catch(e){',
    '  document.body.innerHTML="<p style=color:red;padding:20px>"+e.message+"</p>";',
    '  window.ReactNativeWebView.postMessage("error:"+e.message);',
    '}',
    '<\/script></body></html>',
  ].join('\n');
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

export function Chart({ candles, liveCandle, height = 280 }: ChartProps) {
  const webViewRef = useRef<WebView>(null);
  const isReady = useRef(false);
  const candlesRef = useRef(candles);
  candlesRef.current = candles;
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [status, setStatus] = useState("writing html...");

  // Write HTML to a file so WebView can load it as a URI (more reliable than inline html)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const html = buildChartHtml();
        await FileSystem.writeAsStringAsync(CHART_FILE, html, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        if (!cancelled) {
          setFileUri(CHART_FILE);
          setStatus("html written, loading webview...");
        }
      } catch (e) {
        setStatus("file write error: " + (e instanceof Error ? e.message : String(e)));
      }
    })();
    return () => { cancelled = true; };
  }, []);

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

  if (!fileUri) {
    return (
      <View style={{ height, backgroundColor: "#1A1A1A", borderRadius: 12, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color="#F5C518" />
        <Text style={{ color: "#F5C518", fontSize: 10, marginTop: 8, fontFamily: "monospace" }}>{status}</Text>
      </View>
    );
  }

  return (
    <View style={{ height }}>
      <Text style={{ color: "#F5C518", fontSize: 9, fontFamily: "monospace", paddingHorizontal: 4 }}>
        {status}
      </Text>
      <View style={{ flex: 1, borderRadius: 12, overflow: "hidden", backgroundColor: "#1A1A1A" }}>
        <WebView
          ref={webViewRef}
          source={{ uri: fileUri }}
          onMessage={onMessage}
          onError={(e) => setStatus("webview error: " + e.nativeEvent.description)}
          scrollEnabled={false}
          bounces={false}
          javaScriptEnabled
          domStorageEnabled
          allowFileAccess
          allowFileAccessFromFileURLs
          originWhitelist={["*"]}
          style={{ flex: 1, backgroundColor: "#1A1A1A" }}
        />
      </View>
    </View>
  );
}
