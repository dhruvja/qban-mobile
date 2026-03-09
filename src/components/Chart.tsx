import { useRef, useCallback, useEffect } from "react";
import { View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import type { CandleData } from "../types";

const CHART_HTML = `
<!DOCTYPE html>
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
  <script src="https://unpkg.com/lightweight-charts@4.1.1/dist/lightweight-charts.standalone.production.js"></script>
  <script>
    const chart = LightweightCharts.createChart(document.getElementById('chart'), {
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
      rightPriceScale: {
        borderColor: '#2D2D2D',
      },
      timeScale: {
        borderColor: '#2D2D2D',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#00C853',
      downColor: '#CC2936',
      borderUpColor: '#00C853',
      borderDownColor: '#CC2936',
      wickUpColor: '#00C853',
      wickDownColor: '#CC2936',
    });

    chart.timeScale().fitContent();

    window.addEventListener('message', function(event) {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'candles') {
          candleSeries.setData(msg.data);
          chart.timeScale().fitContent();
        } else if (msg.type === 'update') {
          candleSeries.update(msg.data);
        }
      } catch(e) {}
    });

    // Also handle React Native postMessage
    document.addEventListener('message', function(event) {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'candles') {
          candleSeries.setData(msg.data);
          chart.timeScale().fitContent();
        } else if (msg.type === 'update') {
          candleSeries.update(msg.data);
        }
      } catch(e) {}
    });

    new ResizeObserver(() => chart.applyOptions({ width: document.body.clientWidth }))
      .observe(document.body);
  </script>
</body>
</html>
`;

interface ChartProps {
  candles: CandleData[];
  liveCandle?: CandleData;
  height?: number;
}

export function Chart({ candles, liveCandle, height = 280 }: ChartProps) {
  const webViewRef = useRef<WebView>(null);
  const webViewReady = useRef(false);

  const sendMessage = useCallback((msg: object) => {
    webViewRef.current?.postMessage(JSON.stringify(msg));
  }, []);

  const sendCandles = useCallback(() => {
    if (!webViewReady.current || candles.length === 0) return;
    sendMessage({
      type: "candles",
      data: candles.map((c) => ({
        time: Math.floor(c.time / 1000),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    });
  }, [candles, sendMessage]);

  // WebView finished loading — send candles if we have them
  const onLoad = useCallback(() => {
    webViewReady.current = true;
    sendCandles();
  }, [sendCandles]);

  // Candles changed — send if WebView is ready
  useEffect(() => {
    sendCandles();
  }, [sendCandles]);

  // Stream live candle updates
  useEffect(() => {
    if (liveCandle && sentInitial.current) {
      sendMessage({
        type: "update",
        data: {
          time: Math.floor(liveCandle.time / 1000),
          open: liveCandle.open,
          high: liveCandle.high,
          low: liveCandle.low,
          close: liveCandle.close,
        },
      });
    }
  }, [liveCandle, sendMessage]);

  const onMessage = useCallback((_event: WebViewMessageEvent) => {
    // Future: handle chart interactions (crosshair, etc.)
  }, []);

  return (
    <View style={{ height }} className="bg-qban-black rounded-xl overflow-hidden">
      <WebView
        ref={webViewRef}
        source={{ html: CHART_HTML }}
        onLoad={onLoad}
        onMessage={onMessage}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled
        domStorageEnabled
        style={{ backgroundColor: "#1A1A1A" }}
      />
    </View>
  );
}
