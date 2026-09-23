package com.example.smartbee.dto;

import lombok.Data;

@Data
public class HeaterTelemetryRequest {
    private Long farmId;
    private Double temperature;
    private Double humidity;
    private String mode; // optional "AUTO" or "MANUAL"
    private Boolean heater; // true = ON, false = OFF
    private String reason;
}
