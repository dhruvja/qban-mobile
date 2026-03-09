import { useRef, useCallback, useEffect, useMemo } from "react";
import { View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import type { CandleData } from "../types";
import { LIGHTWEIGHT_CHARTS_JS } from "./chartLib";

function buildChartHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#1A1A1A; overflow:hidden; }
    #chart { width:100%; height:100%; }
  </style>
</head>
<body>
  <div id="chart"></div>
  <script>${LIGHTWEIGHT_CHARTS_JS}</script>
  <script>
    try {
      var chart = LightweightCharts.createChart(document.getElementById('chart'), {
        layout: {
          background: { color: '#1A1A1A' },
          textColor: '#B8B2AA',
          fontSize: 11,
        },
        grid: {
          vertLines: { color: '#2D2D2D' },
          horzLines: { color: '#2D2D2D' },
        },
        crosshair: {
          mode: LightweightCharts.CrosshairMode.Normal,
          vertLine: { color: '#F5C518', labelBackgroundColor: '#F5C518' },
          horzLine: { color: '#F5C518', labelBackgroundColor: '#F5C518' },
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

      chart.timeScale().fitContent();

      window.setCandles = function(data) {
        candleSeries.setData(data);
        chart.timeScale().fitContent();
      };

      window.updateCandle = function(data) {
        candleSeries.update(data);
      };

      new ResizeObserver(function() {
        chart.applyOptions({ width: document.body.clientWidth });
      }).observe(document.body);

      window.ReactNativeWebView.postMessage('ready');
    } catch(e) {
      document.body.innerHTML = '<p style="color:#CC2936;padding:20px;font-family:monospace">Chart error: ' + e.message + '</p>';
      window.ReactNativeWebView.postMessage('error:' + e.message);
    }
  </script>
</body>
</html>`;
}

interface ChartProps {
  candles: CandleData[];
  liveCandle?: CandleData;
  height?: number;
}

function formatCandlesForChart(candles: CandleData[]) {
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

  const html = useMemo(() => buildChartHtml(), []);

  const inject = useCallback((js: string) => {
    webViewRef.current?.injectJavaScript(js + ";true;");
  }, []);

  const sendCandlesToChart = useCallback(
    (data: CandleData[]) => {
      const json = JSON.stringify(formatCandlesForChart(data));
      inject(`window.setCandles(${json})`);
    },
    [inject]
  );

  // WebView signals ready — send candles if available
  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      if (event.nativeEvent.data === "ready") {
        isReady.current = true;
        if (candlesRef.current.length > 0) {
          sendCandlesToChart(candlesRef.current);
        }
      }
    },
    [sendCandlesToChart]
  );

  // When candles prop changes after WebView is already ready
  useEffect(() => {
    if (isReady.current && candles.length > 0) {
      sendCandlesToChart(candles);
    }
  }, [candles, sendCandlesToChart]);

  // Stream live candle updates
  useEffect(() => {
    if (isReady.current && liveCandle) {
      const data = JSON.stringify({
        time: Math.floor(liveCandle.time / 1000),
        open: liveCandle.open,
        high: liveCandle.high,
        low: liveCandle.low,
        close: liveCandle.close,
      });
      inject(`window.updateCandle(${data})`);
    }
  }, [liveCandle, inject]);

  return (
    <View style={{ height }} className="bg-qban-black rounded-xl overflow-hidden">
      <WebView
        ref={webViewRef}
        source={{ html }}
        onMessage={onMessage}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        style={{ backgroundColor: "#1A1A1A" }}
      />
    </View>
  );
}
