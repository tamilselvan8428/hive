package com.example.smartbee.dto;

import lombok.Data;

@Data
public class HeaterManualRequest {
    private Long farmId;
    private Boolean heater; // true = ON, false = OFF
}
