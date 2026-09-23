package com.example.smartbee.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {
    private String message;
    private UserDto user;
    private String apiKey;
    private String token; // Optional: depending on if the client uses it immediately

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class UserDto {
        private String id;
        private String name;
        private String email;
        private String phoneNumber;
        private String address;
        private String farmName;
        private Long farmId;
    }
}
