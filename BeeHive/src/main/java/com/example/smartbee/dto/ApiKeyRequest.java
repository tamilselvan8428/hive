package com.example.smartbee.dto;

import lombok.Data;

@Data
public class ApiKeyRequest {
    private Object farmId; // Use Object to handle string or number from JSON like node.js does
    private String apiKey;
}
