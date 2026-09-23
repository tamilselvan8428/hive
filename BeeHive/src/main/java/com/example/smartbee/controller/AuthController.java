package com.example.smartbee.controller;

import com.example.smartbee.dto.AuthResponse;
import com.example.smartbee.dto.LoginRequest;
import com.example.smartbee.dto.SignupRequest;
import com.example.smartbee.model.ApiKey;
import com.example.smartbee.model.User;
import com.example.smartbee.repository.ApiKeyRepository;
import com.example.smartbee.repository.UserRepository;
import com.example.smartbee.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final ApiKeyRepository apiKeyRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest req) {
        try {
            if (req.getName() == null || req.getEmail() == null || req.getPassword() == null ||
                req.getPhoneNumber() == null || req.getFarmName() == null) {
                Map<String, String> err = new HashMap<>();
                err.put("message", "Missing required fields");
                return ResponseEntity.badRequest().body(err);
            }

            if (userRepository.findByEmail(req.getEmail()).isPresent()) {
                Map<String, String> err = new HashMap<>();
                err.put("message", "User already exists");
                return ResponseEntity.badRequest().body(err);
            }

            Optional<User> lastUserOpt = userRepository.findTopByOrderByFarmIdDesc();
            Long nextFarmId = lastUserOpt.map(user -> user.getFarmId() != null ? user.getFarmId() + 1 : 1L).orElse(1L);

            User newUser = new User();
            newUser.setName(req.getName());
            newUser.setEmail(req.getEmail());
            newUser.setPassword(passwordEncoder.encode(req.getPassword()));
            newUser.setPhoneNumber(req.getPhoneNumber());
            newUser.setAddress(req.getAddress());
            newUser.setFarmName(req.getFarmName());
            newUser.setFarmId(nextFarmId);
            newUser.setCreatedAt(LocalDateTime.now());
            userRepository.save(newUser);

            String generatedKey = UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
            ApiKey newApiKey = new ApiKey();
            newApiKey.setFarmId(nextFarmId);
            newApiKey.setApiKey(generatedKey);
            newApiKey.setCreatedAt(LocalDateTime.now());
            apiKeyRepository.save(newApiKey);

            AuthResponse.UserDto userDto = new AuthResponse.UserDto(
                    newUser.getId(), newUser.getName(), newUser.getEmail(),
                    newUser.getPhoneNumber(), newUser.getAddress(),
                    newUser.getFarmName(), newUser.getFarmId()
            );

            // Generate JWT Token just in case
            UserDetails userDetails = userDetailsService.loadUserByUsername(newUser.getEmail());
            String token = jwtUtil.generateToken(userDetails);

            AuthResponse response = new AuthResponse("User created successfully", userDto, generatedKey, token);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        try {
            Optional<User> userOpt = userRepository.findByEmail(req.getEmail());
            if (userOpt.isEmpty() || !passwordEncoder.matches(req.getPassword(), userOpt.get().getPassword())) {
                Map<String, String> err = new HashMap<>();
                err.put("message", "Invalid email or password");
                return ResponseEntity.badRequest().body(err);
            }

            User user = userOpt.get();
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(req.getEmail(), req.getPassword()));
            
            UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
            String token = jwtUtil.generateToken(userDetails);

            Optional<ApiKey> apiKeyOpt = apiKeyRepository.findByFarmId(user.getFarmId());
            String apiKey = apiKeyOpt.map(ApiKey::getApiKey).orElse(null);

            AuthResponse.UserDto userDto = new AuthResponse.UserDto(
                    user.getId(), user.getName(), user.getEmail(),
                    user.getPhoneNumber(), user.getAddress(),
                    user.getFarmName(), user.getFarmId()
            );

            AuthResponse response = new AuthResponse("Login successful", userDto, apiKey, token);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }
}
