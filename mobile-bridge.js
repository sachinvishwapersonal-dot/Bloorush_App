/**
 * BlooRush Mobile Bridge
 * Seamlessly interfaces the web app with Capacitor Native Plugins
 * when running inside iOS or Android native containers.
 */
(function() {
  const isCapacitor = typeof window.Capacitor !== 'undefined';

  window.BlooRushNative = {
    isNative: isCapacitor,

    // Initialize native features (Status bar, Keyboard, etc.)
    init: async function() {
      if (!isCapacitor) return;
      console.log('[BlooRushNative] Initializing native plugins...');

      try {
        const { StatusBar, Style } = window.Capacitor.Plugins.StatusBar || {};
        if (StatusBar) {
          await StatusBar.setStyle({ style: Style ? Style.Dark : 'DARK' });
          await StatusBar.setBackgroundColor({ color: '#FFFFFF' });
          await StatusBar.setOverlaysWebView({ overlay: false });
        }
      } catch (e) {
        console.warn('[BlooRushNative] StatusBar init:', e);
      }

      try {
        const { Keyboard } = window.Capacitor.Plugins.Keyboard || {};
        if (Keyboard) {
          Keyboard.setAccessoryBarVisible({ isVisible: true });
        }
      } catch (e) {
        console.warn('[BlooRushNative] Keyboard init:', e);
      }
    },

    // Trigger haptic vibration on button taps / actions
    hapticImpact: async function() {
      if (!isCapacitor) return;
      try {
        const { Haptics, ImpactStyle } = window.Capacitor.Plugins.Haptics || {};
        if (Haptics) {
          await Haptics.impact({ style: ImpactStyle ? ImpactStyle.Light : 'LIGHT' });
        }
      } catch (e) {}
    },

    // Get precise GPS coordinates (for Partners check-in or Customer zone check)
    getCurrentPosition: async function() {
      if (isCapacitor && window.Capacitor.Plugins.Geolocation) {
        try {
          const pos = await window.Capacitor.Plugins.Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 10000
          });
          return {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          };
        } catch (e) {
          console.warn('[BlooRushNative] Native geolocation fallback to browser:', e);
        }
      }

      // Browser fallback
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          return reject(new Error('Geolocation not supported'));
        }
        navigator.geolocation.getCurrentPosition(
          p => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
          err => reject(err),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    },

    // Register for native Push Notifications
    registerPushNotifications: async function(onTokenReceived) {
      if (!isCapacitor || !window.Capacitor.Plugins.PushNotifications) return;
      try {
        const { PushNotifications } = window.Capacitor.Plugins;
        let perm = await PushNotifications.checkPermissions();
        if (perm.receive !== 'granted') {
          perm = await PushNotifications.requestPermissions();
        }
        if (perm.receive === 'granted') {
          await PushNotifications.register();
          PushNotifications.addListener('registration', token => {
            console.log('[BlooRushNative] Push Token:', token.value);
            if (typeof onTokenReceived === 'function') onTokenReceived(token.value);
          });
          PushNotifications.addListener('pushNotificationReceived', notification => {
            console.log('[BlooRushNative] Notification received:', notification);
          });
        }
      } catch (e) {
        console.warn('[BlooRushNative] Push registration error:', e);
      }
    }
  };

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.BlooRushNative.init());
  } else {
    window.BlooRushNative.init();
  }
})();
