package com.example.smartbee.controller;

import com.example.smartbee.dto.HeaterManualRequest;
import com.example.smartbee.dto.HeaterModeRequest;
import com.example.smartbee.dto.HeaterSettingsRequest;
import com.example.smartbee.dto.HeaterTelemetryRequest;
import com.example.smartbee.model.ApiKey;
import com.example.smartbee.model.HeaterLog;
import com.example.smartbee.model.HeaterState;
import com.example.smartbee.model.User;
import com.example.smartbee.repository.ApiKeyRepository;
import com.example.smartbee.repository.HeaterLogRepository;
import com.example.smartbee.repository.UserRepository;
import com.example.smartbee.service.HeaterControlService;
import com.example.smartbee.service.SmsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/heater")
@RequiredArgsConstructor
public class HeaterController {

    private final HeaterControlService heaterControlService;
    private final HeaterLogRepository heaterLogRepository;
    private final UserRepository userRepository;
    private final ApiKeyRepository apiKeyRepository;

    /**
     * Resolves authenticated user's farmId or validates that the requested farmId belongs to them.
     */
    private Long resolveAndVerifyFarmId(Long requestedFarmId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            String email = auth.getName();
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                Long userFarmId = user.getFarmId();
                if (requestedFarmId == null) {
                    return userFarmId;
                }
                // Verify ownership (Requirement 16)
                if (!requestedFarmId.equals(userFarmId)) {
                    throw new SecurityException("Unauthorized: You do not own farm " + requestedFarmId);
                }
                return requestedFarmId;
            }
        }
        return requestedFarmId;
    }

    @GetMapping("/status")
    public ResponseEntity<?> getStatus() {
        return getStatusForFarm(null);
    }

    @GetMapping({"/status/{farmIdParam}", "/{farmIdParam}"})
    public ResponseEntity<?> getStatusForFarm(@PathVariable(required = false) Long farmIdParam) {
        try {
            Long farmId = resolveAndVerifyFarmId(farmIdParam);
            if (farmId == null) {
                farmId = 1L; // Fallback to default farm if not logged in
            }

            HeaterState state = heaterControlService.getOrCreateHeaterState(farmId);
            Optional<User> ownerOpt = userRepository.findByFarmId(farmId);
            String maskedPhone = ownerOpt.map(u -> SmsService.maskPhoneNumber(u.getPhoneNumber())).orElse("None");

            boolean isOnline = false;
            if (state.getLastTelemetryAt() != null) {
                long minutesSinceLast = Duration.between(state.getLastTelemetryAt(), LocalDateTime.now()).toMinutes();
                isOnline = minutesSinceLast < 2; // online if updated in last 2 mins
            }

            Map<String, Object> res = new HashMap<>();
            res.put("farmId", state.getFarmId());
            res.put("temperature", state.getCurrentTemperature());
            res.put("humidity", state.getCurrentHumidity());
            res.put("heaterStatus", state.getHeaterStatus());
            res.put("mode", state.getMode());
            res.put("onThreshold", state.getOnThreshold());
            res.put("offThreshold", state.getOffThreshold());
            res.put("reason", state.getLastReason());
            res.put("smsStatus", state.getLastSmsStatus());
            res.put("smsMessage", state.getLastSmsMessage());
            res.put("maskedRecipient", maskedPhone);
            res.put("esp32Online", isOnline);
            res.put("lastStateChangeAt", state.getLastStateChangeAt());
            res.put("lastNotificationAt", state.getLastNotificationAt());
            res.put("lastTelemetryAt", state.getLastTelemetryAt());

            return ResponseEntity.ok(res);

        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Error retrieving heater status: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/mode")
    public ResponseEntity<?> setMode(@RequestBody HeaterModeRequest req) {
        try {
            Long farmId = resolveAndVerifyFarmId(req.getFarmId());
            if (farmId == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "farmId is required"));
            }

            HeaterState state = heaterControlService.setMode(farmId, req.getMode());
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "farmId", state.getFarmId(),
                    "mode", state.getMode(),
                    "heaterStatus", state.getHeaterStatus(),
                    "reason", state.getLastReason()
            ));

        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Error setting heater mode: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/manual")
    public ResponseEntity<?> setManual(@RequestBody HeaterManualRequest req) {
        try {
            Long farmId = resolveAndVerifyFarmId(req.getFarmId());
            if (farmId == null || req.getHeater() == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "farmId and heater (boolean) are required"));
            }

            HeaterState state = heaterControlService.setManualHeater(farmId, req.getHeater());
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "farmId", state.getFarmId(),
                    "heaterStatus", state.getHeaterStatus(),
                    "mode", state.getMode(),
                    "reason", state.getLastReason()
            ));

        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Error setting manual heater: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/settings")
    public ResponseEntity<?> updateSettings(@RequestBody HeaterSettingsRequest req) {
        try {
            Long farmId = resolveAndVerifyFarmId(req.getFarmId());
            if (farmId == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "farmId is required"));
            }

            HeaterState state = heaterControlService.updateThresholds(farmId, req.getOnThreshold(), req.getOffThreshold());
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "farmId", state.getFarmId(),
                    "onThreshold", state.getOnThreshold(),
                    "offThreshold", state.getOffThreshold(),
                    "message", "Thresholds updated successfully"
            ));

        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Error updating heater thresholds: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Telemetry & notification event endpoint called by ESP32 or client.
     */
    @PostMapping({"/telemetry", "/notifications/heater"})
    public ResponseEntity<?> receiveTelemetry(
            @RequestHeader(value = "X-API-KEY", required = false) String apiKeyHeader,
            @RequestBody HeaterTelemetryRequest req) {
        try {
            Long farmId = req.getFarmId();
            if (farmId == null) {
                farmId = 1L;
            }

            // If API key is provided, verify it against ApiKey repository
            if (apiKeyHeader != null && !apiKeyHeader.isBlank()) {
                Optional<ApiKey> keyOpt = apiKeyRepository.findByFarmId(farmId);
                if (keyOpt.isPresent() && !keyOpt.get().getApiKey().equalsIgnoreCase(apiKeyHeader)) {
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid device API key"));
                }
            }

            HeaterState state = heaterControlService.processTelemetry(
                    farmId,
                    req.getTemperature(),
                    req.getHumidity(),
                    req.getMode(),
                    req.getHeater(),
                    req.getReason()
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "farmId", state.getFarmId(),
                    "heaterStatus", state.getHeaterStatus(),
                    "mode", state.getMode(),
                    "reason", state.getLastReason(),
                    "onThreshold", state.getOnThreshold(),
                    "offThreshold", state.getOffThreshold()
            ));

        } catch (Exception e) {
            log.error("Error processing telemetry: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/logs/{farmIdParam}")
    public ResponseEntity<?> getLogs(@PathVariable Long farmIdParam) {
        try {
            Long farmId = resolveAndVerifyFarmId(farmIdParam);
            List<HeaterLog> logs = heaterLogRepository.findTop20ByFarmIdOrderByTimestampDesc(farmId);
            return ResponseEntity.ok(logs);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }
}
