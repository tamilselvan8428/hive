package com.example.smartbee.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "heater_states")
public class HeaterState {
    @Id
    private String id;

    @Indexed(unique = true)
    private Long farmId;

    private String mode = "AUTO"; // "AUTO" or "MANUAL"
    private String heaterStatus = "OFF"; // "ON" or "OFF"

    private Double currentTemperature;
    private Double currentHumidity;

    // Configurable thresholds: default 30°C and 35°C
    private Double onThreshold = 30.0;
    private Double offThreshold = 35.0;

    private String lastReason = "System initialized";
    private String lastSmsStatus = "NOT REQUIRED";
    private String lastSmsMessage;

    private LocalDateTime lastStateChangeAt;
    private LocalDateTime lastNotificationAt;
    private LocalDateTime lastTelemetryAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
