import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

class NotificationService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.channelCreated = false;
    this.listeners = [];
    this.lastNotifiedStatus = null;
    this.lastNotifiedTime = 0;
  }

  /**
   * Initializes the high-priority Android notification channel for heads-up top bar alerts.
   */
  async init() {
    try {
      if (this.isNative) {
        // Request Android 13+ POST_NOTIFICATIONS permission
        const permStatus = await LocalNotifications.requestPermissions();
        console.log('[NOTIFICATION SERVICE] Permission status:', permStatus);

        // Create high-importance notification channel for Android status bar popup
        await LocalNotifications.createChannel({
          id: 'smartbee_heater_alerts',
          name: 'SmartBee Heater Alerts',
          description: 'Emergency temperature and heater status change notifications',
          importance: 5, // 5 = IMPORTANCE_HIGH (Displays heads-up banner at top of mobile screen)
          visibility: 1, // 1 = VISIBILITY_PUBLIC
          sound: 'beep.wav',
          vibration: true,
          lights: true,
          lightColor: '#e53935',
        });
        this.channelCreated = true;
        console.log('[NOTIFICATION SERVICE] Android Notification Channel created with IMPORTANCE_HIGH');
      } else {
        // Fallback for desktop/web browser notifications
        if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
          await Notification.requestPermission();
        }
      }
    } catch (err) {
      console.warn('[NOTIFICATION SERVICE] Init error:', err);
    }
  }

  /**
   * Triggers a system status bar notification at the top of the mobile screen.
   * Only triggers when heater state genuinely changes or when forced.
   */
  async showHeaterNotification({ status, temperature, mode, reason, force = false }) {
    const now = Date.now();
    // Guard against repeated notifications if state hasn't changed or triggered too recently
    if (!force) {
      if (this.lastNotifiedStatus === status && now - this.lastNotifiedTime < 30000) {
        console.log(`[NOTIFICATION SERVICE] Suppressed duplicate notification for status: ${status}`);
        return;
      }
    }

    this.lastNotifiedStatus = status;
    this.lastNotifiedTime = now;

    const title = `SmartBee Alert: Heater ${status}`;
    const tempStr = temperature != null ? `${Number(temperature).toFixed(1)}°C` : 'N/A';
    const body = `Temp: ${tempStr} | Mode: ${mode} | Reason: ${reason || 'State change'}`;

    console.log('[NOTIFICATION SERVICE] Triggering top-bar mobile notification:', title, body);

    // Notify any registered in-app listeners (for floating toast or bell badge)
    this.listeners.forEach((fn) => {
      try {
        fn({ status, temperature, mode, reason, title, body, timestamp: new Date() });
      } catch (e) {
        console.error(e);
      }
    });

    if (this.isNative) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              title: `🔥 ${title}`,
              body: body,
              id: Math.floor(Math.random() * 900000) + 100000,
              channelId: 'smartbee_heater_alerts',
              schedule: { at: new Date(Date.now() + 100) },
              smallIcon: 'ic_stat_icon_config_sample',
              sound: 'beep.wav',
              actionTypeId: '',
              extra: { status, temperature, mode, reason },
            },
          ],
        });
        console.log('[NOTIFICATION SERVICE] Native Android status bar notification scheduled!');
      } catch (err) {
        console.error('[NOTIFICATION SERVICE] Native notification schedule error:', err);
      }
    } else {
      // Browser notification fallback
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body: body,
            icon: '/favicon.ico',
          });
        } catch (e) {
          console.error('[NOTIFICATION SERVICE] Web notification error:', e);
        }
      }
    }
  }

  addListener(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }
}

export const notificationService = new NotificationService();
