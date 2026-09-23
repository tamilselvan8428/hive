package com.example.smartbee.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/test")
public class TestController {

    @Value("${spring.data.mongodb.uri:NOT_FOUND}")
    private String mongoUri;

    @GetMapping("/config")
    public String getConfig() {
        return "Mongo URI is: " + mongoUri;
    }
}
