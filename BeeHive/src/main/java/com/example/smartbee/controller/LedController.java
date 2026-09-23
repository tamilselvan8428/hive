package com.example.smartbee.controller;

import com.example.smartbee.dto.LedRequest;
import com.example.smartbee.model.Led;
import com.example.smartbee.repository.LedRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class LedController {

    private final LedRepository ledRepository;

    @PostMapping("/led")
    public ResponseEntity<?> controlLed(@RequestBody LedRequest req) {
        try {
            if (req.getFarmId() == null) {
                Map<String, String> err = new HashMap<>();
                err.put("message", "farmId is required");
                return ResponseEntity.badRequest().body(err);
            }

            if (req.getState() == null || (!req.getState().equalsIgnoreCase("on") && !req.getState().equalsIgnoreCase("off"))) {
                Map<String, String> err = new HashMap<>();
                err.put("message", "state must be 'on' or 'off'");
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

            Optional<Led> ledOpt = ledRepository.findByFarmId(farmIdNumber);
            Led led;
            if (ledOpt.isPresent()) {
                led = ledOpt.get();
                led.setLedStatus(req.getState().toLowerCase());
                led.setUpdatedAt(LocalDateTime.now());
            } else {
                led = new Led();
                led.setFarmId(farmIdNumber);
                led.setLedStatus(req.getState().toLowerCase());
                led.setCreatedAt(LocalDateTime.now());
            }
            ledRepository.save(led);

            Map<String, Object> res = new HashMap<>();
            res.put("success", true);
            res.put("farmId", farmIdNumber);
            res.put("ledStatus", led.getLedStatus());
            res.put("message", "LED for farm " + farmIdNumber + " set to " + led.getLedStatus());
            return ResponseEntity.ok(res);

        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }

    @GetMapping("/led/{farmIdParam}")
    public ResponseEntity<?> getLedStatus(@PathVariable String farmIdParam) {
        try {
            Long farmId;
            try {
                farmId = Long.parseLong(farmIdParam);
            } catch (NumberFormatException e) {
                Map<String, String> err = new HashMap<>();
                err.put("message", "farmId must be a valid number");
                return ResponseEntity.badRequest().body(err);
            }

            Optional<Led> ledOpt = ledRepository.findByFarmId(farmId);
            if (ledOpt.isEmpty()) {
                Map<String, String> err = new HashMap<>();
                err.put("message", "No LED data found for farm " + farmId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(err);
            }

            Led led = ledOpt.get();
            Map<String, Object> res = new HashMap<>();
            res.put("success", true);
            res.put("farmId", led.getFarmId());
            res.put("ledStatus", led.getLedStatus());
            return ResponseEntity.ok(res);

        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }
}
