package com.example.smartbee.controller;

import com.example.smartbee.dto.ApiKeyRequest;
import com.example.smartbee.model.ApiKey;
import com.example.smartbee.repository.ApiKeyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ApiKeyController {

    private final ApiKeyRepository apiKeyRepository;

    @PostMapping("/saveKey")
    public ResponseEntity<?> saveKey(@RequestBody ApiKeyRequest req) {
        try {
            if (req.getFarmId() == null || req.getApiKey() == null) {
                Map<String, String> err = new HashMap<>();
                err.put("message", "farmId and apiKey are required");
                return ResponseEntity.badRequest().body(err);
            }

            Long farmIdNumber;
            try {
                farmIdNumber = Long.parseLong(req.getFarmId().toString());
            } catch (NumberFormatException e) {
                Map<String, String> err = new HashMap<>();
                err.put("message", "farmId must be a valid number");
                return ResponseEntity.badRequest().body(err);
            }

            Optional<ApiKey> recordOpt = apiKeyRepository.findByFarmId(farmIdNumber);
            if (recordOpt.isPresent()) {
                ApiKey record = recordOpt.get();
                record.setApiKey(req.getApiKey());
                record.setUpdatedAt(LocalDateTime.now());
                apiKeyRepository.save(record);

                Map<String, Object> res = new HashMap<>();
                res.put("message", "API key updated successfully");
                res.put("record", record);
                return ResponseEntity.ok(res);
            }

            ApiKey newRecord = new ApiKey();
            newRecord.setFarmId(farmIdNumber);
            newRecord.setApiKey(req.getApiKey());
            newRecord.setCreatedAt(LocalDateTime.now());
            apiKeyRepository.save(newRecord);

            Map<String, Object> res = new HashMap<>();
            res.put("message", "API key saved successfully");
            res.put("record", newRecord);
            return ResponseEntity.status(HttpStatus.CREATED).body(res);

        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }
}
