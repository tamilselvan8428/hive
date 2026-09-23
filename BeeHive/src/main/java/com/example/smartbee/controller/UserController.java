package com.example.smartbee.controller;

import com.example.smartbee.dto.AuthResponse;
import com.example.smartbee.dto.UpdateProfileRequest;
import com.example.smartbee.model.ApiKey;
import com.example.smartbee.model.User;
import com.example.smartbee.repository.ApiKeyRepository;
import com.example.smartbee.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final ApiKeyRepository apiKeyRepository;

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "User not authenticated"));
            }

            String email = auth.getName();
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
            }

            User user = userOpt.get();
            Optional<ApiKey> apiKeyOpt = apiKeyRepository.findByFarmId(user.getFarmId());
            String apiKey = apiKeyOpt.map(ApiKey::getApiKey).orElse(null);

            AuthResponse.UserDto userDto = new AuthResponse.UserDto(
                    user.getId(), user.getName(), user.getEmail(),
                    user.getPhoneNumber(), user.getAddress(),
                    user.getFarmName(), user.getFarmId()
            );

            return ResponseEntity.ok(Map.of("user", userDto, "apiKey", apiKey != null ? apiKey : ""));

        } catch (Exception e) {
            log.error("Error fetching user profile: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody UpdateProfileRequest req) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "User not authenticated"));
            }

            String email = auth.getName();
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
            }

            User user = userOpt.get();

            if (req.getName() != null && !req.getName().isBlank()) {
                user.setName(req.getName().trim());
            }
            if (req.getPhoneNumber() != null && !req.getPhoneNumber().isBlank()) {
                user.setPhoneNumber(req.getPhoneNumber().trim());
            }
            if (req.getAddress() != null) {
                user.setAddress(req.getAddress().trim());
            }
            if (req.getFarmName() != null && !req.getFarmName().isBlank()) {
                user.setFarmName(req.getFarmName().trim());
            }

            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);

            log.info("Profile updated for user {}. Future alerts will go to registered mobile: {}",
                    user.getEmail(), user.getPhoneNumber());

            AuthResponse.UserDto userDto = new AuthResponse.UserDto(
                    user.getId(), user.getName(), user.getEmail(),
                    user.getPhoneNumber(), user.getAddress(),
                    user.getFarmName(), user.getFarmId()
            );

            return ResponseEntity.ok(Map.of("message", "Profile updated successfully", "user", userDto));

        } catch (Exception e) {
            log.error("Error updating user profile: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }
}
