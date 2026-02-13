import { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, SafeAreaView, StatusBar, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

// Default development URL - replace your local IP here for testing on device
// e.g., 'http://192.168.1.5:3000'
const DEFAULT_URL = 'http://192.168.1.10:3000';

export default function NativeWrapper() {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);

  const handleConnect = () => {
    let formattedUrl = url;
    if (!formattedUrl.startsWith('http')) {
      formattedUrl = 'https://' + formattedUrl;
    }
    setActiveUrl(formattedUrl);
  };

  if (activeUrl) {
    return (
      <View style={styles.container}>
        <ExpoStatusBar style="light" backgroundColor="#00A8E8" />
        <WebView 
          source={{ uri: activeUrl }} 
          style={styles.webview}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          // Inject code to let the web app know it's running in a wrapper if needed
          injectedJavaScript={`window.isNativeWrapper = true; true;`}
        />
        {/* Reset Button (Hidden feature: Long press bottom right or similar could implement later) */}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.setupContainer}>
      <ExpoStatusBar style="dark" />
      <View style={styles.content}>
        <Text style={styles.title}>BBM Reborn Native</Text>
        <Text style={styles.subtitle}>Enter the URL of your running web server</Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder="http://192.168.1.x:3000"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleConnect}>
          <Text style={styles.buttonText}>Connect</Text>
        </TouchableOpacity>

        <View style={styles.help}>
          <Text style={styles.helpText}>1. Run 'npm run dev' on your computer</Text>
          <Text style={styles.helpText}>2. Ensure your phone is on the same WiFi</Text>
          <Text style={styles.helpText}>3. Enter your computer's local IP address above</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#00A8E8',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  webview: {
    flex: 1,
  },
  setupContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#00A8E8',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#0f172a',
  },
  button: {
    backgroundColor: '#00A8E8',
    width: '100%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#00A8E8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  help: {
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 12,
    width: '100%',
  },
  helpText: {
    color: '#475569',
    fontSize: 14,
    marginBottom: 8,
  },
});