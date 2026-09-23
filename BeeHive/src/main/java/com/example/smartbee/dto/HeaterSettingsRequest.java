package com.example.smartbee.dto;

import lombok.Data;

@Data
public class HeaterSettingsRequest {
    private Long farmId;
    private Double onThreshold;
    private Double offThreshold;
}
