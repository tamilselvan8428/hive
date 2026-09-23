package com.example.smartbee.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "heater_logs")
public class HeaterLog {
    @Id
    private String id;

    private Long farmId;
    private Double temperature;
    private String heaterStatus; // "ON" or "OFF"
    private String mode; // "AUTO" or "MANUAL"
    private String reason;
    private String notificationStatus; // "SENT", "FAILED", "NOT REQUIRED", "NO_PHONE_CONFIGURED"
    private String recipientPhone; // Masked for privacy: e.g. +91 ******3210
    private LocalDateTime timestamp;
}
