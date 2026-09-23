package com.example.smartbee.dto;

import lombok.Data;

@Data
public class HeaterModeRequest {
    private Long farmId;
    private String mode; // "AUTO" or "MANUAL"
}
