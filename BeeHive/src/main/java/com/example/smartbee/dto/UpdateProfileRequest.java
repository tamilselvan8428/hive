package com.example.smartbee.dto;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String name;
    private String phoneNumber;
    private String address;
    private String farmName;
}
