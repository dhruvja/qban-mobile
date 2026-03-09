import { useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";

interface ChartProps {
  symbol?: string;
  height?: number;
}

const TRADINGVIEW_SYMBOL_MAP: Record<string, string> = {
  "SOL/USD": "BINANCE:SOLUSDT",
  "ETH/USD": "BINANCE:ETHUSDT",
  "BTC/USD": "BINANCE:BTCUSDT",
};

function buildWidgetHtml(tvSymbol: string): string {
  return [
    '<!DOCTYPE html><html><head>',
    '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">',
    '<style>*{margin:0;padding:0}html,body{width:100%;height:100%;overflow:hidden;background:#1A1A1A}</style>',
    '</head><body>',
    '<div class="tradingview-widget-container" style="width:100%;height:100%">',
    '  <div id="tv_chart" style="width:100%;height:100%"></div>',
    '</div>',
    '<script type="text/javascript" src="https://s3.tradingview.com/tv.js"></script>',
    '<script type="text/javascript">',
    'new TradingView.widget({',
    '  "container_id": "tv_chart",',
    '  "autosize": true,',
    '  "symbol": "' + tvSymbol + '",',
    '  "interval": "5",',
    '  "timezone": "Etc/UTC",',
    '  "theme": "dark",',
    '  "style": "1",',
    '  "locale": "en",',
    '  "toolbar_bg": "#1A1A1A",',
    '  "enable_publishing": false,',
    '  "hide_top_toolbar": true,',
    '  "hide_legend": true,',
    '  "save_image": false,',
    '  "hide_volume": false,',
    '  "backgroundColor": "#1A1A1A",',
    '  "gridColor": "#2D2D2D",',
    '  "allow_symbol_change": false',
    '});',
    '</script>',
    '</body></html>',
  ].join('\n');
}

export function Chart({ symbol = "SOL/USD", height = 280 }: ChartProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tvSymbol = TRADINGVIEW_SYMBOL_MAP[symbol] || "BINANCE:SOLUSDT";
  const html = buildWidgetHtml(tvSymbol);

  return (
    <View style={{ height }}>
      <View style={{ flex: 1, borderRadius: 12, overflow: "hidden", backgroundColor: "#1A1A1A" }}>
        {loading && (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", zIndex: 1 }}>
            <ActivityIndicator color="#F5C518" />
            <Text style={{ color: "#B8B2AA", fontSize: 10, marginTop: 8, fontFamily: "monospace" }}>
              Loading chart...
            </Text>
          </View>
        )}
        {error && (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", zIndex: 1 }}>
            <Text style={{ color: "#CC2936", fontSize: 11, fontFamily: "monospace" }}>{error}</Text>
          </View>
        )}
        <WebView
          source={{ html }}
          onLoad={() => setLoading(false)}
          onError={(e) => {
            setLoading(false);
            setError("Chart error: " + e.nativeEvent.description);
          }}
          scrollEnabled={false}
          bounces={false}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={["*"]}
          allowsInlineMediaPlayback
          mixedContentMode="compatibility"
          style={{ flex: 1, backgroundColor: "#1A1A1A" }}
        />
      </View>
    </View>
  );
}
