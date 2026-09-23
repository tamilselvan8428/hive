package com.example.smartbee.service;

import com.example.smartbee.model.HeaterLog;
import com.example.smartbee.model.HeaterState;
import com.example.smartbee.model.Led;
import com.example.smartbee.model.User;
import com.example.smartbee.repository.AppNotificationRepository;
import com.example.smartbee.repository.HeaterLogRepository;
import com.example.smartbee.repository.HeaterStateRepository;
import com.example.smartbee.repository.LedRepository;
import com.example.smartbee.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class HeaterControlService {

    private final HeaterStateRepository heaterStateRepository;
    private final HeaterLogRepository heaterLogRepository;
    private final AppNotificationRepository appNotificationRepository;
    private final UserRepository userRepository;
    private final LedRepository ledRepository;
    private final SmsService smsService;

    @Value("${thingspeak.write.key:A0B9TJ5N4L8R72ZE}")
    private String thingspeakWriteKey;

    @Value("${thingspeak.channel.id:3126283}")
    private String thingspeakChannelId;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    /**
     * Retrieves or initializes HeaterState for a specific farmId.
     */
    public HeaterState getOrCreateHeaterState(Long farmId) {
        return heaterStateRepository.findByFarmId(farmId).orElseGet(() -> {
            HeaterState state = new HeaterState();
            state.setFarmId(farmId);
            state.setMode("AUTO");
            state.setHeaterStatus("OFF");
            state.setOnThreshold(30.0);
            state.setOffThreshold(35.0);
            state.setLastReason("System initialized");
            state.setLastSmsStatus("NOT REQUIRED");
            state.setCreatedAt(LocalDateTime.now());
            state.setUpdatedAt(LocalDateTime.now());
            return heaterStateRepository.save(state);
        });
    }

    /**
     * Process telemetry received from ESP32 or ThingSpeak sync.
     * Evaluates AUTO mode hysteresis, detects state transitions, and notifies registered user.
     */
    public synchronized HeaterState processTelemetry(Long farmId, Double temperature, Double humidity, String reportedMode, Boolean reportedHeater, String clientReason) {
        HeaterState state = getOrCreateHeaterState(farmId);
        LocalDateTime now = LocalDateTime.now();

        state.setCurrentTemperature(temperature);
        if (humidity != null) {
            state.setCurrentHumidity(humidity);
        }
        state.setLastTelemetryAt(now);
        state.setUpdatedAt(now);

        String previousStatus = state.getHeaterStatus() != null ? state.getHeaterStatus().toUpperCase() : "OFF";
        String targetStatus = previousStatus;
        String reason = state.getLastReason();

        if ("AUTO".equalsIgnoreCase(state.getMode())) {
            // Requirement 8: Sensor Failure Safety
            if (temperature == null || Double.isNaN(temperature)) {
                targetStatus = "OFF";
                reason = "Temperature sensor unavailable";
                log.warn("[AUTO HEATER] Farm {}: Sensor reading invalid/NaN. Defaulting heater to OFF for safety.", farmId);
            } else {
                double onLimit = state.getOnThreshold() != null ? state.getOnThreshold() : 30.0;
                double offLimit = state.getOffThreshold() != null ? state.getOffThreshold() : 35.0;

                // Requirement 2: Temperature-based automatic heater control with hysteresis
                if (temperature < onLimit) {
                    targetStatus = "ON";
                    reason = String.format("Temperature below %.1f°C", onLimit);
                } else if (temperature > offLimit) {
                    targetStatus = "OFF";
                    reason = String.format("Temperature above %.1f°C", offLimit);
                } else {
                    // 30°C <= temp <= 35°C: Keep previous state
                    targetStatus = previousStatus;
                    reason = String.format("Temperature (%.1f°C) within hysteresis band (%.1f°C - %.1f°C). State maintained.",
                            temperature, onLimit, offLimit);
                }
            }
        } else {
            // MANUAL Mode
            if (reportedHeater != null) {
                targetStatus = reportedHeater ? "ON" : "OFF";
                reason = clientReason != null ? clientReason : "Manual control";
            }
        }

        applyStateChange(state, farmId, previousStatus, targetStatus, reason, temperature);
        return heaterStateRepository.save(state);
    }

    /**
     * Switch Control Mode (AUTO or MANUAL).
     */
    public synchronized HeaterState setMode(Long farmId, String newMode) {
        if (newMode == null || (!newMode.equalsIgnoreCase("AUTO") && !newMode.equalsIgnoreCase("MANUAL"))) {
            throw new IllegalArgumentException("Mode must be 'AUTO' or 'MANUAL'");
        }

        HeaterState state = getOrCreateHeaterState(farmId);
        String previousMode = state.getMode();
        String formattedMode = newMode.toUpperCase();
        state.setMode(formattedMode);
        state.setUpdatedAt(LocalDateTime.now());

        String previousStatus = state.getHeaterStatus() != null ? state.getHeaterStatus().toUpperCase() : "OFF";
        String targetStatus = previousStatus;
        String reason = "Switched to " + formattedMode + " mode";

        if ("AUTO".equalsIgnoreCase(formattedMode)) {
            // Requirement 22: Immediately evaluate current temperature when switching MANUAL -> AUTO
            Double temp = state.getCurrentTemperature();
            if (temp != null && !Double.isNaN(temp)) {
                double onLimit = state.getOnThreshold() != null ? state.getOnThreshold() : 30.0;
                double offLimit = state.getOffThreshold() != null ? state.getOffThreshold() : 35.0;

                if (temp < onLimit) {
                    targetStatus = "ON";
                    reason = String.format("Switched to AUTO: Temperature (%.1f°C) below %.1f°C", temp, onLimit);
                } else if (temp > offLimit) {
                    targetStatus = "OFF";
                    reason = String.format("Switched to AUTO: Temperature (%.1f°C) above %.1f°C", temp, offLimit);
                } else {
                    targetStatus = previousStatus;
                    reason = String.format("Switched to AUTO: Temperature (%.1f°C) within hysteresis band. Maintained %s.", temp, previousStatus);
                }
            }
        } else {
            // Requirement 21: When switching AUTO -> MANUAL, preserve current heater state
            reason = "Switched to MANUAL mode. Maintained current state " + previousStatus;
        }

        applyStateChange(state, farmId, previousStatus, targetStatus, reason, state.getCurrentTemperature());
        syncThingSpeak(farmId, state.getHeaterStatus(), state.getMode());
        return heaterStateRepository.save(state);
    }

    /**
     * Manual Heater Control (ON / OFF).
     */
    public synchronized HeaterState setManualHeater(Long farmId, boolean turnOn) {
        HeaterState state = getOrCreateHeaterState(farmId);

        if (!"MANUAL".equalsIgnoreCase(state.getMode())) {
            throw new IllegalStateException("Manual commands are only permitted in MANUAL mode. Current mode is " + state.getMode());
        }

        String previousStatus = state.getHeaterStatus() != null ? state.getHeaterStatus().toUpperCase() : "OFF";
        String targetStatus = turnOn ? "ON" : "OFF";
        String reason = "Manual control";

        applyStateChange(state, farmId, previousStatus, targetStatus, reason, state.getCurrentTemperature());
        syncThingSpeak(farmId, targetStatus, "MANUAL");
        return heaterStateRepository.save(state);
    }

    /**
     * Updates hysteresis thresholds.
     */
    public synchronized HeaterState updateThresholds(Long farmId, Double onThreshold, Double offThreshold) {
        if (onThreshold == null || offThreshold == null) {
            throw new IllegalArgumentException("Both onThreshold and offThreshold are required.");
        }
        if (onThreshold >= offThreshold) {
            throw new IllegalArgumentException("Heater ON threshold (" + onThreshold + "°C) must be lower than Heater OFF threshold (" + offThreshold + "°C).");
        }

        HeaterState state = getOrCreateHeaterState(farmId);
        state.setOnThreshold(onThreshold);
        state.setOffThreshold(offThreshold);
        state.setUpdatedAt(LocalDateTime.now());

        // Re-evaluate current temperature if in AUTO mode
        if ("AUTO".equalsIgnoreCase(state.getMode()) && state.getCurrentTemperature() != null) {
            return processTelemetry(farmId, state.getCurrentTemperature(), state.getCurrentHumidity(), "AUTO", null, "Thresholds updated");
        }

        return heaterStateRepository.save(state);
    }

    /**
     * Handles state change detection, deduplication, logging, and SMS notification dispatch.
     */
    private void applyStateChange(HeaterState state, Long farmId, String previousStatus, String targetStatus, String reason, Double currentTemp) {
        LocalDateTime now = LocalDateTime.now();
        state.setHeaterStatus(targetStatus);
        state.setLastReason(reason);

        // Mirror to existing Led entity for backwards compatibility
        syncLedStatus(farmId, targetStatus);

        // Requirement 9 & 20: Only send SMS when actual heater state changes (OFF -> ON or ON -> OFF)
        boolean stateChanged = !previousStatus.equalsIgnoreCase(targetStatus);

        if (stateChanged) {
            log.info("[HEATER STATE CHANGE] Farm {}: {} -> {} (Reason: {})", farmId, previousStatus, targetStatus, reason);
            state.setLastStateChangeAt(now);

            // Requirements 8, 10, 11, 12, 32: Resolve authenticated user's registered phone number from database
            Optional<User> userOpt = userRepository.findByFarmId(farmId);
            String userPhoneNumber = userOpt.map(User::getPhoneNumber).orElse(null);

            SmsService.SmsResult result = smsService.sendHeaterAlert(
                    userPhoneNumber,
                    currentTemp,
                    targetStatus,
                    state.getMode(),
                    reason
            );

            state.setLastSmsStatus(result.getStatus());
            state.setLastSmsMessage(result.getMessage());
            state.setLastNotificationAt(now);

            // Log event in database (Requirement 18)
            HeaterLog heaterLog = new HeaterLog();
            heaterLog.setFarmId(farmId);
            heaterLog.setTemperature(currentTemp);
            heaterLog.setHeaterStatus(targetStatus);
            heaterLog.setMode(state.getMode());
            heaterLog.setReason(reason);
            heaterLog.setNotificationStatus(result.getStatus());
            heaterLog.setRecipientPhone(result.getMaskedRecipient());
            heaterLog.setTimestamp(now);
            heaterLogRepository.save(heaterLog);

            // Create App Notification for Mobile Top Status Bar & App Alert Center
            try {
                com.example.smartbee.model.AppNotification appNotification = new com.example.smartbee.model.AppNotification();
                appNotification.setFarmId(farmId);
                appNotification.setTitle("SmartBee Alert: Heater " + targetStatus);
                String tempFormatted = (currentTemp != null && !Double.isNaN(currentTemp)) ? String.format("%.1f°C", currentTemp) : "N/A";
                appNotification.setMessage(String.format("Temperature: %s | Mode: %s | Reason: %s", tempFormatted, state.getMode(), reason));
                appNotification.setTemperature(currentTemp);
                appNotification.setHeaterStatus(targetStatus);
                appNotification.setMode(state.getMode());
                appNotification.setReason(reason);
                appNotification.setRead(false);
                appNotification.setCreatedAt(now);
                appNotificationRepository.save(appNotification);
                log.info("[APP NOTIFICATION] Saved alert for Farm {}: Heater {}", farmId, targetStatus);
            } catch (Exception ex) {
                log.error("[APP NOTIFICATION] Error saving alert: {}", ex.getMessage());
            }
        } else {
            log.debug("[HEATER] Farm {}: State remains {}. No SMS dispatched.", farmId, targetStatus);
        }
    }

    private void syncLedStatus(Long farmId, String targetStatus) {
        try {
            Optional<Led> ledOpt = ledRepository.findByFarmId(farmId);
            Led led = ledOpt.orElseGet(() -> {
                Led l = new Led();
                l.setFarmId(farmId);
                l.setCreatedAt(LocalDateTime.now());
                return l;
            });
            led.setLedStatus(targetStatus.toLowerCase());
            led.setUpdatedAt(LocalDateTime.now());
            ledRepository.save(led);
        } catch (Exception e) {
            log.warn("[LED SYNC] Failed to sync Led table for farm {}: {}", farmId, e.getMessage());
        }
    }

    private void syncThingSpeak(Long farmId, String heaterStatus, String mode) {
        if (thingspeakWriteKey == null || thingspeakWriteKey.isBlank()) return;

        // Async update to ThingSpeak
        new Thread(() -> {
            try {
                int field6 = "ON".equalsIgnoreCase(heaterStatus) ? 1 : 0;
                int field7 = "MANUAL".equalsIgnoreCase(mode) ? 1 : 0;
                int field8 = field6; // manual command

                String url = String.format(
                        "https://api.thingspeak.com/update?api_key=%s&field1=%d&field6=%d&field7=%d&field8=%d",
                        thingspeakWriteKey, farmId, field6, field7, field8
                );

                HttpRequest req = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .timeout(Duration.ofSeconds(4))
                        .GET()
                        .build();

                httpClient.send(req, HttpResponse.BodyHandlers.discarding());
                log.info("[THINGSPEAK SYNC] Updated field6={}, field7={}, field8={} for farm {}", field6, field7, field8, farmId);
            } catch (Exception e) {
                log.debug("[THINGSPEAK SYNC] Failed to update ThingSpeak: {}", e.getMessage());
            }
        }).start();
    }
}
