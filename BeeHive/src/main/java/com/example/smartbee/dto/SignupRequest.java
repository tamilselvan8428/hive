package com.example.smartbee.dto;

import lombok.Data;

@Data
public class SignupRequest {
    private String name;
    private String email;
    private String password;
    private String phoneNumber;
    private String address;
    private String farmName;
}
