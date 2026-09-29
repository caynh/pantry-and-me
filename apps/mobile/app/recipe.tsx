import * as WebBrowser from 'expo-web-browser';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  View as RNView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function RecipeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { url, title } = useLocalSearchParams<{ url: string; title?: string }>();

  const webViewRef = useRef<WebView>(null);
  const canGoBackRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // Android's back gesture should walk the page history before leaving the screen.
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBackRef.current) {
        webViewRef.current?.goBack();
        return true;
      }

      return false;
    });

    return () => subscription.remove();
  }, []);

  const openExternally = () => {
    if (url) void WebBrowser.openBrowserAsync(url);
  };

  const retry = () => {
    setFailed(false);
    setLoading(true);
    webViewRef.current?.reload();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: title ?? 'Recipe',
          headerRight: () => (
            <Pressable onPress={openExternally} hitSlop={8}>
              <Text style={[styles.headerAction, { color: colors.tint }]}>Open in browser</Text>
            </Pressable>
          ),
        }}
      />

      {!url ? (
        <RNView style={styles.centered}>
          <Text style={{ color: colors.muted }}>No recipe link was provided.</Text>
        </RNView>
      ) : failed ? (
        <RNView style={styles.centered}>
          <Text style={styles.errorTitle}>This recipe could not load</Text>
          <Text style={[styles.errorBody, { color: colors.muted }]}>
            The site may be blocking in-app viewing. Open it in your browser instead.
          </Text>
          <RNView style={styles.errorActions}>
            <Pressable onPress={retry} style={[styles.button, { borderColor: colors.border }]}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>Try again</Text>
            </Pressable>
            <Pressable
              onPress={openExternally}
              style={[styles.button, { backgroundColor: colors.tint, borderColor: colors.tint }]}>
              <Text style={{ color: colors.background, fontWeight: '700' }}>Open in browser</Text>
            </Pressable>
          </RNView>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={[styles.backLink, { color: colors.muted }]}>Back to results</Text>
          </Pressable>
        </RNView>
      ) : (
        <>
          <WebView
            ref={webViewRef}
            source={{ uri: url }}
            originWhitelist={['*']}
            style={styles.webView}
            allowsBackForwardNavigationGestures
            setSupportMultipleWindows={false}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setFailed(true);
            }}
            onNavigationStateChange={(state) => {
              canGoBackRef.current = state.canGoBack;
            }}
          />
          {loading ? (
            <RNView style={[styles.loading, { backgroundColor: colors.background }]}>
              <ActivityIndicator color={colors.tint} />
              <Text style={{ color: colors.muted }}>Loading recipe...</Text>
            </RNView>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  loading: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  headerAction: {
    fontSize: 15,
    fontWeight: '600',
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  errorBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  button: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backLink: {
    marginTop: 4,
    fontSize: 14,
  },
});
